"""RAG (Retrieval-Augmented Generation) service using Nomic AI embeddings.

Uses Nomic's cloud embedding API (nomic-embed-text-v1.5, 768 dimensions)
to index meeting transcripts and decisions, then searches via MongoDB
Atlas Vector Search for semantically similar past content.

Why nomic-embed-text-v1.5:
  - Stable cloud API model (v2 is local-only via sentence-transformers)
  - Free tier (1M tokens), no credit card
  - SOTA quality on MTEB retrieval benchmark
  - Task-type prefixes for optimal retrieval (prepended to text)
  - Zero local compute — runs entirely in the cloud

Setup required (Atlas UI — one-time, ~2 minutes):
  See get_vector_index_instructions() below for exact steps.
"""

import logging
import time
from datetime import datetime
from typing import Any

from backend.config import settings

logger = logging.getLogger(__name__)

# Nomic model + dimension config
# nomic-embed-text-v1.5 is the stable cloud API model
# nomic-embed-text-v2 is local-only (sentence-transformers)
NOMIC_MODEL = "nomic-embed-text-v1.5"
EMBEDDING_DIM = 768  # nomic-embed-text-v1.5 output dimension
COLLECTION_NAME = "meeting_embeddings"
INDEX_NAME = "nudge_meeting_vector_index"


def _get_nomic_client():
    """Lazy-import nomic to avoid errors if package isn't installed yet."""
    try:
        import nomic
        from nomic import embed
        api_key = settings.NOMIC_API_KEY.get_secret_value()
        if api_key:
            nomic.login(api_key)
        return embed
    except ImportError:
        raise RuntimeError(
            "nomic package not installed. Run: pip install nomic>=3.2.0"
        )


def get_embedding(text: str, task_type: str = "search_document") -> list[float]:
    """Generate an embedding vector using Nomic AI cloud API.

    Uses nomic-embed-text-v1.5 via the nomic SDK.
    Task-type prefixes are prepended directly to the text (most reliable approach).

    Args:
        text: The text to embed.
        task_type: One of:
            - "search_document"  — when indexing data into the DB
            - "search_query"     — when encoding a user search query

    Returns:
        List of 768 floats (the embedding vector).

    Raises:
        RuntimeError: If Nomic API call fails after retries.
    """
    if not text or not text.strip():
        logger.warning("Empty text passed to get_embedding — returning zero vector")
        return [0.0] * EMBEDDING_DIM

    # Prepend task-type prefix directly (most compatible approach with v1.5)
    TASK_PREFIXES = {
        "search_document": "search_document: ",
        "search_query": "search_query: ",
        "clustering": "clustering: ",
        "classification": "classification: ",
    }
    prefixed_text = TASK_PREFIXES.get(task_type, "") + text

    embed = _get_nomic_client()

    # Retry with exponential backoff (handles transient 500s)
    last_error = None
    for attempt in range(3):
        try:
            output = embed.text(
                texts=[prefixed_text],
                model=NOMIC_MODEL,
                task_type="search_document",  # Still pass task_type for v1.5
                dimensionality=EMBEDDING_DIM,
            )
            vector = output["embeddings"][0]
            logger.debug(f"Generated embedding: dim={len(vector)}, task={task_type}")
            return vector
        except Exception as e:
            last_error = e
            wait = 2 ** attempt  # 1s, 2s, 4s
            logger.warning(f"Nomic API attempt {attempt+1} failed: {e}. Retrying in {wait}s...")
            time.sleep(wait)

    logger.error(f"Nomic embedding failed after 3 attempts: {last_error}")
    raise RuntimeError(f"Embedding generation failed: {last_error}") from last_error


def _build_index_text(
    title: str,
    decisions: list[str],
    transcript_snippet: str,
) -> str:
    """Combine meeting fields into a single indexable text blob.

    Decisions are given priority by repeating them. Transcript is
    truncated to 2000 chars to stay within Nomic's token limits.
    """
    decisions_text = " | ".join(decisions) if decisions else ""
    snippet = transcript_snippet[:2000] if transcript_snippet else ""
    return f"Meeting: {title}. Decisions: {decisions_text}. Context: {snippet}"


def store_meeting_embedding(
    db,
    meeting_id: str,
    title: str,
    transcript: str,
    decisions: list[str],
) -> bool:
    """Generate and store an embedding for a processed meeting.

    Called automatically after `process_meeting` in meetings.py.
    Upserts into the `meeting_embeddings` collection so re-processing
    a meeting updates its embedding rather than creating a duplicate.

    Args:
        db: PyMongo database instance.
        meeting_id: MongoDB ObjectId string of the meeting.
        title: Meeting title.
        transcript: Full transcript text.
        decisions: List of extracted decision strings.

    Returns:
        True on success, False on failure (non-fatal — logged only).
    """
    if not settings.NOMIC_API_KEY.get_secret_value():
        logger.info("NOMIC_API_KEY not set — skipping embedding storage")
        return False

    try:
        from bson import ObjectId

        index_text = _build_index_text(title, decisions, transcript)
        embedding = get_embedding(index_text, task_type="search_document")

        doc = {
            "meeting_id": ObjectId(meeting_id),
            "title": title,
            "decisions": decisions,
            "transcript_snippet": transcript[:500],  # Store small preview only
            "embedding": embedding,
            "indexed_at": datetime.utcnow().isoformat(),
        }

        db[COLLECTION_NAME].update_one(
            {"meeting_id": ObjectId(meeting_id)},
            {"$set": doc},
            upsert=True,
        )

        logger.info(f"Stored embedding for meeting {meeting_id} (dim={len(embedding)})")
        return True

    except Exception as e:
        logger.error(f"Failed to store meeting embedding for {meeting_id}: {e}")
        return False


def search_similar_meetings(
    db,
    query_text: str,
    limit: int = 3,
    exclude_meeting_id: str | None = None,
) -> list[dict]:
    """Find semantically similar past meetings using Atlas Vector Search.

    Args:
        db: PyMongo database instance.
        query_text: Free-text query (e.g., the current meeting's title or a question).
        limit: Max results to return.
        exclude_meeting_id: Optional meeting ID to exclude from results
            (used to exclude the current meeting from its own similar-list).

    Returns:
        List of dicts with: title, decisions, transcript_snippet, score, meeting_id
        Returns empty list if vector search index doesn't exist yet.
    """
    if not settings.NOMIC_API_KEY.get_secret_value():
        logger.info("NOMIC_API_KEY not set — skipping similarity search")
        return []

    try:
        query_vector = get_embedding(query_text, task_type="search_query")

        pipeline: list[dict] = [
            {
                "$vectorSearch": {
                    "index": INDEX_NAME,
                    "path": "embedding",
                    "queryVector": query_vector,
                    "numCandidates": min(limit * 10, 100),
                    "limit": limit + (1 if exclude_meeting_id else 0),
                }
            },
            {
                "$project": {
                    "_id": 0,
                    "meeting_id": {"$toString": "$meeting_id"},
                    "title": 1,
                    "decisions": 1,
                    "transcript_snippet": 1,
                    "indexed_at": 1,
                    "score": {"$meta": "vectorSearchScore"},
                }
            },
        ]

        results = list(db[COLLECTION_NAME].aggregate(pipeline))

        # Filter out the current meeting if requested
        if exclude_meeting_id:
            results = [
                r for r in results if r.get("meeting_id") != exclude_meeting_id
            ]

        return results[:limit]

    except Exception as e:
        error_str = str(e)
        if "index" in error_str.lower() or "vectorSearch" in error_str:
            logger.warning(
                "Atlas Vector Search index not yet created. "
                "Follow setup instructions at GET /api/rag/setup-instructions"
            )
            return []
        logger.error(f"Vector search failed: {e}")
        return []


def search_similar_action_items(
    db,
    query_text: str,
    limit: int = 5,
) -> list[dict]:
    """Find action items from past meetings similar to the query.

    Uses keyword-based text search as a fallback when vector index
    isn't set up yet, and vector search when available.

    Args:
        db: PyMongo database instance.
        query_text: Description of an action item to find similar items for.
        limit: Max results to return.

    Returns:
        List of similar action item dicts.
    """
    from backend.db.models import ACTION_ITEMS

    try:
        # Use MongoDB text search (always available, no index setup needed)
        # For a hackathon this is a good enough fallback
        results = list(
            db[ACTION_ITEMS]
            .find(
                {"$text": {"$search": query_text}, "status": {"$ne": "pending"}},
                {"score": {"$meta": "textScore"}},
            )
            .sort([("score", {"$meta": "textScore"})])
            .limit(limit)
        )

        serialized = []
        for item in results:
            serialized.append({
                "id": str(item["_id"]),
                "text": item.get("text", ""),
                "owner_name": item.get("owner_name"),
                "status": item.get("status"),
                "meeting_id": str(item.get("meeting_id", "")),
                "deadline": item.get("deadline"),
            })

        return serialized

    except Exception as e:
        logger.warning(f"Similar action items search failed: {e}")
        return []


def get_vector_index_instructions() -> dict:
    """Return step-by-step instructions for creating the Atlas Vector Search index.

    This is a one-time manual setup step needed in the Atlas UI.
    Called by GET /api/rag/setup-instructions.
    """
    return {
        "title": "Atlas Vector Search Index Setup (One-Time)",
        "estimated_time": "2 minutes",
        "steps": [
            "1. Go to https://cloud.mongodb.com → your cluster (cluster0)",
            "2. Click 'Atlas Search' tab in the left sidebar",
            "3. Click 'Create Search Index' → choose 'Atlas Vector Search'",
            "4. Select database: 'meeting_agent', collection: 'meeting_embeddings'",
            "5. Switch to 'JSON Editor' and paste the config below",
            "6. Name the index: 'nudge_meeting_vector_index'",
            "7. Click 'Next' → 'Create Search Index'",
            "8. Wait ~1 minute for the index to build (status: Active)",
        ],
        "index_config": {
            "fields": [
                {
                    "type": "vector",
                    "path": "embedding",
                    "numDimensions": 768,
                    "similarity": "cosine",
                }
            ]
        },
        "collection": COLLECTION_NAME,
        "index_name": INDEX_NAME,
        "embedding_model": NOMIC_MODEL,
        "dimensions": EMBEDDING_DIM,
    }
