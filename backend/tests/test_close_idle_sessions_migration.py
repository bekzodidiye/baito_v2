"""The migration that closes the backlog of sessions nobody came back to.

The code now treats an idle row as dead wherever it is read, and closes a
user's idle rows when they sign in. That leaves the rows belonging to people
who have not signed in since — they would go on reading ``active`` in the
database forever.

Run against the real migration function rather than a reimplementation of it:
a test that agrees with a copy of the logic proves nothing about the copy that
will actually run.
"""

import importlib.util
import pathlib
import uuid
from datetime import datetime, timedelta, timezone

import pytest

from app.db.session import SessionLocal, engine
from app.models.session import ActiveSession

from .conftest import make_user

MIGRATION = (
    pathlib.Path(__file__).resolve().parent.parent
    / "alembic" / "versions" / "0019_close_idle_sessions.py"
)


def _load():
    spec = importlib.util.spec_from_file_location("m0019", MIGRATION)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class _Bind:
    """``op.get_bind()`` stands in for the connection the migration runs on."""

    def __init__(self, conn):
        self._conn = conn

    def get_bind(self):
        return self._conn


def _run(direction="upgrade"):
    module = _load()
    with engine.begin() as conn:
        module.op = _Bind(conn)
        getattr(module, direction)()


def _phone():
    return f"+9989{uuid.uuid4().int % 10**8:08d}"


def _session(user, *, days_idle: float, active: bool = True) -> str:
    when = datetime.now(timezone.utc) - timedelta(days=days_idle)
    with SessionLocal() as db:
        row = ActiveSession(
            id=str(uuid.uuid4()),
            user_uid=str(user.uid or user.id),
            device_name="Windows PC",
            is_active=active,
            created_at=when,
            last_active_at=when,
        )
        db.add(row)
        db.commit()
        return row.id


def _is_active(session_id: str) -> bool:
    with SessionLocal() as db:
        return bool(
            db.query(ActiveSession).filter(ActiveSession.id == session_id).first().is_active
        )


@pytest.fixture
def person():
    return make_user(phone=_phone())


def test_a_session_idle_longer_than_the_window_is_closed(person):
    stale = _session(person, days_idle=30)

    _run()

    assert _is_active(stale) is False


def test_a_session_used_this_week_is_left_alone(person):
    """Its refresh token is still good; closing it would sign someone out."""
    live = _session(person, days_idle=2)

    _run()

    assert _is_active(live) is True


def test_a_session_just_inside_the_window_is_left_alone(person):
    live = _session(person, days_idle=6.9)

    _run()

    assert _is_active(live) is True


def test_a_session_already_closed_stays_closed(person):
    revoked = _session(person, days_idle=30, active=False)

    _run()

    assert _is_active(revoked) is False


def test_it_sorts_a_mixed_pile_correctly(person):
    stale_one = _session(person, days_idle=200)
    stale_two = _session(person, days_idle=8)
    live_one = _session(person, days_idle=0)
    live_two = _session(person, days_idle=6)

    _run()

    assert [_is_active(s) for s in (stale_one, stale_two)] == [False, False]
    assert [_is_active(s) for s in (live_one, live_two)] == [True, True]


def test_running_it_twice_changes_nothing_the_second_time(person):
    stale = _session(person, days_idle=30)
    live = _session(person, days_idle=1)

    _run()
    after_first = (_is_active(stale), _is_active(live))
    _run()

    assert (_is_active(stale), _is_active(live)) == after_first == (False, True)


def test_downgrade_reopens_nothing(person):
    """A row this closed cannot be told apart from one its owner revoked, so
    re-opening them would hand back sessions somebody deliberately ended."""
    stale = _session(person, days_idle=30)
    _run()

    _run("downgrade")

    assert _is_active(stale) is False
