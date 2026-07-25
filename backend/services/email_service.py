"""Gmail SMTP email service for sending reminders.

Uses Gmail's SMTP server with App Password authentication (Option A).
This is the fastest approach for a hackathon — no OAuth consent screen needed.

Setup:
  1. Enable 2FA on your Gmail account
  2. Go to https://myaccount.google.com/apppasswords
  3. Generate an App Password → put in .env as GMAIL_APP_PASSWORD
"""

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from backend.config import settings

logger = logging.getLogger(__name__)

SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587


def send_email(
    to_email: str,
    subject: str,
    body: str,
    cc_emails: list[str] | None = None,
) -> bool:
    """Send an email via Gmail SMTP.

    Args:
        to_email: Recipient email address.
        subject: Email subject line.
        body: Email body (plain text — auto-converted to HTML too).
        cc_emails: Optional CC recipients.

    Returns:
        True if sent successfully, False on failure (logged, not raised).
    """
    if not settings.GMAIL_SENDER_EMAIL or not settings.GMAIL_APP_PASSWORD.get_secret_value():
        logger.warning("Gmail credentials not configured — skipping email send")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = settings.GMAIL_SENDER_EMAIL
        msg["To"] = to_email
        msg["Subject"] = subject

        if cc_emails:
            msg["Cc"] = ", ".join(cc_emails)

        # Plain text
        msg.attach(MIMEText(body, "plain"))

        # HTML version (simple conversion)
        html_body = body.replace("\n", "<br>")
        html = (
            '<html><body style="font-family: Arial, sans-serif; '
            f'line-height: 1.6; color: #333;">{html_body}</body></html>'
        )
        msg.attach(MIMEText(html, "html"))

        # Send
        all_recipients = [to_email]
        if cc_emails:
            all_recipients.extend(cc_emails)

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(
                settings.GMAIL_SENDER_EMAIL,
                settings.GMAIL_APP_PASSWORD.get_secret_value(),
            )
            server.sendmail(
                settings.GMAIL_SENDER_EMAIL,
                all_recipients,
                msg.as_string(),
            )

        logger.info(f"Email sent to {to_email}: {subject}")
        return True

    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False


def send_reminder(
    to_email: str,
    owner_name: str,
    action_item_text: str,
    deadline: str,
    reminder_count: int,
    meeting_title: str = "your meeting",
) -> bool:
    """Send a reminder email with escalating tone.

    Tone escalation:
      - Count 1: Gentle / friendly
      - Count 2: Firm / follow-up
      - Count 3+: Urgent / overdue

    Returns:
        True if sent successfully.
    """
    if reminder_count <= 1:
        subject = f"Friendly Reminder: Action item from {meeting_title}"
        body = (
            f"Hi {owner_name},\n\n"
            f"Just a friendly reminder about your action item "
            f"from {meeting_title}:\n\n"
            f"📋 {action_item_text}\n"
            f"📅 Deadline: {deadline}\n\n"
            f"Please let us know if you need any help or have questions.\n\n"
            f"Best regards,\nNudge AI Assistant"
        )
    elif reminder_count == 2:
        subject = f"Follow-up: Action item due — {meeting_title}"
        body = (
            f"Hi {owner_name},\n\n"
            f"This is a follow-up regarding your pending action item "
            f"from {meeting_title}:\n\n"
            f"📋 {action_item_text}\n"
            f"📅 Deadline: {deadline}\n\n"
            f"This item is approaching its deadline. Please prioritize "
            f"completing it or update the team on your progress.\n\n"
            f"Thank you,\nNudge AI Assistant"
        )
    else:
        subject = f"⚠️ URGENT: Overdue action item — {meeting_title}"
        body = (
            f"Hi {owner_name},\n\n"
            f"This is an urgent reminder. The following action item "
            f"is overdue:\n\n"
            f"📋 {action_item_text}\n"
            f"📅 Deadline: {deadline} (OVERDUE)\n\n"
            f"This item has been flagged for escalation. Please complete "
            f"it immediately or reach out to your manager to discuss "
            f"any blockers.\n\n"
            f"Regards,\nNudge AI Assistant"
        )

    logger.info(f"Sending reminder #{reminder_count} to {owner_name} <{to_email}>")
    return send_email(to_email, subject, body)


def send_escalation(
    to_email: str,
    manager_email: str,
    owner_name: str,
    action_item_text: str,
    deadline: str,
    meeting_title: str = "a meeting",
) -> bool:
    """Send an escalation email (CC to manager) after repeated missed reminders.

    Returns:
        True if sent successfully.
    """
    subject = f"🔴 Escalation: Unresolved action item from {meeting_title}"
    body = (
        f"Hi {owner_name},\n\n"
        f"The following action item from {meeting_title} has been escalated "
        f"after multiple missed reminders:\n\n"
        f"📋 {action_item_text}\n"
        f"📅 Original Deadline: {deadline}\n\n"
        f"Your manager has been CC'd on this email. Please address this "
        f"as soon as possible.\n\n"
        f"Regards,\nNudge AI Assistant"
    )
    return send_email(to_email, subject, body, cc_emails=[manager_email])
