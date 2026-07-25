"""Assignment agent: matches owners to a roster and resolves deadlines.

Uses fuzzy string matching (difflib.SequenceMatcher) to map names
mentioned in the transcript to known team members. Resolves relative
date expressions ("by Friday") to ISO dates using date_parser.
"""

import logging
from difflib import SequenceMatcher

from backend.utils.date_parser import resolve_relative_date

logger = logging.getLogger(__name__)

# ----- Team Roster -----
# Hardcoded for hackathon demo. In production, load from DB or CSV upload.
DEFAULT_ROSTER: list[dict] = [
    {"name": "John Smith", "email": "john@example.com"},
    {"name": "Jane Doe", "email": "jane@example.com"},
    {"name": "Alice Johnson", "email": "alice@example.com"},
    {"name": "Bob Williams", "email": "bob@example.com"},
    {"name": "Charlie Brown", "email": "charlie@example.com"},
]


def fuzzy_match_name(
    query: str,
    roster: list[dict],
    threshold: float = 0.6,
) -> dict | None:
    """Find the best matching person in the roster using fuzzy matching.

    Checks exact match on full name, first/last name parts, and falls
    back to fuzzy ratio matching above the threshold.

    Args:
        query: Name to search for (from transcript).
        roster: List of dicts with "name" and "email" keys.
        threshold: Minimum similarity ratio (0–1) for a match.

    Returns:
        Best matching roster entry, or None if no match above threshold.
    """
    if not query:
        return None

    query_lower = query.lower().strip()
    best_match = None
    best_score = 0.0

    for person in roster:
        name_lower = person["name"].lower()

        # Exact full-name match
        if query_lower == name_lower:
            return person

        # Exact match on any name part (first name, last name)
        name_parts = name_lower.split()
        for part in name_parts:
            if query_lower == part:
                return person

        # Fuzzy ratio on full name
        score = SequenceMatcher(None, query_lower, name_lower).ratio()

        # Also check individual parts for higher partial match
        for part in name_parts:
            part_score = SequenceMatcher(None, query_lower, part).ratio()
            score = max(score, part_score)

        if score > best_score and score >= threshold:
            best_score = score
            best_match = person

    return best_match


def _is_iso_date(text: str) -> bool:
    """Check if a string looks like an ISO date (YYYY-MM-DD)."""
    if not text or len(text) != 10:
        return False
    parts = text.split("-")
    return (
        len(parts) == 3
        and len(parts[0]) == 4
        and len(parts[1]) == 2
        and len(parts[2]) == 2
        and all(p.isdigit() for p in parts)
    )


# ----- Node Function -----

def assignment_node(state: dict) -> dict:
    """LangGraph node: match owners to roster and resolve deadlines.

    Reads: action_items
    Writes: action_items, messages
    """
    action_items = state.get("action_items", [])
    if not action_items:
        return {
            "messages": [
                {"role": "assistant", "content": "[Assignment] No action items to assign."}
            ],
        }

    roster = DEFAULT_ROSTER
    updated_items: list[dict] = []
    assigned_count = 0
    deadline_count = 0

    for item in action_items:
        updated = dict(item)  # Shallow copy

        # --- Fuzzy-match owner name to roster ---
        if item.get("owner") and not item.get("owner_email"):
            match = fuzzy_match_name(item["owner"], roster)
            if match:
                updated["owner"] = match["name"]
                updated["owner_email"] = match["email"]
                assigned_count += 1
            else:
                logger.info(f"No roster match for owner: {item['owner']}")

        # --- Resolve relative deadline to ISO date ---
        if item.get("deadline") and not _is_iso_date(item["deadline"]):
            resolved = resolve_relative_date(item["deadline"])
            if resolved:
                updated["deadline"] = resolved
                deadline_count += 1
            else:
                logger.info(f"Could not resolve deadline: {item['deadline']}")

        updated_items.append(updated)

    summary = (
        f"[Assignment] {assigned_count}/{len(action_items)} owners matched to roster, "
        f"{deadline_count} deadlines resolved to ISO dates."
    )
    logger.info(summary)

    return {
        "action_items": updated_items,
        "assignment_done": True,   # Prevents supervisor from looping back here
        "messages": [{"role": "assistant", "content": summary}],
    }
