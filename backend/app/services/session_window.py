"""How long a session stays alive without being used.

A refresh token lives seven days. A session nobody has used in seven days
therefore cannot come back — the only key that could revive it has already
expired. Nothing ever told the row that: `is_active` was set at login and
changed only by logging out or revoking, so a phone signed in six months ago
and forgotten still read `is_active = True`.

That made `/me/sessions` say the wrong thing to the one question it exists to
answer — who else is in my account. It listed devices that could not get back
in as though they were live.

The window is the refresh window, derived rather than configured. A shorter one
would sign out people who can still get back in; a longer one would go on
claiming a session is alive after its last key has died.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.session import ActiveSession


def idle_window() -> timedelta:
    """Read at call time so a changed refresh lifetime carries straight over."""
    return timedelta(minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES)


def _as_utc(moment: Optional[datetime]) -> Optional[datetime]:
    """SQLite hands back what Postgres stores with a timezone as naive.

    Comparing the two raises, and the tests run on one database while
    production runs on the other — so a naive timestamp is read as the UTC it
    was written as.
    """
    if moment is None:
        return None
    if moment.tzinfo is None:
        return moment.replace(tzinfo=timezone.utc)
    return moment


def has_expired(session: ActiveSession, now: Optional[datetime] = None) -> bool:
    """True once the session has gone unused for longer than the window."""
    last_used = _as_utc(session.last_active_at) or _as_utc(session.created_at)
    if last_used is None:
        # Neither timestamp: nothing says it is still alive.
        return True
    return (now or datetime.now(timezone.utc)) - last_used > idle_window()


def is_live(session: Optional[ActiveSession]) -> bool:
    """The one question every caller actually asks of a session row."""
    return session is not None and bool(session.is_active) and not has_expired(session)


def expire_idle(db: Session, user_uid: str) -> int:
    """Close this user's idle sessions and report how many.

    Called where a write already belongs — signing in, and refusing a refresh —
    so the rows tell the truth from then on rather than only being filtered out
    of one listing.
    """
    closed = 0
    rows = (
        db.query(ActiveSession)
        .filter(
            ActiveSession.user_uid == user_uid,
            ActiveSession.is_active == True,  # noqa: E712 — SQL boolean, not Python
        )
        .all()
    )
    for row in rows:
        if has_expired(row):
            row.is_active = False
            closed += 1
    return closed
