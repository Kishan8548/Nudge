"""iCalendar (.ics) generation service for meeting action items.

Generates RFC 5545 compliant .ics files so users can import their action
items and deadlines directly into Google Calendar, Apple Calendar, or Outlook
with built-in reminders and 1-click completion deep links.
"""

from datetime import datetime, timedelta
import re
from backend.config import settings


def _format_ics_datetime(dt: datetime) -> str:
    """Format a datetime object to ICS format: YYYYMMDDTHHMMSSZ."""
    return dt.strftime("%Y%m%dT%H%M%SZ")


def _parse_deadline_to_datetime(deadline_str: str | None) -> datetime:
    """Parse an ISO date or datetime string to a datetime object.

    Defaults to tomorrow at 17:00 UTC if parsing fails or deadline is missing.
    """
    if not deadline_str:
        return datetime.utcnow() + timedelta(days=1, hours=8)

    clean_str = deadline_str.strip()
    try:
        # Full ISO format
        return datetime.fromisoformat(clean_str.replace("Z", "+00:00")).replace(tzinfo=None)
    except Exception:
        pass

    try:
        # Date only: YYYY-MM-DD
        if len(clean_str) >= 10 and re.match(r"^\d{4}-\d{2}-\d{2}", clean_str):
            date_part = clean_str[:10]
            dt = datetime.strptime(date_part, "%Y-%m-%d")
            # Default to 5 PM (17:00) on that date
            return dt.replace(hour=17, minute=0, second=0)
    except Exception:
        pass

    return datetime.utcnow() + timedelta(days=1)


def generate_action_item_ics(
    item_id: str,
    task_text: str,
    deadline_str: str | None,
    owner_name: str | None = None,
    meeting_title: str = "Nudge AI Meeting",
) -> str:
    """Generate an iCalendar (.ics) string for a single action item.

    Includes a reminder alarm (2 hours prior) and 1-click completion link.
    """
    due_dt = _parse_deadline_to_datetime(deadline_str)
    start_dt = due_dt - timedelta(hours=1)
    now_dt = datetime.utcnow()

    base_url = settings.BASE_API_URL.rstrip("/")
    complete_url = f"{base_url}/api/action-items/{item_id}/quick-complete" if item_id else base_url

    uid = f"nudge-ai-{item_id or 'task'}@nudge.ai"
    summary = f"📋 [Task] {task_text[:80]}"
    description = (
        f"Task: {task_text}\\n"
        f"Assigned To: {owner_name or 'Unassigned'}\\n"
        f"Meeting: {meeting_title}\\n\\n"
        f"✅ Mark Completed in 1-Click: {complete_url}"
    )

    ics_content = f"""BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Nudge AI//Meeting Follow-Up Agent//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:{uid}
DTSTAMP:{_format_ics_datetime(now_dt)}
DTSTART:{_format_ics_datetime(start_dt)}
DTEND:{_format_ics_datetime(due_dt)}
SUMMARY:{summary}
DESCRIPTION:{description}
STATUS:CONFIRMED
BEGIN:VALARM
ACTION:DISPLAY
DESCRIPTION:Reminder: {summary} is due soon!
TRIGGER:-PT2H
END:VALARM
END:VEVENT
END:VCALENDAR
""".replace("\n", "\r\n")

    return ics_content


def generate_meeting_action_items_ics(
    meeting_id: str,
    meeting_title: str,
    action_items: list[dict],
) -> str:
    """Generate an iCalendar (.ics) string containing all action items for a meeting."""
    now_dt = datetime.utcnow()
    base_url = settings.BASE_API_URL.rstrip("/")

    events = []
    for item in action_items:
        item_id = str(item.get("id") or item.get("_id") or "")
        task_text = item.get("text", "Action Item")
        deadline_str = item.get("deadline")
        owner_name = item.get("owner_name") or item.get("owner") or "Team Member"

        due_dt = _parse_deadline_to_datetime(deadline_str)
        start_dt = due_dt - timedelta(hours=1)
        complete_url = f"{base_url}/api/action-items/{item_id}/quick-complete" if item_id else base_url

        uid = f"nudge-ai-item-{item_id or len(events)}@nudge.ai"
        summary = f"📋 [{meeting_title[:25]}] {task_text[:60]}"
        description = (
            f"Task: {task_text}\\n"
            f"Owner: {owner_name}\\n"
            f"Meeting: {meeting_title}\\n\\n"
            f"✅ Mark Complete: {complete_url}"
        )

        event = f"""BEGIN:VEVENT
UID:{uid}
DTSTAMP:{_format_ics_datetime(now_dt)}
DTSTART:{_format_ics_datetime(start_dt)}
DTEND:{_format_ics_datetime(due_dt)}
SUMMARY:{summary}
DESCRIPTION:{description}
STATUS:CONFIRMED
BEGIN:VALARM
ACTION:DISPLAY
DESCRIPTION:Upcoming Deadline: {task_text[:60]}
TRIGGER:-PT2H
END:VALARM
END:VEVENT"""
        events.append(event)

    events_str = "\r\n".join(events)

    ics_content = f"""BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Nudge AI//Meeting Follow-Up Agent//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
{events_str}
END:VCALENDAR
""".replace("\n", "\r\n")

    return ics_content
