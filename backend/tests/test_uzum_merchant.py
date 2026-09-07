"""The webhooks Uzum Bank calls on us.

Written against https://developer.uzumbank.uz/merchant. Two properties of that
spec drive most of what is asserted here:

* every business failure is **HTTP 400 with a string errorCode** — a 401 or a
  404 would be read by Uzum as the webhook itself failing, and it would retry
  rather than tell the customer why;
* **amounts are in tiyin**, on both sides, so /create's check is an equality
  and any conversion in it would be a bug.
"""

import base64
import uuid

from app.core.config import settings
from app.db.session import SessionLocal
from app.models import PaymentOrder, User, UzumTransaction

from .conftest import login, make_job, make_user

SERVICE_ID = 783774
USERNAME = "uzum-test-user"
PASSWORD = "uzum-test-password-not-a-real-one"

AUTH = {
    "Authorization": "Basic " + base64.b64encode(f"{USERNAME}:{PASSWORD}".encode()).decode()
}
BAD_AUTH = {
    "Authorization": "Basic " + base64.b64encode(f"{USERNAME}:wrong".encode()).decode()
}


def _configure(monkeypatch):
    monkeypatch.setattr(settings, "UZUM_MERCHANT_SERVICE_ID", SERVICE_ID)
    monkeypatch.setattr(settings, "UZUM_MERCHANT_USERNAME", USERNAME)
    monkeypatch.setattr(settings, "UZUM_MERCHANT_PASSWORD", PASSWORD)


def _order(user_id: str, amount_tiyin: int = 1_000_000, **kwargs) -> PaymentOrder:
    with SessionLocal() as db:
        order = PaymentOrder(
            orderNumber=kwargs.pop("orderNumber", str(uuid.uuid4().int)[:16]),
            userId=user_id,
            purpose=kwargs.pop("purpose", "deposit"),
            amount=amount_tiyin,
            status=kwargs.pop("status", "new"),
            **kwargs,
        )
        db.add(order)
        db.commit()
        db.refresh(order)
        db.expunge(order)
        return order


def _balance(user_id: str) -> int:
    with SessionLocal() as db:
        return db.query(User).filter(User.id == user_id).first().balance or 0


def _trans_status(trans_id: str) -> str:
    with SessionLocal() as db:
        row = db.query(UzumTransaction).filter(UzumTransaction.transId == trans_id).first()
        return row.status if row else ""


def _check(client, order, **over):
    body = {"serviceId": SERVICE_ID, "timestamp": 1, "params": {"order_id": order.orderNumber}}
    body.update(over)
    return client.post("/api/v1/payments/uzum/check", json=body, headers=AUTH)


def _create(client, order, trans_id, amount=None, **over):
    body = {
        "serviceId": SERVICE_ID,
        "timestamp": 1,
        "transId": trans_id,
        "params": {"order_id": order.orderNumber},
        "amount": order.amount if amount is None else amount,
    }
    body.update(over)
    return client.post("/api/v1/payments/uzum/create", json=body, headers=AUTH)


def _confirm(client, trans_id):
    return client.post(
        "/api/v1/payments/uzum/confirm",
        json={
            "serviceId": SERVICE_ID, "timestamp": 1, "transId": trans_id,
            "paymentSource": "UZCARD", "phone": "998901234567", "cardType": 2,
        },
        headers=AUTH,
    )


def _reverse(client, trans_id):
    return client.post(
        "/api/v1/payments/uzum/reverse",
        json={"serviceId": SERVICE_ID, "timestamp": 1, "transId": trans_id},
        headers=AUTH,
    )


def _status(client, trans_id):
    return client.post(
        "/api/v1/payments/uzum/status",
        json={"serviceId": SERVICE_ID, "timestamp": 1, "transId": trans_id},
        headers=AUTH,
    )


# --- the path a real payment takes -----------------------------------------


def test_a_payment_from_check_to_confirmed_balance(client, monkeypatch):
    """The whole point of the integration, asserted end to end."""
    _configure(monkeypatch)
    employer = make_user(role="employer", phone="+998901000001", balance=0)
    order = _order(employer.id, 1_000_000)  # 10 000 so'm
    trans_id = str(uuid.uuid4())

    resp = _check(client, order)
    assert resp.status_code == 200
    assert resp.json()["status"] == "OK"
    assert resp.json()["serviceId"] == SERVICE_ID
    assert resp.json()["data"]["amount"] == 1_000_000

    resp = _create(client, order, trans_id)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["status"] == "CREATED"
    assert body["transId"] == trans_id
    assert body["amount"] == 1_000_000
    assert isinstance(body["transTime"], int)
    # Nothing has moved yet — /create is a hold.
    assert _balance(employer.id) == 0

    resp = _confirm(client, trans_id)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["status"] == "CONFIRMED"
    assert isinstance(body["confirmTime"], int)

    # 1 000 000 tiyin is 10 000 so'm. Getting this wrong by a factor of a
    # hundred is the single most expensive mistake available here.
    assert _balance(employer.id) == 10_000


def test_status_reports_each_stage(client, monkeypatch):
    _configure(monkeypatch)
    employer = make_user(role="employer", phone="+998901000002")
    order = _order(employer.id)
    trans_id = str(uuid.uuid4())

    _create(client, order, trans_id)
    assert _status(client, trans_id).json()["status"] == "CREATED"

    _confirm(client, trans_id)
    body = _status(client, trans_id).json()
    assert body["status"] == "CONFIRMED"
    assert body["confirmTime"] is not None
    assert body["reverseTime"] is None


# --- authorisation ----------------------------------------------------------


def test_every_webhook_answers_10001_without_credentials(client, monkeypatch):
    _configure(monkeypatch)
    for path in ("check", "create", "confirm", "reverse", "status"):
        resp = client.post(f"/api/v1/payments/uzum/{path}", json={
            "serviceId": SERVICE_ID, "timestamp": 1, "transId": str(uuid.uuid4()),
            "params": {}, "amount": 1,
        })
        assert resp.status_code == 400, f"{path} answered {resp.status_code}"
        assert resp.json()["errorCode"] == "10001", path


def test_wrong_password_is_10001_and_400_not_401(client, monkeypatch):
    """401 would make Uzum retry the webhook instead of reporting the failure."""
    _configure(monkeypatch)
    employer = make_user(role="employer", phone="+998901000003")
    order = _order(employer.id)
    resp = client.post(
        "/api/v1/payments/uzum/check",
        json={"serviceId": SERVICE_ID, "timestamp": 1, "params": {"order_id": order.orderNumber}},
        headers=BAD_AUTH,
    )
    assert resp.status_code == 400
    assert resp.json()["errorCode"] == "10001"


def test_unconfigured_service_refuses_rather_than_accepting_anything(client, monkeypatch):
    monkeypatch.setattr(settings, "UZUM_MERCHANT_SERVICE_ID", 0)
    monkeypatch.setattr(settings, "UZUM_MERCHANT_USERNAME", "")
    monkeypatch.setattr(settings, "UZUM_MERCHANT_PASSWORD", "")
    resp = client.post(
        "/api/v1/payments/uzum/check",
        json={"serviceId": SERVICE_ID, "timestamp": 1, "params": {"order_id": "1"}},
        headers=AUTH,
    )
    assert resp.status_code == 400
    assert resp.json()["errorCode"] == "10001"


# --- the error codes the spec names ----------------------------------------


def test_unknown_service_id_is_10006(client, monkeypatch):
    _configure(monkeypatch)
    employer = make_user(role="employer", phone="+998901000004")
    order = _order(employer.id)
    resp = _check(client, order, serviceId=999999)
    assert resp.status_code == 400
    assert resp.json()["errorCode"] == "10006"


def test_unknown_order_is_10007(client, monkeypatch):
    _configure(monkeypatch)
    resp = client.post(
        "/api/v1/payments/uzum/check",
        json={"serviceId": SERVICE_ID, "timestamp": 1, "params": {"order_id": "0000000000000000"}},
        headers=AUTH,
    )
    assert resp.status_code == 400
    assert resp.json()["errorCode"] == "10007"


def test_an_already_paid_order_is_10008(client, monkeypatch):
    """One of the two states /check exists to detect."""
    _configure(monkeypatch)
    employer = make_user(role="employer", phone="+998901000005")
    order = _order(employer.id, status="paid")
    assert _check(client, order).json()["errorCode"] == "10008"


def test_a_cancelled_order_is_10009(client, monkeypatch):
    _configure(monkeypatch)
    employer = make_user(role="employer", phone="+998901000006")
    order = _order(employer.id, status="cancelled")
    assert _check(client, order).json()["errorCode"] == "10009"


def test_reusing_a_transid_is_10010_and_creates_nothing(client, monkeypatch):
    """Uzum retries. Without this the same payment lands twice."""
    _configure(monkeypatch)
    employer = make_user(role="employer", phone="+998901000007")
    order = _order(employer.id)
    trans_id = str(uuid.uuid4())

    assert _create(client, order, trans_id).status_code == 200
    resp = _create(client, order, trans_id)
    assert resp.status_code == 400
    assert resp.json()["errorCode"] == "10010"

    with SessionLocal() as db:
        assert db.query(UzumTransaction).filter(UzumTransaction.orderId == order.id).count() == 1


def test_the_wrong_amount_is_10011(client, monkeypatch):
    _configure(monkeypatch)
    employer = make_user(role="employer", phone="+998901000008")
    order = _order(employer.id, 1_000_000)
    resp = _create(client, order, str(uuid.uuid4()), amount=100)
    assert resp.status_code == 400
    assert resp.json()["errorCode"] == "10011"


def test_an_amount_off_by_the_unit_is_still_10011(client, monkeypatch):
    """The failure this would actually take: so'm sent where tiyin is meant."""
    _configure(monkeypatch)
    employer = make_user(role="employer", phone="+998901000009")
    order = _order(employer.id, 1_000_000)
    assert _create(client, order, str(uuid.uuid4()), amount=10_000).json()["errorCode"] == "10011"


def test_an_unknown_transid_is_10014_everywhere_it_can_be(client, monkeypatch):
    _configure(monkeypatch)
    nowhere = "00000000-0000-0000-0000-000000000000"
    assert _confirm(client, nowhere).json()["errorCode"] == "10014"
    assert _reverse(client, nowhere).json()["errorCode"] == "10014"
    assert _status(client, nowhere).json()["errorCode"] == "10014"


def test_confirming_a_reversed_transaction_is_10015(client, monkeypatch):
    _configure(monkeypatch)
    employer = make_user(role="employer", phone="+998901000010")
    order = _order(employer.id)
    trans_id = str(uuid.uuid4())
    _create(client, order, trans_id)
    _reverse(client, trans_id)
    assert _confirm(client, trans_id).json()["errorCode"] == "10015"


def test_confirming_twice_is_10016_and_credits_once(client, monkeypatch):
    """The one that would double a person's money."""
    _configure(monkeypatch)
    employer = make_user(role="employer", phone="+998901000011", balance=0)
    order = _order(employer.id, 1_000_000)
    trans_id = str(uuid.uuid4())

    _create(client, order, trans_id)
    assert _confirm(client, trans_id).status_code == 200
    assert _balance(employer.id) == 10_000

    resp = _confirm(client, trans_id)
    assert resp.status_code == 400
    assert resp.json()["errorCode"] == "10016"
    assert _balance(employer.id) == 10_000


def test_reversing_twice_is_10018_and_debits_once(client, monkeypatch):
    _configure(monkeypatch)
    employer = make_user(role="employer", phone="+998901000012", balance=0)
    order = _order(employer.id, 1_000_000)
    trans_id = str(uuid.uuid4())

    _create(client, order, trans_id)
    _confirm(client, trans_id)
    assert _balance(employer.id) == 10_000

    assert _reverse(client, trans_id).status_code == 200
    assert _balance(employer.id) == 0

    resp = _reverse(client, trans_id)
    assert resp.status_code == 400
    assert resp.json()["errorCode"] == "10018"
    assert _balance(employer.id) == 0


# --- reversal, which is where the money can go wrong ------------------------


def test_reversing_before_confirm_moves_no_money(client, monkeypatch):
    _configure(monkeypatch)
    employer = make_user(role="employer", phone="+998901000013", balance=5_000)
    order = _order(employer.id, 1_000_000)
    trans_id = str(uuid.uuid4())

    _create(client, order, trans_id)
    assert _reverse(client, trans_id).json()["status"] == "REVERSED"
    # Nothing was ever credited, so nothing is taken back.
    assert _balance(employer.id) == 5_000


def test_a_reversed_order_can_be_paid_again(client, monkeypatch):
    """A customer who reverses by mistake should not lose the order."""
    _configure(monkeypatch)
    employer = make_user(role="employer", phone="+998901000014", balance=0)
    order = _order(employer.id, 1_000_000)

    first = str(uuid.uuid4())
    _create(client, order, first)
    _confirm(client, first)
    _reverse(client, first)
    assert _balance(employer.id) == 0

    second = str(uuid.uuid4())
    assert _create(client, order, second).status_code == 200
    assert _confirm(client, second).status_code == 200
    assert _balance(employer.id) == 10_000


def test_a_refund_of_money_already_spent_still_goes_through(client, monkeypatch):
    """The bank has already returned it to the customer.

    Refusing would leave our books disagreeing with theirs, so the debit is
    taken even though it puts the balance below zero — and it is recorded
    rather than hidden, because somebody has to decide what to do about it.
    """
    _configure(monkeypatch)
    employer = make_user(role="employer", phone="+998901000015", balance=0)
    order = _order(employer.id, 1_000_000)
    trans_id = str(uuid.uuid4())

    _create(client, order, trans_id)
    _confirm(client, trans_id)
    assert _balance(employer.id) == 10_000

    # Spend it all before the reversal lands.
    with SessionLocal() as db:
        user = db.query(User).filter(User.id == employer.id).first()
        user.balance = 0
        db.commit()

    assert _reverse(client, trans_id).status_code == 200
    assert _balance(employer.id) == -10_000


# --- opening an order from our own side ------------------------------------


def test_an_employer_can_open_an_order_and_gets_a_typable_number(client, monkeypatch):
    _configure(monkeypatch)
    employer = make_user(role="employer", phone="+998901000016")
    login(client, employer)

    resp = client.post("/api/v1/payments/uzum/orders", json={"amount": 50_000})
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["purpose"] == "deposit"
    assert body["amount"] == 50_000
    # Sixteen digits, because a person types this into the Uzum app.
    assert len(body["orderNumber"]) == 16
    assert body["orderNumber"].isdigit()

    # And it is stored in tiyin, which is what /create will be compared against.
    with SessionLocal() as db:
        stored = db.query(PaymentOrder).filter(
            PaymentOrder.orderNumber == body["orderNumber"]
        ).first()
        assert stored.amount == 5_000_000


def test_an_order_can_be_tied_to_your_own_posting(client, monkeypatch):
    _configure(monkeypatch)
    employer = make_user(role="employer", phone="+998901000017")
    job = make_job(employer.id, title="Omborchi kerak")
    login(client, employer)

    resp = client.post("/api/v1/payments/uzum/orders", json={"amount": 20_000, "jobId": job.id})
    assert resp.status_code == 200
    assert resp.json()["purpose"] == "job"

    # And the job's title is what the customer sees in the Uzum app.
    with SessionLocal() as db:
        order = db.query(PaymentOrder).filter(
            PaymentOrder.orderNumber == resp.json()["orderNumber"]
        ).first()
    resp = client.post(
        "/api/v1/payments/uzum/check",
        json={"serviceId": SERVICE_ID, "timestamp": 1, "params": {"order_id": order.orderNumber}},
        headers=AUTH,
    )
    assert resp.json()["data"]["title"] == "Omborchi kerak"


def test_you_cannot_open_an_order_against_somebody_elses_job(client, monkeypatch):
    """Otherwise the endpoint answers whether a given job id exists."""
    _configure(monkeypatch)
    owner = make_user(role="employer", phone="+998901000018")
    job = make_job(owner.id)
    intruder = make_user(role="employer", phone="+998901000019")
    login(client, intruder)

    resp = client.post("/api/v1/payments/uzum/orders", json={"amount": 20_000, "jobId": job.id})
    assert resp.status_code == 404


def test_order_numbers_do_not_repeat(client, monkeypatch):
    _configure(monkeypatch)
    employer = make_user(role="employer", phone="+998901000020")
    login(client, employer)
    numbers = {
        client.post("/api/v1/payments/uzum/orders", json={"amount": 1_000}).json()["orderNumber"]
        for _ in range(20)
    }
    assert len(numbers) == 20


# --- the 30-minute rule -----------------------------------------------------


def test_an_unconfirmed_transaction_expires_and_cannot_then_be_confirmed(client, monkeypatch):
    """The spec's own words: not confirmed within 30 minutes is unsuccessful."""
    _configure(monkeypatch)
    from app.tasks import expire_uzum_transactions

    employer = make_user(role="employer", phone="+998901000021", balance=0)
    order = _order(employer.id, 1_000_000)
    trans_id = str(uuid.uuid4())
    _create(client, order, trans_id)

    # Push it past the window rather than waiting half an hour.
    with SessionLocal() as db:
        row = db.query(UzumTransaction).filter(UzumTransaction.transId == trans_id).first()
        row.transTime = row.transTime - 31 * 60 * 1000
        db.commit()

    assert expire_uzum_transactions() == 1
    assert _trans_status(trans_id) == "FAILED"
    assert _confirm(client, trans_id).json()["errorCode"] == "10015"
    assert _balance(employer.id) == 0


def test_the_sweep_leaves_finished_transactions_alone(client, monkeypatch):
    _configure(monkeypatch)
    from app.tasks import expire_uzum_transactions

    employer = make_user(role="employer", phone="+998901000022")
    order = _order(employer.id)
    trans_id = str(uuid.uuid4())
    _create(client, order, trans_id)
    _confirm(client, trans_id)

    with SessionLocal() as db:
        row = db.query(UzumTransaction).filter(UzumTransaction.transId == trans_id).first()
        row.transTime = row.transTime - 31 * 60 * 1000
        db.commit()

    expire_uzum_transactions()
    assert _trans_status(trans_id) == "CONFIRMED"


def test_an_empty_service_id_env_var_does_not_crash_the_app():
    """The outage this integration caused.

    Settings is a BaseSettings, so it reads the variable itself and a default
    computed in the field declaration never applies once the name exists in the
    environment. docker-compose lists it as `${VAR:-}`, which sets it to the
    empty string, and Pydantic cannot parse that as an int — so importing
    settings raised ValidationError, the container failed its health check, and
    the site returned 502 until this was fixed.

    "Not configured" has to read as 0. It must never read as a crash.
    """
    from app.core.config import Settings

    for value in ("", "   ", None):
        assert Settings(UZUM_MERCHANT_SERVICE_ID=value).UZUM_MERCHANT_SERVICE_ID == 0
    assert Settings(UZUM_MERCHANT_SERVICE_ID="783774").UZUM_MERCHANT_SERVICE_ID == 783774
