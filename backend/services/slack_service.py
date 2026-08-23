"""Slack notification service using Incoming Webhooks.

Sends rich Block Kit messages to Slack. No OAuth, no bot tokens —
just posts JSON to the webhook URL configured in .env.

Setup:
  1. https://api.slack.com/apps → Create New App → From Scratch
  2. Enable Incoming Webhooks → Add Webhook to Workspace → pick channel
  3. Copy webhook URL → SLACK_WEBHOOK_URL in .env
  4. Set SLACK_ENABLED=true in .env

Message types:
  - Reminder: colour-coded by urgency (yellow/orange/red)
  - Escalation: red alert with manager mention
  - Meeting processed: green success notification
"""

import logging

import httpx

from backend.config import settings

logger = logging.getLogger(__name__)


def is_slack_configured() -> bool:
    """Return True if Slack webhook is configured and enabled."""
    return bool(settings.SLACK_ENABLED and settings.SLACK_WEBHOOK_URL)


def _post_to_slack(payload: dict) -> bool:
    """Send a JSON payload to the configured Slack webhook.

    Args:
        payload: Slack Block Kit message dict.

    Returns:
        True on success, False on failure (logged, never raised).
    """
    if not is_slack_configured():
        logger.debug("Slack not configured — skipping notification")
        return False

    try:
        response = httpx.post(
            settings.SLACK_WEBHOOK_URL,
            json=payload,
            timeout=10.0,
        )
        if response.status_code == 200:
            logger.info("Slack notification sent successfully")
            return True
        else:
            logger.warning(
                f"Slack webhook returned {response.status_code}: {response.text}"
            )
            return False
    except httpx.TimeoutException:
        logger.error("Slack webhook timed out")
        return False
    except Exception as e:
        logger.error(f"Slack notification failed: {e}")
        return False


def send_reminder_slack(
    owner_name: str,
    item_text: str,
    deadline: str,
    reminder_count: int,
    item_id: str = "",
    meeting_title: str = "your meeting",
) -> bool:
    """Send a reminder Slack message with escalating colour + urgency.

    Colour scheme:
      Count 1 → #f59e0b (yellow-amber, gentle)
      Count 2 → #f97316 (orange, firm)
      Count 3+ → #ef4444 (red, urgent)

    Args:
        owner_name: Name of the action item owner.
        item_text: Description of the task.
        deadline: Deadline string (ISO date or display text).
        reminder_count: How many reminders have been sent (including this one).
        item_id: Optional MongoDB _id for dashboard deep-link.
        meeting_title: Meeting name for context.

    Returns:
        True if sent successfully.
    """
    if reminder_count <= 1:
        colour = "#f59e0b"
        urgency_label = "Friendly Reminder"
        urgency_emoji = "📋"
    elif reminder_count == 2:
        colour = "#f97316"
        urgency_label = "Follow-up Required"
        urgency_emoji = "⚠️"
    else:
        colour = "#ef4444"
        urgency_label = "URGENT — Overdue"
        urgency_emoji = "🔴"

    base_url = settings.BASE_API_URL.rstrip("/")
    quick_complete_url = f"{base_url}/api/action-items/{item_id}/quick-complete" if item_id else f"{base_url}/dashboard"

    action_elements = [
        {
            "type": "button",
            "text": {
                "type": "plain_text",
                "text": "✅ Mark Complete (1-Click)",
                "emoji": True,
            },
            "url": quick_complete_url,
            "style": "primary",
        }
    ]

    payload = {
        "attachments": [
            {
                "color": colour,
                "blocks": [
                    {
                        "type": "header",
                        "text": {
                            "type": "plain_text",
                            "text": f"{urgency_emoji} {urgency_label}",
                            "emoji": True,
                        },
                    },
                    {
                        "type": "section",
                        "fields": [
                            {
                                "type": "mrkdwn",
                                "text": f"*Task:*\n{item_text}",
                            },
                            {
                                "type": "mrkdwn",
                                "text": f"*Assigned to:*\n{owner_name}",
                            },
                            {
                                "type": "mrkdwn",
                                "text": f"*Deadline:*\n{deadline}",
                            },
                            {
                                "type": "mrkdwn",
                                "text": f"*Meeting:*\n{meeting_title}",
                            },
                        ],
                    },
                    {
                        "type": "actions",
                        "elements": action_elements,
                    },
                    {
                        "type": "context",
                        "elements": [
                            {
                                "type": "mrkdwn",
                                "text": (
                                    f"Nudge AI • Reminder #{reminder_count} • "
                                    f"Action item from {meeting_title}"
                                ),
                            }
                        ],
                    },
                ],
            }
        ]
    }

    logger.info(
        f"Sending Slack reminder #{reminder_count} for '{item_text}' to channel"
    )
    return _post_to_slack(payload)


def send_escalation_slack(
    owner_name: str,
    item_text: str,
    deadline: str,
    reminder_count: int,
    meeting_title: str = "a meeting",
) -> bool:
    """Send a red escalation alert to Slack after repeated missed reminders.

    Args:
        owner_name: Name of the action item owner.
        item_text: Description of the overdue task.
        deadline: Original deadline string.
        reminder_count: Total reminders sent before escalation.
        meeting_title: Source meeting name.

    Returns:
        True if sent successfully.
    """
    payload = {
        "attachments": [
            {
                "color": "#dc2626",
                "blocks": [
                    {
                        "type": "header",
                        "text": {
                            "type": "plain_text",
                            "text": "🚨 ESCALATION ALERT — Unresolved Action Item",
                            "emoji": True,
                        },
                    },
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": (
                                f"*{owner_name}* has not completed the following action item "
                                f"after *{reminder_count} reminders*. Manager attention required."
                            ),
                        },
                    },
                    {
                        "type": "section",
                        "fields": [
                            {
                                "type": "mrkdwn",
                                "text": f"*Task:*\n{item_text}",
                            },
                            {
                                "type": "mrkdwn",
                                "text": f"*Original Deadline:*\n{deadline} *(OVERDUE)*",
                            },
                        ],
                    },
                    {
                        "type": "context",
                        "elements": [
                            {
                                "type": "mrkdwn",
                                "text": f"Nudge AI Escalation • From: {meeting_title}",
                            }
                        ],
                    },
                ],
            }
        ]
    }

    logger.info(f"Sending Slack escalation alert for '{item_text}'")
    return _post_to_slack(payload)


def send_meeting_processed_slack(
    meeting_title: str,
    decisions_count: int,
    items_count: int,
    needs_review: bool = False,
) -> bool:
    """Send a green success notification when a meeting is processed.

    Args:
        meeting_title: Title of the processed meeting.
        decisions_count: Number of decisions extracted.
        items_count: Number of action items extracted.
        needs_review: Whether any items need human review.

    Returns:
        True if sent successfully.
    """
    review_note = (
        " ⚠️ *Some items need human review.*" if needs_review else ""
    )

    payload = {
        "attachments": [
            {
                "color": "#10b981",
                "blocks": [
                    {
                        "type": "header",
                        "text": {
                            "type": "plain_text",
                            "text": "✅ Meeting Processed by Nudge AI",
                            "emoji": True,
                        },
                    },
                    {
                        "type": "section",
                        "fields": [
                            {
                                "type": "mrkdwn",
                                "text": f"*Meeting:*\n{meeting_title}",
                            },
                            {
                                "type": "mrkdwn",
                                "text": f"*Decisions Extracted:*\n{decisions_count}",
                            },
                            {
                                "type": "mrkdwn",
                                "text": f"*Action Items Created:*\n{items_count}",
                            },
                        ],
                    },
                    {
                        "type": "context",
                        "elements": [
                            {
                                "type": "mrkdwn",
                                "text": f"Nudge AI{review_note}",
                            }
                        ],
                    },
                ],
            }
        ]
    }

    logger.info(
        f"Sending Slack meeting-processed notification for '{meeting_title}'"
    )
    return _post_to_slack(payload)
