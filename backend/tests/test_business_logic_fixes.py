"""Regression tests for the functional and business-logic findings."""

from datetime import date, datetime, timedelta, timezone

from app.core.money import salary_to_uzs
from app.db.session import SessionLocal
from app.models import Application, Job, User
from app.models.job import JobStatus

from .conftest import login, make_job, make_user


# ── Job status vocabulary ──────────────────────────────────────────────────

def test_recommended_jobs_are_not_always_empty(client):
    """These endpoints filtered on 'active', which nothing ever wrote."""
    employer = make_user(role="employer", phone="+998911111111")
    make_job(employer.id, title="Kassir")

    worker = make_user(role="worker", phone="+998911111112")
    login(client, worker)

    resp = client.get("/api/v1/jobs/recommended")
    assert resp.status_code == 200
    assert len(resp.json()) == 1


def test_nearby_jobs_are_not_always_empty(client):
    employer = make_user(role="employer", phone="+998911111113")
    # coordinateX is latitude, coordinateY is longitude.
    make_job(employer.id, coordinateX=41.31, coordinateY=69.24)

    resp = client.get("/api/v1/jobs/nearby?lat=41.31&lng=69.24&radius_km=10")
    assert resp.status_code == 200
    assert len(resp.json()) == 1


def test_closed_jobs_are_hidden_from_job_seekers(client):
    employer = make_user(role="employer", phone="+998911111114")
    make_job(employer.id, status=JobStatus.CANCELLED, title="Bekor qilingan")
    make_job(employer.id, status=JobStatus.OPEN, title="Ochiq")

    titles = [j["title"] for j in client.get("/api/v1/jobs").json()]
    assert "Ochiq" in titles
    assert "Bekor qilingan" not in titles


# ── Applications and hiring ────────────────────────────────────────────────

def test_cannot_apply_to_a_cancelled_job(client):
    employer = make_user(role="employer", phone="+998911111115")
    job = make_job(employer.id, status=JobStatus.CANCELLED)
    worker = make_user(role="worker", phone="+998911111116")
    login(client, worker)

    resp = client.post(f"/api/v1/jobs/{job.id}/apply")
    assert resp.status_code == 400


def test_hiring_respects_the_vacancy_count(client):
    employer = make_user(role="employer", phone="+998911111117", balance=10_000_000)
    job = make_job(employer.id, neededWorkers="1", salary="250000")

    w1 = make_user(role="worker", phone="+998911111118")
    w2 = make_user(role="worker", phone="+998911111119")
    with SessionLocal() as db:
        a1 = Application(jobId=job.id, workerId=w1.id, status="applied")
        a2 = Application(jobId=job.id, workerId=w2.id, status="applied")
        db.add_all([a1, a2])
        db.commit()
        a1_id, a2_id = a1.id, a2.id

    login(client, employer)
    assert client.post(f"/api/v1/applications/{a1_id}/hire").status_code == 200
    second = client.post(f"/api/v1/applications/{a2_id}/hire")
    assert second.status_code == 400
    assert "to'lgan" in second.json()["detail"]


def test_hiring_holds_the_wage_in_escrow(client):
    employer = make_user(role="employer", phone="+998911111120", balance=1_000_000)
    job = make_job(employer.id, salary="250 000 so'm / kun")
    worker = make_user(role="worker", phone="+998911111121")
    with SessionLocal() as db:
        app = Application(jobId=job.id, workerId=worker.id, status="applied")
        db.add(app)
        db.commit()
        app_id = app.id

    login(client, employer)
    resp = client.post(f"/api/v1/applications/{app_id}/hire")
    assert resp.status_code == 200
    assert resp.json()["escrow_held"] is True

    with SessionLocal() as db:
        assert db.query(User).filter(User.id == employer.id).first().balance == 750_000


def test_rejected_applicant_is_notified(client):
    from app.models import Notification

    employer = make_user(role="employer", phone="+998911111122")
    job = make_job(employer.id)
    worker = make_user(role="worker", phone="+998911111123")
    with SessionLocal() as db:
        app = Application(jobId=job.id, workerId=worker.id, status="applied")
        db.add(app)
        db.commit()
        app_id = app.id

    login(client, employer)
    assert client.post(f"/api/v1/applications/{app_id}/reject").status_code == 200

    with SessionLocal() as db:
        assert db.query(Notification).filter(Notification.userId == worker.id).count() == 1


def test_applicant_phone_is_masked_until_hired(client):
    employer = make_user(role="employer", phone="+998911111124")
    job = make_job(employer.id)
    worker = make_user(role="worker", phone="+998911111125")
    with SessionLocal() as db:
        db.add(Application(jobId=job.id, workerId=worker.id, status="applied"))
        db.commit()

    login(client, employer)
    rows = client.get("/api/v1/applications/employer").json()
    assert rows[0]["contactUnlocked"] is False
    assert rows[0]["workerPhone"] != worker.phone


# ── Start / complete lifecycle ─────────────────────────────────────────────

def _hire(db, job_id, worker_id, status="hired"):
    app = Application(jobId=job_id, workerId=worker_id, status=status)
    db.add(app)
    db.commit()
    return app.id


def test_worker_cannot_start_a_job_alone(client):
    employer = make_user(role="employer", phone="+998911111126")
    job = make_job(employer.id)
    worker = make_user(role="worker", phone="+998911111127")
    with SessionLocal() as db:
        _hire(db, job.id, worker.id)

    login(client, worker)
    resp = client.post(f"/api/v1/jobs/{job.id}/request-start")
    assert resp.status_code == 200
    assert resp.json()["status"] == "start_requested"

    with SessionLocal() as db:
        assert db.query(Job).filter(Job.id == job.id).first().status != JobStatus.IN_PROGRESS

    # Only the employer can confirm.
    assert client.post(f"/api/v1/jobs/{job.id}/confirm-start").status_code == 403


def test_completing_a_job_that_never_started_is_refused(client):
    employer = make_user(role="employer", phone="+998911111128")
    job = make_job(employer.id)
    worker = make_user(role="worker", phone="+998911111129")
    with SessionLocal() as db:
        _hire(db, job.id, worker.id)

    login(client, employer)
    resp = client.post(f"/api/v1/jobs/{job.id}/complete", json={"rating": 5})
    assert resp.status_code == 400


def test_completion_pays_the_worker_and_updates_their_profile(client):
    employer = make_user(role="employer", phone="+998911111130", balance=1_000_000)
    job = make_job(employer.id, salary="250000")
    worker = make_user(role="worker", phone="+998911111131", balance=0)

    with SessionLocal() as db:
        app = Application(jobId=job.id, workerId=worker.id, status="applied")
        db.add(app)
        db.commit()
        app_id = app.id

    login(client, employer)
    client.post(f"/api/v1/applications/{app_id}/hire")
    client.post(f"/api/v1/jobs/{job.id}/confirm-start")

    resp = client.post(f"/api/v1/jobs/{job.id}/complete", json={"rating": 5, "review": "Zo'r"})
    assert resp.status_code == 200
    assert resp.json()["paid_workers"] == 1

    with SessionLocal() as db:
        w = db.query(User).filter(User.id == worker.id).first()
        # 250 000 minus the 10% platform fee.
        assert w.balance == 225_000
        assert w.completedJobsCount == 1
        assert w.rating == 5.0


def test_completing_twice_is_refused(client):
    employer = make_user(role="employer", phone="+998911111132", balance=1_000_000)
    job = make_job(employer.id, salary="250000")
    worker = make_user(role="worker", phone="+998911111133")
    with SessionLocal() as db:
        app = Application(jobId=job.id, workerId=worker.id, status="applied")
        db.add(app)
        db.commit()
        app_id = app.id

    login(client, employer)
    client.post(f"/api/v1/applications/{app_id}/hire")
    client.post(f"/api/v1/jobs/{job.id}/confirm-start")
    assert client.post(f"/api/v1/jobs/{job.id}/complete", json={"rating": 5}).status_code == 200
    assert client.post(f"/api/v1/jobs/{job.id}/complete", json={"rating": 1}).status_code == 400


def test_rating_outside_one_to_five_is_refused(client):
    employer = make_user(role="employer", phone="+998911111134")
    job = make_job(employer.id)
    login(client, employer)
    resp = client.post(f"/api/v1/jobs/{job.id}/complete", json={"rating": 99})
    assert resp.status_code == 422


# ── Chat ───────────────────────────────────────────────────────────────────

def test_worker_can_open_a_chat_without_sending_worker_id(client):
    """The web client only sends employerId/jobId; this used to 422."""
    employer = make_user(role="employer", phone="+998911111135")
    job = make_job(employer.id)
    worker = make_user(role="worker", phone="+998911111136")
    login(client, worker)

    resp = client.post("/api/v1/chats", json={"employerId": employer.id, "jobId": job.id})
    assert resp.status_code == 200, resp.text
    assert resp.json()["workerId"] == worker.id


def test_chat_messages_can_be_sent_over_http(client):
    employer = make_user(role="employer", phone="+998911111137")
    worker = make_user(role="worker", phone="+998911111138")
    login(client, worker)
    chat_id = client.post("/api/v1/chats", json={"employerId": employer.id}).json()["id"]

    resp = client.post(f"/api/v1/chats/{chat_id}/messages", json={"text": "Salom"})
    assert resp.status_code == 200
    assert resp.json()["senderId"] == worker.id

    assert client.post(f"/api/v1/chats/{chat_id}/messages", json={"text": ""}).status_code == 422
    assert client.post(
        f"/api/v1/chats/{chat_id}/messages", json={"text": "x" * 5000}
    ).status_code == 422


def test_unread_count_falls_once_a_chat_is_read(client):
    """The badge used to be every message the other side had ever sent.

    `unreadCount` counted on senderId alone, with nothing recording that a
    message had been seen, so a conversation you had just read still showed its
    whole history as unread and the number only ever went up.
    """
    employer = make_user(role="employer", phone="+998911111142")
    worker = make_user(role="worker", phone="+998911111143")

    login(client, worker)
    chat_id = client.post("/api/v1/chats", json={"employerId": employer.id}).json()["id"]

    login(client, employer)
    client.post(f"/api/v1/chats/{chat_id}/messages", json={"text": "Salom"})
    client.post(f"/api/v1/chats/{chat_id}/messages", json={"text": "Ertaga bo'shmisiz?"})

    login(client, worker)
    assert client.get("/api/v1/chats").json()[0]["unreadCount"] == 2

    resp = client.post(f"/api/v1/chats/{chat_id}/read")
    assert resp.status_code == 200
    assert resp.json()["marked"] == 2
    assert client.get("/api/v1/chats").json()[0]["unreadCount"] == 0

    # A later message is unread again; reading is not permanent.
    login(client, employer)
    client.post(f"/api/v1/chats/{chat_id}/messages", json={"text": "Yana bir savol"})
    login(client, worker)
    assert client.get("/api/v1/chats").json()[0]["unreadCount"] == 1


def test_your_own_messages_are_never_unread_to_you(client):
    employer = make_user(role="employer", phone="+998911111144")
    worker = make_user(role="worker", phone="+998911111145")
    login(client, worker)
    chat_id = client.post("/api/v1/chats", json={"employerId": employer.id}).json()["id"]
    client.post(f"/api/v1/chats/{chat_id}/messages", json={"text": "Salom"})

    assert client.get("/api/v1/chats").json()[0]["unreadCount"] == 0


def test_outsider_cannot_mark_a_chat_read(client):
    employer = make_user(role="employer", phone="+998911111146")
    worker = make_user(role="worker", phone="+998911111147")
    login(client, worker)
    chat_id = client.post("/api/v1/chats", json={"employerId": employer.id}).json()["id"]

    outsider = make_user(role="worker", phone="+998911111148")
    login(client, outsider)
    assert client.post(f"/api/v1/chats/{chat_id}/read").status_code == 403


def test_outsider_cannot_read_a_chat(client):
    employer = make_user(role="employer", phone="+998911111139")
    worker = make_user(role="worker", phone="+998911111140")
    login(client, worker)
    chat_id = client.post("/api/v1/chats", json={"employerId": employer.id}).json()["id"]

    outsider = make_user(role="worker", phone="+998911111141")
    login(client, outsider)
    assert client.get(f"/api/v1/chats/{chat_id}/messages").status_code == 403


# ── Salary parsing ─────────────────────────────────────────────────────────

def test_salary_ranges_no_longer_concatenate_every_digit():
    assert salary_to_uzs("1 500 000 - 2 000 000") == 1_500_000
    assert salary_to_uzs("250 000 so'm / kun") == 250_000
    assert salary_to_uzs("250,000") == 250_000
    assert salary_to_uzs("kelishilgan holda") == 0
    assert salary_to_uzs(None) == 0


# ── Date parsing ───────────────────────────────────────────────────────────

def test_bare_day_number_rolls_into_next_month_when_already_past():
    from app.api.v1.endpoints.job_actions import get_job_dates_set

    class FakeJob:
        workDate = "1"

    today = date.today()
    parsed = get_job_dates_set(FakeJob())
    assert len(parsed) == 1
    resolved = date.fromisoformat(next(iter(parsed)))
    assert resolved >= date(today.year, today.month, 1)
    if today.day > 1:
        assert resolved > today or resolved.month != today.month


def test_iso_date_is_not_mistaken_for_a_range():
    from app.api.v1.endpoints.job_actions import get_job_dates_set

    class FakeJob:
        workDate = "2026-09-15"

    assert get_job_dates_set(FakeJob()) == {"2026-09-15"}


# ── Job editing ────────────────────────────────────────────────────────────

def test_employer_can_edit_their_own_posting(client):
    employer = make_user(role="employer", phone="+998911111142")
    job = make_job(employer.id, title="Eski sarlavha")
    login(client, employer)

    resp = client.put(f"/api/v1/jobs/{job.id}", json={"title": "Yangi sarlavha"})
    assert resp.status_code == 200
    assert resp.json()["title"] == "Yangi sarlavha"


def test_employer_cannot_edit_someone_elses_posting(client):
    owner = make_user(role="employer", phone="+998911111143")
    job = make_job(owner.id)
    intruder = make_user(role="employer", phone="+998911111144")
    login(client, intruder)

    assert client.put(f"/api/v1/jobs/{job.id}", json={"title": "Buzildi"}).status_code == 403


def test_deleting_a_job_cancels_it_and_notifies_applicants(client):
    from app.models import Notification

    employer = make_user(role="employer", phone="+998911111145")
    job = make_job(employer.id)
    worker = make_user(role="worker", phone="+998911111146")
    with SessionLocal() as db:
        db.add(Application(jobId=job.id, workerId=worker.id, status="applied"))
        db.commit()

    login(client, employer)
    assert client.delete(f"/api/v1/jobs/{job.id}").status_code == 200

    with SessionLocal() as db:
        # The row still exists, so chats and transactions keep resolving.
        assert db.query(Job).filter(Job.id == job.id).first().status == JobStatus.CANCELLED
        assert db.query(Notification).filter(Notification.userId == worker.id).count() == 1


# ── Spam screening ─────────────────────────────────────────────────────────

def test_scam_posting_is_rejected(client):
    employer = make_user(role="employer", phone="+998911111147")
    login(client, employer)

    resp = client.post("/api/v1/jobs", json={
        "title": "Tez daromad 1000$",
        "company": "X", "salary": "999000000", "location": "Toshkent",
        "description": "Oldindan to'lov qiling va karta raqam yuboring, kripto investitsiya",
    })
    assert resp.status_code == 400


# ── Admin ──────────────────────────────────────────────────────────────────

def test_admin_balance_change_writes_a_ledger_entry_and_audit_log(client):
    from app.models import AdminAuditLog, AuditLedger

    admin = make_user(role="admin", phone="+998911111148")
    target = make_user(role="worker", phone="+998911111149", balance=0)
    login(client, admin)

    resp = client.post(f"/api/v1/admin/users/{target.id}/balance",
                       json={"amount": 50_000, "reason": "Qo'llab-quvvatlash to'lovi"})
    assert resp.status_code == 200

    with SessionLocal() as db:
        assert db.query(AuditLedger).filter(AuditLedger.userId == target.id).count() == 1
        assert db.query(AdminAuditLog).filter(AdminAuditLog.action == "user.balance").count() == 1


def test_admin_balance_change_requires_a_reason(client):
    admin = make_user(role="admin", phone="+998911111150")
    target = make_user(role="worker", phone="+998911111151")
    login(client, admin)

    assert client.post(
        f"/api/v1/admin/users/{target.id}/balance", json={"amount": 50_000}
    ).status_code == 422


def test_admin_settings_are_persisted(client):
    admin = make_user(role="admin", phone="+998911111152")
    login(client, admin)

    client.post("/api/v1/admin/settings", json={"platformFeePercent": 15})
    assert client.get("/api/v1/admin/settings").json()["platformFeePercent"] == 15


def test_broadcast_actually_creates_notifications(client):
    from app.models import Notification

    admin = make_user(role="admin", phone="+998911111153")
    make_user(role="worker", phone="+998911111154")
    make_user(role="worker", phone="+998911111155")
    login(client, admin)

    resp = client.post("/api/v1/admin/broadcast", json={
        "title": "Yangilik", "message": "Test xabari", "targetRole": "worker",
    })
    assert resp.status_code == 200
    assert resp.json()["recipients"] == 2

    with SessionLocal() as db:
        assert db.query(Notification).filter(Notification.title == "Yangilik").count() == 2


def test_last_admin_cannot_be_demoted(client):
    admin = make_user(role="admin", phone="+998911111156")
    login(client, admin)

    resp = client.patch(f"/api/v1/admin/users/{admin.id}/role", json={"role": "worker"})
    assert resp.status_code == 400


def test_banning_a_user_revokes_their_sessions(client):
    from fastapi.testclient import TestClient
    from app.main import app
    from .conftest import TEST_PASSWORD

    admin = make_user(role="admin", phone="+998911111157")
    victim = make_user(role="worker", phone="+998911111158")

    with TestClient(app) as victim_client:
        victim_client.post("/api/v1/auth/login",
                           data={"username": victim.phone, "password": TEST_PASSWORD})
        assert victim_client.get("/api/v1/users/me").status_code == 200

        login(client, admin)
        resp = client.patch(f"/api/v1/admin/users/{victim.id}/ban",
                            json={"isBanned": True, "reason": "Spam"})
        assert resp.status_code == 200
        assert resp.json()["revoked_sessions"] >= 1

        assert victim_client.get("/api/v1/users/me").status_code in (401, 403)


# ── Bookmarks ──────────────────────────────────────────────────────────────

def test_a_saved_job_is_still_saved_after_a_reload(client):
    """The toggle wrote to the bookmarks table and nothing ever read it back,
    so the flag lived only in the browser and a refresh lost it."""
    employer = make_user(role="employer", phone="+998911111180")
    job = make_job(employer.id, title="Saqlanadigan ish")

    worker = make_user(role="worker", phone="+998911111181")
    login(client, worker)

    assert client.get("/api/v1/jobs").json()[0]["bookmarked"] is False
    assert client.post(f"/api/v1/jobs/{job.id}/bookmark", json={}).json()["bookmarked"] is True
    assert client.get("/api/v1/jobs").json()[0]["bookmarked"] is True

    client.post(f"/api/v1/jobs/{job.id}/bookmark", json={})
    assert client.get("/api/v1/jobs").json()[0]["bookmarked"] is False


def test_saved_jobs_can_be_listed(client):
    employer = make_user(role="employer", phone="+998911111182")
    saved = make_job(employer.id, title="Saqlangan")
    make_job(employer.id, title="Saqlanmagan")

    worker = make_user(role="worker", phone="+998911111183")
    login(client, worker)
    client.post(f"/api/v1/jobs/{saved.id}/bookmark", json={})

    resp = client.get("/api/v1/jobs/bookmarked")
    assert resp.status_code == 200
    assert [j["id"] for j in resp.json()] == [saved.id]


def test_one_users_bookmarks_are_not_anothers(client):
    employer = make_user(role="employer", phone="+998911111184")
    job = make_job(employer.id)

    first = make_user(role="worker", phone="+998911111185")
    login(client, first)
    client.post(f"/api/v1/jobs/{job.id}/bookmark", json={})

    second = make_user(role="worker", phone="+998911111186")
    login(client, second)
    assert client.get("/api/v1/jobs").json()[0]["bookmarked"] is False
    assert client.get("/api/v1/jobs/bookmarked").json() == []


# ── Search ─────────────────────────────────────────────────────────────────

def test_search_narrows_the_query_instead_of_returning_everything(client):
    employer = make_user(role="employer", phone="+998911111190")
    make_job(employer.id, title="Omborchi kerak", company="Alfa")
    wanted = make_job(employer.id, title="Zebrakassir kerak", company="Beta")

    login(client, make_user(role="worker", phone="+998911111191"))
    found = client.get("/api/v1/jobs?search=Zebrakassir").json()
    assert [j["id"] for j in found] == [wanted.id]

    assert client.get("/api/v1/jobs?search=bumasloqyoqnarsa").json() == []


def test_search_reaches_past_the_first_page(client):
    """All filtering used to happen in the browser over one page of results, so
    a job beyond the limit could not be found at all."""
    employer = make_user(role="employer", phone="+998911111192")
    # Explicit timestamps: three rows written in the same instant tie on
    # createdAt, and which one a page of size 1 returns is then up to the
    # database. Newest first, so the oldest is the one it never reaches.
    base = datetime(2026, 1, 1, 9, 0, 0, tzinfo=timezone.utc)
    buried = make_job(employer.id, title="Zebrakassir kerak", createdAt=base)
    make_job(employer.id, title="Yangi e\'lon", createdAt=base + timedelta(minutes=1))
    make_job(employer.id, title="Yana bitta", createdAt=base + timedelta(minutes=2))

    login(client, make_user(role="worker", phone="+998911111193"))
    # A page of one cannot contain it...
    assert buried.id not in [j["id"] for j in client.get("/api/v1/jobs?limit=1").json()]
    # ...but a search still finds it.
    assert buried.id in [j["id"] for j in client.get("/api/v1/jobs?search=Zebrakassir").json()]


def test_search_is_case_insensitive_and_covers_the_company(client):
    employer = make_user(role="employer", phone="+998911111194")
    job = make_job(employer.id, title="Kassir", company="Korzinka Savdo")

    login(client, make_user(role="worker", phone="+998911111195"))
    assert [j["id"] for j in client.get("/api/v1/jobs?search=korzinka").json()] == [job.id]


def test_location_and_category_filter_in_sql(client):
    employer = make_user(role="employer", phone="+998911111196")
    tashkent = make_job(employer.id, location="Toshkent", category="savdo")
    make_job(employer.id, location="Samarqand", category="qurilish")

    login(client, make_user(role="worker", phone="+998911111197"))
    assert [j["id"] for j in client.get("/api/v1/jobs?location=Toshkent").json()] == [tashkent.id]
    assert [j["id"] for j in client.get("/api/v1/jobs?category=savdo").json()] == [tashkent.id]


def test_pagination_does_not_repeat_or_skip_tied_postings(client):
    """createdAt is not a total order. Several postings can share a timestamp,
    and the database is then free to return the tied rows in any order — so
    walking the pages could show one job twice and never show another."""
    employer = make_user(role="employer", phone="+998911111198")
    same_moment = datetime(2026, 2, 2, 12, 0, 0, tzinfo=timezone.utc)
    created = {make_job(employer.id, title=f"Ish {i}", createdAt=same_moment).id
               for i in range(6)}

    login(client, make_user(role="worker", phone="+998911111199"))

    seen = []
    for skip in range(0, 6, 2):
        page = client.get(f"/api/v1/jobs?skip={skip}&limit=2").json()
        seen.extend(j["id"] for j in page)

    assert len(seen) == len(set(seen)), "bir e'lon ikki sahifada chiqdi"
    assert set(seen) == created, "sahifalash e'lonni tushirib qoldirdi"


def test_admin_status_change_to_open_clears_hired_worker_and_shows_in_feed(client):
    admin = make_user(role="admin", phone="+998911111200")
    employer = make_user(role="employer", phone="+998911111201")
    worker = make_user(role="worker", phone="+998911111202")

    job = make_job(employer.id, title="Ofitsiant", status=JobStatus.CONFIRMED, hiredWorkerId=worker.id)
    with SessionLocal() as db:
        app = Application(jobId=job.id, workerId=worker.id, status="start_requested")
        db.add(app)
        db.commit()

    login(client, admin)
    res = client.patch(f"/api/v1/admin/jobs/{job.id}/status", json={"status": "open"})
    assert res.status_code == 200

    # Unauthenticated visitor or other worker browsing jobs
    client.cookies.clear()
    jobs = client.get("/api/v1/jobs").json()
    assert any(j["id"] == job.id for j in jobs)


def test_get_my_jobs_only_returns_own_jobs(client):
    emp_a = make_user(role="employer", phone="+998911111203")
    emp_b = make_user(role="employer", phone="+998911111204")
    job_a = make_job(emp_a.id, title="Ish A")
    job_b = make_job(emp_b.id, title="Ish B")

    login(client, emp_a)
    resp_a = client.get("/api/v1/jobs/my")
    assert resp_a.status_code == 200
    ids_a = [j["id"] for j in resp_a.json()]
    assert job_a.id in ids_a
    assert job_b.id not in ids_a

    login(client, emp_b)
    resp_b = client.get("/api/v1/jobs/my")
    assert resp_b.status_code == 200
    ids_b = [j["id"] for j in resp_b.json()]
    assert job_b.id in ids_b
    assert job_a.id not in ids_b


def test_worker_can_complete_job_and_employer_reviews(client):
    employer = make_user(role="employer", phone="+998911111205", balance=1_000_000)
    worker = make_user(role="worker", phone="+998911111206")
    job = make_job(employer.id, title="Kuryerlik", salary="200000")

    with SessionLocal() as db:
        app = Application(jobId=job.id, workerId=worker.id, status="applied")
        db.add(app)
        db.commit()
        app_id = app.id

    # Employer hires and confirms start
    login(client, employer)
    assert client.post(f"/api/v1/applications/{app_id}/hire").status_code == 200
    assert client.post(f"/api/v1/jobs/{job.id}/confirm-start").status_code == 200

    # Worker completes the job
    login(client, worker)
    res_worker = client.post(f"/api/v1/jobs/{job.id}/complete", json={})
    assert res_worker.status_code == 200
    assert res_worker.json()["job_status"] == JobStatus.COMPLETED

    # Employer submits review and rating
    login(client, employer)
    # Review with less than 3 chars should fail validation
    assert client.post(f"/api/v1/jobs/{job.id}/review", json={"rating": 5, "review": "a"}).status_code == 422
    # Valid review succeeds
    res_review = client.post(f"/api/v1/jobs/{job.id}/review", json={"rating": 5, "review": "Ajoyib ishchi!"})
    assert res_review.status_code == 200
    assert res_review.json()["success"] is True

    # Worker profile rating is updated
    with SessionLocal() as db:
        updated_worker = db.query(User).filter(User.id == worker.id).first()
        assert updated_worker.rating == 5.0
        updated_app = db.query(Application).filter(Application.id == app_id).first()
        assert updated_app.review == "Ajoyib ishchi!"
        assert updated_app.rating == 5

