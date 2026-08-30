"""Message read state, and indexes for the foreign keys that had none

The unread badge could never go down. `unreadCount` counted every message the
other participant had ever sent, because a message carried no notion of having
been read — so a conversation you had just finished reading still showed its
whole history as unread. `readAt` is what the count now filters on.

The indexes are the other half. Twelve foreign keys had none, and they are the
columns the app joins and filters on: a user's chats, their bookmarks, their
transactions, the messages in a ticket. An empty database hides this
completely; each of them is a sequential scan once there is data.

Revision ID: 0003_read_and_fk_indexes
Revises: 0002_media_audit
Create Date: 2026-09-01
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = '0003_read_and_fk_indexes'
down_revision: Union[str, None] = '0002_media_audit'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Foreign keys with no index of their own, measured against the running
# database. Postgres does not index a foreign key for you.
FK_INDEXES = [
    ('ix_jobs_hired_worker', 'jobs', ['hiredWorkerId']),
    ('ix_supporttickets_user', 'supporttickets', ['userId']),
    ('ix_transactions_job', 'transactions', ['jobId']),
    ('ix_transactions_worker', 'transactions', ['workerId']),
    ('ix_chats_employer', 'chats', ['employerId']),
    ('ix_chats_worker', 'chats', ['workerId']),
    ('ix_chats_job', 'chats', ['jobId']),
    ('ix_bookmarks_user', 'bookmarks', ['userId']),
    ('ix_bookmarks_job', 'bookmarks', ['jobId']),
    ('ix_ticketmessages_ticket', 'ticketmessages', ['ticketId']),
    ('ix_ticketmessages_sender', 'ticketmessages', ['senderId']),
    ('ix_messages_sender', 'messages', ['senderId']),
]

# Counting one chat's unread messages touches all three columns.
UNREAD_INDEX = ('ix_messages_unread', 'messages', ['chatId', 'senderId', 'readAt'])


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    tables = set(inspector.get_table_names())

    if 'messages' in tables:
        columns = {c['name'] for c in inspector.get_columns('messages')}
        if 'readAt' not in columns:
            op.add_column('messages', sa.Column('readAt', sa.DateTime(timezone=True), nullable=True))

    for name, table, cols in FK_INDEXES + [UNREAD_INDEX]:
        if table not in tables:
            continue
        existing = {ix['name'] for ix in inspector.get_indexes(table)}
        if name in existing:
            continue
        op.create_index(name, table, cols)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    tables = set(inspector.get_table_names())

    for name, table, _ in reversed(FK_INDEXES + [UNREAD_INDEX]):
        if table not in tables:
            continue
        existing = {ix['name'] for ix in inspector.get_indexes(table)}
        if name in existing:
            op.drop_index(name, table_name=table)

    if 'messages' in tables:
        columns = {c['name'] for c in inspector.get_columns('messages')}
        if 'readAt' in columns:
            op.drop_column('messages', 'readAt')
