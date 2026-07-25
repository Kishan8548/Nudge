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
)

# CORS middleware for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Routers ---
app.include_router(upload.router)
app.include_router(meetings.router)
app.include_router(action_items.router)


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
