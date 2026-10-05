"""close the sessions that have been idle longer than a refresh token lives

A refresh token lives seven days. A session nobody has used in seven days
therefore cannot come back: the only key that could revive it has expired.
Nothing ever told the row that. ``is_active`` was written at login and changed
only by logging out or revoking, so a phone signed into six months ago and
forgotten still reads ``is_active = True``.

That is what ``/me/sessions`` lists, and the question that screen exists to
answer is "who else is in my account?" — answered with devices that cannot get
in at all.

The code now treats an idle row as dead wherever it is read, and closes this
user's idle rows when they sign in. This closes the backlog: the rows belonging
to people who have not signed in since, and would otherwise go on reading
``active`` in the database forever.

What is touched:

  * ``active_sessions`` rows with ``is_active = true`` whose ``last_active_at``
    (or ``created_at``, where the first is null) is older than the window —
    and only those.

Nothing else moves. No token is invalidated that was not already invalid: every
row closed here is one whose refresh token expired days or months ago.

Downgrade does nothing, and cannot. A row this closed is indistinguishable
afterwards from one the user revoked themselves, so re-opening them would hand
back sessions their owner deliberately ended.

Revision ID: 0019_close_idle_sessions
Revises: 0018_refund_held_escrow
Create Date: 2026-09-21
"""

from datetime import datetime, timedelta, timezone
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0019_close_idle_sessions"
down_revision: Union[str, None] = "0018_refund_held_escrow"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# The refresh window, stated here rather than imported: a migration is a record
# of what was run against the database on the day it ran, and must not change
# meaning later because a setting moved.
IDLE_DAYS = 7


def upgrade() -> None:
    conn = op.get_bind()
    cutoff = datetime.now(timezone.utc) - timedelta(days=IDLE_DAYS)

    result = conn.execute(
        sa.text("""
            UPDATE active_sessions
            SET is_active = false
            WHERE is_active = true
              AND COALESCE(last_active_at, created_at) < :cutoff
        """),
        {"cutoff": cutoff},
    )
    print(f"[0019] closed {result.rowcount} session(s) idle since before {cutoff:%Y-%m-%d}")


def downgrade() -> None:
    """Deliberately empty — see the note above."""
    pass
