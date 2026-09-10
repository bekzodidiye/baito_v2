"""End-to-end lifecycle: apply -> hire -> chat -> complete.

Originally one 103-line function wrapped in an 87-line try/finally, with its
own module-level TestClient and hand-built User and Job rows. conftest already
provides `client`, `make_user`, `make_job` and `login`, and an autouse fixture
that truncates every table between tests — so the session handling and the
seeding were both redundant. Split into steps so each assertion says which part
of the lifecycle broke.
"""
import uuid

import pytest

from app import models
from app.db.session import SessionLocal
from tests.conftest import login, make_job, make_user


@pytest.fixture
def lifecycle(client):
    """An employer with money, a worker, and an open job between them."""
    suffix = uuid.uuid4().hex[:6]
    employer = make_user(
        role="employer", phone=f"+99890{suffix[:4]}11",
        name="Test Employer", balance=1_000_000,
    )
    worker = make_user(
        role="worker", phone=f"+99890{suffix[:4]}22", name="Test Worker",
    )
    job = make_job(
        employer.id, title="E2E Developer Job", company="Baito Corp",
        description="E2E test description for platform developer",
        salary="500000", workDate="2026-08-30",
    )
    return {"client": client, "employer": employer, "worker": worker, "job": job}


def _apply(ctx) -> str:
    login(ctx["client"], ctx["worker"])
    res = ctx["client"].post(f"/api/v1/jobs/{ctx['job'].id}/apply")
    assert res.status_code == 200, res.text
    assert res.json()["status"] == "applied"
    return res.json()["id"]


def _hire(ctx, application_id: str) -> None:
    login(ctx["client"], ctx["employer"])
    res = ctx["client"].post(f"/api/v1/applications/{application_id}/hire")
    assert res.status_code == 200, res.text
    assert res.json()["application_status"] == "hired"


def _open_chat(ctx) -> None:
    with SessionLocal() as db:
        chat = models.Chat(
            id=str(uuid.uuid4()), jobId=ctx["job"].id,
            workerId=ctx["worker"].id, employerId=ctx["employer"].id,
        )
        db.add(chat)
        db.commit()
        chat_id = chat.id
    res = ctx["client"].get(f"/api/v1/chats/{chat_id}/messages")
    assert res.status_code == 200, res.text


def _complete(ctx) -> None:
    res = ctx["client"].post(
        f"/api/v1/jobs/{ctx['job'].id}/complete",
        json={"rating": 5, "review": "A'lo ishchi!", "bonus": 50000},
    )
    assert res.status_code == 200, res.text
    assert res.json()["job_status"] == "completed"


def test_full_platform_e2e_lifecycle(lifecycle):
    application_id = _apply(lifecycle)
    _hire(lifecycle, application_id)
    _open_chat(lifecycle)
    _complete(lifecycle)

    with SessionLocal() as db:
        job = db.query(models.Job).filter(
            models.Job.id == lifecycle["job"].id
        ).first()
        assert job.status == "completed"

        application = db.query(models.Application).filter(
            models.Application.id == application_id
        ).first()
        assert application.status == "completed"
        assert application.rating == 5
