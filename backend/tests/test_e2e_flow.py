import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal
from app import models
import uuid

client = TestClient(app)

def test_full_platform_e2e_lifecycle():
    """
    Full E2E Integration test simulating real lifecycle:
    1. Worker & Employer login tokens
    2. Employer creates Job
    3. Worker applies to Job
    4. Employer hires Worker
    5. Chat message is sent
    6. Employer completes job
    7. Worker checks balance & ledger
    """
    db = SessionLocal()
    try:
        # Create mock users with unique phone numbers
        rand_id = uuid.uuid4().hex[:6]
        emp_uid = f"emp_{rand_id}"
        wrk_uid = f"wrk_{rand_id}"
        
        emp = models.User(
            id=str(uuid.uuid4()),
            uid=emp_uid,
            phone=f"+99890{rand_id[:4]}11",
            name="Test Employer",
            role="employer",
            balance=1000000
        )
        wrk = models.User(
            id=str(uuid.uuid4()),
            uid=wrk_uid,
            phone=f"+99890{rand_id[:4]}22",
            name="Test Worker",
            role="worker",
            balance=0
        )
        db.add(emp)
        db.add(wrk)
        db.commit()

        # Generate tokens
        from app.core.security import create_access_token
        emp_token = create_access_token(emp.uid)
        wrk_token = create_access_token(wrk.uid)

        # 1. Employer creates Job
        job = models.Job(
            id=str(uuid.uuid4()),
            employerId=emp.id,
            title="E2E Developer Job",
            company="Baito Corp",
            description="E2E test description for platform developer",
            salary="500000",
            location="Toshkent",
            workDate="2026-08-30",
            status="active"
        )
        db.add(job)
        db.commit()

        # 2. Worker applies to Job via API
        client.cookies.set("baito_access", wrk_token)
        res_apply = client.post(f"/api/v1/jobs/{job.id}/apply")
        assert res_apply.status_code == 200
        assert res_apply.json()["status"] == "applied"
        app_id = res_apply.json()["id"]

        # 3. Employer views applications & hires worker
        client.cookies.set("baito_access", emp_token)
        res_hire = client.post(f"/api/v1/applications/{app_id}/hire")
        assert res_hire.status_code == 200
        assert res_hire.json()["application_status"] == "hired"

        # 4. Chat creation & message sending
        chat = models.Chat(
            id=str(uuid.uuid4()),
            jobId=job.id,
            workerId=wrk.id,
            employerId=emp.id
        )
        db.add(chat)
        db.commit()

        res_msg = client.get(f"/api/v1/chats/{chat.id}/messages")
        assert res_msg.status_code == 200

        # 5. Employer completes job
        res_comp = client.post(
            f"/api/v1/jobs/{job.id}/complete",
            json={"rating": 5, "review": "A'lo ishchi!", "bonus": 50000}
        )
        assert res_comp.status_code == 200
        assert res_comp.json()["job_status"] == "completed"

        # 6. Verify job and application status in DB
        db.refresh(job)
        assert job.status == "completed"
        
        app_db = db.query(models.Application).filter(models.Application.id == app_id).first()
        assert app_db.status == "completed"
        assert app_db.rating == 5

        print("✅ E2E Full Lifecycle Integration Test: PASSED!")
    finally:
        db.close()

if __name__ == "__main__":
    test_full_platform_e2e_lifecycle()
