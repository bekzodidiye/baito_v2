"""Boundary probes: injection, auth, webhook forgery, withdrawal amounts.

Originally one 56-line function running four unrelated probes in sequence,
with prints standing in for assertions and its own session handling. Split so
a failure names which boundary gave way, and using conftest's fixtures, whose
autouse cleanup already truncates between tests.
"""
import uuid

from tests.conftest import login, make_user


def test_sql_injection_in_query_params_is_not_executed(client):
    payload = "' OR 1=1 --"
    res = client.get("/api/v1/jobs", params={"employer_id": payload})
    assert res.status_code in (200, 404, 422)
    # A raw driver error in the body would mean the string reached the engine.
    assert "syntax error" not in res.text.lower()


def test_upload_requires_authentication(client):
    res = client.post("/api/v1/upload")
    assert res.status_code == 401


def test_webhook_rejects_a_forged_signature(client):
    res = client.post(
        "/api/v1/payments/webhook/uzum",
        json={
            "order_id": "test_order_123",
            "uzum_transaction_id": "fake_tx_999",
            "amount": 1000000,
            "status": "SUCCESS",
            "sign": "forged_invalid_md5_or_sha_signature",
        },
    )
    assert res.status_code in (403, 404)


def test_withdrawal_refuses_negative_and_excessive_amounts(client):
    user = make_user(
        role="worker",
        phone=f"+99890{uuid.uuid4().hex[:6]}",
        name="Security Test User",
        balance=10000,
    )
    login(client, user)

    negative = client.post("/api/v1/payments/withdraw", json={"amount": -50000})
    assert negative.status_code == 400

    more_than_held = client.post(
        "/api/v1/payments/withdraw", json={"amount": 999999999}
    )
    assert more_than_held.status_code == 400
