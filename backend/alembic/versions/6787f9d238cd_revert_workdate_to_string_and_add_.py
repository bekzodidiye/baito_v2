"""revert_workdate_to_string_and_add_isnegotiable

Revision ID: 6787f9d238cd
Revises: f1263e379685
Create Date: 2026-09-22 17:14:07.914920

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '6787f9d238cd'
down_revision: Union[str, None] = 'f1263e379685'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    with op.batch_alter_table('jobs', schema=None) as batch_op:
        batch_op.alter_column('workDate',
               existing_type=sa.DATETIME(),
               type_=sa.String(),
               existing_nullable=True)
        batch_op.add_column(sa.Column('isNegotiable', sa.Boolean(), nullable=True, server_default='0'))

def downgrade() -> None:
    with op.batch_alter_table('jobs', schema=None) as batch_op:
        batch_op.drop_column('isNegotiable')
        batch_op.alter_column('workDate',
               existing_type=sa.String(),
               type_=sa.DATETIME(),
               existing_nullable=True)
