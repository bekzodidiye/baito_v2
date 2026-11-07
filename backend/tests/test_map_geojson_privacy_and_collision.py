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


def test_map_cache_privacy_user_a_logout_user_b(client):
    """Personalized map cache test: User A -> logout -> User B.
    Browser cache ETag from User A must not serve 304 or leak state to User B.
    All responses must carry Cache-Control: private, no-cache and Vary: Cookie, Authorization.
    """
    invalidate_map_cache()
    with SessionLocal() as db:
        _, job_1 = _create_test_employer_and_job(db, title="A-B Job 1", lat=41.320, lng=69.250)
        _, job_2 = _create_test_employer_and_job(db, title="A-B Job 2", lat=41.325, lng=69.255)
        job_1_id = job_1.id
        job_2_id = job_2.id

        worker_a = make_user(role="worker", phone="+998901230001")
        worker_b = make_user(role="worker", phone="+998901230002")

        # Worker A applied only to Job 1
        db.add(models.Application(id=str(uuid.uuid4()), jobId=job_1_id, workerId=worker_a.id, status="pending"))
        # Worker B applied only to Job 2
        db.add(models.Application(id=str(uuid.uuid4()), jobId=job_2_id, workerId=worker_b.id, status="pending"))
        db.commit()

    # 1. User A requests map
    login(client, worker_a)
    res_a = client.get("/api/v1/jobs/map")
    assert res_a.status_code == 200
    assert "private" in res_a.headers.get("Cache-Control", "")
    assert "no-cache" in res_a.headers.get("Cache-Control", "")
    assert "Cookie" in res_a.headers.get("Vary", "")
    assert "Authorization" in res_a.headers.get("Vary", "")

    pins_a = {p["id"]: p for p in res_a.json()}
    assert pins_a[job_1_id]["applied"] is True
    assert pins_a[job_2_id]["applied"] is False
    etag_a = res_a.headers.get("ETag")
    assert etag_a is not None

    # 2. User A logs out
    res_logout = client.post("/api/v1/auth/logout")
    assert res_logout.status_code == 200

    # 3. User B logs in
    login(client, worker_b)

    # 4. User B requests map with User A's cached ETag in If-None-Match
    res_b = client.get("/api/v1/jobs/map", headers={"If-None-Match": etag_a})
    # MUST NOT return 304 Not Modified!
    assert res_b.status_code == 200, f"Expected 200 for different user, got {res_b.status_code}"
    assert "private" in res_b.headers.get("Cache-Control", "")
    assert "no-cache" in res_b.headers.get("Cache-Control", "")
    assert "Cookie" in res_b.headers.get("Vary", "")

    pins_b = {p["id"]: p for p in res_b.json()}
    # User B must see their own state: Job 1 not applied, Job 2 applied!
    assert pins_b[job_1_id]["applied"] is False
    assert pins_b[job_2_id]["applied"] is True


def test_map_cache_guest_to_authenticated_privacy(client):
    """Guest -> Authenticated test:
    Public guest map cache must carry Vary: Cookie, Authorization.
    An authenticated user presenting a guest ETag must NOT receive a 304 guest response.
    """
    invalidate_map_cache()
    with SessionLocal() as db:
        _, job = _create_test_employer_and_job(db, title="Guest-Auth Job", lat=41.330, lng=69.260)
        job_id = job.id
        worker = make_user(role="worker", phone="+998901230003")
        db.add(models.Application(id=str(uuid.uuid4()), jobId=job_id, workerId=worker.id, status="pending"))
        db.commit()

    # 1. Guest request (clear all cookies)
    client.cookies.clear()
    res_guest = client.get("/api/v1/jobs/map")
    assert res_guest.status_code == 200
    assert "public" in res_guest.headers.get("Cache-Control", "")
    assert "Cookie" in res_guest.headers.get("Vary", "")
    assert "Authorization" in res_guest.headers.get("Vary", "")
    etag_guest = res_guest.headers.get("ETag")
    assert etag_guest is not None

    pins_guest = {p["id"]: p for p in res_guest.json()}
    assert pins_guest[job_id]["applied"] is False

    # 2. Authenticated worker requests with If-None-Match = etag_guest
    login(client, worker)
    res_auth = client.get("/api/v1/jobs/map", headers={"If-None-Match": etag_guest})
    assert res_auth.status_code == 200, f"Expected 200, got {res_auth.status_code}"
    assert "private" in res_auth.headers.get("Cache-Control", "")
    assert "no-cache" in res_auth.headers.get("Cache-Control", "")

    pins_auth = {p["id"]: p for p in res_auth.json()}
    assert pins_auth[job_id]["applied"] is True


def test_map_tile_safe_coordinate_bounds(client):
    """Tile endpoint must validate z/x/y coordinate bounds and fail safely without crashing."""
    # Valid Tashkent tile (z=10, x=708, y=382) -> 200
    res_valid = client.get("/api/v1/jobs/map/tile/10/708/382")
    assert res_valid.status_code == 200
    assert "public" in res_valid.headers.get("Cache-Control", "")
    assert "Accept-Encoding" in res_valid.headers.get("Vary", "")

    # Out of bounds z (> 20) -> 400 or 422
    res_z_high = client.get("/api/v1/jobs/map/tile/25/0/0")
    assert res_z_high.status_code in (400, 422)

    # Negative z (< 0) -> 400 or 422
    res_z_neg = client.get("/api/v1/jobs/map/tile/-1/0/0")
    assert res_z_neg.status_code in (400, 422)

    # Out of bounds x (x >= 2**z): For z=5, max_x = 31. x=32 must be rejected
    res_x_high = client.get("/api/v1/jobs/map/tile/5/32/0")
    assert res_x_high.status_code == 400
    assert "Noto'g'ri tile koordinatalari" in res_x_high.text

    # Out of bounds y (y >= 2**z): For z=5, y=32 must be rejected
    res_y_high = client.get("/api/v1/jobs/map/tile/5/0/32")
    assert res_y_high.status_code == 400
    assert "Noto'g'ri tile koordinatalari" in res_y_high.text

    # Negative x / y -> 400 or 422
    res_neg_coord = client.get("/api/v1/jobs/map/tile/5/-1/0")
    assert res_neg_coord.status_code in (400, 422)


def test_websocket_open_connection_revocation_on_session_revoked(client):
    """An open WebSocket connection must detect session revocation and terminate immediately."""
    with SessionLocal() as db:
        worker = make_user(role="worker", phone="+998901230004")
        employer = make_user(role="employer", phone="+998901230005")
        chat = models.Chat(workerId=worker.id, employerId=employer.id)
        db.add(chat)
        db.commit()
        db.refresh(chat)
        chat_id = chat.id

    login(client, worker)
    res_ticket = client.post(f"/api/v1/chats/{chat_id}/ws-ticket")
    assert res_ticket.status_code == 200
    ticket = res_ticket.json()["ticket"]

    with client.websocket_connect(f"/api/v1/chats/ws/{chat_id}?ticket={ticket}") as ws:
        # First message while session is active succeeds
        ws.send_json({"type": "ping"})
        msg = ws.receive_json()
        assert msg.get("type") == "pong"

        # Simulate logout / session revocation in database
        with SessionLocal() as db:
            sessions = db.query(ActiveSession).filter(ActiveSession.user_uid == worker.uid).all()
            for s in sessions:
                s.is_active = False
            db.commit()

        # Next action on the OPEN socket must be rejected due to revocation
        ws.send_json({"type": "ping"})
        msg_revoked = ws.receive_json()
        assert msg_revoked.get("error") == "session_revoked"


def test_websocket_open_connection_revocation_on_user_banned(client):
    """An open WebSocket connection must detect when a user is banned and terminate with 1008."""
    with SessionLocal() as db:
        worker = make_user(role="worker", phone="+998901230006")
        employer = make_user(role="employer", phone="+998901230007")
        chat = models.Chat(workerId=worker.id, employerId=employer.id)
        db.add(chat)
        db.commit()
        db.refresh(chat)
        chat_id = chat.id

    login(client, worker)
    res_ticket = client.post(f"/api/v1/chats/{chat_id}/ws-ticket")
    assert res_ticket.status_code == 200
    ticket = res_ticket.json()["ticket"]

    with client.websocket_connect(f"/api/v1/chats/ws/{chat_id}?ticket={ticket}") as ws:
        ws.send_json({"type": "ping"})
        assert ws.receive_json().get("type") == "pong"

        # Admin bans the user
        with SessionLocal() as db:
            u = db.query(models.User).filter(models.User.id == worker.id).first()
            u.isBanned = True
            db.commit()

        # Next action must fail and close
        ws.send_json({"type": "ping"})
        msg = ws.receive_json()
        assert msg.get("error") == "session_revoked"


def test_websocket_multi_socket_logout_revocation(client):
    """Multi-socket revocation: when a user logs out, all open sockets for that user are revoked."""
    with SessionLocal() as db:
        worker = make_user(role="worker", phone="+998901230008")
        employer = make_user(role="employer", phone="+998901230009")
        chat = models.Chat(workerId=worker.id, employerId=employer.id)
        db.add(chat)
        db.commit()
        db.refresh(chat)
        chat_id = chat.id

    login(client, worker)
    t1 = client.post(f"/api/v1/chats/{chat_id}/ws-ticket").json()["ticket"]
    t2 = client.post(f"/api/v1/chats/{chat_id}/ws-ticket").json()["ticket"]

    with client.websocket_connect(f"/api/v1/chats/ws/{chat_id}?ticket={t1}") as ws1:
        with client.websocket_connect(f"/api/v1/chats/ws/{chat_id}?ticket={t2}") as ws2:
            ws1.send_json({"type": "ping"})
            assert ws1.receive_json().get("type") == "pong"
            ws2.send_json({"type": "ping"})
            assert ws2.receive_json().get("type") == "pong"

            # Revoke session (user logs out)
            with SessionLocal() as db:
                sessions = db.query(ActiveSession).filter(ActiveSession.user_uid == worker.uid).all()
                for s in sessions:
                    s.is_active = False
                db.commit()

            # Both sockets must be rejected
            ws1.send_json({"type": "ping"})
            assert ws1.receive_json().get("error") == "session_revoked"
            ws2.send_json({"type": "ping"})
            assert ws2.receive_json().get("error") == "session_revoked"


def test_websocket_flood_control_for_control_frames(client):
    """Flood control must apply to ping, typing, and read frames, preventing Denial of Service."""
    with SessionLocal() as db:
        worker = make_user(role="worker", phone="+998901230010")
        employer = make_user(role="employer", phone="+998901230011")
        chat = models.Chat(workerId=worker.id, employerId=employer.id)
        db.add(chat)
        db.commit()
        db.refresh(chat)
        chat_id = chat.id

    login(client, worker)
    ticket = client.post(f"/api/v1/chats/{chat_id}/ws-ticket").json()["ticket"]

    with client.websocket_connect(f"/api/v1/chats/ws/{chat_id}?ticket={ticket}") as ws:
        rate_limited_observed = False
        # Send 25 pings in rapid succession
        for _ in range(25):
            ws.send_json({"type": "ping"})
            res = ws.receive_json()
            if res.get("error") in ("rate_limited", "flood_detected"):
                rate_limited_observed = True
                break

        assert rate_limited_observed, "Flood of ping frames must be throttled with rate_limited or flood_detected error"


def test_websocket_sustained_flood_terminates_connection(client):
    """Sustained flood past rate limits must not stream infinite rate_limited messages; socket must be terminated."""
    with SessionLocal() as db:
        worker = make_user(role="worker", phone="+998901230014")
        employer = make_user(role="employer", phone="+998901230015")
        chat = models.Chat(workerId=worker.id, employerId=employer.id)
        db.add(chat)
        db.commit()
        db.refresh(chat)
        chat_id = chat.id

    login(client, worker)
    ticket = client.post(f"/api/v1/chats/{chat_id}/ws-ticket").json()["ticket"]

    with client.websocket_connect(f"/api/v1/chats/ws/{chat_id}?ticket={ticket}") as ws:
        # Exhaust CONTROL_FRAME_LIMIT (20 frames)
        for _ in range(20):
            ws.send_json({"type": "ping"})
            assert ws.receive_json().get("type") == "pong"

        # Next violations return rate_limited until MAX_RATE_VIOLATIONS (5) terminates socket
        flood_detected = False
        for _ in range(10):
            ws.send_json({"type": "ping"})
            try:
                res = ws.receive_json()
                if res.get("error") == "flood_detected":
                    flood_detected = True
                    break
            except WebSocketDisconnect:
                flood_detected = True
                break

        assert flood_detected, "Sustained flood must terminate socket with flood_detected error"


def test_websocket_db_error_fail_closed_prevents_message_write_and_broadcast(client):
    """Database outage during session verification must fail closed: terminate socket, write 0 messages, broadcast 0 messages."""
    with SessionLocal() as db:
        worker = make_user(role="worker", phone="+998901230016")
        employer = make_user(role="employer", phone="+998901230017")
        chat = models.Chat(workerId=worker.id, employerId=employer.id)
        db.add(chat)
        db.commit()
        db.refresh(chat)
        chat_id = chat.id

    login(client, worker)
    ticket = client.post(f"/api/v1/chats/{chat_id}/ws-ticket").json()["ticket"]

    with client.websocket_connect(f"/api/v1/chats/ws/{chat_id}?ticket={ticket}") as ws:
        # Initial ping works while DB is healthy
        ws.send_json({"type": "ping"})
        assert ws.receive_json().get("type") == "pong"

        # Simulate synthetic PostgreSQL connection crash / DB operational error
        attack_text = "Malicious unverified message during DB outage"
        with patch("app.api.v1.endpoints.chats.websocket.crud.user.get_by_uid", side_effect=Exception("psycopg2.OperationalError: server closed the connection unexpectedly")):
            ws.send_json({"text": attack_text})
            res = ws.receive_json()
            assert res.get("error") == "session_revoked", "Socket must fail closed on DB error"

        # Verify that the message was NEVER saved to the database
        with SessionLocal() as db:
            saved_msg = db.query(models.Message).filter(models.Message.text == attack_text).first()
            assert saved_msg is None, "No message should be persisted when DB verification fails closed"


def test_websocket_idle_socket_outbound_revocation_drops_incoming_messages(client):
    """An idle, open WebSocket of a logged-out or banned user must NOT receive new broadcast messages.
    Zero authorization cache lag: immediately after logout, new private messages must not leak to the old socket.
    """
    with SessionLocal() as db:
        worker = make_user(role="worker", phone="+998901230020")
        employer = make_user(role="employer", phone="+998901230021")
        chat = models.Chat(workerId=worker.id, employerId=employer.id)
        db.add(chat)
        db.commit()
        db.refresh(chat)
        chat_id = chat.id

    # 1. Issue ticket and connect worker
    login(client, worker)
    worker_ticket = client.post(f"/api/v1/chats/{chat_id}/ws-ticket").json()["ticket"]

    # 2. Issue ticket and connect employer using a second client
    client_employer = TestClient(app)
    login(client_employer, employer)
    employer_ticket = client_employer.post(f"/api/v1/chats/{chat_id}/ws-ticket").json()["ticket"]

    with client.websocket_connect(f"/api/v1/chats/ws/{chat_id}?ticket={worker_ticket}") as ws_worker:
        with client_employer.websocket_connect(f"/api/v1/chats/ws/{chat_id}?ticket={employer_ticket}") as ws_employer:
            # Employer sends a ping to establish readiness
            ws_employer.send_json({"type": "ping"})
            assert ws_employer.receive_json().get("type") == "pong"

            # Worker is completely IDLE (sends zero frames).
            # Worker logs out / active session is deactivated in PostgreSQL
            with SessionLocal() as db:
                db.query(ActiveSession).filter(ActiveSession.user_uid == worker.uid).update({"is_active": False})
                db.commit()

            # IMMEDIATELY after logout (WITHOUT any last_checked manipulation), employer sends a confidential message
            secret_text = "Confidential employer message sent immediately after logout"
            ws_employer.send_json({"text": secret_text})

            # Employer gets message broadcast or delivery ack
            msg_emp = ws_employer.receive_json()
            assert msg_emp.get("text") == secret_text

            # Worker was idle, but outbound check in manager._send_local intercepts the revoked session immediately!
            # Worker must receive session_revoked error and close, NEVER receiving secret_text!
            msg_worker = ws_worker.receive_json()
            assert msg_worker.get("error") == "session_revoked"
            assert msg_worker.get("text") != secret_text

            # Socket is closed with 1008
            with pytest.raises(WebSocketDisconnect) as exc:
                ws_worker.receive_json()
            assert exc.value.code == 1008


def test_websocket_untracked_socket_outbound_fail_closed(client):
    """Connections missing from connection_meta must fail closed and never receive private messages."""
    from app.api.v1.endpoints.chats.manager import manager

    with SessionLocal() as db:
        worker = make_user(role="worker", phone="+998901230028")
        employer = make_user(role="employer", phone="+998901230029")
        chat = models.Chat(workerId=worker.id, employerId=employer.id)
        db.add(chat)
        db.commit()
        db.refresh(chat)
        chat_id = chat.id

    login(client, worker)
    ticket = client.post(f"/api/v1/chats/{chat_id}/ws-ticket").json()["ticket"]

    with client.websocket_connect(f"/api/v1/chats/ws/{chat_id}?ticket={ticket}") as ws:
        # Simulate missing connection_meta
        for ws_key in list(manager.connection_meta.keys()):
            del manager.connection_meta[ws_key]

        # Trigger outbound broadcast
        import asyncio
        asyncio.run(manager._send_local({"text": "Leaked message?"}, chat_id))

        # Untracked socket must be closed with 1008, never receiving the payload
        with pytest.raises(WebSocketDisconnect) as exc:
            ws.receive_json()
        assert exc.value.code == 1008


def test_websocket_cross_user_session_spoofing_rejected(client):
    """A user attempting to authenticate with another user's session_id must fail closed."""
    import json

    with SessionLocal() as db:
        user_a = make_user(role="worker", phone="+998901230030")
        user_b = make_user(role="worker", phone="+998901230031")
        employer = make_user(role="employer", phone="+998901230032")
        chat = models.Chat(workerId=user_a.id, employerId=employer.id)
        db.add(chat)

        # Create active session for user_b
        session_b = ActiveSession(
            id=str(uuid.uuid4()),
            user_uid=user_b.uid,
            device_name="User B Phone",
            is_active=True,
        )
        db.add(session_b)
        db.commit()
        db.refresh(chat)
        chat_id = chat.id
        session_b_id = session_b.id

    # User A tries to use User B's session_id in their ticket
    spoofed_ticket = f"spoofed-ticket-{uuid.uuid4()}"
    ticket_payload = {
        "user_id": user_a.id,
        "user_uid": user_a.uid,
        "chat_id": chat_id,
        "role": user_a.role,
        "session_id": session_b_id,  # Belongs to user_b!
    }
    redis_client.set(f"chat:ws_ticket:{spoofed_ticket}", json.dumps(ticket_payload), ex=60)

    with pytest.raises(WebSocketDisconnect) as exc:
        with client.websocket_connect(f"/api/v1/chats/ws/{chat_id}?ticket={spoofed_ticket}"):
            pass
    assert exc.value.code == 1008


def test_websocket_two_devices_one_revoked_session_isolation(client):
    """Revoking Session 1 on Device 1 must disconnect Device 1 while Device 2 remains active and isolated."""
    with SessionLocal() as db:
        worker = make_user(role="worker", phone="+998901230022")
        employer = make_user(role="employer", phone="+998901230023")
        chat = models.Chat(workerId=worker.id, employerId=employer.id)
        db.add(chat)
        db.commit()
        db.refresh(chat)
        chat_id = chat.id

    # Device 1 login
    client_dev1 = TestClient(app)
    login(client_dev1, worker)
    ticket_dev1 = client_dev1.post(f"/api/v1/chats/{chat_id}/ws-ticket").json()["ticket"]

    # Device 2 login
    client_dev2 = TestClient(app)
    login(client_dev2, worker)
    ticket_dev2 = client_dev2.post(f"/api/v1/chats/{chat_id}/ws-ticket").json()["ticket"]

    assert ticket_dev1 != ticket_dev2

    with client_dev1.websocket_connect(f"/api/v1/chats/ws/{chat_id}?ticket={ticket_dev1}") as ws_dev1:
        with client_dev2.websocket_connect(f"/api/v1/chats/ws/{chat_id}?ticket={ticket_dev2}") as ws_dev2:
            # Both devices can ping
            ws_dev1.send_json({"type": "ping"})
            assert ws_dev1.receive_json().get("type") == "pong"
            ws_dev2.send_json({"type": "ping"})
            assert ws_dev2.receive_json().get("type") == "pong"

            # Device 1 logs out (revokes session 1 only)
            res_logout = client_dev1.post("/api/v1/auth/logout")
            assert res_logout.status_code == 200

            # Device 1 sends ping -> session is revoked!
            ws_dev1.send_json({"type": "ping"})
            res_dev1 = ws_dev1.receive_json()
            assert res_dev1.get("error") == "session_revoked"

            with pytest.raises(WebSocketDisconnect) as exc:
                ws_dev1.receive_json()
            assert exc.value.code == 1008

            # Device 2 sends ping -> session 2 is still active and valid!
            ws_dev2.send_json({"type": "ping"})
            assert ws_dev2.receive_json().get("type") == "pong"


def test_websocket_real_sidless_token_and_ticket_rejected_without_mocks(client):
    """Real JWT tokens and Redis tickets without a session_id must be rejected with code 1008 without mocks."""
    import json
    from app.core import security
    from app.core.config import settings

    with SessionLocal() as db:
        worker = make_user(role="worker", phone="+998901230026")
        employer = make_user(role="employer", phone="+998901230027")
        chat = models.Chat(workerId=worker.id, employerId=employer.id)
        db.add(chat)
        db.commit()
        db.refresh(chat)
        chat_id = chat.id

    # 1. Real JWT access token created WITHOUT sid claim (legacy/unbound token)
    real_sidless_jwt = security.create_access_token(subject=worker.uid, sid=None)

    # Connecting via cookie with real sid-less token must fail handshake with code 1008
    client.cookies.set(settings.ACCESS_COOKIE_NAME, real_sidless_jwt)
    with pytest.raises(WebSocketDisconnect) as exc:
        with client.websocket_connect(f"/api/v1/chats/ws/{chat_id}"):
            pass
    assert exc.value.code == 1008
    client.cookies.clear()

    # 2. Real Redis ticket created WITHOUT session_id
    sidless_ticket = f"test-ticket-sidless-{uuid.uuid4()}"
    ticket_data = {
        "user_id": worker.id,
        "user_uid": worker.uid,
        "chat_id": chat_id,
        "role": worker.role,
        "session_id": None,
    }
    redis_client.set(f"chat:ws_ticket:{sidless_ticket}", json.dumps(ticket_data), ex=60)

    # Connecting with real sid-less ticket must fail handshake with code 1008
    with pytest.raises(WebSocketDisconnect) as exc2:
        with client.websocket_connect(f"/api/v1/chats/ws/{chat_id}?ticket={sidless_ticket}"):
            pass
    assert exc2.value.code == 1008


def test_websocket_query_token_strictly_rejected_for_access_log_protection(client):
    """Passing tokens via ?token= query parameter must be strictly rejected with code 1008 to protect access logs."""
    from app.core import security

    with SessionLocal() as db:
        worker = make_user(role="worker", phone="+998901230033")
        employer = make_user(role="employer", phone="+998901230034")
        chat = models.Chat(workerId=worker.id, employerId=employer.id)
        db.add(chat)
        db.commit()
        db.refresh(chat)
        chat_id = chat.id

    # Even with a valid, session-bound JWT, ?token= query parameter is forbidden (CWE-598)
    valid_jwt = security.create_access_token(subject=worker.uid, sid=str(uuid.uuid4()))
    with pytest.raises(WebSocketDisconnect) as exc:
        with client.websocket_connect(f"/api/v1/chats/ws/{chat_id}?token={valid_jwt}"):
            pass
    assert exc.value.code == 1008


def test_websocket_untrusted_origin_rejected(client):
    """WebSocket handshake must reject untrusted Origin headers with code 1008."""
    with SessionLocal() as db:
        worker = make_user(role="worker", phone="+998901230012")
        employer = make_user(role="employer", phone="+998901230013")
        chat = models.Chat(workerId=worker.id, employerId=employer.id)
        db.add(chat)
        db.commit()
        db.refresh(chat)
        chat_id = chat.id

    login(client, worker)
    ticket = client.post(f"/api/v1/chats/{chat_id}/ws-ticket").json()["ticket"]

    # Connecting with untrusted evil origin must fail handshake with code 1008
    with pytest.raises(WebSocketDisconnect) as exc:
        with client.websocket_connect(
            f"/api/v1/chats/ws/{chat_id}?ticket={ticket}",
            headers={"Origin": "https://evil-attacker-site.com"},
        ):
            pass
    assert exc.value.code == 1008
