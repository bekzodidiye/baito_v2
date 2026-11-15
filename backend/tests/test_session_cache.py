from app.api.deps import check_session_liveness_cached, invalidate_session_cache
from app.db.session import SessionLocal
from app.models.session import ActiveSession
from app.redis_client import redis_client
from tests.conftest import make_user
import uuid


def test_session_liveness_caching():
    phone = f"+99890{uuid.uuid4().int % 10000000:07d}"
    user = make_user(phone=phone)
    sid = str(uuid.uuid4())
    with SessionLocal() as db:
        session = ActiveSession(id=sid, user_uid=user.uid, is_active=True)
        db.add(session)
        db.commit()

        # Cache key should initially be empty
        cache_key = f"session:live:{sid}"
        assert redis_client.get(cache_key) is None

        # First check populates cache
        live = check_session_liveness_cached(db, sid)
        assert live is True
        assert redis_client.get(cache_key) == "1"

        # Updating the session in DB triggers invalidation event
        session.is_active = False
        db.commit()

        # Cache must have been invalidated by event listener
        assert redis_client.get(cache_key) is None

        # Next check reflects revoked state
        assert check_session_liveness_cached(db, sid) is False


def test_get_current_user_optional_uses_cached_session(client):
    phone = f"+99890{uuid.uuid4().int % 10000000:07d}"
    user = make_user(phone=phone)
    from tests.conftest import login
    login(client, user)

    # Calling an endpoint that uses get_current_user_optional (e.g. GET /api/v1/jobs)
    resp = client.get("/api/v1/jobs")
    assert resp.status_code == 200

    # User logout evicts session
    client.post("/api/v1/auth/logout")

    # Calling the endpoint again reflects logged out state without errors
    resp_after = client.get("/api/v1/jobs")
    assert resp_after.status_code == 200
