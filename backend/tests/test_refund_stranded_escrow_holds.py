"""The migration that gives back what escrow took and never returned.

Hiring used to freeze the wage plus commission against the employer's balance.
Escrow is gone, and with it both the release and the refund, so every row still
at ``held`` is money that left a balance with nothing left to move it back.

Run against the real migration function rather than a reimplementation of it:
a test that agrees with a copy of the logic proves nothing about the copy that
will actually run.
"""

import importlib.util
import pathlib
import uuid

import pytest

from app.db.session import SessionLocal, engine
from app.models.audit_ledger import AuditLedger
from app.models.transaction import Transaction
from app.models.user import User

from .conftest import make_job, make_user

MIGRATION = (
    pathlib.Path(__file__).resolve().parent.parent
    / "alembic" / "versions" / "0018_refund_held_escrow.py"
)

WAGE_TIYIN = 200_000 * 100
FEE_TIYIN = 20_000 * 100


def _load():
    spec = importlib.util.spec_from_file_location("m0018", MIGRATION)
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


def _hold(employer_id, job_id, *, status="held", amount=WAGE_TIYIN, fee=FEE_TIYIN):
    with SessionLocal() as db:
        tx = Transaction(
            id=str(uuid.uuid4()), jobId=job_id, employerId=employer_id,
            amount=amount, platformFee=fee, feePercent=10,
            type="escrow_hold", status=status,
        )
        db.add(tx)
        db.commit()
        return tx.id


def _balance(user_id):
    with SessionLocal() as db:
        return db.query(User).filter(User.id == user_id).first().balance or 0


def _status(tx_id):
    with SessionLocal() as db:
        return db.query(Transaction).filter(Transaction.id == tx_id).first().status


@pytest.fixture
def stranded():
    employer = make_user(role="employer", phone=_phone(), balance=1_000_000)
    job = make_job(employer.id, salary="200000")
    tx_id = _hold(employer.id, job.id)
    return employer, job, tx_id


def test_the_employer_gets_the_wage_and_the_commission_back(stranded):
    employer, _job, _tx = stranded

    _run()

    # Both halves: the employer was charged for both when the hold was made.
    assert _balance(employer.id) == 1_000_000 + 220_000


def test_the_row_is_marked_refunded_rather_than_deleted(stranded):
    _employer, _job, tx_id = stranded

    _run()

    assert _status(tx_id) == "refunded"


def test_the_movement_is_on_the_record(stranded):
    employer, job, _tx = stranded

    _run()

    with SessionLocal() as db:
        entry = (
            db.query(AuditLedger)
            .filter(AuditLedger.userId == employer.id,
                    AuditLedger.entryType == "refund")
            .first()
        )
        assert entry is not None
        assert entry.amountDelta == 220_000
        assert entry.balanceAfter == 1_220_000
        assert entry.referenceId == job.id


def test_a_hold_already_released_is_left_alone():
    """That money reached a worker. Giving it back too would pay twice."""
    employer = make_user(role="employer", phone=_phone(), balance=500_000)
    job = make_job(employer.id, salary="200000")
    tx_id = _hold(employer.id, job.id, status="released")

    _run()

    assert _balance(employer.id) == 500_000
    assert _status(tx_id) == "released"


def test_a_hold_already_refunded_is_not_refunded_twice():
    employer = make_user(role="employer", phone=_phone(), balance=500_000)
    job = make_job(employer.id, salary="200000")
    tx_id = _hold(employer.id, job.id, status="refunded")

    _run()

    assert _balance(employer.id) == 500_000
    assert _status(tx_id) == "refunded"


def test_every_held_row_on_one_posting_comes_back():
    """A three-day shift froze three times over."""
    employer = make_user(role="employer", phone=_phone(), balance=1_000_000)
    job = make_job(employer.id, salary="200000")
    for _ in range(3):
        _hold(employer.id, job.id)

    _run()

    assert _balance(employer.id) == 1_000_000 + 220_000 * 3


def test_running_it_twice_does_not_pay_twice(stranded):
    """Migrations get re-run. The second pass must find nothing left to do."""
    employer, _job, _tx = stranded

    _run()
    after_first = _balance(employer.id)
    _run()

    assert _balance(employer.id) == after_first


def test_a_zero_value_hold_credits_nothing():
    employer = make_user(role="employer", phone=_phone(), balance=50_000)
    job = make_job(employer.id, salary="0")
    tx_id = _hold(employer.id, job.id, amount=0, fee=0)

    _run()

    assert _balance(employer.id) == 50_000
    assert _status(tx_id) == "refunded"


def test_downgrade_puts_it_back_exactly(stranded):
    employer, _job, tx_id = stranded
    before = _balance(employer.id)

    _run()
    assert _balance(employer.id) == before + 220_000

    _run("downgrade")

    assert _balance(employer.id) == before
    assert _status(tx_id) == "held"
    with SessionLocal() as db:
        assert db.query(AuditLedger).filter(
            AuditLedger.description.like("Escrow bekor qilindi:%")
        ).count() == 0
