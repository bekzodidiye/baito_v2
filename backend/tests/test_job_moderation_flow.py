import uuid
import pytest
from app import models
from app.models.job import JobStatus
from app.db.session import SessionLocal
from tests.conftest import login, make_user


def test_job_moderation_flow(client):
    """Test full moderation lifecycle:
    1. Employer creates a job -> status is 'pending'
    2. Employer sees the job in their list
    3. Worker cannot see the pending job in search or get details
    4. Admin sees the pending job
    5. Admin approves the job -> status is 'open', employer gets notification
    6. Worker now sees the job in search and can view details
    """
    suffix = uuid.uuid4().hex[:6]
    employer = make_user(
        role="employer",
        phone=f"+99890{suffix[:4]}55",
        name="HR Moderation Employer",
        companyName="Test Moderation Corp",
        balance=1_000_000,
    )
    worker = make_user(
        role="worker",
        phone=f"+99890{suffix[:4]}66",
        name="Job Seeker Worker",
    )
    admin = make_user(
        role="admin",
        phone=f"+99890{suffix[:4]}77",
        name="System Admin",
    )

    # 1. Employer creates a job
    login(client, employer)
    job_payload = {
        "title": "Ombor ishchisi kerak",
        "company": "Test Moderation Corp",
        "salary": 300000,
        "salaryCurrency": "UZS",
        "location": "Toshkent, Sergeli",
        "description": "Tovarlarni saralash va qadoqlash uchun ombor ishchisi",
        "workDate": "2026-10-15",
        "workTime": "09:00 - 18:00",
        "durationLabel": "1 kunlik",
        "imageUrl": "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d",
        "neededWorkers": "2",
        "urgent": False,
    }
    create_res = client.post("/api/v1/jobs", json=job_payload)
    assert create_res.status_code == 200, create_res.text
    created_job = create_res.json()
    job_id = created_job["id"]
    assert created_job["status"] == JobStatus.PENDING

    # 2. Employer sees it in their listing (/jobs/my)
    my_jobs_res = client.get("/api/v1/jobs/my")
    assert my_jobs_res.status_code == 200, my_jobs_res.text
    my_job_ids = [j["id"] for j in my_jobs_res.json()]
    assert job_id in my_job_ids
    my_job = next(j for j in my_jobs_res.json() if j["id"] == job_id)
    assert my_job["status"] == JobStatus.PENDING

    # 3. Worker cannot see the pending job in search
    login(client, worker)
    worker_jobs_res = client.get("/api/v1/jobs")
    assert worker_jobs_res.status_code == 200, worker_jobs_res.text
    worker_visible_ids = [j["id"] for j in worker_jobs_res.json()]
    assert job_id not in worker_visible_ids

    # Worker direct read returns 404
    job_read_res = client.get(f"/api/v1/jobs/{job_id}")
    assert job_read_res.status_code == 404

    # Worker cannot apply to a pending job
    apply_res = client.post(f"/api/v1/jobs/{job_id}/apply")
    assert apply_res.status_code in (400, 404)

    # 4. Admin sees the job with status == 'pending'
    login(client, admin)
    admin_jobs_res = client.get(f"/api/v1/admin/jobs?status={JobStatus.PENDING}")
    assert admin_jobs_res.status_code == 200, admin_jobs_res.text
    admin_items = admin_jobs_res.json()["items"]
    assert any(j["id"] == job_id for j in admin_items)

    # 5. Admin approves the job
    approve_res = client.post(f"/api/v1/admin/jobs/{job_id}/approve")
    assert approve_res.status_code == 200, approve_res.text
    assert approve_res.json()["status"] == JobStatus.OPEN

    # Check notification sent to employer
    with SessionLocal() as db:
        notif = (
            db.query(models.Notification)
            .filter(
                models.Notification.userId == employer.id,
                models.Notification.relatedJobId == job_id,
            )
            .first()
        )
        assert notif is not None
        assert "tasdiqlandi" in notif.title.lower() or "tasdiqlandi" in notif.message.lower()

    # 6. Now Worker sees the job in search & can view details
    login(client, worker)
    worker_jobs_res2 = client.get("/api/v1/jobs")
    assert worker_jobs_res2.status_code == 200, worker_jobs_res2.text
    assert job_id in [j["id"] for j in worker_jobs_res2.json()]

    job_read_res2 = client.get(f"/api/v1/jobs/{job_id}")
    assert job_read_res2.status_code == 200
    assert job_read_res2.json()["status"] == JobStatus.OPEN


def test_job_moderation_reject_flow(client):
    """Test rejecting a job during moderation."""
    suffix = uuid.uuid4().hex[:6]
    employer = make_user(
        role="employer",
        phone=f"+99890{suffix[:4]}88",
        name="HR Reject Employer",
    )
    admin = make_user(
        role="admin",
        phone=f"+99890{suffix[:4]}99",
        name="Admin Reviewer",
    )

    # Create job
    login(client, employer)
    job_payload = {
        "title": "Shubhali elon",
        "company": "HR Reject Employer",
        "salary": 100000,
        "location": "Toshkent",
        "description": "E'lon tavsifi",
        "workDate": "2026-10-20",
        "imageUrl": "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d",
    }
    create_res = client.post("/api/v1/jobs", json=job_payload)
    assert create_res.status_code == 200
    job_id = create_res.json()["id"]

    # Admin rejects
    login(client, admin)
    reject_res = client.post(
        f"/api/v1/admin/jobs/{job_id}/reject",
        json={"reason": "Noto'g'ri ma'lumotlar ko'rsatilgan"},
    )
    assert reject_res.status_code == 200
    assert reject_res.json()["status"] == JobStatus.REJECTED

    # Check notification sent to employer
    with SessionLocal() as db:
        notif = (
            db.query(models.Notification)
            .filter(
                models.Notification.userId == employer.id,
                models.Notification.relatedJobId == job_id,
            )
            .first()
        )
        assert notif is not None
        assert "rad" in notif.title.lower() or "rad" in notif.message.lower()
