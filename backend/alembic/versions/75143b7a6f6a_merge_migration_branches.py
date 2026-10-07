"""Merge migration branches

Revision ID: 75143b7a6f6a
Revises: 0019_close_idle_sessions, f19942162cbf
Create Date: 2026-09-22 13:11:21.714634

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '75143b7a6f6a'
down_revision: Union[str, None] = ('0019_close_idle_sessions', 'f19942162cbf')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
