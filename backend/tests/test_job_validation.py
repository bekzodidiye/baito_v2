"""A posting's fields carried no constraints, so the API accepted nonsense.

The one that cost money: salary "-500000". The parser strips the minus, so the
listing advertised a negative wage and hiring charged the employer 500,000.
"""

from .conftest import login, make_job, make_user

VALID = {
    "title": "Omborchi",
    "company": "Baito",
    "salary": "300000",
    "location": "Toshkent",
    "description": "Omborda yuk ortish va tushirish ishlari.",
}


def _post(client, **overrides):
    return client.post("/api/v1/jobs", json={**VALID, **overrides})


def test_a_valid_posting_is_still_accepted(client):
    login(client, make_user(role="employer", phone="+998911112201"))
    assert _post(client).status_code == 200


def test_negative_salary_is_rejected(client):
    """The one that charged real money."""
    login(client, make_user(role="employer", phone="+998911112202"))
    assert _post(client, salary="-500000").status_code == 422


def test_non_positive_salary_is_rejected(client):
    login(client, make_user(role="employer", phone="+998911112203"))
    assert _post(client, salary="0").status_code == 422


def test_negotiable_salary_is_still_allowed(client):
    """Text with no figure parses to zero and must not be caught by the above."""
    login(client, make_user(role="employer", phone="+998911112204"))
    assert _post(client, salary="Kelishilgan holda").status_code == 200


def test_blank_and_oversized_fields_are_rejected(client):
    login(client, make_user(role="employer", phone="+998911112206"))
    assert _post(client, title="").status_code == 422
    assert _post(client, title="x" * 5000).status_code == 422
    assert _post(client, company="").status_code == 422
    assert _post(client, location="").status_code == 422
    assert _post(client, description="qisqa").status_code == 422


def test_worker_count_must_be_a_sane_whole_number(client):
    login(client, make_user(role="employer", phone="+998911112207"))
    assert _post(client, neededWorkers="0").status_code == 422
    assert _post(client, neededWorkers="-3").status_code == 422
    assert _post(client, neededWorkers="9999").status_code == 422
    assert _post(client, neededWorkers="abc").status_code == 422


def test_an_edit_cannot_smuggle_past_the_rules(client):
    """JobUpdate re-declared every field as Optional, which dropped the
    constraints — so a clean posting could be edited into a bad one."""
    employer = make_user(role="employer", phone="+998911112208")
    login(client, employer)
    job_id = _post(client).json()["id"]

    for patch in ({"salary": "-500000"}, {"title": ""}, {"description": "qisqa"},
                  {"neededWorkers": "0"}):
        assert client.put(f"/api/v1/jobs/{job_id}", json=patch).status_code == 422

    assert client.put(f"/api/v1/jobs/{job_id}", json={"salary": "400000"}).status_code == 200


def test_a_row_written_before_the_rules_is_still_readable(client):
    """The constraints first went on JobBase, which the response models inherit.
    Every listing containing an older row then answered 500."""
    employer = make_user(role="employer", phone="+998911112209")
    make_job(employer.id, title="X", description="", salary="0", neededWorkers="0")

    login(client, make_user(role="worker", phone="+998911112210"))
    resp = client.get("/api/v1/jobs")
    assert resp.status_code == 200
    assert len(resp.json()) == 1


# ── Escrow ─────────────────────────────────────────────────────────────────

def test_a_salary_the_platform_cannot_escrow_is_refused(client):
    """"999000000" parses to zero, because it is over the sanity bound. Hiring
    then took nothing into escrow while the listing advertised the full amount,
    so the worker did the job owed nothing. One flag scored 40 against a
    threshold of 50, so a clean description let it straight through."""
    login(client, make_user(role="employer", phone="+998911112211"))
    resp = _post(client, salary="999000000")
    assert resp.status_code == 400
    assert "chegara" in resp.json()["detail"].lower()


def test_a_high_but_escrowable_salary_is_still_allowed(client):
    login(client, make_user(role="employer", phone="+998911112212"))
    assert _post(client, salary="60000000").status_code == 200


def test_hiring_refuses_a_salary_that_would_escrow_nothing(client):
    """Defence in depth, for a row that reached the table another way."""
    employer = make_user(role="employer", phone="+998911112213", balance=5_000_000)
    job = make_job(employer.id, salary="999000000")

    worker = make_user(role="worker", phone="+998911112214")
    login(client, worker)
    client.post(f"/api/v1/jobs/{job.id}/apply", json={})

    login(client, employer)
    apps = client.get("/api/v1/applications/employer").json()
    app_id = next(a["id"] for a in apps if a.get("jobId") == job.id)

    resp = client.post(f"/api/v1/applications/{app_id}/hire", json={})
    assert resp.status_code == 400
    assert "chegara" in resp.json()["detail"].lower()


def test_cancelling_a_job_returns_the_escrow_to_the_employer(client):
    """Cancelling released the workers and left the wage frozen: the employer
    never got it back and the worker was never paid it."""
    employer = make_user(role="employer", phone="+998911112215", balance=1_000_000)
    job = make_job(employer.id, salary="200000")

    worker = make_user(role="worker", phone="+998911112216")
    login(client, worker)
    client.post(f"/api/v1/jobs/{job.id}/apply", json={})

    login(client, employer)
    apps = client.get("/api/v1/applications/employer").json()
    app_id = next(a["id"] for a in apps if a.get("jobId") == job.id)
    assert client.post(f"/api/v1/applications/{app_id}/hire", json={}).status_code == 200
    assert client.get("/api/v1/users/me").json()["balance"] == 800_000

    resp = client.delete(f"/api/v1/jobs/{job.id}")
    assert resp.status_code == 200
    assert resp.json()["refunded"] == 200_000
    assert client.get("/api/v1/users/me").json()["balance"] == 1_000_000


def test_cancelling_returns_every_hold_not_just_the_first(client):
    """Hiring freezes the wage once per worker, so a job with several vacancies
    has several holds to return."""
    employer = make_user(role="employer", phone="+998911112217", balance=1_000_000)
    job = make_job(employer.id, salary="100000", neededWorkers="3")

    for phone in ("+998911112218", "+998911112219"):
        login(client, make_user(role="worker", phone=phone))
        client.post(f"/api/v1/jobs/{job.id}/apply", json={})

    login(client, employer)
    apps = [a for a in client.get("/api/v1/applications/employer").json()
            if a.get("jobId") == job.id]
    for a in apps:
        assert client.post(f"/api/v1/applications/{a['id']}/hire", json={}).status_code == 200
    assert client.get("/api/v1/users/me").json()["balance"] == 1_000_000 - 100_000 * len(apps)

    resp = client.delete(f"/api/v1/jobs/{job.id}")
    assert resp.json()["refunded"] == 100_000 * len(apps)
    assert client.get("/api/v1/users/me").json()["balance"] == 1_000_000
