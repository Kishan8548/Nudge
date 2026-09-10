"""Unit tests for LangGraph agent routing and assignment matching."""

from backend.agents.supervisor import _deterministic_route
from backend.agents.assignment import DEFAULT_ROSTER, fuzzy_match_name


def test_deterministic_route_extraction():
    route = _deterministic_route(
        current_action="process_meeting",
        action_items=[],
        transcript="John will prepare the report by Friday.",
        assignment_done=False,
        extraction_done=False,
    )
    assert route == "extraction"


def test_deterministic_route_assignment():
    route = _deterministic_route(
        current_action="process_meeting",
        action_items=[{"text": "Prepare report", "owner": "John"}],
        transcript="John will prepare the report.",
        assignment_done=False,
        extraction_done=True,
    )
    assert route == "assignment"


def test_deterministic_route_finish():
    route = _deterministic_route(
        current_action="process_meeting",
        action_items=[{"text": "Prepare report", "owner": "John", "owner_email": "john@example.com"}],
        transcript="John will prepare the report.",
        assignment_done=True,
        extraction_done=True,
    )
    assert route == "FINISH"


def test_deterministic_route_reminder():
    route = _deterministic_route(
        current_action="check_and_remind",
        action_items=[],
        transcript="",
        assignment_done=False,
        extraction_done=False,
    )
    assert route == "reminder"


def test_fuzzy_match_name_exact():
    match = fuzzy_match_name("Kishan", DEFAULT_ROSTER)
    assert match is not None
    assert match["name"] == "Kishan"


def test_fuzzy_match_name_partial():
    match = fuzzy_match_name("John", DEFAULT_ROSTER)
    assert match is not None
    assert match["name"] == "John Smith"


def test_fuzzy_match_name_none():
    match = fuzzy_match_name("Nonexistent Person X123", DEFAULT_ROSTER, threshold=0.8)
    assert match is None
