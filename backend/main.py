"""FastAPI application entry point.

Initializes:
  - MongoDB connection (shared singleton)
  - LangGraph agent with MongoDBSaver checkpointing
  - APScheduler background reminder loop
  - CORS middleware for React frontend
  - All API routers

Run with:  uvicorn backend.main:app --reload
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient

from langgraph.checkpoint.mongodb import MongoDBSaver

from backend.config import settings
from backend.db.connection import close_client, get_client
from backend.db.models import ensure_indexes
from backend.agents.graph import build_graph
from backend.routers import action_items, meetings, upload
from backend.routers.rag import router as rag_router
from backend.routers.analytics import router as analytics_router
from backend.routers.seed import router as seed_router
from backend.services.scheduler import start_scheduler, stop_scheduler, trigger_reminder_now

# ----- Logging -----

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)-35s | %(levelname)-7s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)


# ----- Lifespan -----


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle.

    Startup:
      1. Connect to MongoDB, ensure indexes
      2. Build LangGraph agent with MongoDBSaver
      3. Start background reminder scheduler

    Shutdown:
      1. Stop scheduler
      2. Close all MongoDB connections
    """
    logger.info("=" * 60)
    logger.info("  Starting Nudge AI Meeting Agent...")
    logger.info("=" * 60)

    # --- MongoDB ---
    client = get_client()
    db = client[settings.MONGODB_DB_NAME]
    ensure_indexes(db)
    app.state.db = db

    # --- LangGraph Agent ---
    # Share the same MongoClient for checkpointing (no separate connection)
    checkpointer = MongoDBSaver(client, db_name=settings.MONGODB_DB_NAME)
    graph = build_graph(checkpointer)
    app.state.graph = graph

    # --- Scheduler ---
    start_scheduler(graph, db, settings.SCHEDULER_INTERVAL_MINUTES)

    logger.info("Nudge AI is ready! 🚀")
    logger.info(f"  API docs:    http://localhost:8000/docs")
    logger.info(f"  Health:      http://localhost:8000/api/health")
    logger.info(f"  Scheduler:   every {settings.SCHEDULER_INTERVAL_MINUTES} min")
    logger.info("=" * 60)

    yield

    # --- Shutdown ---
    logger.info("Shutting down Nudge AI...")
    stop_scheduler()
    close_client()
    logger.info("Shutdown complete ✅")


# ----- App -----

app = FastAPI(
    title="Nudge AI — Meeting Follow-Up Agent",
    description=(
        "AI-powered meeting transcription, action item extraction, "
        "and automated reminder system. Built with LangGraph + Groq + MongoDB."
    ),
    version="0.1.0",
    lifespan=lifespan,
    # Large audio uploads up to 200 MB are supported via chunked transcription.
    # Run uvicorn with: --limit-concurrency 10 --timeout-keep-alive 300
    # for long-running transcription requests (2-hour audio ~= 3-5 min to transcribe).
)

import time
from collections import defaultdict
from threading import Lock
from starlette.responses import JSONResponse

# CORS middleware for React frontend and Chrome Extension
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----- Rate Limiting Defense -----
_rate_limit_lock = Lock()
_request_counts = defaultdict(list)
_last_cleanup = time.time()

GENERAL_LIMIT = 80  # Max 80 requests/min per IP for reads/health
HEAVY_LIMIT = 15    # Max 15 requests/min per IP for AI/audio uploads/RAG/seeding

HEAVY_PREFIXES = (
    "/api/upload",
    "/api/rag",
    "/api/seed",
    "/api/scheduler/trigger",
)


def _is_heavy_endpoint(path: str, method: str) -> bool:
    if method == "POST" and (path.endswith("/process") or path.endswith("/remind")):
        return True
    return any(path.startswith(prefix) for prefix in HEAVY_PREFIXES)


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    # Allow CORS preflight requests without rate checks
    if request.method == "OPTIONS":
        return await call_next(request)

    # Resolve client IP (respecting reverse proxies like Render/Cloudflare)
    forwarded = request.headers.get("x-forwarded-for")
    client_ip = (
        forwarded.split(",")[0].strip()
        if forwarded
        else (request.client.host if request.client else "unknown")
    )

    now = time.time()
    path = request.url.path
    method = request.method
    is_heavy = _is_heavy_endpoint(path, method)
    limit = HEAVY_LIMIT if is_heavy else GENERAL_LIMIT
    key = f"{client_ip}:{'heavy' if is_heavy else 'gen'}"

    with _rate_limit_lock:
        global _last_cleanup
        # Periodic cleanup of expired timestamps every 60s
        if now - _last_cleanup > 60:
            cutoff = now - 60
            for k in list(_request_counts.keys()):
                _request_counts[k] = [t for t in _request_counts[k] if t > cutoff]
                if not _request_counts[k]:
                    del _request_counts[k]
            _last_cleanup = now

        # Prune current key's timestamps
        cutoff = now - 60
        timestamps = [t for t in _request_counts[key] if t > cutoff]
        _request_counts[key] = timestamps

        if len(timestamps) >= limit:
            logger.warning(
                f"Rate limit exceeded for {client_ip} on {method} {path} ({len(timestamps)}/{limit})"
            )
            return JSONResponse(
                status_code=429,
                content={
                    "detail": "Rate limit exceeded. Please wait a moment before sending more requests.",
                    "retry_after_seconds": 60,
                },
                headers={"Retry-After": "60"},
            )

        _request_counts[key].append(now)

    return await call_next(request)

# --- Routers ---
app.include_router(upload.router)
app.include_router(meetings.router)
app.include_router(action_items.router)
app.include_router(rag_router)
app.include_router(analytics_router)
app.include_router(seed_router)


# --- Utility Endpoints ---


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "Nudge AI Meeting Agent",
        "version": "0.1.0",
    }


@app.post("/api/scheduler/trigger")
def manual_trigger_scheduler(request: Request):
    """Manually trigger the reminder check loop.

    Useful for live demos — fires the scheduler immediately instead
    of waiting for the next interval.
    """
    result = trigger_reminder_now(request.app.state.graph, request.app.state.db)
    return result
