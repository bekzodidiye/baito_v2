"""Nothing that puts two strangers together happens before the documents are checked.

``isVerified`` existed, the admin panel set it, and editing a document field
cleared it again — and no endpoint read it. An account could apply to shifts and
post them the minute it was created.

The two that matter are here. A worker applying is asking to turn up at a
stranger's address; an employer posting is putting that address in front of
workers and drawing on an escrow balance.
"""

import uuid

from app.models.job import JobStatus
from app.db.session import SessionLocal
from app.models.user import User

from .conftest import login, make_job, make_user


def _phone():
    return f"+9989{uuid.uuid4().int % 10**8:08d}"


def _set_verified(user_id: str, value: bool):
    with SessionLocal() as db:
        db.query(User).filter(User.id == user_id).first().isVerified = value
        db.commit()


JOB_BODY = {
    "title": "Ombor yordamchisi",
    "company": "Korzinka",
    "salary": "250000",
    "location": "Toshkent, Chilonzor",
    "description": "Yuklarni tushirish va joylash.",
}


# --- a worker applying -------------------------------------------------------

def test_an_unverified_worker_cannot_apply(client):
    employer = make_user(role="employer", phone=_phone())
    job = make_job(employer.id)
    worker = make_user(phone=_phone())
    _set_verified(worker.id, False)

    login(client, worker)
    resp = client.post(f"/api/v1/jobs/{job.id}/apply")

    assert resp.status_code == 403
    assert "tasdiqlanmagan" in resp.json()["detail"]


def test_a_verified_worker_still_can(client):
    employer = make_user(role="employer", phone=_phone())
    job = make_job(employer.id)
    worker = make_user(phone=_phone())
    _set_verified(worker.id, True)

    login(client, worker)
    resp = client.post(f"/api/v1/jobs/{job.id}/apply")

    assert resp.status_code == 200, resp.text


def test_nothing_is_written_when_the_application_is_refused(client):
    """A 403 that still left a row behind would be worse than no guard."""
    from app.models.application import Application

    employer = make_user(role="employer", phone=_phone())
    job = make_job(employer.id)
    worker = make_user(phone=_phone())
    _set_verified(worker.id, False)

    login(client, worker)
    client.post(f"/api/v1/jobs/{job.id}/apply")

    with SessionLocal() as db:
        assert db.query(Application).filter(Application.jobId == job.id).count() == 0


def test_losing_verification_takes_the_ability_with_it(client):
    """Editing a document clears the flag (users.py), so this is reachable."""
    employer = make_user(role="employer", phone=_phone())
    first = make_job(employer.id)
    second = make_job(employer.id)
    worker = make_user(phone=_phone())
    _set_verified(worker.id, True)

    login(client, worker)
    assert client.post(f"/api/v1/jobs/{first.id}/apply").status_code == 200

    _set_verified(worker.id, False)
    assert client.post(f"/api/v1/jobs/{second.id}/apply").status_code == 403


# --- an employer posting -----------------------------------------------------

def test_an_unverified_employer_cannot_post(client):
    employer = make_user(role="employer", phone=_phone())
    _set_verified(employer.id, False)

    login(client, employer)
    resp = client.post("/api/v1/jobs", json=JOB_BODY)

    assert resp.status_code == 403
    assert "tasdiqlanmagan" in resp.json()["detail"]


def test_a_verified_employer_still_can(client):
    employer = make_user(role="employer", phone=_phone())
    _set_verified(employer.id, True)

    login(client, employer)
    resp = client.post("/api/v1/jobs", json=JOB_BODY)

    assert resp.status_code == 200, resp.text


def test_no_posting_is_created_when_it_is_refused(client):
    from app.models.job import Job

    employer = make_user(role="employer", phone=_phone())
    _set_verified(employer.id, False)

    login(client, employer)
    client.post("/api/v1/jobs", json=JOB_BODY)

    with SessionLocal() as db:
        assert db.query(Job).filter(Job.employerId == employer.id).count() == 0


# --- and the people doing the verifying ---------------------------------------

def test_an_administrator_is_not_held_up_by_it(client):
    """Admins are made by create_accounts.py, which has no document step.

    Holding them to a check only they can lift would lock the platform out of
    its own moderation.
    """
    admin = make_user(role="admin", phone=_phone())
    _set_verified(admin.id, False)

    login(client, admin)
    resp = client.post("/api/v1/jobs", json=JOB_BODY)

    assert resp.status_code == 200, resp.text


def test_the_refusal_says_what_to_do_about_it(client):
    employer = make_user(role="employer", phone=_phone())
    _set_verified(employer.id, False)

    login(client, employer)
    detail = client.post("/api/v1/jobs", json=JOB_BODY).json()["detail"]

    # Not a bare "forbidden": the account can fix this, and is told so.
    assert "Hujjat" in detail and "tasdiq" in detail.lower()
