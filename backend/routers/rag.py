"""RAG (Retrieval-Augmented Generation) endpoints.

Provides semantic search over past meeting content using
Nomic AI embeddings + MongoDB Atlas Vector Search.

Endpoints:
  POST /api/rag/search               — free-text search over all meetings
  GET  /api/rag/similar/{meeting_id} — find meetings similar to a given one
  GET  /api/rag/similar-items        — find similar past action items
  GET  /api/rag/setup-instructions   — Atlas vector index setup guide
"""

import logging

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel

from backend.db.models import MEETINGS
from backend.services.rag_service import (
    get_vector_index_instructions,
    search_similar_action_items,
    search_similar_meetings,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/rag", tags=["rag"])


# ----- Request Schemas -----


class SearchRequest(BaseModel):
    """Free-text RAG search query."""

    query: str
    limit: int = 3


# ----- Endpoints -----


@router.post("/search")
def rag_search(request: Request, body: SearchRequest):
    """Search all past meetings semantically.

    Uses Nomic AI to embed the query, then finds the most semantically
    similar meetings via Atlas Vector Search.

    Example queries:
      - "authentication API security issues"
      - "who is responsible for the mobile app"
      - "deadline for design review"
    """
    db = request.app.state.db

    if not body.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    limit = max(1, min(body.limit, 10))  # Clamp between 1 and 10

    results = search_similar_meetings(
        db=db,
        query_text=body.query,
        limit=limit,
    )

    return {
        "query": body.query,
        "results": results,
        "count": len(results),
        "note": (
            "Empty results? Make sure the Atlas Vector Search index is created. "
            "See GET /api/rag/setup-instructions"
        ) if not results else None,
    }


@router.get("/similar/{meeting_id}")
def get_similar_meetings(
    request: Request,
    meeting_id: str,
    limit: int = Query(3, ge=1, le=10),
):
    """Find meetings semantically similar to a given meeting.

    Uses the meeting's title + decisions as the search query.
    The current meeting is automatically excluded from results.

    Args:
        meeting_id: MongoDB ObjectId of the reference meeting.
        limit: Number of similar meetings to return (1–10).
    """
    db = request.app.state.db

    try:
        oid = ObjectId(meeting_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid meeting ID format")

    meeting = db[MEETINGS].find_one({"_id": oid}, {"title": 1, "decisions": 1})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    # Build a search query from the meeting's own content
    title = meeting.get("title", "")
    decisions = meeting.get("decisions", [])
    query_text = f"{title}. {' '.join(decisions)}"

    results = search_similar_meetings(
        db=db,
        query_text=query_text,
        limit=limit,
        exclude_meeting_id=meeting_id,
    )

    return {
        "meeting_id": meeting_id,
        "meeting_title": title,
        "similar_meetings": results,
        "count": len(results),
    }


@router.get("/similar-items")
def get_similar_action_items(
    request: Request,
    query: str = Query(..., description="Action item text to search for similar items"),
    limit: int = Query(5, ge=1, le=20),
):
    """Find similar action items from past meetings.

    Useful for spotting recurring tasks across meetings.

    Args:
        query: Description of the action item to find similar ones for.
        limit: Number of similar items to return.
    """
    db = request.app.state.db

    if not query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    results = search_similar_action_items(
        db=db,
        query_text=query,
        limit=limit,
    )

    return {
        "query": query,
        "similar_items": results,
        "count": len(results),
    }


@router.get("/setup-instructions")
def get_setup_instructions():
    """Get step-by-step instructions for creating the Atlas Vector Search index.

    This is a one-time manual step required to enable semantic search.
    Once completed, POST /api/rag/search will return real results.
    """
    return get_vector_index_instructions()
