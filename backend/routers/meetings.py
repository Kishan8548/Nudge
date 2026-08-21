"""Meeting CRUD endpoints and agent processing trigger.

Provides:
  - GET  /api/meetings           — list all meetings (paginated)
  - GET  /api/meetings/{id}      — get meeting with its action items
  - POST /api/meetings/{id}/process — trigger AI agent pipeline
"""

import logging
from datetime import datetime

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, HTTPException, Query, Request

from backend.db.models import ACTION_ITEMS, MEETINGS
from backend.services.slack_service import send_meeting_processed_slack
from backend.services.rag_service import store_meeting_embedding
from backend.services.summary import generate_meeting_summary

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/meetings", tags=["meetings"])


# ----- Endpoints -----


@router.get("")
def list_meetings(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    """List all meetings, newest first.

    Returns a paginated list without the full transcript (use the
    detail endpoint for that).
    """
    db = request.app.state.db

    meetings = list(
        db[MEETINGS]
        .find({}, {"raw_transcript": 0})  # Exclude large transcript from list
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
    )

    total = db[MEETINGS].count_documents({})

    return {
        "meetings": [_serialize(m) for m in meetings],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.get("/{meeting_id}")
def get_meeting(request: Request, meeting_id: str):
    """Get a single meeting with its associated action items."""
    db = request.app.state.db

    try:
        oid = ObjectId(meeting_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid meeting ID format")

    meeting = db[MEETINGS].find_one({"_id": oid})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    # Attach action items
    action_items = list(db[ACTION_ITEMS].find({"meeting_id": oid}))

    result = _serialize(meeting)
    result["action_items"] = [_serialize(ai) for ai in action_items]
    return result


@router.post("/{meeting_id}/process")
def process_meeting(request: Request, meeting_id: str):
    """Trigger the AI agent pipeline for a meeting.

    Invokes the LangGraph agent to:
      1. Extract decisions and action items from the transcript
      2. Match owners to the roster
      3. Resolve relative deadlines to ISO dates

    Saves extracted data to MongoDB and returns the results.
    """
    db = request.app.state.db
    graph = request.app.state.graph

    try:
        oid = ObjectId(meeting_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid meeting ID format")

    meeting = db[MEETINGS].find_one({"_id": oid})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    if not meeting.get("raw_transcript"):
        raise HTTPException(status_code=400, detail="Meeting has no transcript")

    # --- Invoke the LangGraph agent ---
    try:
        config = {"configurable": {"thread_id": meeting_id}}
        result = graph.invoke(
            {
                "current_action": "process_meeting",
                "meeting_id": meeting_id,
                "raw_transcript": meeting["raw_transcript"],
                "decisions": [],
                "action_items": [],
                "needs_human_review": False,
                "self_name": meeting.get("self_name"),  # tag is_mine on extraction
            },
            config=config,
        )

        decisions = result.get("decisions", [])
        action_items = result.get("action_items", [])
        needs_review = result.get("needs_human_review", False)

        # --- Persist to MongoDB ---

        # Update meeting with decisions
        db[MEETINGS].update_one(
            {"_id": oid},
            {"$set": {"decisions": decisions, "needs_human_review": needs_review}},
        )

        # Generate executive summary
        summary = generate_meeting_summary(meeting.get("raw_transcript", ""))
        db[MEETINGS].update_one(
            {"_id": oid},
            {"$set": {"summary": summary}},
        )

        # Insert action items as separate documents
        now = datetime.utcnow()
        saved_items = []
        for item in action_items:
            item_doc = {
                "meeting_id": oid,
                "text": item.get("text", ""),
                "owner_name": item.get("owner"),
                "owner_email": item.get("owner_email"),
                "deadline": item.get("deadline"),
                "confidence": item.get("confidence", 1.0),
                "status": item.get("status", "pending"),
                "reminder_count": 0,
                "last_reminded_at": None,
                "created_at": now,
                "activity_log": [
                    {
                        "ts": now.isoformat(),
                        "event": "created",
                        "detail": (
                            f"Extracted from meeting with "
                            f"confidence {item.get('confidence', 1.0):.2f}"
                        ),
                    }
                ],
            }
            insert_result = db[ACTION_ITEMS].insert_one(item_doc)
            item_doc["_id"] = insert_result.inserted_id
            saved_items.append(item_doc)

        logger.info(
            f"Processed meeting {meeting_id}: "
            f"{len(decisions)} decisions, {len(saved_items)} action items"
        )

        # Notify Slack channel (non-blocking — failure doesn't affect response)
        send_meeting_processed_slack(
            meeting_title=meeting.get("title", "Untitled Meeting"),
            decisions_count=len(decisions),
            items_count=len(saved_items),
            needs_review=needs_review,
        )

        # Index meeting for RAG similarity search (non-blocking)
        store_meeting_embedding(
            db=db,
            meeting_id=meeting_id,
            title=meeting.get("title", "Untitled Meeting"),
            transcript=meeting.get("raw_transcript", ""),
            decisions=decisions,
        )

        return {
            "meeting_id": meeting_id,
            "decisions": decisions,
            "action_items": [_serialize(ai) for ai in saved_items],
            "needs_human_review": needs_review,
        }

    except Exception as e:
        logger.error(f"Failed to process meeting {meeting_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Agent processing failed: {e}",
        )

@router.delete("/{meeting_id}")
def delete_meeting(request: Request, meeting_id: str):
    """Delete a meeting and all its associated action items."""
    db = request.app.state.db

    try:
        oid = ObjectId(meeting_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid meeting ID format")

    # Delete the meeting
    result = db[MEETINGS].delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Meeting not found")

    # Delete associated action items
    db[ACTION_ITEMS].delete_many({"meeting_id": oid})

    logger.info(f"Deleted meeting {meeting_id} and associated action items.")
    return {"status": "success", "detail": "Meeting deleted"}

# ----- Helpers -----


def _serialize(doc: dict) -> dict:
    """Convert a MongoDB document to a JSON-serializable dict.

    Handles ObjectId → str and datetime → ISO string conversions.
    """
    result = {}
    for key, value in doc.items():
        if key == "_id":
            result["id"] = str(value)
        elif isinstance(value, ObjectId):
            result[key] = str(value)
        elif isinstance(value, datetime):
            result[key] = value.isoformat()
        else:
            result[key] = value
    return result
