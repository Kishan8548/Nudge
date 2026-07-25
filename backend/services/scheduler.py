"""APScheduler-based reminder loop.

Uses BackgroundScheduler (APScheduler 3.x stable) to periodically
check for due action items and invoke the LangGraph reminder agent.
Runs in a background thread — does not block the FastAPI event loop.

Design choices:
  - BackgroundScheduler (not AsyncIOScheduler) for simplicity with sync pymongo
  - max_instances=1 prevents overlapping runs if a tick takes longer than the interval
  - 30-minute default interval stays well inside Groq's 1K RPD free tier
"""

import logging
from datetime import datetime, timedelta

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from pymongo.database import Database

from backend.db.models import ACTION_ITEMS

logger = logging.getLogger(__name__)

_scheduler: BackgroundScheduler | None = None


def start_scheduler(
    graph, db: Database, interval_minutes: int = 30
) -> BackgroundScheduler:
    """Start the background reminder scheduler.

    Args:
        graph: Compiled LangGraph graph.
        db: MongoDB database instance.
        interval_minutes: Check interval in minutes.

    Returns:
        The running BackgroundScheduler instance.
    """
    global _scheduler

    if _scheduler is not None and _scheduler.running:
        logger.warning("Scheduler is already running")
        return _scheduler

    _scheduler = BackgroundScheduler()
    _scheduler.add_job(
        _reminder_tick,
        trigger=IntervalTrigger(minutes=interval_minutes),
        args=[graph, db],
        id="reminder_loop",
        name="Check and send reminders",
        replace_existing=True,
        max_instances=1,
    )
    _scheduler.start()
    logger.info(f"Reminder scheduler started (every {interval_minutes} min)")
    return _scheduler


def stop_scheduler() -> None:
    """Gracefully shut down the scheduler."""
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
        logger.info("Reminder scheduler stopped")


def _reminder_tick(graph, db: Database) -> None:
    """Scheduled job: check for due action items and invoke the reminder agent.

    Queries MongoDB for pending/in_progress items with deadlines within
    24 hours, then invokes the LangGraph graph in "check_and_remind" mode
    for each item. Updates MongoDB with the resulting state.
    """
    now = datetime.utcnow()
    logger.info(f"Reminder tick at {now.isoformat()}")

    try:
        # Find items that might be due (have a deadline set and are active)
        query = {
            "status": {"$in": ["pending", "in_progress"]},
            "owner_email": {"$ne": None},
            "deadline": {"$ne": None},
        }

        candidates = list(db[ACTION_ITEMS].find(query))
        if not candidates:
            logger.info("No active items with deadlines found")
            return

        logger.info(f"Checking {len(candidates)} candidate items")

        for item in candidates:
            item_id = str(item["_id"])

            # Check if actually due (within 24 hours or overdue)
            deadline_str = item.get("deadline")
            if deadline_str:
                try:
                    deadline_dt = datetime.fromisoformat(deadline_str)
                    hours_until = (deadline_dt - now).total_seconds() / 3600
                    if hours_until > 24:
                        continue  # Not due yet — skip
                except (ValueError, TypeError):
                    pass  # Can't parse — process it anyway

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

                # Persist updated state back to MongoDB
                if result and result.get("action_items"):
                    updated = result["action_items"][0]
                    db[ACTION_ITEMS].update_one(
                        {"_id": item["_id"]},
                        {
                            "$set": {
                                "status": updated.get("status", item["status"]),
                                "reminder_count": updated.get("reminder_count", 0),
                                "last_reminded_at": updated.get("last_reminded_at"),
                            },
                            "$push": {
                                "activity_log": {
                                    "ts": now.isoformat(),
                                    "event": "reminder_sent",
                                    "detail": (
                                        f"Reminder #{updated.get('reminder_count', 0)} "
                                        f"(status: {updated.get('status', 'pending')})"
                                    ),
                                }
                            },
                        },
                    )

                logger.info(f"Processed reminder for item {item_id}")

            except Exception as e:
                logger.error(f"Failed to process item {item_id}: {e}")

    except Exception as e:
        logger.error(f"Reminder tick failed: {e}")


def trigger_reminder_now(graph, db: Database) -> dict:
    """Manually trigger a reminder check. Useful for live demos.

    Returns:
        dict with a status message.
    """
    _reminder_tick(graph, db)
    return {"message": "Reminder check triggered successfully", "timestamp": datetime.utcnow().isoformat()}
