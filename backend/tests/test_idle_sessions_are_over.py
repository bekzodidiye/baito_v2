"""A session nobody has used in a week is over.

A refresh token lives seven days, so a session idle for longer than that cannot
come back — the only key that would revive it has expired. Nothing said so:
``is_active`` was written at login and changed only by logging out or revoking.
A phone signed into months ago and forgotten still read ``active``, and that is
what ``/me/sessions`` showed to someone asking who else was in their account.

These cover the window itself, the four places a session row is read, and the
timezone trap underneath it — the tests run on SQLite and production on
Postgres, and only one of the two hands back an aware timestamp.
"""

import uuid
from datetime import datetime, timedelta, timezone

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.session import ActiveSession
from app.services.session_window import has_expired, idle_window, is_live

from .conftest import login, make_user

WINDOW_DAYS = 7


def _phone():
    return f"+9989{uuid.uuid4().int % 10**8:08d}"


def _sessions_of(user):
    with SessionLocal() as db:
        return (
            db.query(ActiveSession)
            .filter(ActiveSession.user_uid == str(user.uid or user.id))
            .order_by(ActiveSession.created_at.desc())
            .all()
        )


def _newest_session_id(user) -> str:
    rows = _sessions_of(user)
    assert rows, "logging in should have recorded a session"
    return rows[0].id


def _backdate(session_id: str, *, days: float) -> None:
    """Put a session's last use that far in the past."""
    when = datetime.now(timezone.utc) - timedelta(days=days)
    with SessionLocal() as db:
        row = db.query(ActiveSession).filter(ActiveSession.id == session_id).first()
        row.last_active_at = when
        row.created_at = when
        db.commit()


def _is_active(session_id: str) -> bool:
    with SessionLocal() as db:
        return bool(
            db.query(ActiveSession).filter(ActiveSession.id == session_id).first().is_active
        )


# --- the window is the refresh window, not a second number ------------------

def test_the_window_is_exactly_how_long_a_refresh_token_lives():
    """Derived, not configured: a shorter one would sign out people who can
    still get back in, a longer one would keep claiming a dead session is alive."""
    assert idle_window() == timedelta(minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES)
    assert idle_window() == timedelta(days=WINDOW_DAYS)


def test_a_naive_timestamp_is_read_as_the_utc_it_was_written_as():
    """SQLite hands back naive what Postgres stores aware.

    Comparing the two raises TypeError, and the suite runs on one database
    while production runs on the other — so this is the difference that would
    have shown up only in production.
    """
    row = ActiveSession(
        id="x", user_uid="u", is_active=True,
        last_active_at=datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=1),
    )
    assert has_expired(row) is False  # would raise if the naive value were compared as-is

    row.last_active_at = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=8)
    assert has_expired(row) is True


def test_a_row_with_no_timestamps_at_all_is_not_treated_as_alive():
    row = ActiveSession(id="x", user_uid="u", is_active=True,
                        last_active_at=None, created_at=None)
    assert is_live(row) is False


def test_created_at_stands_in_when_the_session_was_never_used():
    fresh = ActiveSession(id="x", user_uid="u", is_active=True, last_active_at=None,
                          created_at=datetime.now(timezone.utc) - timedelta(days=1))
    stale = ActiveSession(id="y", user_uid="u", is_active=True, last_active_at=None,
                          created_at=datetime.now(timezone.utc) - timedelta(days=8))
    assert is_live(fresh) is True
    assert is_live(stale) is False


# --- refreshing: the gate that matters --------------------------------------

def test_a_session_idle_past_the_window_cannot_refresh(client):
    user = make_user(phone=_phone())
    login(client, user)
    sid = _newest_session_id(user)

    _backdate(sid, days=WINDOW_DAYS + 1)

    resp = client.post("/api/v1/auth/refresh")

    assert resp.status_code == 401
    assert "yaroqsiz" in resp.json()["detail"]


def test_and_that_session_is_closed_on_the_way_out(client):
    """The row stops claiming to be active the moment we establish it is not."""
    user = make_user(phone=_phone())
    login(client, user)
    sid = _newest_session_id(user)
    _backdate(sid, days=WINDOW_DAYS + 1)
    assert _is_active(sid) is True

    client.post("/api/v1/auth/refresh")

    assert _is_active(sid) is False


def test_a_session_used_yesterday_refreshes_as_it_always_did(client):
    user = make_user(phone=_phone())
    login(client, user)
    sid = _newest_session_id(user)

    _backdate(sid, days=1)

    assert client.post("/api/v1/auth/refresh").status_code == 200
    assert _is_active(sid) is True


def test_a_session_just_inside_the_window_still_refreshes(client):
    """Six days and twenty-three hours: nothing that works today stops working."""
    user = make_user(phone=_phone())
    login(client, user)
    sid = _newest_session_id(user)

    _backdate(sid, days=WINDOW_DAYS - (1 / 24))

    assert client.post("/api/v1/auth/refresh").status_code == 200


# --- the listing that answers "who else is in my account?" ------------------

def test_an_idle_session_is_left_out_of_the_listing(client):
    user = make_user(phone=_phone())
    login(client, user)          # the session doing the asking
    login(client, user)          # a second one, which we age out
    rows = _sessions_of(user)
    assert len(rows) == 2
    stale = rows[-1].id
    _backdate(stale, days=WINDOW_DAYS + 1)

    listed = client.get("/api/v1/users/me/sessions").json()

    assert stale not in [row["id"] for row in listed]


def test_a_live_session_is_still_listed(client):
    user = make_user(phone=_phone())
    login(client, user)
    sid = _newest_session_id(user)

    listed = client.get("/api/v1/users/me/sessions").json()

    assert sid in [row["id"] for row in listed]


# --- signing in tidies up what this user left behind ------------------------

def test_signing_in_closes_the_idle_sessions_this_user_left(client):
    user = make_user(phone=_phone())
    login(client, user)
    old = _newest_session_id(user)
    _backdate(old, days=WINDOW_DAYS + 1)

    login(client, user)

    assert _is_active(old) is False


def test_signing_in_leaves_a_live_session_of_the_same_user_alone(client):
    """Signing in on a second device must not sign the first one out."""
    user = make_user(phone=_phone())
    login(client, user)
    first = _newest_session_id(user)

    login(client, user)

    assert _is_active(first) is True


def test_signing_in_does_not_touch_another_person(client):
    other = make_user(phone=_phone())
    login(client, other)
    theirs = _newest_session_id(other)
    _backdate(theirs, days=WINDOW_DAYS + 1)

    user = make_user(phone=_phone())
    login(client, user)

    # Their idle row is their business; this login has nothing to do with it.
    assert _is_active(theirs) is True


# --- and every request, not only the refresh --------------------------------

def test_an_access_token_is_refused_once_its_session_goes_idle(client):
    """The access token is still within its hour; the session behind it is not."""
    user = make_user(phone=_phone())
    login(client, user)
    sid = _newest_session_id(user)
    assert client.get("/api/v1/users/me").status_code == 200

    _backdate(sid, days=WINDOW_DAYS + 1)

    assert client.get("/api/v1/users/me").status_code == 401


def test_a_revoked_session_is_still_refused_the_way_it_was(client):
    """The check that was already there has not been replaced by the new one."""
    user = make_user(phone=_phone())
    login(client, user)
    sid = _newest_session_id(user)
    with SessionLocal() as db:
        db.query(ActiveSession).filter(ActiveSession.id == sid).first().is_active = False
        db.commit()

    assert client.get("/api/v1/users/me").status_code == 401
    assert client.post("/api/v1/auth/refresh").status_code == 401
