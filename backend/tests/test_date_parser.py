"""Unit tests for relative date parser."""

from datetime import datetime
from backend.utils.date_parser import resolve_relative_date


def test_resolve_tomorrow():
    ref = datetime(2026, 7, 20, 10, 0, 0)  # Monday
    result = resolve_relative_date("tomorrow", reference=ref)
    assert result == "2026-07-21"


def test_resolve_in_days():
    ref = datetime(2026, 7, 20, 10, 0, 0)
    result = resolve_relative_date("in 3 days", reference=ref)
    assert result == "2026-07-23"


def test_resolve_in_weeks():
    ref = datetime(2026, 7, 20, 10, 0, 0)
    result = resolve_relative_date("in 2 weeks", reference=ref)
    assert result == "2026-08-03"


def test_resolve_weekday():
    ref = datetime(2026, 7, 20, 10, 0, 0)  # Monday
    result = resolve_relative_date("by Friday", reference=ref)
    assert result == "2026-07-24"


def test_resolve_empty():
    assert resolve_relative_date("") is None
    assert resolve_relative_date(None) is None
