"""Utility for resolving relative date expressions to ISO dates.

Handles natural-language deadline references from meeting transcripts:
  "by Friday"  →  2026-07-28
  "in 3 days"  →  2026-07-28
  "tomorrow"   →  2026-07-26
  "end of week" → 2026-07-28
  "July 30"    →  2026-07-30
"""

from datetime import datetime, timedelta

from dateutil import parser as dateutil_parser
from dateutil.relativedelta import MO, TU, WE, TH, FR, SA, SU, relativedelta

# Map of day name variants → dateutil weekday constants
DAY_MAP = {
    "monday": MO, "mon": MO,
    "tuesday": TU, "tue": TU, "tues": TU,
    "wednesday": WE, "wed": WE,
    "thursday": TH, "thu": TH, "thurs": TH,
    "friday": FR, "fri": FR,
    "saturday": SA, "sat": SA,
    "sunday": SU, "sun": SU,
}


def resolve_relative_date(
    text: str, reference: datetime | None = None
) -> str | None:
    """Resolve a relative date expression to an ISO date string (YYYY-MM-DD).

    Args:
        text: Date expression from the transcript (e.g., "by Friday", "in 3 days").
        reference: Reference datetime for relative calculations. Defaults to now.

    Returns:
        ISO date string (e.g., "2026-07-28") or None if unparseable.
    """
    if not text:
        return None

    ref = reference or datetime.now()
    text_lower = text.lower().strip()

    # Strip common prefixes
    for prefix in ("by ", "before ", "until ", "due ", "on "):
        if text_lower.startswith(prefix):
            text_lower = text_lower[len(prefix):]

    # --- Simple keywords ---
    if text_lower in ("tomorrow", "tmr", "tmrw"):
        return (ref + timedelta(days=1)).date().isoformat()

    if text_lower == "today":
        return ref.date().isoformat()

    if text_lower in ("end of week", "eow", "end of the week"):
        days_until_friday = (4 - ref.weekday()) % 7
        if days_until_friday == 0 and ref.hour >= 17:
            days_until_friday = 7
        return (ref + timedelta(days=days_until_friday or 7)).date().isoformat()

    # --- "in X days/weeks/months" ---
    if text_lower.startswith("in "):
        parts = text_lower.split()
        if len(parts) >= 3:
            try:
                num = int(parts[1]) if parts[1] not in ("a", "an") else 1
                unit = parts[2].rstrip("s")  # Remove plural
                if unit == "day":
                    return (ref + timedelta(days=num)).date().isoformat()
                elif unit == "week":
                    return (ref + timedelta(weeks=num)).date().isoformat()
                elif unit == "month":
                    return (ref + relativedelta(months=num)).date().isoformat()
            except (ValueError, IndexError):
                pass

    # --- Day names: "Friday", "next Friday", "this Friday" ---
    for prefix in ("next ", "this ", ""):
        for day_name, day_const in DAY_MAP.items():
            if text_lower == f"{prefix}{day_name}":
                target = ref + relativedelta(weekday=day_const(+1))
                # If target is today, push to next week
                if target.date() == ref.date():
                    target = ref + relativedelta(weekday=day_const(+2))
                return target.date().isoformat()

    # --- Absolute date fallback (dateutil fuzzy parser) ---
    try:
        parsed = dateutil_parser.parse(text, fuzzy=True, default=ref)
        # If parsed date is in the past, assume next year
        if parsed.date() < ref.date():
            parsed = parsed.replace(year=parsed.year + 1)
        return parsed.date().isoformat()
    except (ValueError, OverflowError):
        return None
