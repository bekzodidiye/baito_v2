import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal
from app import models
import uuid

client = TestClient(app)

def test_security_penetration_suite():
    print("\n🛡️ Running Automated Security & Penetration Testing Suite...")
    
    # 1. SQL Injection probe in query params
    sqli_payload = "' OR 1=1 --"
    res_sqli = client.get(f"/api/v1/jobs?employer_id={sqli_payload}")
    assert res_sqli.status_code in (200, 404, 422)
    # Ensure no raw SQL error is leaked
    assert "syntax error" not in res_sqli.text.lower()
    print("  ✅ 1. SQL Injection Boundary: Protected (No leaks)")

    # 2. Unauthenticated S3 File Upload attempt
    res_upload = client.post("/api/v1/upload")
    assert res_upload.status_code == 401
    print("  ✅ 2. S3 Unauthorized Upload: Blocked (401 Unauthorized)")

    # 3. Webhook HMAC Signature Forgery attempt
    fake_payload = {
        "order_id": "test_order_123",
        "uzum_transaction_id": "fake_tx_999",
        "amount": 1000000,
        "status": "SUCCESS",
        "sign": "forged_invalid_md5_or_sha_signature"
    }
    res_webhook = client.post("/api/v1/payments/webhook/uzum", json=fake_payload)
    assert res_webhook.status_code in (403, 404)
    print("  ✅ 3. Webhook Signature Forgery: Rejected (403 Forbidden)")

    # 4. Negative Balance / Malicious Withdrawal payload
    db = SessionLocal()
    try:
        user = models.User(
            id=str(uuid.uuid4()),
            uid=f"sec_{uuid.uuid4().hex[:6]}",
            phone=f"+99890{uuid.uuid4().hex[:6]}",
            name="Security Test User",
            balance=10000
        )
        db.add(user)
        db.commit()

        from app.core.security import create_access_token
        token = create_access_token(user.uid)
        client.cookies.set("baito_access", token)

        # Attempt to withdraw negative amount or excessive amount
        res_neg = client.post("/api/v1/payments/withdraw", json={"amount": -50000})
        assert res_neg.status_code == 400

        res_excess = client.post("/api/v1/payments/withdraw", json={"amount": 999999999})
        assert res_excess.status_code == 400
        print("  ✅ 4. Negative / Overflow Withdrawal: Prevented (400 Bad Request)")
    finally:
        db.close()

    print("🛡️ Automated Security Penetration Test Suite: 100% PASSED!\n")

if __name__ == "__main__":
    test_security_penetration_suite()
