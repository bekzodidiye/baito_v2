"""Tests for dispute lifecycle and application withdraw/reapply flows."""

import uuid
from app.db.session import SessionLocal
from app.models import Application, Dispute, Job, Notification, User
from app.models.job import JobStatus
from .conftest import login, make_job, make_user


def _phone():
    return f"+9989{uuid.uuid4().int % 10**8:08d}"


def test_worker_can_withdraw_and_reapply(client):
    employer = make_user(role="employer", phone=_phone())
    worker = make_user(role="worker", phone=_phone())
    job = make_job(employer.id, title="Dasturchi", salary="500000")

    login(client, worker)
    # 1. Apply to job
    res_apply = client.post(f"/api/v1/jobs/{job.id}/apply")
    assert res_apply.status_code == 200
    app_id = res_apply.json()["id"]

    with SessionLocal() as db:
        app = db.query(Application).filter(Application.id == app_id).first()
        assert app.status == "applied"

    # 2. Withdraw application
    res_withdraw = client.post(f"/api/v1/applications/{app_id}/withdraw")
    assert res_withdraw.status_code == 200
    assert res_withdraw.json()["application_status"] == "withdrawn"

    with SessionLocal() as db:
        app = db.query(Application).filter(Application.id == app_id).first()
        assert app.status == "withdrawn"
        notif = (
            db.query(Notification)
            .filter(Notification.userId == employer.id, Notification.title == "Ariza qaytarib olindi")
            .first()
        )
        assert notif is not None

    # 3. Re-apply to the same job
    res_reapply = client.post(f"/api/v1/jobs/{job.id}/apply")
    assert res_reapply.status_code == 200
    assert res_reapply.json()["id"] == app_id

    with SessionLocal() as db:
        app = db.query(Application).filter(Application.id == app_id).first()
        assert app.status == "applied"


def test_dispute_creation_fails_without_hired_worker(client):
    employer = make_user(role="employer", phone=_phone())
    job = make_job(employer.id, title="Sotuvchi", salary="300000")

    login(client, employer)
    res = client.post(f"/api/v1/jobs/{job.id}/dispute", json={"reason": "Hech kim kelmadi"})
    assert res.status_code == 400
    assert res.json()["detail"] == "Ishda tayinlangan ishchi yo'q, nizo ochish mumkin emas"


def test_dispute_creation_and_duplicate_guard(client):
    employer = make_user(role="employer", phone=_phone(), balance=2_000_000)
    worker = make_user(role="worker", phone=_phone())
    job = make_job(employer.id, title="Kuryer", salary="200000")

    with SessionLocal() as db:
        app = Application(jobId=job.id, workerId=worker.id, status="applied")
        db.add(app)
        db.commit()
        app_id = app.id

    login(client, employer)
    assert client.post(f"/api/v1/applications/{app_id}/hire").status_code == 200

    # Employer files dispute
    res_dispute = client.post(f"/api/v1/jobs/{job.id}/dispute", json={"reason": "Ishchi kech qoldi"})
    assert res_dispute.status_code == 200

    with SessionLocal() as db:
        j = db.query(Job).filter(Job.id == job.id).first()
        assert j.status == "dispute"
        d = db.query(Dispute).filter(Dispute.jobId == job.id).first()
        assert d is not None
        assert d.status == "open"
        assert d.workerId == worker.id

    # Trying to dispute again should be rejected
    res_dup = client.post(f"/api/v1/jobs/{job.id}/dispute", json={"reason": "Yana nizo"})
    assert res_dup.status_code == 400
    assert res_dup.json()["detail"] == "Ushbu ish bo'yicha faol nizo allaqachon ko'rib chiqilmoqda"


def test_admin_resolves_dispute_worker_wins(client):
    employer = make_user(role="employer", phone=_phone(), balance=2_000_000)
    worker = make_user(role="worker", phone=_phone())
    admin = make_user(role="admin", phone=_phone())
    job = make_job(employer.id, title="Santexnik", salary="250000")

    with SessionLocal() as db:
        app = Application(jobId=job.id, workerId=worker.id, status="applied")
        db.add(app)
        db.commit()
        app_id = app.id

    login(client, employer)
    assert client.post(f"/api/v1/applications/{app_id}/hire").status_code == 200
    res_dispute = client.post(f"/api/v1/jobs/{job.id}/dispute", json={"reason": "Chala bajarildi"})
    assert res_dispute.status_code == 200
    dispute_id = res_dispute.json().get("dispute_id")
    if not dispute_id:
        with SessionLocal() as db:
            dispute_id = db.query(Dispute).filter(Dispute.jobId == job.id).first().id

    # Admin resolves in favor of worker
    login(client, admin)
    res_resolve = client.post(
        f"/api/v1/admin/disputes/{dispute_id}/resolve",
        json={"winner": "worker", "reason": "Ishchi to'liq bajargan"},
    )
    assert res_resolve.status_code == 200
    data = res_resolve.json()
    assert data["success"] is True
    assert data["disputeStatus"] == "resolved"
    assert data["jobStatus"] == JobStatus.COMPLETED

    with SessionLocal() as db:
        w = db.query(User).filter(User.id == worker.id).first()
        assert w.balance > 0
        assert w.completedJobsCount == 1


def test_admin_resolves_dispute_employer_wins(client):
    employer = make_user(role="employer", phone=_phone(), balance=2_000_000)
    worker = make_user(role="worker", phone=_phone())
    admin = make_user(role="admin", phone=_phone())
    job = make_job(employer.id, title="Duradgor", salary="250000")

    with SessionLocal() as db:
        app = Application(jobId=job.id, workerId=worker.id, status="applied")
        db.add(app)
        db.commit()
        app_id = app.id

    login(client, employer)
    assert client.post(f"/api/v1/applications/{app_id}/hire").status_code == 200
    res_dispute = client.post(f"/api/v1/jobs/{job.id}/dispute", json={"reason": "Kelmadi"})
    assert res_dispute.status_code == 200
    with SessionLocal() as db:
        dispute_id = db.query(Dispute).filter(Dispute.jobId == job.id).first().id

    # Admin resolves in favor of employer
    login(client, admin)
    res_resolve = client.post(
        f"/api/v1/admin/disputes/{dispute_id}/resolve",
        json={"winner": "employer", "reason": "Ishchi kelmagan"},
    )
    assert res_resolve.status_code == 200
    data = res_resolve.json()
    assert data["success"] is True
    assert data["disputeStatus"] == "resolved"
    assert data["jobStatus"] == JobStatus.CANCELLED

    with SessionLocal() as db:
        w = db.query(User).filter(User.id == worker.id).first()
        assert w.completedJobsCount == 0
        app = db.query(Application).filter(Application.id == app_id).first()
        assert app.status == "cancelled"
