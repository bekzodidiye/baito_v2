from app.core.error_reporter import sanitize_sensitive_data


def test_sanitize_jwt_token():
    raw = "Error with token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeakThisSignature"
    sanitized = sanitize_sensitive_data(raw)
    assert "[REDACTED_JWT]" in sanitized
    assert "doNotLeakThisSignature" not in sanitized


def test_sanitize_bearer_header():
    raw = "Request failed: Authorization: Bearer secret_access_token_123456"
    sanitized = sanitize_sensitive_data(raw)
    assert "Bearer [REDACTED]" in sanitized
    assert "secret_access_token_123456" not in sanitized


def test_sanitize_password_and_secret():
    raw = '{"username": "admin", "password": "supersecretpassword123", "api_key": "live_key_998877"}'
    sanitized = sanitize_sensitive_data(raw)
    assert "supersecretpassword123" not in sanitized
    assert "live_key_998877" not in sanitized
    assert '"password": "[REDACTED]"' in sanitized


def test_sanitize_cookies():
    raw = 'Cookie: baito_sid=session_abc123xyz; other=value'
    sanitized = sanitize_sensitive_data(raw)
    assert "session_abc123xyz" not in sanitized
    assert "[REDACTED]" in sanitized


def test_sanitize_card_number():
    raw = "Payment failed on card 8600 1234 5678 9012 for user"
    sanitized = sanitize_sensitive_data(raw)
    assert "8600 1234 5678 9012" not in sanitized
    assert "[REDACTED_CARD]" in sanitized


def test_sanitize_phone_pii():
    raw = "SMS failed to send to +998901234567 in service"
    sanitized = sanitize_sensitive_data(raw)
    assert "+998901234567" not in sanitized
    assert "[REDACTED_PHONE]" in sanitized


def test_sanitize_extended_uzbek_phone_prefixes():
    for phone in ["+998771234567", "+998501234567", "+998201234567", "+998 90 123 45 67"]:
        res = sanitize_sensitive_data(f"Failed phone: {phone}")
        assert phone not in res
        assert "[REDACTED_PHONE]" in res


def test_sanitize_quoted_password_with_spaces():
    raw = "user={'password': 'my secret pass 123', 'secret': 'another secret value'}"
    sanitized = sanitize_sensitive_data(raw)
    assert "my secret pass" not in sanitized
    assert "another secret value" not in sanitized
    assert "'password': '[REDACTED]'" in sanitized


def test_sanitize_authorization_with_special_characters():
    raw = "Authorization: Bearer secret$token!123%xyz"
    sanitized = sanitize_sensitive_data(raw)
    assert "secret$token" not in sanitized
    assert "[REDACTED]" in sanitized
