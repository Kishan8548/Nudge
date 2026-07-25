"""MongoDB connection management using PyMongo (sync).

Uses a singleton pattern — one MongoClient instance shared across
the entire application. Motor is deprecated (EOL May 2026); we use
PyMongo's native sync client which is thread-safe and works well
with FastAPI's threadpool for sync endpoints.
"""

import logging

from pymongo import MongoClient
from pymongo.database import Database

from backend.config import settings

logger = logging.getLogger(__name__)

_client: MongoClient | None = None


def get_client() -> MongoClient:
    """Get or create the MongoDB client singleton.

    On first call, creates the client and verifies connectivity
    with a ping command. Subsequent calls return the same instance.

    Raises:
        pymongo.errors.ConnectionFailure: If MongoDB is unreachable.
    """
    global _client
    if _client is None:
        _client = MongoClient(
            settings.MONGODB_URI.get_secret_value(),
            serverSelectionTimeoutMS=5000,
        )
        # Verify connection on first use
        _client.admin.command("ping")
        logger.info("Connected to MongoDB Atlas")
    return _client


def get_db() -> Database:
    """Get the application database instance."""
    return get_client()[settings.MONGODB_DB_NAME]


def close_client() -> None:
    """Close the MongoDB client connection gracefully."""
    global _client
    if _client is not None:
        _client.close()
        _client = None
        logger.info("MongoDB connection closed")
