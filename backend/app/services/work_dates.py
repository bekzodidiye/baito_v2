"""Reading the days a posting covers out of the text somebody typed.

``Job.workDate`` is a free-text field: "15", "2026-09-02, 2026-09-03",
"2~5", "12.03.2026". Several places need the actual calendar days behind it —
the clash check when hiring, the calendar, and now the per-day work records
that carry a day's status and a day's wage — so the parsing lives here rather
than inside whichever endpoint happened to need it first.
"""

from __future__ import annotations

import re
from datetime import date, datetime, timedelta
from typing import Any, Optional


def _parse_single_date(token: str, reference: date) -> Optional[date]:
    """Parse one date token.

    A bare day number ("15") used to be resolved against *today's* month, so a
    posting made on the 28th for the 3rd landed in the past. It now rolls
    forward to the next month when the day has already gone by.
    """
    token = token.strip()
    if not token:
        return None

    if re.fullmatch(r"\d{1,2}", token):
        day = int(token)
        if not 1 <= day <= 31:
            return None
        year, month = reference.year, reference.month
        if day < reference.day:
            month += 1
            if month > 12:
                month = 1
                year += 1
        try:
            return date(year, month, day)
        except ValueError:
            return None

    for fmt in ("%Y-%m-%d", "%d.%m.%Y", "%d/%m/%Y"):
        try:
            return datetime.strptime(token, fmt).date()
        except ValueError:
            continue
    return None


def get_job_dates_set(job: Any) -> set:
    """Every calendar day a job occupies, as ``YYYY-MM-DD`` strings."""
    if not job or not job.workDate:
        return set()

    date_str = str(job.workDate).strip()
    reference = date.today()
    dates: set[str] = set()

    if ',' in date_str:
        for part in date_str.split(','):
            parsed = _parse_single_date(part, reference)
            if parsed:
                dates.add(parsed.strftime("%Y-%m-%d"))
        return dates

    # A range is written with '~', or with '-' between two bare day numbers.
    # A full ISO date also contains '-', so only treat '-' as a range separator
    # when neither side looks like a complete date.
    range_delim = None
    if '~' in date_str:
        range_delim = '~'
    elif date_str.count('-') == 1 and not re.fullmatch(r"\d{4}-\d{1,2}", date_str):
        range_delim = '-'

    if range_delim:
        parts = [p.strip() for p in date_str.split(range_delim)]
        if len(parts) == 2:
            start_dt = _parse_single_date(parts[0], reference)
            # The end of a range shares the start's month when it is a bare day.
            end_dt = _parse_single_date(parts[1], start_dt or reference)
            if start_dt and end_dt and start_dt <= end_dt:
                # Guard against a pathological range locking up the loop.
                if (end_dt - start_dt).days <= 366:
                    current = start_dt
                    while current <= end_dt:
                        dates.add(current.strftime("%Y-%m-%d"))
                        current += timedelta(days=1)
            return dates

    parsed = _parse_single_date(date_str, reference)
    if parsed:
        dates.add(parsed.strftime("%Y-%m-%d"))
    return dates


def job_dates(job: Any) -> list[str]:
    """The days a posting covers, earliest first.

    The set above is enough to answer "does this clash?"; anything that pays
    per day needs a stable order, because the first day and the last day are
    not interchangeable to the person working them.
    """
    return sorted(get_job_dates_set(job))
