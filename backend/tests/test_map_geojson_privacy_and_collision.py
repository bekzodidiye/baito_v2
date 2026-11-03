import math
import uuid
import pytest
from unittest.mock import patch
from concurrent.futures import ThreadPoolExecutor
from starlette.websockets import WebSocketDisconnect
from fastapi import Response
from fastapi.testclient import TestClient

from app.main import app
from app import models
from app.db.session import SessionLocal
from app.models.job import JobStatus
from app.models.session import ActiveSession
from app.core.map_cache import (
    invalidate_map_cache,
    get_map_cache_version,
    build_map_pins_cache_key,
    build_map_geojson_cache_key,
)
from app.redis_client import redis_client
from app.api.v1.endpoints.chats.websocket import _authenticate_ticket
from tests.conftest import make_user, login


@pytest.fixture
def client():
    return TestClient(app)


def _create_test_employer_and_job(db, title="Test Geo Job", lat=41.310, lng=69.245):
    emp = db.query(models.User).filter_by(phone="+998901119988").first()
    if not emp:
        emp = models.User(
            id=str(uuid.uuid4()),
            phone="+998901119988",
            role="employer",
            name="Geo Employer LLC",
            isVerified=True,
        )
        db.add(emp)
        db.flush()

    job = models.Job(
        id=str(uuid.uuid4()),
        title=title,
        company=emp.name,
        location="Toshkent, Chilonzor",
        rawLocation="Chilonzor tumani",
        coordinateX=lat,
        coordinateY=lng,
        salary=200000,
        salaryCurrency="UZS",
        description="GeoJSON test job",
        status=JobStatus.OPEN,
        employerId=emp.id,
        neededWorkers="1",
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return emp, job


def test_anonymous_geojson_http_cache_headers(client):
    """Anonymous GeoJSON responses must carry public cache headers and Vary header."""
    invalidate_map_cache()
    res = client.get("/api/v1/jobs/map/geojson")
    assert res.status_code == 200
    cache_control = res.headers.get("Cache-Control", "")
    assert "public" in cache_control
    assert "max-age=15" in cache_control
    vary = res.headers.get("Vary", "")
    assert "Cookie" in vary
    assert "Authorization" in vary

    etag = res.headers.get("ETag")
    assert etag is not None

    # Conditional 304 request
    res_cond = client.get("/api/v1/jobs/map/geojson", headers={"If-None-Match": etag})
    assert res_cond.status_code == 304
    assert "public" in res_cond.headers.get("Cache-Control", "")
    assert "Cookie" in res_cond.headers.get("Vary", "")


def test_authenticated_geojson_http_cache_privacy_and_isolation(client):
    """Authenticated workers must receive private Cache-Control and isolated personalized properties."""
    invalidate_map_cache()
    with SessionLocal() as db:
        _, job = _create_test_employer_and_job(db, title="Privacy Job", lat=41.300, lng=69.240)
        job_id = job.id

        worker_a = make_user(role="worker", phone="+998901110001")
        worker_b = make_user(role="worker", phone="+998901110002")

        # Worker A applies to the job
        app_a = models.Application(
            id=str(uuid.uuid4()),
            jobId=job_id,
            workerId=worker_a.id,
            status="applied",
        )
        db.add(app_a)
        db.commit()

    # Worker A request: applied == True
    login(client, worker_a)
    res_a = client.get("/api/v1/jobs/map/geojson?min_lat=41.2&max_lat=41.4&min_lng=69.1&max_lng=69.3")
    assert res_a.status_code == 200
    cc_a = res_a.headers.get("Cache-Control", "")
    assert "private" in cc_a
    assert "no-cache" in cc_a
    assert "public" not in cc_a
    vary_a = res_a.headers.get("Vary", "")
    assert "Cookie" in vary_a

    data_a = res_a.json()
    job_feature_a = next((f for f in data_a["features"] if f["id"] == job_id), None)
    assert job_feature_a is not None
    assert job_feature_a["properties"]["applied"] is True

    # Conditional 304 for Worker A
    etag_a = res_a.headers.get("ETag")
    res_a_cond = client.get(
        "/api/v1/jobs/map/geojson?min_lat=41.2&max_lat=41.4&min_lng=69.1&max_lng=69.3",
        headers={"If-None-Match": etag_a},
    )
    assert res_a_cond.status_code == 304
    assert "private" in res_a_cond.headers.get("Cache-Control", "")

    # Worker B request: applied == False
    login(client, worker_b)
    res_b = client.get("/api/v1/jobs/map/geojson?min_lat=41.2&max_lat=41.4&min_lng=69.1&max_lng=69.3")
    assert res_b.status_code == 200
    cc_b = res_b.headers.get("Cache-Control", "")
    assert "private" in cc_b
    assert "no-cache" in cc_b

    data_b = res_b.json()
    job_feature_b = next((f for f in data_b["features"] if f["id"] == job_id), None)
    assert job_feature_b is not None
    assert job_feature_b["properties"]["applied"] is False


def test_viewport_cache_key_distinct_for_nearby_sub_decimal_bounds(client):
    """Sub-decimal coordinates that collide with 2-decimal rounding produce distinct cache keys and correct data."""
    invalidate_map_cache()
    from app.redis_client import redis_client

    with SessionLocal() as db:
        # Job at 41.308 is inside Viewport 1 [41.306, 41.320], but OUTSIDE Viewport 2 [41.314, 41.320]
        _, job_border = _create_test_employer_and_job(db, title="Border Job", lat=41.308, lng=69.245)
        job_border_id = job_border.id

    ver = get_map_cache_version()
    # Key for Viewport 1
    key1 = build_map_geojson_cache_key(ver, min_lat=41.306, max_lat=41.320, min_lng=69.240, max_lng=69.250)
    # Key for Viewport 2
    key2 = build_map_geojson_cache_key(ver, min_lat=41.314, max_lat=41.320, min_lng=69.240, max_lng=69.250)
    assert key1 != key2, f"Keys must be distinct, got {key1} and {key2}"

    # Query Viewport 1 (anonymous)
    res1 = client.get("/api/v1/jobs/map/geojson?min_lat=41.306&max_lat=41.320&min_lng=69.240&max_lng=69.250")
    assert res1.status_code == 200
    features1 = res1.json()["features"]
    ids1 = [f["id"] for f in features1]
    assert job_border_id in ids1, "Job at 41.308 must be in Viewport 1 [41.306, 41.320]"

    # Verify Viewport 1 is cached in Redis
    cached1 = redis_client.get(key1)
    assert cached1 is not None

    # Query Viewport 2 (must NOT hit Viewport 1 cache)
    res2 = client.get("/api/v1/jobs/map/geojson?min_lat=41.314&max_lat=41.320&min_lng=69.240&max_lng=69.250")
    assert res2.status_code == 200
    features2 = res2.json()["features"]
    ids2 = [f["id"] for f in features2]
    assert job_border_id not in ids2, "Job at 41.308 must NOT be in Viewport 2 [41.314, 41.320]"


def test_internal_304_protection_does_not_crash_geojson(client):
    """If client sends If-None-Match matching internal pins ETag, GeoJSON endpoint must not crash with JSONDecodeError."""
    invalidate_map_cache()
    with SessionLocal() as db:
        _create_test_employer_and_job(db, title="Pins ETag Job", lat=41.310, lng=69.240)

    # 1. Fetch raw pins to find its exact ETag
    res_pins = client.get("/api/v1/jobs/map?min_lat=41.2&max_lat=41.4&min_lng=69.1&max_lng=69.3")
    assert res_pins.status_code == 200
    pins_etag = res_pins.headers.get("ETag")
    assert pins_etag is not None

    # 2. Call GeoJSON endpoint passing the internal pins ETag as If-None-Match
    # Previously, this caused get_map_jobs to return 304, causing json.loads("") -> 500 JSONDecodeError
    res_geojson = client.get(
        "/api/v1/jobs/map/geojson?min_lat=41.2&max_lat=41.4&min_lng=69.1&max_lng=69.3",
        headers={"If-None-Match": pins_etag},
    )
    # The GeoJSON endpoint should safely return 200 with full GeoJSON FeatureCollection
    # because its outer GeoJSON ETag is different from the internal pins ETag
    assert res_geojson.status_code == 200
    data = res_geojson.json()
    assert data["type"] == "FeatureCollection"
    assert len(data["features"]) >= 1


def test_redis_unavailable_geojson_fallback(client):
    """When Redis is unavailable, get_map_geojson falls back cleanly to database."""
    invalidate_map_cache()
    with SessionLocal() as db:
        _create_test_employer_and_job(db, title="Redis Fallback Job", lat=41.320, lng=69.240)

    with patch("app.api.v1.endpoints.jobs.read.redis_client.get", side_effect=Exception("Redis connection error")):
        res = client.get("/api/v1/jobs/map/geojson?min_lat=41.2&max_lat=41.4&min_lng=69.1&max_lng=69.3")
        assert res.status_code == 200
        data = res.json()
        assert data["type"] == "FeatureCollection"


def test_chat_websocket_single_use_ticket_lifecycle(client):
    """Test WebSocket connection ticket issuance, consumption, replay prevention, and chat binding."""
    with SessionLocal() as db:
        worker = make_user(role="worker", phone="+998903334455")
        employer = make_user(role="employer", phone="+998903334466")
        other_user = make_user(role="worker", phone="+998903334477")

        chat1 = models.Chat(workerId=worker.id, employerId=employer.id)
        chat2 = models.Chat(workerId=other_user.id, employerId=employer.id)
        db.add_all([chat1, chat2])
        db.commit()
        db.refresh(chat1)
        db.refresh(chat2)

    # 1. Non-participant attempts to get ticket -> 403 Forbidden
    login(client, other_user)
    res_forbidden = client.post(f"/api/v1/chats/{chat1.id}/ws-ticket")
    assert res_forbidden.status_code == 403

    # 2. Participant gets valid ticket
    login(client, worker)
    res_ticket = client.post(f"/api/v1/chats/{chat1.id}/ws-ticket")
    assert res_ticket.status_code == 200
    ticket_data = res_ticket.json()
    assert "ticket" in ticket_data
    assert ticket_data["expires_in"] == 60
    ticket = ticket_data["ticket"]

    # 3. Valid ticket verification for Chat 1
    user_info = _authenticate_ticket(ticket, chat1.id)
    assert user_info is not None
    assert user_info["id"] == worker.id

    # 4. Replay attempt with the same ticket -> None (already deleted from Redis)
    user_info_replay = _authenticate_ticket(ticket, chat1.id)
    assert user_info_replay is None

    # 5. Ticket bound to Chat 1 attempted on Chat 2 -> None
    res_ticket2 = client.post(f"/api/v1/chats/{chat1.id}/ws-ticket")
    ticket2 = res_ticket2.json()["ticket"]
    user_info_wrong_chat = _authenticate_ticket(ticket2, chat2.id)
    assert user_info_wrong_chat is None

    # 6. Malformed and expired tickets are rejected
    assert _authenticate_ticket("", chat1.id) is None
    assert _authenticate_ticket("a" * 200, chat1.id) is None
    assert _authenticate_ticket("nonexistent-ticket", chat1.id) is None


def test_chat_websocket_full_handshake_flow(client):
    """Test full WebSocket connection flow with tickets: HTTP issue, WS connect, ping/pong, and replay rejection."""
    with SessionLocal() as db:
        worker = make_user(role="worker", phone="+998904445566")
        employer = make_user(role="employer", phone="+998904445577")
        chat = models.Chat(workerId=worker.id, employerId=employer.id)
        db.add(chat)
        db.commit()
        db.refresh(chat)
        chat_id = chat.id

    login(client, worker)
    res_ticket = client.post(f"/api/v1/chats/{chat_id}/ws-ticket")
    assert res_ticket.status_code == 200
    ticket = res_ticket.json()["ticket"]

    # 1. Connect over WebSocket with ticket
    with client.websocket_connect(f"/api/v1/chats/ws/{chat_id}?ticket={ticket}") as ws:
        ws.send_json({"type": "ping"})
        msg = ws.receive_json()
        assert msg.get("type") == "pong"

    # 2. Immediate reconnect attempt with consumed ticket must fail with code 1008
    with pytest.raises(WebSocketDisconnect) as exc:
        with client.websocket_connect(f"/api/v1/chats/ws/{chat_id}?ticket={ticket}"):
            pass
    assert exc.value.code == 1008

    # 3. Connection with missing or invalid ticket must fail with code 1008
    with pytest.raises(WebSocketDisconnect) as exc:
        with client.websocket_connect(f"/api/v1/chats/ws/{chat_id}?ticket=invalid-ticket"):
            pass
    assert exc.value.code == 1008


def test_chat_websocket_session_revocation_rejects_ticket(client):
    """If user's active session is revoked after ticket is issued, WebSocket connection must be rejected."""
    with SessionLocal() as db:
        worker = make_user(role="worker", phone="+998905556677")
        employer = make_user(role="employer", phone="+998905556688")
        chat = models.Chat(workerId=worker.id, employerId=employer.id)
        db.add(chat)
        db.commit()
        db.refresh(chat)
        chat_id = chat.id

    login(client, worker)
    res_ticket = client.post(f"/api/v1/chats/{chat_id}/ws-ticket")
    assert res_ticket.status_code == 200
    ticket = res_ticket.json()["ticket"]

    # Revoke user's active session in DB
    with SessionLocal() as db:
        sessions = (
            db.query(ActiveSession)
            .filter(ActiveSession.user_uid == worker.uid)
            .all()
        )
        assert len(sessions) > 0
        for s in sessions:
            s.is_active = False
        db.commit()

    # Attempting to connect with ticket issued for the now-revoked session must fail with 1008
    with pytest.raises(WebSocketDisconnect) as exc:
        with client.websocket_connect(f"/api/v1/chats/ws/{chat_id}?ticket={ticket}"):
            pass
    assert exc.value.code == 1008


def test_chat_websocket_concurrent_ticket_consumption(client):
    """Simultaneous consumers of the same ticket must result in exactly one success and one failure (atomic getdel)."""
    with SessionLocal() as db:
        worker = make_user(role="worker", phone="+998906667788")
        employer = make_user(role="employer", phone="+998906667799")
        chat = models.Chat(workerId=worker.id, employerId=employer.id)
        db.add(chat)
        db.commit()
        db.refresh(chat)
        chat_id = chat.id

    login(client, worker)
    res_ticket = client.post(f"/api/v1/chats/{chat_id}/ws-ticket")
    assert res_ticket.status_code == 200
    ticket = res_ticket.json()["ticket"]

    results = []
    with ThreadPoolExecutor(max_workers=2) as executor:
        f1 = executor.submit(_authenticate_ticket, ticket, chat_id)
        f2 = executor.submit(_authenticate_ticket, ticket, chat_id)
        results = [f1.result(), f2.result()]

    successes = [r for r in results if r is not None]
    failures = [r for r in results if r is None]

    assert len(successes) == 1, f"Expected exactly 1 atomic success, got {len(successes)}"
    assert len(failures) == 1, f"Expected exactly 1 failure, got {len(failures)}"
    assert successes[0]["id"] == worker.id


def test_category_case_sensitivity_in_map_and_geojson(client):
    """Category filter in SQL uses exact equality (==), so cache keys must preserve category case."""
    invalidate_map_cache()
    with SessionLocal() as db:
        emp = make_user(role="employer", phone="+998907778899")
        job_it = models.Job(
            id=str(uuid.uuid4()),
            title="Senior Python Architect",
            company="Tech Corp",
            location="Toshkent, Mirzo Ulug'bek",
            rawLocation="Mirzo Ulug'bek tumani",
            coordinateX=41.320,
            coordinateY=69.280,
            salary=5000000,
            salaryCurrency="UZS",
            description="Case sensitive category test",
            status=JobStatus.OPEN,
            employerId=emp.id,
            neededWorkers="1",
            category="IT",  # UPPERCASE category
        )
        db.add(job_it)
        db.commit()
        job_it_id = job_it.id

    ver = get_map_cache_version()
    key_upper = build_map_pins_cache_key(ver, category="IT")
    key_lower = build_map_pins_cache_key(ver, category="it")
    assert key_upper != key_lower, f"Keys must be distinct: {key_upper} vs {key_lower}"

    key_geo_upper = build_map_geojson_cache_key(ver, category="IT")
    key_geo_lower = build_map_geojson_cache_key(ver, category="it")
    assert key_geo_upper != key_geo_lower, f"GeoJSON keys must be distinct: {key_geo_upper} vs {key_geo_lower}"

    # Query with exact case (category=IT) -> should find job
    res_upper = client.get("/api/v1/jobs/map?category=IT")
    assert res_upper.status_code == 200
    pins_upper = res_upper.json()
    upper_ids = [p["id"] for p in pins_upper]
    assert job_it_id in upper_ids

    # Query with lowercase (category=it) -> should NOT find job (SQL == does not match)
    res_lower = client.get("/api/v1/jobs/map?category=it")
    assert res_lower.status_code == 200
    pins_lower = res_lower.json()
    lower_ids = [p["id"] for p in pins_lower]
    assert job_it_id not in lower_ids

    # GeoJSON projection with exact case (category=IT)
    res_geo_upper = client.get("/api/v1/jobs/map/geojson?category=IT")
    assert res_geo_upper.status_code == 200
    features_upper = res_geo_upper.json()["features"]
    assert any(f["id"] == job_it_id for f in features_upper)

    # GeoJSON projection with lowercase (category=it)
    res_geo_lower = client.get("/api/v1/jobs/map/geojson?category=it")
    assert res_geo_lower.status_code == 200
    features_lower = res_geo_lower.json()["features"]
    assert not any(f["id"] == job_it_id for f in features_lower)


def test_map_cache_key_delimiter_and_whitespace_collision_prevention():
    """Prove that structural delimiter injections ('a:b' vs 'b:c') and trailing whitespace ('IT' vs 'IT ')
    produce strictly distinct cache keys across both pins and GeoJSON cache keys.
    """
    ver = 1
    # 1. Delimiter injection: (loc='a:b', cat='c') vs (loc='a', cat='b:c')
    key_pins_1 = build_map_pins_cache_key(ver, location="a:b", category="c")
    key_pins_2 = build_map_pins_cache_key(ver, location="a", category="b:c")
    assert key_pins_1 != key_pins_2, f"Pins keys collided on delimiter: {key_pins_1} == {key_pins_2}"

    key_geo_1 = build_map_geojson_cache_key(ver, location="a:b", category="c")
    key_geo_2 = build_map_geojson_cache_key(ver, location="a", category="b:c")
    assert key_geo_1 != key_geo_2, f"GeoJSON keys collided on delimiter: {key_geo_1} == {key_geo_2}"

    # 2. Whitespace divergence: 'IT' vs 'IT '
    key_pins_it = build_map_pins_cache_key(ver, category="IT")
    key_pins_it_space = build_map_pins_cache_key(ver, category="IT ")
    assert key_pins_it != key_pins_it_space, f"Pins keys collided on whitespace: {key_pins_it} == {key_pins_it_space}"

    key_geo_it = build_map_geojson_cache_key(ver, category="IT")
    key_geo_it_space = build_map_geojson_cache_key(ver, category="IT ")
    assert key_geo_it != key_geo_it_space, f"GeoJSON keys collided on whitespace: {key_geo_it} == {key_geo_it_space}"


def test_map_and_geojson_cold_and_warm_redis_filter_isolation(client):
    """Cold and warm Redis caching must strictly isolate distinct filters without cache pollution:
    - category='IT' vs category='IT '
    - location='a:b'&category='c' vs location='a'&category='b:c'
    Tested across BOTH /jobs/map and /jobs/map/geojson.
    """
    invalidate_map_cache()
    with SessionLocal() as db:
        emp = make_user(role="employer", phone="+998909991122")
        # Job A: IT category
        job_a = models.Job(
            id=str(uuid.uuid4()),
            title="Python Architect A",
            company="Company Alpha",
            location="Toshkent, Yunusobod",
            rawLocation="Yunusobod",
            description="Test Description Alpha",
            coordinateX=41.340,
            coordinateY=69.260,
            salary=6000000,
            salaryCurrency="UZS",
            status=JobStatus.OPEN,
            employerId=emp.id,
            neededWorkers="1",
            category="IT",
        )
        # Job B: Delimiter test job with location "a:b" and category "c"
        job_b = models.Job(
            id=str(uuid.uuid4()),
            title="Delimiter Test Job B",
            company="Company Beta",
            location="a:b",
            rawLocation="Custom Area",
            description="Test Description Beta",
            coordinateX=41.330,
            coordinateY=69.270,
            salary=7000000,
            salaryCurrency="UZS",
            status=JobStatus.OPEN,
            employerId=emp.id,
            neededWorkers="1",
            category="c",
        )
        db.add_all([job_a, job_b])
        db.commit()
        job_a_id = job_a.id
        job_b_id = job_b.id

    # ---- 1. PINS ENDPOINT (/api/v1/jobs/map) ----
    # Cold 1: category=IT -> returns Job A
    res_cold_it = client.get("/api/v1/jobs/map?category=IT")
    assert res_cold_it.status_code == 200
    ids_cold_it = [p["id"] for p in res_cold_it.json()]
    assert job_a_id in ids_cold_it

    # Cold 2: category=IT (with trailing space) -> must NOT return Job A (SQL exact match fails)
    res_cold_it_sp = client.get("/api/v1/jobs/map?category=IT%20")
    assert res_cold_it_sp.status_code == 200
    ids_cold_it_sp = [p["id"] for p in res_cold_it_sp.json()]
    assert job_a_id not in ids_cold_it_sp

    # Warm 1: category=IT -> served from Redis, still returns Job A
    res_warm_it = client.get("/api/v1/jobs/map?category=IT")
    assert res_warm_it.status_code == 200
    ids_warm_it = [p["id"] for p in res_warm_it.json()]
    assert job_a_id in ids_warm_it

    # Warm 2: category=IT  -> served from Redis, still returns empty (no cache poisoning from 'IT')
    res_warm_it_sp = client.get("/api/v1/jobs/map?category=IT%20")
    assert res_warm_it_sp.status_code == 200
    ids_warm_it_sp = [p["id"] for p in res_warm_it_sp.json()]
    assert job_a_id not in ids_warm_it_sp

    # Cold 3: location=a:b & category=c -> returns Job B
    res_cold_b = client.get("/api/v1/jobs/map?location=a:b&category=c")
    assert res_cold_b.status_code == 200
    ids_cold_b = [p["id"] for p in res_cold_b.json()]
    assert job_b_id in ids_cold_b

    # Cold 4: location=a & category=b:c -> must NOT return Job B
    res_cold_cross = client.get("/api/v1/jobs/map?location=a&category=b:c")
    assert res_cold_cross.status_code == 200
    ids_cold_cross = [p["id"] for p in res_cold_cross.json()]
    assert job_b_id not in ids_cold_cross

    # Warm 3: location=a:b & category=c -> returns Job B from cache
    res_warm_b = client.get("/api/v1/jobs/map?location=a:b&category=c")
    assert res_warm_b.status_code == 200
    assert job_b_id in [p["id"] for p in res_warm_b.json()]

    # Warm 4: location=a & category=b:c -> returns empty from cache
    res_warm_cross = client.get("/api/v1/jobs/map?location=a&category=b:c")
    assert res_warm_cross.status_code == 200
    assert job_b_id not in [p["id"] for p in res_warm_cross.json()]

    # ---- 2. GEOJSON ENDPOINT (/api/v1/jobs/map/geojson) ----
    # Cold 1: category=IT -> returns Job A in features
    res_geo_it = client.get("/api/v1/jobs/map/geojson?category=IT")
    assert res_geo_it.status_code == 200
    assert any(f["id"] == job_a_id for f in res_geo_it.json()["features"])

    # Cold 2: category=IT  -> does NOT return Job A
    res_geo_it_sp = client.get("/api/v1/jobs/map/geojson?category=IT%20")
    assert res_geo_it_sp.status_code == 200
    assert not any(f["id"] == job_a_id for f in res_geo_it_sp.json()["features"])

    # Warm 1: category=IT -> returns Job A from Redis
    res_geo_warm_it = client.get("/api/v1/jobs/map/geojson?category=IT")
    assert res_geo_warm_it.status_code == 200
    assert any(f["id"] == job_a_id for f in res_geo_warm_it.json()["features"])

    # Warm 2: category=IT  -> returns empty from Redis
    res_geo_warm_it_sp = client.get("/api/v1/jobs/map/geojson?category=IT%20")
    assert res_geo_warm_it_sp.status_code == 200
    assert not any(f["id"] == job_a_id for f in res_geo_warm_it_sp.json()["features"])

    # Cold 3: location=a:b & category=c -> returns Job B
    res_geo_cold_b = client.get("/api/v1/jobs/map/geojson?location=a:b&category=c")
    assert res_geo_cold_b.status_code == 200
    assert any(f["id"] == job_b_id for f in res_geo_cold_b.json()["features"])

    # Cold 4: location=a & category=b:c -> does NOT return Job B
    res_geo_cold_cross = client.get("/api/v1/jobs/map/geojson?location=a&category=b:c")
    assert res_geo_cold_cross.status_code == 200
    assert not any(f["id"] == job_b_id for f in res_geo_cold_cross.json()["features"])

    # Warm 3: location=a:b & category=c -> returns Job B from Redis
    res_geo_warm_b = client.get("/api/v1/jobs/map/geojson?location=a:b&category=c")
    assert res_geo_warm_b.status_code == 200
    assert any(f["id"] == job_b_id for f in res_geo_warm_b.json()["features"])

    # Warm 4: location=a & category=b:c -> returns empty from Redis
    res_geo_warm_cross = client.get("/api/v1/jobs/map/geojson?location=a&category=b:c")
    assert res_geo_warm_cross.status_code == 200
    assert not any(f["id"] == job_b_id for f in res_geo_warm_cross.json()["features"])


def _lat_lng_to_tile(lat: float, lng: float, z: int) -> tuple[int, int]:
    """Helper calculating Slippy Map (TMS/XYZ) tile coordinates (x, y) for a given (lat, lng, z)."""
    n = 2.0 ** z
    x = int((lng + 180.0) / 360.0 * n)
    lat_rad = math.radians(lat)
    y = int((1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n)
    return x, y


def test_map_tile_conditional_request_and_304(client):
    """Test /map/tile endpoint conditional requests with ETag, 304, and verified non-empty tile job containment."""
    invalidate_map_cache()
    lat = 41.310
    lng = 69.245
    zoom = 10
    # Calculate exact tile coordinates for Tashkent coordinates
    tile_x, tile_y = _lat_lng_to_tile(lat, lng, zoom)
    assert tile_x == 708 and tile_y == 382, f"Expected tile (708, 382) for Tashkent, got ({tile_x}, {tile_y})"

    with SessionLocal() as db:
        _, test_job = _create_test_employer_and_job(db, title="Tile Test Job Tashkent", lat=lat, lng=lng)
        test_job_id = test_job.id

    # 1. Request matching tile (z=10, x=708, y=382) -> must contain the job
    res_tile = client.get(f"/api/v1/jobs/map/tile/{zoom}/{tile_x}/{tile_y}")
    assert res_tile.status_code == 200
    tile_pins = res_tile.json()
    assert isinstance(tile_pins, list) and len(tile_pins) > 0, "Tile payload must not be empty"
    assert any(p["id"] == test_job_id for p in tile_pins), f"Job {test_job_id} must be in tile ({tile_x}, {tile_y})"
    etag = res_tile.headers.get("ETag")
    assert etag is not None
    assert "public" in res_tile.headers.get("Cache-Control", "")

    # 2. Conditional request matching ETag -> 304 Not Modified with identical ETag
    res_tile_cond = client.get(f"/api/v1/jobs/map/tile/{zoom}/{tile_x}/{tile_y}", headers={"If-None-Match": etag})
    assert res_tile_cond.status_code == 304
    assert res_tile_cond.headers.get("ETag") == etag

    # 3. Request adjacent tile (z=10, x=707, y=382) -> must NOT contain the job
    res_adj = client.get(f"/api/v1/jobs/map/tile/{zoom}/{tile_x - 1}/{tile_y}")
    assert res_adj.status_code == 200
    adj_pins = res_adj.json()
    assert not any(p["id"] == test_job_id for p in adj_pins), f"Job {test_job_id} must not leak into adjacent tile"

    # 4. Fetch raw pins ETag and pass to tile endpoint (internal delegation protection)
    res_pins = client.get("/api/v1/jobs/map?min_lat=41.2&max_lat=41.4&min_lng=69.1&max_lng=69.3")
    pins_etag = res_pins.headers.get("ETag")
    if pins_etag:
        res_cross = client.get(f"/api/v1/jobs/map/tile/{zoom}/{tile_x}/{tile_y}", headers={"If-None-Match": pins_etag})
        assert res_cross.status_code in (200, 304)


def test_map_geojson_fail_closed_on_internal_error_status(client):
    """Negative regression test: get_map_geojson must fail closed and NOT mask internal 5xx errors as 200 OK empty collections."""
    with patch("app.api.v1.endpoints.jobs.read.get_map_jobs") as mock_get_jobs:
        mock_get_jobs.return_value = Response(
            content=b'{"detail":"Database unreachable"}',
            status_code=503,
            media_type="application/json",
        )
        res = client.get("/api/v1/jobs/map/geojson")
        assert res.status_code == 503, f"Expected 503, got {res.status_code}"
        assert "Database unreachable" in res.text


def test_map_geojson_fail_closed_on_corrupt_json(client):
    """Negative regression test: get_map_geojson must fail closed (502 Bad Gateway) when internal pins payload is unparseable or corrupt."""
    with patch("app.api.v1.endpoints.jobs.read.get_map_jobs") as mock_get_jobs:
        mock_get_jobs.return_value = Response(
            content=b'<html><body>500 Internal Error Page</body></html>',
            status_code=200,
            media_type="application/json",
        )
        res = client.get("/api/v1/jobs/map/geojson")
        assert res.status_code == 502, f"Expected 502 Bad Gateway, got {res.status_code}"
        assert "Xarita ma'lumotlarini yuklashda xatolik yuz berdi" in res.text


def test_chat_ws_ticket_endpoint_error_handling(client):
    """Test error handling on ws-ticket endpoint for invalid chat and Redis failure."""
    with SessionLocal() as db:
        worker = make_user(role="worker", phone="+998908889900")
        employer = make_user(role="employer", phone="+998908889911")
        chat = models.Chat(workerId=worker.id, employerId=employer.id)
        db.add(chat)
        db.commit()
        db.refresh(chat)
        chat_id = chat.id

    login(client, worker)

    # Non-existent chat -> 404
    res_not_found = client.post("/api/v1/chats/nonexistent-chat-id/ws-ticket")
    assert res_not_found.status_code == 404

    # Redis failure simulation -> 500 without leaking ticket contents
    with patch("app.api.v1.endpoints.chats.main.redis_client.set", side_effect=Exception("Redis down")):
        res_err = client.post(f"/api/v1/chats/{chat_id}/ws-ticket")
        assert res_err.status_code == 500
        assert "Chipta yaratishda xatolik yuz berdi" in res_err.text
