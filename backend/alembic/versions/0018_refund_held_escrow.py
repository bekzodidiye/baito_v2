"""give back the money escrow took and never returned

Hiring used to freeze the wage plus commission against the employer's balance.
Completing the work released it to the worker; cancelling gave it back. Escrow
is gone now, and with it both of those paths — so every row still sitting at
``held`` is money that left an employer's balance and has nothing left in the
code that would ever move it again.

That money was taken twice over in the first place. The invoice raised after
the work is done bills the same shift, and paying it never credited the balance
back. So the hold was always a second charge; this returns it.

What is touched:

  * ``transactions`` rows with ``type = 'escrow_hold'`` and ``status = 'held'``
    — and only those. A hold already ``released`` paid a worker and a hold
    already ``refunded`` has been given back; both are finished business.
  * the employer's ``balance``, by the wage and the commission together,
    because both halves were taken when the hold was made.
  * one ``audit_ledger`` row per refund, so the movement is on the record
    rather than appearing as a balance that changed by itself.

The rows are marked ``refunded`` rather than deleted. They are what happened.

Downgrade takes the money back off the balances and returns the rows to
``held``, which restores the state exactly — but it does not restore the code
that used to read them, so it is a formality rather than a route back.

Revision ID: 0018_refund_held_escrow
Revises: 0017_privacy_consent
Create Date: 2026-09-21
"""

import uuid
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0018_refund_held_escrow"
down_revision: Union[str, None] = "0017_privacy_consent"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _held_rows(conn):
    """Every hold still frozen, newest last so the ledger reads in order."""
    return conn.execute(sa.text("""
        SELECT id, "employerId", amount, "platformFee", "jobId"
        FROM transactions
        WHERE type = 'escrow_hold' AND status = 'held'
        ORDER BY "createdAt"
    """)).fetchall()


def upgrade() -> None:
    conn = op.get_bind()
    rows = _held_rows(conn)
    if not rows:
        return

    for row in rows:
        # Stored in tiyin; balances are in so'm.
        refund_uzs = (int(row.amount or 0) + int(row.platformFee or 0)) // 100
        if refund_uzs <= 0:
            # Nothing to give back — a posting with no figure on it. The row is
            # still marked so it stops reading as live.
            conn.execute(
                sa.text("UPDATE transactions SET status = 'refunded' WHERE id = :id"),
                {"id": row.id},
            )
            continue

        conn.execute(
            sa.text('UPDATE users SET balance = COALESCE(balance, 0) + :amt WHERE id = :uid'),
            {"amt": refund_uzs, "uid": row.employerId},
        )
        balance_after = conn.execute(
            sa.text('SELECT COALESCE(balance, 0) FROM users WHERE id = :uid'),
            {"uid": row.employerId},
        ).scalar()

        conn.execute(sa.text("""
            INSERT INTO audit_ledgers
                (id, "userId", "amountDelta", "balanceAfter", "entryType",
                 "referenceType", "referenceId", description)
            VALUES
                (:id, :uid, :delta, :after, 'refund', 'job', :job, :note)
        """), {
            "id": str(uuid.uuid4()),
            "uid": row.employerId,
            "delta": refund_uzs,
            "after": balance_after,
            "job": row.jobId,
            "note": (
                f"Escrow bekor qilindi: {refund_uzs} so'm hisobingizga qaytarildi. "
                "Ish haqi ish tugagach hisob-faktura bo'yicha to'lanadi."
            ),
        })

        conn.execute(
            sa.text("UPDATE transactions SET status = 'refunded' WHERE id = :id"),
            {"id": row.id},
        )


def downgrade() -> None:
    conn = op.get_bind()
    # Only the rows this migration wrote: a hold refunded by the old escrow
    # code has its own ledger entry and is none of our business.
    rows = conn.execute(sa.text("""
        SELECT t.id, t."employerId", t.amount, t."platformFee"
        FROM transactions t
        JOIN audit_ledgers l
          ON l."referenceId" = t."jobId"
         AND l."userId" = t."employerId"
         AND l.description LIKE 'Escrow bekor qilindi:%'
        WHERE t.type = 'escrow_hold' AND t.status = 'refunded'
    """)).fetchall()

    for row in rows:
        refund_uzs = (int(row.amount or 0) + int(row.platformFee or 0)) // 100
        if refund_uzs > 0:
            conn.execute(
                sa.text('UPDATE users SET balance = COALESCE(balance, 0) - :amt WHERE id = :uid'),
                {"amt": refund_uzs, "uid": row.employerId},
            )
        conn.execute(
            sa.text("UPDATE transactions SET status = 'held' WHERE id = :id"),
            {"id": row.id},
        )

    conn.execute(sa.text(
        "DELETE FROM audit_ledgers WHERE description LIKE 'Escrow bekor qilindi:%'"
    ))
