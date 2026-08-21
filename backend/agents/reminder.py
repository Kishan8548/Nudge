"""Reminder agent: checks deadlines and sends escalating reminders.

Checks each action item against its deadline, composes and sends
reminder emails with escalating urgency, and flips items to
"escalated" status after 3 missed reminders.
"""

import logging
from datetime import datetime

from backend.services.email_service import send_escalation, send_reminder
from backend.services.slack_service import (
    send_escalation_slack,
    send_reminder_slack,
)

logger = logging.getLogger(__name__)

# After this many reminders, escalate to manager
MAX_REMINDERS_BEFORE_ESCALATION = 3


def reminder_node(state: dict) -> dict:
    """LangGraph node: check action items and send reminders if due.

    Reads: action_items
    Writes: action_items, messages
    """
    action_items = state.get("action_items", [])
    if not action_items:
        return {
            "messages": [
                {"role": "assistant", "content": "[Reminder] No action items to check."}
            ],
        }

    now = datetime.utcnow()
    updated_items: list[dict] = []
    actions_taken: list[str] = []

    for item in action_items:
        updated = dict(item)

        # Skip items that are already resolved or have no email
        if item.get("status") in ("done", "escalated"):
            updated_items.append(updated)
            continue

        if not item.get("owner_email"):
            updated_items.append(updated)
            continue

        # --- Check deadline proximity ---
        deadline_str = item.get("deadline")
        is_due = False
        is_overdue = False

        if deadline_str:
            try:
                deadline_dt = datetime.fromisoformat(deadline_str)
                hours_until = (deadline_dt - now).total_seconds() / 3600
                is_overdue = hours_until < 0
                is_due = hours_until < 24
            except (ValueError, TypeError):
                # If we can't parse the deadline, remind anyway
                is_due = True
        else:
            # No deadline set — still send if this is a "check_and_remind" invocation
            is_due = True

        if not (is_due or is_overdue):
            updated_items.append(updated)
            continue

        # --- Send reminder / escalate ---
        reminder_count = item.get("reminder_count", 0) + 1
        updated["reminder_count"] = reminder_count
        updated["last_reminded_at"] = now.isoformat()

        owner_name = item.get("owner", "Team Member")
        item_text = item.get("text", "Unknown task")
        deadline_display = deadline_str or "Not specified"

        if reminder_count >= MAX_REMINDERS_BEFORE_ESCALATION:
            # Escalate to manager
            updated["status"] = "escalated"
            sent = send_escalation(
                to_email=item["owner_email"],
                manager_email="manager@example.com",  # In production: from roster
                owner_name=owner_name,
                action_item_text=item_text,
                deadline=deadline_display,
            )
            # Also notify Slack
            send_escalation_slack(
                owner_name=owner_name,
                item_text=item_text,
                deadline=deadline_display,
                reminder_count=reminder_count,
            )
            status_tag = "🔴 ESCALATED" if sent else "🔴 ESCALATED (email failed/simulated)"
            actions_taken.append(
                f"{status_tag}: '{item_text}' (owner: {owner_name}, "
                f"after {reminder_count} reminders)"
            )
        else:
            # Send escalating reminder
            sent = send_reminder(
                to_email=item["owner_email"],
                owner_name=owner_name,
                action_item_text=item_text,
                deadline=deadline_display,
                reminder_count=reminder_count,
            )
            # Also notify Slack
            send_reminder_slack(
                owner_name=owner_name,
                item_text=item_text,
                deadline=deadline_display,
                reminder_count=reminder_count,
            )
            tone = {1: "gentle", 2: "firm"}.get(reminder_count, "urgent")
            status_tag = f"📧 Sent {tone} reminder #{reminder_count}" if sent else f"📧 Queued {tone} reminder #{reminder_count} (email skipped/simulated)"
            actions_taken.append(
                f"{status_tag}: '{item_text}' (owner: {owner_name})"
            )

        updated_items.append(updated)

    # Build summary
    if actions_taken:
        summary = "[Reminder] Actions taken:\n" + "\n".join(
            f"  - {a}" for a in actions_taken
        )
    else:
        summary = "[Reminder] No items are currently due for reminders."

    logger.info(summary)

    return {
        "action_items": updated_items,
        "messages": [{"role": "assistant", "content": summary}],
    }
