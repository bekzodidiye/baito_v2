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


def test_a_nul_byte_is_refused_with_a_reason_not_a_crash(client):
    """A NUL byte reached PostgreSQL, which refused it in the driver — past every
    check the schema made. The writer saw "server error"; the log saw an
    unhandled exception. 422 is the honest answer."""
    login(client, make_user(role="employer", phone="+998911112220"))
    for field in ("title", "description", "location", "company"):
        resp = _post(client, **{field: VALID[field][:3] + "\x00" + VALID[field][3:]})
        assert resp.status_code == 422, f"{field} answered {resp.status_code}"


def test_other_control_characters_are_refused_too(client):
    login(client, make_user(role="employer", phone="+998911112221"))
    for ch in ("\x01", "\x1b", "\x7f"):
        assert _post(client, title=f"Omborchi{ch}").status_code == 422


def test_newlines_and_tabs_are_still_allowed(client):
    """A description is written on several lines. Refusing those would break
    every posting that has ever had a list in it."""
    login(client, make_user(role="employer", phone="+998911112222"))
    assert _post(client, description="Birinchi qator.\n\tIkkinchi qator.\r\nUchinchi.").status_code == 200


def test_real_text_from_real_alphabets_is_still_allowed(client):
    """The regression this fix could plausibly cause. Every one of these was
    accepted before the change and must stay accepted."""
    login(client, make_user(role="employer", phone="+998911112223"))
    for title in ("Omborchi 📦", "عامل مستودع", "Кладовщик", "Magasinier — café"):
        assert _post(client, title=title).status_code == 200, title
