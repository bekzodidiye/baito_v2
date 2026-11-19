"""add_translations_to_jobs

Revision ID: 78c37b938750
Revises: 6787f9d238cd
Create Date: 2026-10-01 12:08:51.709553

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '78c37b938750'
down_revision: Union[str, None] = '6787f9d238cd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


from alembic import context


def upgrade() -> None:
    if context.is_offline_mode():
        with op.batch_alter_table('jobs', schema=None) as batch_op:
            batch_op.add_column(sa.Column('translations', sa.JSON(), nullable=True, server_default='{}'))
        return

    bind = op.get_bind()
    try:
        inspector = sa.inspect(bind)
        jobs_cols = [c['name'] for c in inspector.get_columns('jobs')]
    except Exception:
        jobs_cols = []

    if 'translations' not in jobs_cols:
        with op.batch_alter_table('jobs', schema=None) as batch_op:
            batch_op.add_column(sa.Column('translations', sa.JSON(), nullable=True, server_default='{}'))


def downgrade() -> None:
    if context.is_offline_mode():
        with op.batch_alter_table('jobs', schema=None) as batch_op:
            batch_op.drop_column('translations')
        return

    bind = op.get_bind()
    try:
        inspector = sa.inspect(bind)
        jobs_cols = [c['name'] for c in inspector.get_columns('jobs')]
    except Exception:
        jobs_cols = ['translations']

    if 'translations' in jobs_cols:
        with op.batch_alter_table('jobs', schema=None) as batch_op:
            batch_op.drop_column('translations')

