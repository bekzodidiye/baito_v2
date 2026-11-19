"""add parsed salary int

Revision ID: f19942162cbf
Revises: 0017_privacy_consent
Create Date: 2026-09-22 11:13:46.089246

"""
from typing import Sequence, Union

from alembic import context, op
import sqlalchemy as sa
import re
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision: str = 'f19942162cbf'
down_revision: Union[str, None] = '0017_privacy_consent'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Regex from app.core.money
_NUMBER_RE = re.compile(r"\d[\d\s '’,.]*\d|\d")
_SEPARATORS = str.maketrans({" ": "", " ": "", "'": "", "’": "", ",": "", ".": ""})
MAX_REASONABLE_SALARY_UZS = 500_000_000

def _parse_to_int(salary: str | None) -> int:
    if not salary:
        return 0
    amounts = []
    for match in _NUMBER_RE.finditer(salary):
        digits = match.group(0).translate(_SEPARATORS)
        if not digits.isdigit():
            continue
        value = int(digits)
        if 0 < value <= MAX_REASONABLE_SALARY_UZS:
            amounts.append(value)
    if not amounts:
        return 0
    return min(amounts)

def _is_offline() -> bool:
    try:
        return context.is_offline_mode()
    except Exception:
        return False


def upgrade() -> None:
    bind = op.get_bind()
    from sqlalchemy import inspect
    inspector = inspect(bind)
    columns = [c["name"] for c in inspector.get_columns("jobs")]

    if 'salaryInt' not in columns:
        op.add_column('jobs', sa.Column('salaryInt', sa.Integer(), nullable=True))
    if 'hourlyRateInt' not in columns:
        op.add_column('jobs', sa.Column('hourlyRateInt', sa.Integer(), nullable=True))
    if 'transportRateInt' not in columns:
        op.add_column('jobs', sa.Column('transportRateInt', sa.Integer(), nullable=True))

    indexes = [ix["name"] for ix in inspector.get_indexes("jobs")]
    if 'ix_jobs_salaryInt' not in indexes:
        op.create_index(op.f('ix_jobs_salaryInt'), 'jobs', ['salaryInt'], unique=False)

    # Data migration
    if not _is_offline():
        conn = op.get_bind()
        result = conn.execute(text("SELECT id, salary, \"hourlyRate\", \"transportRate\" FROM jobs"))
        if result:
            jobs = result.fetchall()
            for job in jobs:
                s_int = _parse_to_int(job[1])
                h_int = _parse_to_int(job[2]) if job[2] else None
                t_int = _parse_to_int(job[3]) if job[3] else None
                
                conn.execute(
                    text('UPDATE jobs SET "salaryInt" = :s, "hourlyRateInt" = :h, "transportRateInt" = :t WHERE id = :id'),
                    {"s": s_int, "h": h_int, "t": t_int, "id": job[0]}
                )

def downgrade() -> None:
    bind = op.get_bind()
    from sqlalchemy import inspect
    inspector = inspect(bind)
    
    indexes = [ix["name"] for ix in inspector.get_indexes("jobs")]
    if 'ix_jobs_salaryInt' in indexes:
        op.drop_index(op.f('ix_jobs_salaryInt'), table_name='jobs')
        
    columns = [c["name"] for c in inspector.get_columns("jobs")]
    if 'transportRateInt' in columns:
        op.drop_column('jobs', 'transportRateInt')
    if 'hourlyRateInt' in columns:
        op.drop_column('jobs', 'hourlyRateInt')
    if 'salaryInt' in columns:
        op.drop_column('jobs', 'salaryInt')
