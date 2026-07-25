"""Action item CRUD, manual reminder trigger, and human review endpoints.

Provides:
  - GET    /api/action-items               — list (filterable by status, meeting)
  - GET    /api/action-items/{id}          — get single item
  - PATCH  /api/action-items/{id}          — update status/owner/deadline
  - POST   /api/action-items/{id}/remind   — manually trigger a reminder
  - GET    /api/action-items/{id}/activity-log — agent reasoning history
  - POST   /api/action-items/{id}/review   — approve/reject flagged items
"""

import logging
from datetime import datetime

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel

from backend.db.models import ACTION_ITEMS

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/action-items", tags=["action-items"])


# ----- Request Schemas -----


class ActionItemUpdate(BaseModel):
    """Fields that can be updated on an action item."""

    status: str | None = None
    owner_name: str | None = None
    owner_email: str | None = None
    deadline: str | None = None
    text: str | None = None


class ReviewDecision(BaseModel):
    """Human review decision for a low-confidence action item."""

    approved: bool
    updated_text: str | None = None
    updated_owner: str | None = None
    updated_deadline: str | None = None


# ----- Endpoints -----


@router.get("")
def list_action_items(
    request: Request,
    status: str | None = Query(None, description="Filter by status"),
    meeting_id: str | None = Query(None, description="Filter by meeting"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
):
    """List action items with optional status and meeting filters."""
    db = request.app.state.db

    query: dict = {}
    if status:
        query["status"] = status
    if meeting_id:
        try:
            query["meeting_id"] = ObjectId(meeting_id)
        except InvalidId:
            raise HTTPException(status_code=400, detail="Invalid meeting ID")

    items = list(
        db[ACTION_ITEMS]
        .find(query)
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
    )

    total = db[ACTION_ITEMS].count_documents(query)

    return {
        "action_items": [_serialize(item) for item in items],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.get("/{item_id}")
def get_action_item(request: Request, item_id: str):
    """Get a single action item by ID."""
    db = request.app.state.db
    oid = _parse_oid(item_id)

    item = db[ACTION_ITEMS].find_one({"_id": oid})
    if not item:
        raise HTTPException(status_code=404, detail="Action item not found")

    return _serialize(item)


@router.patch("/{item_id}")
def update_action_item(
    request: Request,
    item_id: str,
    update: ActionItemUpdate,
):
    """Update an action item (e.g., mark done, reassign, change deadline)."""
    db = request.app.state.db
    oid = _parse_oid(item_id)

    update_fields: dict = {}
    log_details: list[str] = []

    for field, value in update.model_dump(exclude_none=True).items():
        update_fields[field] = value
        log_details.append(f"{field}={value}")

    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields to update")

    # Add activity log entry
    log_entry = {
        "ts": datetime.utcnow().isoformat(),
        "event": "updated",
        "detail": f"Updated: {', '.join(log_details)}",
    }

    result = db[ACTION_ITEMS].update_one(
        {"_id": oid},
        {"$set": update_fields, "$push": {"activity_log": log_entry}},
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Action item not found")

    updated = db[ACTION_ITEMS].find_one({"_id": oid})
    return _serialize(updated)


@router.post("/{item_id}/remind")
def trigger_reminder(request: Request, item_id: str):
    """Manually trigger a reminder for a specific action item.

    Useful for live demo: fire a reminder email on demand.
    """
    db = request.app.state.db
    graph = request.app.state.graph
    oid = _parse_oid(item_id)

    item = db[ACTION_ITEMS].find_one({"_id": oid})
    if not item:
        raise HTTPException(status_code=404, detail="Action item not found")

    if not item.get("owner_email"):
        raise HTTPException(
            status_code=400,
            detail="Cannot send reminder: no owner email assigned",
        )

    try:
        config = {"configurable": {"thread_id": item_id}}
        result = graph.invoke(
            {
                "current_action": "check_and_remind",
                "meeting_id": str(item.get("meeting_id", "")),
                "raw_transcript": "",
                "decisions": [],
                "action_items": [
                    {
                        "id": item_id,
                        "text": item.get("text", ""),
                        "owner": item.get("owner_name"),
                        "owner_email": item.get("owner_email"),
                        "deadline": item.get("deadline"),
                        "confidence": item.get("confidence", 1.0),
                        "status": item.get("status", "pending"),
                        "reminder_count": item.get("reminder_count", 0),
                        "last_reminded_at": item.get("last_reminded_at"),
                    }
                ],
                "needs_human_review": False,
            },
            config=config,
        )

        # Persist updated state
        if result and result.get("action_items"):
            updated = result["action_items"][0]
            now = datetime.utcnow()
            db[ACTION_ITEMS].update_one(
                {"_id": oid},
                {
                    "$set": {
                        "status": updated.get("status"),
                        "reminder_count": updated.get("reminder_count", 0),
                        "last_reminded_at": updated.get("last_reminded_at"),
                    },
                    "$push": {
                        "activity_log": {
                            "ts": now.isoformat(),
                            "event": "manual_reminder",
                            "detail": f"Manual reminder #{updated.get('reminder_count', 0)}",
                        }
                    },
                },
            )

        return {"message": "Reminder sent successfully", "item_id": item_id}

    except Exception as e:
        logger.error(f"Manual reminder failed for {item_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Reminder failed: {e}")


@router.get("/{item_id}/activity-log")
def get_activity_log(request: Request, item_id: str):
    """Get the activity log (agent reasoning history) for an action item.

    This is the key "agentic" feature for judges — shows extraction
    reasoning, reminder history, and human review decisions.
    """
    db = request.app.state.db
    oid = _parse_oid(item_id)

    item = db[ACTION_ITEMS].find_one({"_id": oid}, {"activity_log": 1})
    if not item:
        raise HTTPException(status_code=404, detail="Action item not found")

    return {
        "item_id": item_id,
        "activity_log": item.get("activity_log", []),
    }


@router.post("/{item_id}/review")
def review_action_item(
    request: Request,
    item_id: str,
    decision: ReviewDecision,
):
    """Approve or reject a flagged action item (human-in-the-loop review).

    Items with confidence < 0.7 are flagged for review. Approving
    sets confidence to 1.0 (human-verified). Rejecting marks as done.
    """
    db = request.app.state.db
    oid = _parse_oid(item_id)

    item = db[ACTION_ITEMS].find_one({"_id": oid})
    if not item:
        raise HTTPException(status_code=404, detail="Action item not found")

    now = datetime.utcnow()

    if decision.approved:
        update_fields: dict = {"confidence": 1.0}  # Human-verified

        if decision.updated_text:
            update_fields["text"] = decision.updated_text
        if decision.updated_owner:
            update_fields["owner_name"] = decision.updated_owner
        if decision.updated_deadline:
            update_fields["deadline"] = decision.updated_deadline

        db[ACTION_ITEMS].update_one(
            {"_id": oid},
            {
                "$set": update_fields,
                "$push": {
                    "activity_log": {
                        "ts": now.isoformat(),
                        "event": "human_approved",
                        "detail": f"Approved with edits: {list(update_fields.keys())}",
                    }
                },
            },
        )
        return {"message": "Action item approved", "item_id": item_id}

    else:
        db[ACTION_ITEMS].update_one(
            {"_id": oid},
            {
                "$set": {"status": "done"},
                "$push": {
                    "activity_log": {
                        "ts": now.isoformat(),
                        "event": "human_rejected",
                        "detail": "Rejected during human review",
                    }
                },
            },
        )
        return {"message": "Action item rejected", "item_id": item_id}


# ----- Helpers -----


def _parse_oid(item_id: str) -> ObjectId:
    """Parse a string to ObjectId, raising 400 on invalid format."""
    try:
        return ObjectId(item_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid item ID format")


def _serialize(doc: dict) -> dict:
    """Convert a MongoDB document to a JSON-serializable dict."""
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
