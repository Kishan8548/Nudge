"""Unit tests for iCalendar (.ics) generation service."""

from backend.services.calendar_service import (
    generate_action_item_ics,
    generate_meeting_action_items_ics,
)


def test_generate_action_item_ics():
    ics = generate_action_item_ics(
        item_id="65f1a2b3c4d5e6f7a8b9c0d1",
        task_text="Complete backend API tests",
        deadline_str="2026-08-15T17:00:00",
        owner_name="Kishan",
        meeting_title="Sprint Planning",
    )

    assert "BEGIN:VCALENDAR" in ics
    assert "END:VCALENDAR" in ics
    assert "BEGIN:VEVENT" in ics
    assert "SUMMARY:📋 [Task] Complete backend API tests" in ics
    assert "BEGIN:VALARM" in ics
    assert "TRIGGER:-PT2H" in ics
    assert "quick-complete" in ics


def test_generate_meeting_action_items_ics():
    items = [
        {
            "id": "1",
            "text": "Task One",
            "deadline": "2026-08-10",
            "owner_name": "Alice",
        },
        {
            "id": "2",
            "text": "Task Two",
            "deadline": "2026-08-12",
            "owner_name": "Bob",
        },
    ]

    ics = generate_meeting_action_items_ics(
        meeting_id="meeting123",
        meeting_title="Product Review",
        action_items=items,
    )

    assert "BEGIN:VCALENDAR" in ics
    assert "END:VCALENDAR" in ics
    assert ics.count("BEGIN:VEVENT") == 2
    assert "Task One" in ics
    assert "Task Two" in ics
