"""Regression tests for the security findings fixed in this change.

Each test names the behaviour that used to be wrong, so a future refactor that
reintroduces it fails here rather than in production.
"""


import uuid

from app.core.config import settings
from app.db.session import SessionLocal
from app.models import User

from .conftest import TEST_PASSWORD, login, make_job, make_user


# ── Registration must prove phone ownership ────────────────────────────────

def test_registration_without_sms_verification_is_rejected(client):
    """POST /users used to accept any phone number outright."""
    resp = client.post("/api/v1/users", json={
        "name": "Yangi Ishchi",
        "phone": "+998901234599",
        "password": TEST_PASSWORD,
        "role": "worker",
    })
    assert resp.status_code == 400
    assert "tasdiqlanmagan" in resp.json()["detail"].lower()


def test_registration_succeeds_after_sms_verification(client):
    phone = "+998901234599"

    send = client.post("/api/v1/auth/send-sms", json={"phone": phone})
    assert send.status_code == 200
    code = send.json()["dev_code"]

    verify = client.post("/api/v1/auth/verify-sms", json={"phone": phone, "code": code})
    assert verify.status_code == 200
    token = verify.json()["verification_token"]

    resp = client.post("/api/v1/users", json={
        "name": "Yangi Ishchi",
        "phone": phone,
        "password": TEST_PASSWORD,
        "role": "worker",
        "verification_token": token,
    })
    assert resp.status_code == 200, resp.text
    assert resp.json()["phone"] == phone


def test_verification_grant_is_single_use(client):
    phone = "+998901234588"
    code = client.post("/api/v1/auth/send-sms", json={"phone": phone}).json()["dev_code"]
    token = client.post(
        "/api/v1/auth/verify-sms", json={"phone": phone, "code": code}
    ).json()["verification_token"]

    first = client.post("/api/v1/users", json={
        "name": "A", "phone": phone, "password": TEST_PASSWORD,
        "role": "worker", "verification_token": token,
    })
    assert first.status_code == 200

    second = client.post("/api/v1/users", json={
        "name": "B", "phone": "+998901234577", "password": TEST_PASSWORD,
        "role": "worker", "verification_token": token,
    })
    assert second.status_code == 400


def test_sms_response_never_contains_the_code_in_production(client, monkeypatch):
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    try:
        body = client.post("/api/v1/auth/send-sms", json={"phone": "+998901234566"}).json()
        assert "dev_code" not in body
    finally:
        monkeypatch.setattr(settings, "ENVIRONMENT", "test")


def test_public_registration_cannot_grant_admin(client):
    phone = "+998901234555"
    code = client.post("/api/v1/auth/send-sms", json={"phone": phone}).json()["dev_code"]
    token = client.post(
        "/api/v1/auth/verify-sms", json={"phone": phone, "code": code}
    ).json()["verification_token"]

    resp = client.post("/api/v1/users", json={
        "name": "Bosqinchi", "phone": phone, "password": TEST_PASSWORD,
        "role": "admin", "verification_token": token,
    })
    assert resp.status_code == 200
    assert resp.json()["role"] == "worker"


# ── Password policy ────────────────────────────────────────────────────────

def test_weak_passwords_are_refused(client):
    phone = "+998901234544"
    code = client.post("/api/v1/auth/send-sms", json={"phone": phone}).json()["dev_code"]
    token = client.post(
        "/api/v1/auth/verify-sms", json={"phone": phone, "code": code}
    ).json()["verification_token"]

    for weak in ("a", "1234567", "password", "12345678"):
        resp = client.post("/api/v1/users", json={
            "name": "X", "phone": phone, "password": weak,
            "role": "worker", "verification_token": token,
        })
        assert resp.status_code == 422, f"{weak!r} should be rejected"


def test_password_change_revokes_other_sessions(client):
    user = make_user(phone="+998901234533")
    login(client, user)

    # A second device.
    from fastapi.testclient import TestClient
    from app.main import app
    with TestClient(app) as other:
        other.post("/api/v1/auth/login",
                   data={"username": user.phone, "password": TEST_PASSWORD})
        assert other.get("/api/v1/users/me").status_code == 200

        resp = client.put("/api/v1/users/me/password", json={
            "current_password": TEST_PASSWORD,
            "new_password": "An0therStr0ngPass",
        })
        assert resp.status_code == 200
        assert resp.json()["revoked_sessions"] >= 1

        # The other device's refresh chain is dead too.
        assert other.post("/api/v1/auth/refresh").status_code == 401





def test_card_token_is_not_returned_to_the_client(client):
    user = make_user(phone="+998901234499")
    login(client, user)

    created = client.post("/api/v1/payments/cards", json={
        "type": "uzcard", "last4": "1234", "bank": "Kapitalbank", "token": "SECRET-TOKEN",
    })
    assert created.status_code == 200
    assert "token" not in created.json()

    listed = client.get("/api/v1/payments/cards").json()
    assert all("token" not in c for c in listed)


def test_withdrawal_is_idempotent(client):
    user = make_user(phone="+998901234488", balance=100_000)
    login(client, user)

    headers = {"Idempotency-Key": "abc-123"}
    first = client.post("/api/v1/payments/withdraw", json={"amount": 10_000}, headers=headers)
    second = client.post("/api/v1/payments/withdraw", json={"amount": 10_000}, headers=headers)

    assert first.status_code == 200 and second.status_code == 200
    assert first.json()["transaction_id"] == second.json()["transaction_id"]

    with SessionLocal() as db:
        assert db.query(User).filter(User.id == user.id).first().balance == 90_000


# ── Media access control ───────────────────────────────────────────────────

def test_private_media_is_not_readable_anonymously(client):
    from app.models import MediaFile
    from app.models.media_file import MediaVisibility

    owner = make_user(phone="+998901234477")
    key = "a" * 32 + ".webp"
    with SessionLocal() as db:
        db.add(MediaFile(objectKey=key, ownerId=owner.id,
                         visibility=MediaVisibility.PRIVATE, contentType="image/webp"))
        db.commit()

    assert client.get(f"/api/v1/media/{key}").status_code == 401


def test_a_chat_attachment_is_readable_by_the_other_participant_only(client):
    """Chat images were uploaded as 'job', which made them public.

    Anyone holding the URL could open one. Private would have been correct
    except that private means owner-only, and the whole point of sending an
    image in a chat is that the other person sees it.
    """
    from app.models import MediaFile
    from app.models.media_file import MediaVisibility

    worker = make_user(role="worker", phone="+998901234478")
    employer = make_user(role="employer", phone="+998901234479")
    outsider = make_user(role="worker", phone="+998901234480")

    key = "c" * 32 + ".webp"
    with SessionLocal() as db:
        db.add(MediaFile(objectKey=key, ownerId=worker.id,
                         visibility=MediaVisibility.PRIVATE, contentType="image/webp"))
        db.commit()

    # No conversation yet: the employer is a stranger like anyone else.
    login(client, employer)
    assert client.get(f"/api/v1/media/{key}").status_code == 403

    login(client, worker)
    client.post("/api/v1/chats", json={"employerId": employer.id})

    # Now they share one. Storage is not configured under test, so a 404 here
    # means the permission check passed and the fetch failed after it.
    login(client, employer)
    assert client.get(f"/api/v1/media/{key}").status_code != 403

    login(client, outsider)
    assert client.get(f"/api/v1/media/{key}").status_code == 403

    client.post("/api/v1/auth/logout")
    assert client.get(f"/api/v1/media/{key}").status_code == 401


def test_media_endpoint_refuses_path_traversal(client):
    for probe in ("../backups/dump.zip", "backups%2Fdump.zip", "..%2F..%2Fetc%2Fpasswd"):
        resp = client.get(f"/api/v1/media/{probe}")
        assert resp.status_code == 404


def test_identity_document_is_never_readable_by_chat_partner(client):
    """Even if users share a chat, identity documents (passports) must be 403."""
    from app.models import MediaFile, User
    from app.models.media_file import MediaVisibility

    worker = make_user(role="worker", phone="+998901234491")
    employer = make_user(role="employer", phone="+998901234492")

    passport_key = "d" * 32 + ".webp"
    with SessionLocal() as db:
        w = db.query(User).filter(User.id == worker.id).first()
        w.passportDocFront = f"/api/v1/media/{passport_key}"
        db.add(w)
        db.add(MediaFile(objectKey=passport_key, ownerId=worker.id,
                         visibility=MediaVisibility.PRIVATE, contentType="image/webp"))
        db.commit()

    # Worker and employer start a chat
    login(client, worker)
    client.post("/api/v1/chats", json={"employerId": employer.id})

    # Employer chats with worker, but attempting to fetch worker's passport is strictly forbidden (403)
    login(client, employer)
    assert client.get(f"/api/v1/media/{passport_key}").status_code == 403

    # Worker (owner) can access it (passes auth check)
    login(client, worker)
    assert client.get(f"/api/v1/media/{passport_key}").status_code != 403


# ── Privacy in job listings ────────────────────────────────────────────────

def test_hired_worker_phone_is_hidden_from_anonymous_visitors(client):
    from app.models import Application

    employer = make_user(role="employer", phone="+998901234466")
    worker = make_user(role="worker", phone="+998907654321")
    job = make_job(employer.id, neededWorkers="3")
    with SessionLocal() as db:
        db.add(Application(jobId=job.id, workerId=worker.id, status="hired"))
        db.commit()

    listing = client.get("/api/v1/jobs").json()
    entry = next(j for j in listing if j["id"] == job.id)
    assert entry["hiredWorkers"], "the hired worker should still be listed"
    assert entry["hiredWorkers"][0]["phone"] is None


def test_employer_job_history_is_not_publicly_enumerable(client):
    employer = make_user(role="employer", phone="+998901234455")
    make_job(employer.id)
    assert client.get(f"/api/v1/jobs?employer_id={employer.id}").status_code == 403


def test_hired_worker_phone_is_never_exposed_to_employer(client):
    from app.models import Application

    employer = make_user(role="employer", phone="+998901234477")
    worker = make_user(role="worker", phone="+998907654333")
    job = make_job(employer.id, neededWorkers="2")
    with SessionLocal() as db:
        db.add(Application(jobId=job.id, workerId=worker.id, status="hired"))
        db.commit()

    login(client, employer)
    my_jobs = client.get("/api/v1/jobs/my").json()
    job_entry = next(j for j in my_jobs if j["id"] == job.id)
    assert job_entry["hiredWorkers"]
    assert job_entry["hiredWorkers"][0]["phone"] is None

    emp_apps = client.get("/api/v1/applications/employer").json()
    app_entry = next(a for a in emp_apps if a["jobId"] == job.id)
    assert app_entry["workerPhone"] is None


def test_payout_receipt_not_readable_by_unrelated_chat_partner(client):
    """A bank transfer receipt is strictly for payout participants/admin, not unrelated chat partners."""
    from app.models import JobPayout, MediaFile
    from app.models.media_file import MediaVisibility

    employer = make_user(role="employer", phone="+998901234901")
    worker1 = make_user(role="worker", phone="+998901234902")
    worker2 = make_user(role="worker", phone="+998901234903")
    job = make_job(employer.id)

    receipt_key = "r" * 32 + ".webp"
    with SessionLocal() as db:
        db.add(MediaFile(objectKey=receipt_key, ownerId=employer.id,
                         visibility=MediaVisibility.PRIVATE, contentType="image/webp"))
        payout = JobPayout(
            id=str(uuid.uuid4()),
            jobId=job.id,
            workerId=worker1.id,
            employerId=employer.id,
            amount=50000,
            receiptUrl=f"/api/v1/media/{receipt_key}",
            paidByAdminId=employer.id,
        )
        db.add(payout)
        db.commit()

    # Worker 2 starts a chat with the employer on an unrelated topic
    login(client, worker2)
    client.post("/api/v1/chats", json={"employerId": employer.id})

    # Worker 2 tries to download Worker 1's payout receipt -> 403 Forbidden!
    assert client.get(f"/api/v1/media/{receipt_key}").status_code == 403

    # Worker 1 (the paid worker) can access it
    login(client, worker1)
    assert client.get(f"/api/v1/media/{receipt_key}").status_code != 403


def test_media_sent_in_chat_a_not_readable_by_chat_b_partner(client):
    """Media sent in Chat A cannot be read by a partner from Chat B even if both share a chat with owner."""
    from app.models import MediaFile
    from app.models.media_file import MediaVisibility

    employer = make_user(role="employer", phone="+998901234911")
    worker_a = make_user(role="worker", phone="+998901234912")
    worker_b = make_user(role="worker", phone="+998901234913")

    key = "e" * 32 + ".webp"
    with SessionLocal() as db:
        db.add(MediaFile(objectKey=key, ownerId=employer.id,
                         visibility=MediaVisibility.PRIVATE, contentType="image/webp"))
        db.commit()

    # Employer chats with Worker A
    login(client, worker_a)
    chat_a_res = client.post("/api/v1/chats", json={"employerId": employer.id}).json()
    chat_a_id = chat_a_res["id"]

    # Employer posts the media link inside Chat A
    login(client, employer)
    client.post(f"/api/v1/chats/{chat_a_id}/messages", json={"text": f"Here is the file: /api/v1/media/{key}"})

    # Employer also has a chat with Worker B
    login(client, worker_b)
    client.post("/api/v1/chats", json={"employerId": employer.id})

    # Worker B tries to access the file that was sent only to Worker A -> 403 Forbidden!
    assert client.get(f"/api/v1/media/{key}").status_code == 403

    # Worker A (the intended recipient in Chat A) can access it
    login(client, worker_a)
    assert client.get(f"/api/v1/media/{key}").status_code != 403




