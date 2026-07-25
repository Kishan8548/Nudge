"""MongoDB collection constants and index creation.

Defines the two core collections (meetings, action_items) and
creates performance indexes on startup. LangGraph's own checkpoint
collections (checkpoints, checkpoint_writes) are auto-created by
MongoDBSaver — no manual setup needed.
"""

import logging

from pymongo import ASCENDING, DESCENDING
from pymongo.database import Database

logger = logging.getLogger(__name__)

# ----- Collection Names -----
MEETINGS = "meetings"
ACTION_ITEMS = "action_items"
MEETING_EMBEDDINGS = "meeting_embeddings"  # RAG vector store


def ensure_indexes(db: Database) -> None:
    """Create required indexes on application collections.

    Called once during app startup. MongoDB's create_index is
    idempotent — safe to call on every restart.
    """
    # Meetings: sort by newest first
    db[MEETINGS].create_index(
        [("created_at", DESCENDING)],
        name="idx_meetings_created_at",
    )

    # Action items: look up by meeting
    db[ACTION_ITEMS].create_index(
        [("meeting_id", ASCENDING)],
        name="idx_action_items_meeting_id",
    )

    # Action items: scheduler query (pending items approaching deadline)
    db[ACTION_ITEMS].create_index(
        [("status", ASCENDING), ("deadline", ASCENDING)],
        name="idx_action_items_status_deadline",
    )

    # Action items: filter by owner
    db[ACTION_ITEMS].create_index(
        [("owner_email", ASCENDING), ("status", ASCENDING)],
        name="idx_action_items_owner_status",
    )

    # Action items: full-text search for RAG fallback
    db[ACTION_ITEMS].create_index(
        [("text", "text")],
        name="idx_action_items_text_search",
        default_language="english",
    )

    # Meeting embeddings: look up by meeting_id
    db[MEETING_EMBEDDINGS].create_index(
        [("meeting_id", ASCENDING)],
        name="idx_meeting_embeddings_meeting_id",
        unique=True,
    )

    logger.info("MongoDB indexes ensured")
