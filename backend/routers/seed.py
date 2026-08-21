"""Demo seed endpoints — inserts realistic meetings and action items.

Used to populate the live dashboard for demos without needing to record a
real meeting. Safe to call multiple times (idempotent via a seed marker).

  POST   /api/seed   — insert demo data (skips if already seeded)
  DELETE /api/seed   — wipe ALL demo data (for a clean re-seed)
"""

import logging
from datetime import datetime, timedelta

from fastapi import APIRouter, Request
from pymongo.database import Database

from backend.db.models import ACTION_ITEMS, MEETINGS

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/seed", tags=["seed"])

SEED_MARKER = "_is_demo_seed"  # flag on demo docs so we can clean them up


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _future(days: int) -> str:
    """ISO date string N days from now."""
    return (datetime.utcnow() + timedelta(days=days)).strftime("%Y-%m-%d")


def _past(days: int) -> str:
    """ISO date string N days ago."""
    return (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")


def _now(offset_days: int = 0) -> datetime:
    return datetime.utcnow() - timedelta(days=offset_days)


# ---------------------------------------------------------------------------
# Seed data definitions
# ---------------------------------------------------------------------------

SEED_MEETINGS = [
    {
        "title": "Q3 Product Roadmap Planning",
        "raw_transcript": (
            "Suren: Alright everyone, let's lock in the Q3 priorities. Kishan, can you "
            "handle the new onboarding flow by end of month? Kishan: Sure, I'll have "
            "the designs done by next Friday. Suren: Perfect. Ananya, we need the "
            "analytics dashboard shipped before the investor demo. Can you get that done "
            "by August 30th? Ananya: Yes, I'll prioritize that. Suren: Great. Also "
            "someone needs to update the API docs — let's say Rohan handles that by next "
            "Wednesday. Rohan: Got it. And I'll also set up the staging environment "
            "by end of this week."
        ),
        "summary": (
            "Q3 planning session covering onboarding redesign, analytics dashboard "
            "delivery for investor demo, API documentation update, and staging "
            "environment setup. All tasks assigned with clear owners and deadlines."
        ),
        "decisions": [
            {
                "text": "Prioritize analytics dashboard for investor demo on August 30th",
                "confidence": 0.97,
            },
            {
                "text": "Onboarding flow redesign to be completed by end of month",
                "confidence": 0.94,
            },
            {
                "text": "All documentation to be reviewed before next sprint",
                "confidence": 0.88,
            },
        ],
        "needs_human_review": False,
        "language": "en",
        "duration_seconds": 1847,
        "created_at_offset": 5,  # days ago
        "action_items": [
            {
                "text": "Complete onboarding flow redesign with new user personas and flows",
                "owner_name": "Kishan",
                "owner_email": "kishan@nudge.ai",
                "deadline": _future(8),
                "confidence": 0.95,
                "status": "pending",
                "reminder_count": 1,
            },
            {
                "text": "Ship analytics dashboard before investor demo",
                "owner_name": "Ananya",
                "owner_email": "ananya@nudge.ai",
                "deadline": _future(2),
                "confidence": 0.98,
                "status": "pending",
                "reminder_count": 2,
            },
            {
                "text": "Update and publish API documentation on developer portal",
                "owner_name": "Rohan",
                "owner_email": "rohan@nudge.ai",
                "deadline": _future(3),
                "confidence": 0.91,
                "status": "done",
                "reminder_count": 1,
            },
            {
                "text": "Set up staging environment with production parity",
                "owner_name": "Rohan",
                "owner_email": "rohan@nudge.ai",
                "deadline": _future(1),
                "confidence": 0.89,
                "status": "pending",
                "reminder_count": 0,
            },
        ],
    },
    {
        "title": "Sprint 14 Retrospective",
        "raw_transcript": (
            "Suren: Sprint 14 was solid but we had too many rollbacks. Priya, can you "
            "add more integration tests to the payment module? Like by next Monday? "
            "Priya: Agreed, I'll get that done. Suren: Also the CI pipeline is too slow "
            "— taking 18 minutes. Someone should look into parallelizing the test suite. "
            "Dev: I can take that — maybe by end of sprint? Suren: Perfect. And we "
            "agreed last time to document the deployment runbook. Has anyone started? "
            "Dev: Not yet. Suren: Let's assign that to Priya as well — two weeks should "
            "be enough. Priya: Works for me."
        ),
        "summary": (
            "Sprint 14 retrospective identified three key improvement areas: payment "
            "module test coverage, CI/CD pipeline performance (18 min → target <8 min), "
            "and missing deployment runbook documentation."
        ),
        "decisions": [
            {
                "text": "Add integration tests to payment module before next sprint",
                "confidence": 0.96,
            },
            {
                "text": "Parallelize CI test suite to reduce build time below 8 minutes",
                "confidence": 0.91,
            },
        ],
        "needs_human_review": False,
        "language": "en",
        "duration_seconds": 2340,
        "created_at_offset": 10,
        "action_items": [
            {
                "text": "Write integration tests for the payment module (checkout + refund flows)",
                "owner_name": "Priya",
                "owner_email": "priya@nudge.ai",
                "deadline": _future(4),
                "confidence": 0.96,
                "status": "pending",
                "reminder_count": 2,
            },
            {
                "text": "Parallelize CI/CD test suite — target under 8 min build time",
                "owner_name": "Dev",
                "owner_email": "dev@nudge.ai",
                "deadline": _future(6),
                "confidence": 0.87,
                "status": "pending",
                "reminder_count": 1,
            },
            {
                "text": "Write and publish the deployment runbook in Notion",
                "owner_name": "Priya",
                "owner_email": "priya@nudge.ai",
                "deadline": _future(14),
                "confidence": 0.92,
                "status": "done",
                "reminder_count": 0,
            },
        ],
    },
    {
        "title": "Investor Demo Prep — Dry Run",
        "raw_transcript": (
            "Suren: Ok this is our last dry run before the actual demo. The story needs "
            "to be tight. Kishan, the intro slide still says 'v0.1' — fix that tonight. "
            "Kishan: Done by midnight. Suren: The live demo keeps crashing on the AI "
            "extraction step. Ananya can you seed some fallback data so we have a "
            "guaranteed working path? Ananya: Yes I'll have it ready by 8am tomorrow. "
            "Suren: Perfect. I'm not sure whose responsibility it is to book the "
            "conference room — can someone figure that out? Rohan: I can do it. "
            "Suren: Also we should probably practice the Q&A section — maybe that's "
            "something we do informally."
        ),
        "summary": (
            "Final dry run before investor demo. Key issues: intro slide version number, "
            "live demo stability (fallback data needed), and logistics (room booking). "
            "One item flagged for human review due to vague ownership."
        ),
        "decisions": [
            {
                "text": "Update all presentation materials to remove beta/v0.1 labels",
                "confidence": 0.99,
            },
            {
                "text": "Seed fallback demo data to guarantee successful live demo path",
                "confidence": 0.97,
            },
        ],
        "needs_human_review": True,
        "language": "en",
        "duration_seconds": 1120,
        "created_at_offset": 1,
        "action_items": [
            {
                "text": "Fix intro slide — remove 'v0.1' label, update to final branding",
                "owner_name": "Kishan",
                "owner_email": "kishan@nudge.ai",
                "deadline": _future(0),
                "confidence": 0.99,
                "status": "done",
                "reminder_count": 0,
            },
            {
                "text": "Seed guaranteed fallback demo data for investor presentation",
                "owner_name": "Ananya",
                "owner_email": "ananya@nudge.ai",
                "deadline": _future(0),
                "confidence": 0.96,
                "status": "done",
                "reminder_count": 0,
            },
            {
                "text": "Book conference room for investor demo session",
                "owner_name": "Rohan",
                "owner_email": "rohan@nudge.ai",
                "deadline": _future(1),
                "confidence": 0.82,
                "status": "pending",
                "reminder_count": 1,
            },
            {
                "text": "Organize informal Q&A practice session with the team",
                "owner_name": None,  # vague ownership → needs review
                "owner_email": None,
                "deadline": _future(1),
                "confidence": 0.55,  # low confidence → HITL flag
                "status": "pending",
                "reminder_count": 0,
            },
        ],
    },
]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post("")
def seed_demo_data(request: Request):
    """Insert demo meetings and action items into MongoDB.

    Idempotent: skips if demo data is already present (checks for the seed
    marker). Returns a summary of what was inserted or skipped.
    """
    db: Database = request.app.state.db

    # Check if already seeded
    existing = db[MEETINGS].find_one({SEED_MARKER: True})
    if existing:
        count = db[MEETINGS].count_documents({SEED_MARKER: True})
        return {
            "status": "already_seeded",
            "message": f"Demo data already present ({count} meetings). "
            "Call DELETE /api/seed first to re-seed.",
        }

    inserted_meetings = 0
    inserted_items = 0

    for m_def in SEED_MEETINGS:
        now = _now(m_def["created_at_offset"])

        # Build the meeting document
        meeting_doc = {
            "title": m_def["title"],
            "raw_transcript": m_def["raw_transcript"],
            "summary": m_def["summary"],
            "decisions": m_def["decisions"],
            "needs_human_review": m_def["needs_human_review"],
            "language": m_def["language"],
            "duration_seconds": m_def["duration_seconds"],
            "created_at": now,
            SEED_MARKER: True,
        }

        result = db[MEETINGS].insert_one(meeting_doc)
        meeting_id = result.inserted_id
        inserted_meetings += 1

        # Build action item documents
        for ai_def in m_def["action_items"]:
            log_events = [
                {
                    "ts": now.isoformat(),
                    "event": "created",
                    "detail": (
                        f"Extracted from meeting with confidence "
                        f"{ai_def['confidence']:.2f}"
                    ),
                }
            ]

            if ai_def["reminder_count"] > 0:
                for i in range(1, ai_def["reminder_count"] + 1):
                    log_events.append(
                        {
                            "ts": (_now(ai_def["reminder_count"] - i + 1)).isoformat(),
                            "event": "reminder_sent",
                            "detail": f"Automated reminder #{i} sent via email",
                        }
                    )

            if ai_def["status"] == "done":
                log_events.append(
                    {
                        "ts": _now(0).isoformat(),
                        "event": "completed",
                        "detail": "Marked complete by assignee",
                    }
                )

            if ai_def["confidence"] < 0.7:
                log_events.append(
                    {
                        "ts": now.isoformat(),
                        "event": "flagged_for_review",
                        "detail": (
                            f"Low confidence score ({ai_def['confidence']:.2f}) — "
                            "requires human review"
                        ),
                    }
                )

            item_doc = {
                "meeting_id": meeting_id,
                "text": ai_def["text"],
                "owner_name": ai_def.get("owner_name"),
                "owner_email": ai_def.get("owner_email"),
                "deadline": ai_def["deadline"],
                "confidence": ai_def["confidence"],
                "status": ai_def["status"],
                "reminder_count": ai_def["reminder_count"],
                "last_reminded_at": (
                    _now(1).isoformat() if ai_def["reminder_count"] > 0 else None
                ),
                "created_at": now,
                "activity_log": log_events,
                SEED_MARKER: True,
            }
            db[ACTION_ITEMS].insert_one(item_doc)
            inserted_items += 1

    logger.info(
        f"Seeded {inserted_meetings} demo meetings and {inserted_items} action items"
    )
    return {
        "status": "seeded",
        "meetings_inserted": inserted_meetings,
        "action_items_inserted": inserted_items,
        "message": (
            "Demo data inserted. Visit /api/meetings to see the results. "
            "Call DELETE /api/seed to remove demo data."
        ),
    }


@router.delete("")
def clear_demo_data(request: Request):
    """Remove all demo seed data from MongoDB.

    Only deletes documents that have the seed marker flag — does not touch
    real meeting data recorded by users.
    """
    db: Database = request.app.state.db

    meetings_result = db[MEETINGS].delete_many({SEED_MARKER: True})
    items_result = db[ACTION_ITEMS].delete_many({SEED_MARKER: True})

    logger.info(
        f"Cleared {meetings_result.deleted_count} demo meetings and "
        f"{items_result.deleted_count} demo action items"
    )

    return {
        "status": "cleared",
        "meetings_deleted": meetings_result.deleted_count,
        "action_items_deleted": items_result.deleted_count,
    }
