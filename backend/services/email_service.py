import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from backend.config import settings
from backend.services.whatsapp_service import generate_whatsapp_nudge_link

logger = logging.getLogger(__name__)

SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587


def send_email(
    to_email: str,
    subject: str,
    body: str,
    html_content: str | None = None,
    cc_emails: list[str] | None = None,
) -> bool:
    """Send an email via Gmail SMTP.

    Args:
        to_email: Recipient email address.
        subject: Email subject line.
        body: Plain text fallback.
        html_content: Optional styled HTML body.
        cc_emails: Optional CC recipients.

    Returns:
        True if sent successfully, False on failure.
    """
    if not settings.GMAIL_SENDER_EMAIL or not settings.GMAIL_APP_PASSWORD.get_secret_value():
        logger.warning("Gmail credentials not configured — skipping email send")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = f"Nudge AI <{settings.GMAIL_SENDER_EMAIL}>"
        msg["To"] = to_email
        msg["Subject"] = subject

        if cc_emails:
            msg["Cc"] = ", ".join(cc_emails)

        # Plain text fallback
        msg.attach(MIMEText(body, "plain"))

        # HTML version
        if not html_content:
            html_body = body.replace("\n", "<br>")
            html_content = (
                '<html><body style="font-family: Arial, sans-serif; '
                f'line-height: 1.6; color: #333;">{html_body}</body></html>'
            )
        msg.attach(MIMEText(html_content, "html"))

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


def _build_html_email(
    owner_name: str,
    item_text: str,
    deadline: str,
    meeting_title: str,
    action_item_id: str,
    urgency_badge: str = "Upcoming Deadline",
    urgency_color: str = "#0D9488",
) -> str:
    """Build a modern, responsive HTML email template with 1-click completion."""
    base_url = settings.BASE_API_URL.rstrip("/")
    complete_url = f"{base_url}/api/action-items/{action_item_id}/quick-complete" if action_item_id else f"{base_url}/dashboard"
    wa_url = generate_whatsapp_nudge_link(
        owner_name=owner_name,
        task_text=item_text,
        deadline=deadline,
        complete_url=complete_url,
    )

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Nudge AI Reminder</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #0A0A0F; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #F8FAFC;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #0A0A0F; padding: 24px 12px;">
        <tr>
          <td align="center">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #121218; border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
              
              <!-- Header -->
              <tr>
                <td style="padding: 28px 28px 16px 28px; border-bottom: 1px solid rgba(255,255,255,0.06);">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td>
                        <span style="display: inline-block; background-color: rgba(13,148,136,0.15); color: #14B8A6; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; padding: 4px 10px; border-radius: 999px;">NUDGE AI</span>
                      </td>
                      <td align="right">
                        <span style="display: inline-block; background-color: {urgency_color}22; color: {urgency_color}; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 999px;">{urgency_badge}</span>
                      </td>
                    </tr>
                  </table>
                  <h2 style="color: #FFFFFF; font-size: 20px; font-weight: 700; margin: 16px 0 4px 0;">Action Item Reminder</h2>
                  <p style="color: #94A3B8; font-size: 13px; margin: 0;">Meeting: <strong>{meeting_title}</strong></p>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding: 24px 28px;">
                  <p style="color: #F8FAFC; font-size: 15px; margin: 0 0 16px 0;">Hi <strong>{owner_name}</strong>,</p>
                  
                  <div style="background-color: #1A1A22; border-left: 4px solid {urgency_color}; border-radius: 10px; padding: 16px 18px; margin-bottom: 24px;">
                    <p style="color: #F8FAFC; font-size: 15px; font-weight: 600; line-height: 1.4; margin: 0 0 8px 0;">{item_text}</p>
                    <p style="color: #94A3B8; font-size: 12px; margin: 0;">⏰ <strong>Due:</strong> <span style="color: #F8FAFC;">{deadline}</span></p>
                  </div>

                  <!-- 1-Click Complete Button -->
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 16px;">
                    <tr>
                      <td align="center">
                        <a href="{complete_url}" target="_blank" style="display: block; width: 100%; box-sizing: border-box; background-color: #0D9488; color: #FFFFFF; text-align: center; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 20px; border-radius: 12px; box-shadow: 0 4px 14px rgba(13,148,136,0.4);">
                          ✅ Mark Task as Completed
                        </a>
                      </td>
                    </tr>
                  </table>

                  <!-- WhatsApp Nudge Button -->
                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td align="center">
                        <a href="{wa_url}" target="_blank" style="display: block; width: 100%; box-sizing: border-box; background-color: #1F2937; color: #25D366; text-align: center; text-decoration: none; font-size: 13px; font-weight: 600; padding: 10px 16px; border-radius: 10px; border: 1px solid rgba(37,211,102,0.25);">
                          📱 Share / Nudge via WhatsApp
                        </a>
                      </td>
                    </tr>
                  </table>

                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding: 16px 28px 24px 28px; border-top: 1px solid rgba(255,255,255,0.06); text-align: center;">
                  <p style="color: #64748B; font-size: 11px; margin: 0; line-height: 1.4;">
                    Sent autonomously by <strong>Nudge AI</strong> · Tap the button above to close this task in 1-click without logging in.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    """


def send_reminder(
    to_email: str,
    owner_name: str,
    action_item_text: str,
    deadline: str,
    reminder_count: int,
    meeting_title: str = "your meeting",
    action_item_id: str = "",
) -> bool:
    """Send an escalating reminder email with 1-click complete button."""
    if reminder_count <= 1:
        subject = f"Friendly Reminder: Action item from {meeting_title}"
        badge = "Friendly Reminder"
        color = "#0D9488"
        plain_body = f"Hi {owner_name},\n\nReminder: {action_item_text}\nDue: {deadline}\n\nMark complete: {settings.BASE_API_URL}/api/action-items/{action_item_id}/quick-complete"
    elif reminder_count == 2:
        subject = f"Follow-up: Action item due — {meeting_title}"
        badge = "Approaching Deadline"
        color = "#F59E0B"
        plain_body = f"Hi {owner_name},\n\nFollow-up: {action_item_text}\nDue: {deadline}\n\nMark complete: {settings.BASE_API_URL}/api/action-items/{action_item_id}/quick-complete"
    else:
        subject = f"⚠️ URGENT: Overdue action item — {meeting_title}"
        badge = "URGENT OVERDUE"
        color = "#EF4444"
        plain_body = f"Hi {owner_name},\n\nURGENT OVERDUE: {action_item_text}\nDue: {deadline}\n\nMark complete: {settings.BASE_API_URL}/api/action-items/{action_item_id}/quick-complete"

    html = _build_html_email(
        owner_name=owner_name,
        item_text=action_item_text,
        deadline=deadline,
        meeting_title=meeting_title,
        action_item_id=action_item_id,
        urgency_badge=badge,
        urgency_color=color,
    )

    logger.info(f"Sending reminder #{reminder_count} to {owner_name} <{to_email}>")
    return send_email(to_email, subject, plain_body, html_content=html)


def send_escalation(
    to_email: str,
    manager_email: str,
    owner_name: str,
    action_item_text: str,
    deadline: str,
    meeting_title: str = "a meeting",
    action_item_id: str = "",
) -> bool:
    """Send an escalation email (CC to manager) with 1-click complete button."""
    subject = f"🔴 Escalation: Unresolved action item from {meeting_title}"
    plain_body = f"Hi {owner_name},\n\nEscalation: {action_item_text}\nDeadline: {deadline}\nManager CC'd: {manager_email}\n\nMark complete: {settings.BASE_API_URL}/api/action-items/{action_item_id}/quick-complete"

    html = _build_html_email(
        owner_name=owner_name,
        item_text=action_item_text,
        deadline=f"{deadline} (ESCALATED)",
        meeting_title=meeting_title,
        action_item_id=action_item_id,
        urgency_badge="ESCALATED TO MANAGER",
        urgency_color="#EF4444",
    )
    return send_email(to_email, subject, plain_body, html_content=html, cc_emails=[manager_email])
