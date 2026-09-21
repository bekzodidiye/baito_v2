"""record when the work actually started

``workTime`` is the shift a posting advertised — "09:00 - 18:00". Nothing
recorded whether anybody turned up at nine, so an administrator looking at a
finished job could not tell a punctual one from a shift that started two hours
late and ran over. ``completedAt`` was already stored; its opposite number was
not.

Two nullable columns, no backfill:

  jobs.startedAt      set when the employer confirms the work has begun.
  job_days.startedAt  the same, per day of a multi-day posting.

Jobs that started before this existed have none, and every screen that shows
these has to say "not recorded" rather than inventing a time — a guessed start
would be read as a measurement.

Additive only. The release before this one runs unchanged against the result,
which is the rollback contract in docs/releases.md.

Revision ID: 0014_job_started_at
Revises: 0013_category_region_commission
Create Date: 2026-09-13
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "0014_job_started_at"
down_revision: Union[str, None] = "0013_category_region_commission"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _columns(inspector, table: str) -> set:
    if table not in inspector.get_table_names():
        return set()
    return {c["name"] for c in inspector.get_columns(table)}


def upgrade() -> None:
    inspector = inspect(op.get_bind())

    if "jobs" in inspector.get_table_names() and "startedAt" not in _columns(inspector, "jobs"):
        op.add_column("jobs", sa.Column("startedAt", sa.DateTime(timezone=True), nullable=True))

    if "job_days" in inspector.get_table_names() and "startedAt" not in _columns(inspector, "job_days"):
        op.add_column("job_days", sa.Column("startedAt", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    inspector = inspect(op.get_bind())

    if "startedAt" in _columns(inspector, "job_days"):
        op.drop_column("job_days", "startedAt")

    if "startedAt" in _columns(inspector, "jobs"):
        op.drop_column("jobs", "startedAt")
