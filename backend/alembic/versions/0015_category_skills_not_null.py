"""give the seeded categories an empty skills list instead of null

0013 inserted the fourteen categories with raw SQL and did not name ``skills``.
``Category.skills`` carries ``default=list``, but that is a SQLAlchemy-side
default applied on ORM inserts — a raw INSERT leaves the column NULL. The admin
Kategoriyalar screen does ``cat.skills.map(...)``, so every one of those rows
crashed it, and the error boundary took the whole panel down with it.

The screen is being made to survive a null either way — it should never have
been able to crash on one field of one row. This is the other half: the data
itself, so the API stops handing out a null that means "empty list".

Only NULLs are touched. A category somebody has actually given skills to is
left exactly as it is.

Revision ID: 0015_category_skills_not_null
Revises: 0014_job_started_at
Create Date: 2026-09-13
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "0015_category_skills_not_null"
down_revision: Union[str, None] = "0014_job_started_at"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if "categories" not in inspector.get_table_names():
        return
    if "skills" not in {c["name"] for c in inspector.get_columns("categories")}:
        return

    bind.execute(sa.text("UPDATE categories SET skills = '[]' WHERE skills IS NULL"))


def downgrade() -> None:
    """Deliberately does nothing.

    The previous release reads this column the same way; an empty list is what
    it expects. Putting the NULLs back would only restore the crash.
    """
