"""WhatsApp notification and instant nudge service.

Generates 1-tap WhatsApp deep-links for action item reminders and supports
automated WhatsApp message dispatch via Twilio / Meta Cloud API when configured.
"""

import logging
import urllib.parse

from backend.config import settings

logger = logging.getLogger(__name__)


def generate_whatsapp_nudge_link(
    phone_number: str = "",
    owner_name: str = "Team Member",
    task_text: str = "",
    deadline: str = "",
    complete_url: str = "",
) -> str:
    """Generate a WhatsApp click-to-nudge URL.

    When tapped, opens WhatsApp with a pre-filled reminder message and
    a 1-click completion link.

    Args:
        phone_number: Optional phone number with country code (e.g. "919876543210").
        owner_name: Name of the task owner.
        task_text: Description of the action item.
        deadline: Deadline string (e.g. "Today at 5:00 PM").
        complete_url: 1-click completion URL.

    Returns:
        Encoded WhatsApp deep-link string (https://wa.me/...).
    """
    clean_phone = "".join(c for c in phone_number if c.isdigit())
    
    msg_lines = [
        f"👋 Hi {owner_name},",
        "",
        "🤖 *Nudge AI Reminder*:",
        f"📋 *Task:* {task_text}",
    ]
    if deadline:
        msg_lines.append(f"⏰ *Deadline:* {deadline}")
    
    if complete_url:
        msg_lines.extend([
            "",
            "👉 *Tap here to mark complete with 1-click:*",
            complete_url,
        ])

    message_text = "\n".join(msg_lines)
    encoded_text = urllib.parse.quote(message_text)

    if clean_phone:
        return f"https://wa.me/{clean_phone}?text={encoded_text}"
    return f"https://wa.me/?text={encoded_text}"
