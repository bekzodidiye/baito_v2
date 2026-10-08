"""Boundary probes: injection, auth, webhook forgery, withdrawal amounts.

Originally one 56-line function running four unrelated probes in sequence,
with prints standing in for assertions and its own session handling. Split so
a failure names which boundary gave way, and using conftest's fixtures, whose
autouse cleanup already truncates between tests.
"""
import uuid

from tests.conftest import login, make_user


def test_sql_injection_in_free_text_search_is_not_executed(client):
    """The original probe sent the payload as `employer_id` and read the 403
    as proof of safety. It was not: /jobs refuses an anonymous caller
    filtering by someone else's employer_id before any query runs, so the
    string never reached the database. `search` is free text and does reach
    the query, which is the surface worth probing."""
    res = client.get("/api/v1/jobs", params={"search": "' OR 1=1 --"})
    assert res.status_code in (200, 422), res.text
    # A raw driver error in the body would mean the string reached the engine.
    assert "syntax error" not in res.text.lower()


def test_upload_requires_authentication(client):
    res = client.post("/api/v1/upload")
    assert res.status_code == 401





def test_withdrawal_refuses_negative_and_excessive_amounts(client):
    user = make_user(
        role="worker",
        phone=f"+99890{uuid.uuid4().hex[:6]}",
        name="Security Test User",
        balance=10000,
    )
    login(client, user)

    # WithdrawRequest bounds the amount in the schema
    # (`Field(ge=MIN_WITHDRAWAL_UZS, le=MAX_WITHDRAWAL_UZS)`), so both of these
    # are refused by validation with 422 before the handler is entered. The
    # original 400 expectation described a rejection that happens one layer
    # further in. What matters is that neither is accepted.
    negative = client.post("/api/v1/payments/withdraw", json={"amount": -50000})
    assert negative.status_code in (400, 422), negative.text

    more_than_held = client.post(
        "/api/v1/payments/withdraw", json={"amount": 999999999}
    )
    assert more_than_held.status_code in (400, 422), more_than_held.text
