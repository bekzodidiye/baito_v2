import pytest
from fastapi import Query
from fastapi.testclient import TestClient

from app.main import app
from app import models
from app.db.session import SessionLocal
from app.models.job import JobStatus
from app.core.map_cache import (
    build_map_pins_cache_key,
    get_map_cache_version,
    invalidate_map_cache,
    _format_coord,
    CACHE_MAP_PINS_PREFIX,
)
from app.redis_client import redis_client


@pytest.fixture
def client():
    return TestClient(app)


def test_format_coord_canonical_representations():
    """Unit test _format_coord helper across coordinate variations and edge cases."""
    # None and Query default handling
    assert _format_coord(None) == "_"
    assert _format_coord(Query(None)) == "_"

    # Floats with varying decimal lengths
    assert _format_coord(41.28) == "41.28"
    assert _format_coord(41.281) == "41.281"
    assert _format_coord(41.276) == "41.276"
    assert _format_coord(41.0) == "41.0"
    assert _format_coord(41) == "41.0"
    assert _format_coord(0.0) == "0.0"
    assert _format_coord(0) == "0.0"
    assert _format_coord(-0.0) == "0.0"

    # Equivalent float representations yield identical key components
    assert _format_coord(41.281) == _format_coord(41.2810)
    assert _format_coord(41) == _format_coord(41.0)
    assert _format_coord(0.0) == _format_coord(-0.0)

    # Sub-6-decimal precision: distinct floats yield distinct key components without rounding
    assert _format_coord(41.2810001) == "41.2810001"
    assert _format_coord(41.2810002) == "41.2810002"
    assert _format_coord(41.2810001) != _format_coord(41.2810002)

    # Negative coordinates
    assert _format_coord(-71.123456) == "-71.123456"

    # Full exact float precision without lossy rounding
    assert _format_coord(41.1234567) == "41.1234567"

    # String float conversion and invalid inputs
    assert _format_coord("41.281") == "41.281"
    assert _format_coord("invalid") == "_"


def test_cache_key_sub_6_decimal_precision():
    """Prove that coordinates differing beyond 6 decimals yield distinct cache keys."""
    key1 = build_map_pins_cache_key(version=1, min_lat=41.2810001)
    key2 = build_map_pins_cache_key(version=1, min_lat=41.2810002)
    assert key1 != key2
    assert ":41.2810001:" in key1
    assert ":41.2810002:" in key2


def test_cache_key_distinct_for_differing_sub_decimal_viewports():
    """Prove that distinct viewports that previously collided under 2-decimal rounding

    now yield distinct cache keys.
    """
    version = 1
    # Viewport 1 (Narrow bounds)
    # Under old round(..., 2), both lat 41.281 and lat 41.276 rounded to 41.28
    key_viewport_1 = build_map_pins_cache_key(
        version=version,
        min_lat=41.281,
        max_lat=41.341,
        min_lng=69.211,
        max_lng=69.251,
    )
    # Viewport 2 (Wider bounds)
    key_viewport_2 = build_map_pins_cache_key(
        version=version,
        min_lat=41.276,
        max_lat=41.344,
        min_lng=69.206,
        max_lng=69.254,
    )

    # Must be distinct keys!
    assert key_viewport_1 != key_viewport_2
    assert "41.281:41.341:69.211:69.251" in key_viewport_1
    assert "41.276:41.344:69.206:69.254" in key_viewport_2


def test_cache_key_identical_for_equivalent_bounds():
    """Prove that equivalent numerical bounds produce identical cache keys."""
    version = 1
    key1 = build_map_pins_cache_key(
        version=version,
        min_lat=41.281,
        max_lat=41.34,
        min_lng=69.21,
        max_lng=69.25,
    )
    # Passed with trailing zero float representations or identical numbers
    key2 = build_map_pins_cache_key(
        version=version,
        min_lat=41.2810,
        max_lat=41.3400,
        min_lng=69.210,
        max_lng=69.250,
    )
    assert key1 == key2


def test_cache_key_preserves_none_as_underscore():
    """Prove that None bounds preserve current '_' representation."""
    version = 1
    key_nationwide = build_map_pins_cache_key(
        version=version,
        min_lat=None,
        max_lat=None,
        min_lng=None,
        max_lng=None,
    )
    expected_segment = f"{CACHE_MAP_PINS_PREFIX}:v1:_:_:_:_::::500"
    assert key_nationwide == expected_segment

    # Partial bounds
    key_partial = build_map_pins_cache_key(
        version=version,
        min_lat=41.28,
        max_lat=None,
        min_lng=None,
        max_lng=69.25,
    )
    assert f"{CACHE_MAP_PINS_PREFIX}:v1:41.28:_:_:69.25::::500" == key_partial


def test_cache_key_preserves_filters_and_limits():
    """Prove that search, location, category, and limit parameters remain isolated."""
    version = 1
    key_default = build_map_pins_cache_key(version=version, limit=500)
    key_filtered = build_map_pins_cache_key(
        version=version,
        location="Tashkent",
        category="delivery",
        search="courier",
        limit=200,
    )
    assert ":tashkent:delivery:courier:200" in key_filtered
    assert key_default != key_filtered


def test_distinct_viewports_endpoint_isolation_no_cache_poisoning(client):
    """Integration test proving distinct viewports do not serve stale or wrong

    cached results to each other when queried sequentially.
    """
    with SessionLocal() as db_session:
        employer = db_session.query(models.User).filter_by(id="test-employer-cache-1").first()
        if not employer:
            employer = models.User(
                id="test-employer-cache-1",
                phone="+998901239988",
                role="employer",
                name="Test Cache Employer",
            )
            db_session.add(employer)
            db_session.flush()

        # Job 1 is inside both Viewport 1 (narrow) and Viewport 2 (wider)
        job1 = models.Job(
            title="Inner Viewport Job",
            company="Company Inner",
            location="Toshkent, Chilonzor",
            coordinateX=41.282,
            coordinateY=69.212,
            salary=300000,
            description="Tavsif 1",
            status=JobStatus.OPEN,
            employerId="test-employer-cache-1",
            neededWorkers="1",
        )
        # Job 2 is outside Viewport 1 (narrow) but inside Viewport 2 (wider)
        job2 = models.Job(
            title="Outer Viewport Job",
            company="Company Outer",
            location="Toshkent, Sergeli",
            coordinateX=41.277,
            coordinateY=69.207,
            salary=350000,
            description="Tavsif 2",
            status=JobStatus.OPEN,
            employerId="test-employer-cache-1",
            neededWorkers="1",
        )
        db_session.add(job1)
        db_session.add(job2)
        db_session.commit()

    # Step 1: Query narrow viewport (lat: 41.280 to 41.340, lng: 69.210 to 69.250)
    # Under old logic, this was cached under key rounded to 41.28:41.34:69.21:69.25
    res1 = client.get(
        "/api/v1/jobs/map?min_lat=41.280&max_lat=41.340&min_lng=69.210&max_lng=69.250"
    )
    assert res1.status_code == 200
    pins1 = res1.json()
    titles1 = [p["title"] for p in pins1]
    assert "Inner Viewport Job" in titles1
    assert "Outer Viewport Job" not in titles1

    # Step 2: Query wider viewport (lat: 41.275 to 41.345, lng: 69.205 to 69.255)
    # Under old logic, this also rounded to 41.28:41.34:69.21:69.25 and would return the
    # narrow cached results (missing "Outer Viewport Job")!
    res2 = client.get(
        "/api/v1/jobs/map?min_lat=41.275&max_lat=41.345&min_lng=69.205&max_lng=69.255"
    )
    assert res2.status_code == 200
    pins2 = res2.json()
    titles2 = [p["title"] for p in pins2]
    # In fixed system, the wider viewport MUST include both jobs
    assert "Inner Viewport Job" in titles2
    assert "Outer Viewport Job" in titles2

    # Step 3: Re-query narrow viewport to verify its cache wasn't overwritten
    res3 = client.get(
        "/api/v1/jobs/map?min_lat=41.280&max_lat=41.340&min_lng=69.210&max_lng=69.250"
    )
    assert res3.status_code == 200
    pins3 = res3.json()
    titles3 = [p["title"] for p in pins3]
    assert "Inner Viewport Job" in titles3
    assert "Outer Viewport Job" not in titles3


def test_cache_version_invalidation_updates_cache_key_and_data(client):
    """Prove that invalidate_map_cache updates version and prevents serving stale data."""
    with SessionLocal() as db_session:
        employer = db_session.query(models.User).filter_by(id="test-employer-cache-2").first()
        if not employer:
            employer = models.User(
                id="test-employer-cache-2",
                phone="+998901239977",
                role="employer",
                name="Test Cache Employer 2",
            )
            db_session.add(employer)
            db_session.flush()

        job1 = models.Job(
            title="Initial Cache Job",
            company="Company 1",
            location="Toshkent",
            coordinateX=41.30,
            coordinateY=69.25,
            salary=200000,
            description="Tavsif 1",
            status=JobStatus.OPEN,
            employerId="test-employer-cache-2",
        )
        db_session.add(job1)
        db_session.commit()

    v_initial = get_map_cache_version()
    res1 = client.get("/api/v1/jobs/map?min_lat=41.29&max_lat=41.31&min_lng=69.24&max_lng=69.26")
    assert res1.status_code == 200
    assert any(p["title"] == "Initial Cache Job" for p in res1.json())

    # Add second job
    with SessionLocal() as db_session:
        job2 = models.Job(
            title="Newly Created Job",
            company="Company 2",
            location="Toshkent",
            coordinateX=41.305,
            coordinateY=69.255,
            salary=250000,
            description="Tavsif 2",
            status=JobStatus.OPEN,
            employerId="test-employer-cache-2",
        )
        db_session.add(job2)
        db_session.commit()

    # Without invalidation, request would hit cache (still only 1 job)
    res_stale = client.get("/api/v1/jobs/map?min_lat=41.29&max_lat=41.31&min_lng=69.24&max_lng=69.26")
    assert not any(p["title"] == "Newly Created Job" for p in res_stale.json())

    # Now invalidate map cache
    invalidate_map_cache()
    v_after = get_map_cache_version()
    assert v_after > v_initial

    # Subsequent request must bypass stale cache and fetch fresh data containing both jobs
    res_fresh = client.get("/api/v1/jobs/map?min_lat=41.29&max_lat=41.31&min_lng=69.24&max_lng=69.26")
    assert res_fresh.status_code == 200
    fresh_titles = [p["title"] for p in res_fresh.json()]
    assert "Initial Cache Job" in fresh_titles
    assert "Newly Created Job" in fresh_titles


def test_sub_6_decimal_endpoint_isolation_no_cache_poisoning(client):
    """Endpoint regression proving viewports differing beyond 6 decimal places do not

    serve stale or wrong cached results to each other.

    Note on test mechanism:
    The test suite executes against a real SQLite on-disk database with SQLAlchemy ORM
    and the project's in-process MockRedis dictionary fallback (configured via conftest.py).
    """
    with SessionLocal() as db_session:
        employer = db_session.query(models.User).filter_by(id="test-employer-cache-sub6").first()
        if not employer:
            employer = models.User(
                id="test-employer-cache-sub6",
                phone="+998901239966",
                role="employer",
                name="Test Cache Employer Sub6",
            )
            db_session.add(employer)
            db_session.flush()

        # Job placed at latitude 41.28100015
        job = models.Job(
            title="Sub-6-Decimal Precision Job",
            company="Precision Tech",
            location="Toshkent",
            coordinateX=41.28100015,
            coordinateY=69.21,
            salary=400000,
            description="Tavsif",
            status=JobStatus.OPEN,
            employerId="test-employer-cache-sub6",
            neededWorkers="1",
        )
        db_session.add(job)
        db_session.commit()

    # Request 1: max_lat=41.2810001 (job at 41.28100015 is outside: 41.28100015 > 41.2810001)
    res1 = client.get(
        "/api/v1/jobs/map?min_lat=41.280&max_lat=41.2810001&min_lng=69.20&max_lng=69.22"
    )
    assert res1.status_code == 200
    pins1 = res1.json()
    assert not any(p["title"] == "Sub-6-Decimal Precision Job" for p in pins1)

    # Request 2: max_lat=41.2810002 (job at 41.28100015 is inside: 41.28100015 <= 41.2810002)
    # Under lossy rounding (e.g. round(x, 6)), this would collide with Request 1's cache key!
    # With exact repr(float(x)), Request 2 has a distinct key, runs SQL, and finds the job.
    res2 = client.get(
        "/api/v1/jobs/map?min_lat=41.280&max_lat=41.2810002&min_lng=69.20&max_lng=69.22"
    )
    assert res2.status_code == 200
    pins2 = res2.json()
    assert any(p["title"] == "Sub-6-Decimal Precision Job" for p in pins2)


def test_compute_pin_signature_deterministic_and_canonical():
    """Unit test that compute_pin_signature produces deterministic 64-hex SHA-256 HMAC."""
    from app.core.map_cache import compute_pin_signature, verify_pin_signature

    pin1 = {
        "id": "job-test-1",
        "title": "Test Title",
        "coordinateX": 41.3100004,
        "coordinateY": 69.2400001,
        "status": "open",
        "applied": False,
        "bookmarked": False,
        "count": 1,
        "pinIds": ["job-test-1"],
        "geo_verified": True,
    }
    sig1 = compute_pin_signature(pin1)
    assert isinstance(sig1, str)
    assert len(sig1) == 64

    # Identical content with different key order produces the EXACT same signature
    pin2 = {
        "count": 1,
        "pinIds": ["job-test-1"],
        "status": "open",
        "coordinateY": 69.2400001,
        "coordinateX": 41.3100004,
        "title": "Test Title",
        "id": "job-test-1",
        "applied": False,
        "bookmarked": False,
        "geo_verified": True,
    }
    sig2 = compute_pin_signature(pin2)
    assert sig1 == sig2

    # Verification passes
    pin1["geo_sig"] = sig1
    assert verify_pin_signature(pin1) is True


def test_pin_signature_tamper_detection():
    """Unit test that modifying any security/correctness field invalidates signature."""
    from app.core.map_cache import compute_pin_signature, verify_pin_signature

    base_pin = {
        "id": "job-tamper-1",
        "title": "Bosh Oshpaz",
        "company": "Milliy Taomlar",
        "salary": 5000000,
        "location": "Toshkent, Chilonzor",
        "tags": ["oshxona", "ovqat"],
        "coordinateX": 41.31,
        "coordinateY": 69.24,
        "latitude": 41.31,
        "longitude": 69.24,
        "status": "open",
        "applied": False,
        "bookmarked": False,
        "isCluster": False,
        "count": 1,
        "pinIds": ["job-tamper-1"],
        "geo_verified": True,
    }
    base_sig = compute_pin_signature(base_pin)
    base_pin["geo_sig"] = base_sig
    assert verify_pin_signature(base_pin) is True

    # 1. title
    t = dict(base_pin); t["title"] = "Eskort"; assert verify_pin_signature(t) is False
    # 2. company
    t = dict(base_pin); t["company"] = "Scam Corp"; assert verify_pin_signature(t) is False
    # 3. salary
    t = dict(base_pin); t["salary"] = 99999999; assert verify_pin_signature(t) is False
    # 4. location
    t = dict(base_pin); t["location"] = "Buxoro"; assert verify_pin_signature(t) is False
    # 5. tags
    t = dict(base_pin); t["tags"] = ["hacked"]; assert verify_pin_signature(t) is False
    # 6. coordinateX
    t = dict(base_pin); t["coordinateX"] = 41.35; assert verify_pin_signature(t) is False
    # 7. coordinateY
    t = dict(base_pin); t["coordinateY"] = 69.30; assert verify_pin_signature(t) is False
    # 8. latitude (independent of coordinateX)
    t = dict(base_pin); t["latitude"] = 42.00; assert verify_pin_signature(t) is False
    # 9. longitude (independent of coordinateY)
    t = dict(base_pin); t["longitude"] = 70.00; assert verify_pin_signature(t) is False
    # 10. status
    t = dict(base_pin); t["status"] = "closed"; assert verify_pin_signature(t) is False
    # 11. applied
    t = dict(base_pin); t["applied"] = True; assert verify_pin_signature(t) is False
    # 12. bookmarked
    t = dict(base_pin); t["bookmarked"] = True; assert verify_pin_signature(t) is False
    # 13. pinIds
    t = dict(base_pin); t["pinIds"] = ["job-tamper-1", "job-tamper-extra"]; assert verify_pin_signature(t) is False
    # 14. count
    t = dict(base_pin); t["count"] = 5; assert verify_pin_signature(t) is False
    # 15. isCluster
    t = dict(base_pin); t["isCluster"] = True; assert verify_pin_signature(t) is False
    # 16. id
    t = dict(base_pin); t["id"] = "job-tamper-2"; assert verify_pin_signature(t) is False
    # 17. truncated or altered signature
    t = dict(base_pin); t["geo_sig"] = base_sig[:16]; assert verify_pin_signature(t) is False
    # 18. trust flag geo_verified modified/false
    t = dict(base_pin); t["geo_verified"] = False; assert verify_pin_signature(t) is False


def test_independent_latitude_longitude_cannot_alias():
    """Prove that changing latitude independently of coordinateX (or vice versa) invalidates signature."""
    from app.core.map_cache import compute_pin_signature, verify_pin_signature

    pin = {
        "id": "job-alias-test",
        "coordinateX": 41.300000,
        "coordinateY": 69.200000,
        "latitude": 41.300000,
        "longitude": 69.200000,
        "status": "open",
        "geo_verified": True,
    }
    sig = compute_pin_signature(pin)
    pin["geo_sig"] = sig
    assert verify_pin_signature(pin) is True

    # Mutate latitude only: coordinateX is untouched
    tampered_lat = dict(pin)
    tampered_lat["latitude"] = 41.399999
    assert verify_pin_signature(tampered_lat) is False
    assert compute_pin_signature(tampered_lat) != sig

    # Mutate coordinateX only: latitude is untouched
    tampered_cx = dict(pin)
    tampered_cx["coordinateX"] = 41.399999
    assert verify_pin_signature(tampered_cx) is False
    assert compute_pin_signature(tampered_cx) != sig


def test_get_map_cache_key_for_request_mirrors_production():
    """Unit test get_map_cache_key_for_request helper for clustered and authenticated routes."""
    from app.core.map_cache import get_map_cache_key_for_request

    ver = 42
    # Unclustered key
    k_unclustered = get_map_cache_key_for_request(version=ver, search="cook", limit=500, clustered=False)
    assert ":500" in k_unclustered
    assert ":clustered" not in k_unclustered

    # Clustered key must use limit=0 and append :clustered
    k_clustered = get_map_cache_key_for_request(version=ver, search="cook", limit=500, clustered=True)
    assert ":0" in k_clustered
    assert k_clustered.endswith(":clustered")

    # Authenticated user key
    k_auth = get_map_cache_key_for_request(version=ver, search="cook", clustered=True, user_id="u123", user_ver=5)
    assert ":clustered:u:u123:uv5" in k_auth


def test_hmac_secret_strict_validation(monkeypatch):
    """Unit test that empty or missing SECRET_KEY fails closed with RuntimeError."""
    from app.core.config import settings
    from app.core.map_cache import compute_pin_signature

    monkeypatch.setattr(settings, "SECRET_KEY", "")
    with pytest.raises(RuntimeError, match="SECRET_KEY must be configured"):
        compute_pin_signature({"id": "fail-key"})

    monkeypatch.setattr(settings, "SECRET_KEY", "   ")
    with pytest.raises(RuntimeError, match="SECRET_KEY must be configured"):
        compute_pin_signature({"id": "fail-key"})


def test_strict_type_validation_no_lossy_conversion():
    """Unit tests proving FIX 2 strict type checking: distinct JSON types are never silently converted.
    - int(3500000.9) must not equal 3500000
    - bool("false") must not equal true
    - Numeric strings ("41.31") must not equal numeric coordinates (41.31)
    - Numeric 1 must not equal True
    """
    from app.core.map_cache import compute_pin_signature, verify_pin_signature, _canonical_pin_data

    valid_base = {
        "id": "job-type-test",
        "title": "Oshpaz",
        "salary": 3500000,
        "coordinateX": 41.31,
        "coordinateY": 69.24,
        "latitude": 41.31,
        "longitude": 69.24,
        "applied": False,
        "bookmarked": False,
        "urgent": False,
        "isCluster": False,
        "geo_verified": True,
        "count": 1,
        "pinIds": ["job-type-test"],
        "tags": ["oshxona"],
    }
    sig = compute_pin_signature(valid_base)
    valid_base["geo_sig"] = sig
    assert verify_pin_signature(valid_base) is True

    # 1. Float salary (3500000.9) must raise TypeError, NOT truncate to 3500000
    with pytest.raises(TypeError, match="must be an integer"):
        _canonical_pin_data({"id": "j1", "salary": 3500000.9})
    t_salary = dict(valid_base)
    t_salary["salary"] = 3500000.9
    assert verify_pin_signature(t_salary) is False

    # 2. String boolean ("false") must raise TypeError, NOT evaluate to True
    with pytest.raises(TypeError, match="must be a boolean"):
        _canonical_pin_data({"id": "j1", "applied": "false"})
    t_applied = dict(valid_base)
    t_applied["applied"] = "false"
    assert verify_pin_signature(t_applied) is False

    # 3. Numeric string coordinates ("41.31") must raise TypeError, NOT parse as 41.31
    with pytest.raises(TypeError, match="must be a numeric float or int"):
        _canonical_pin_data({"id": "j1", "coordinateX": "41.31"})
    t_coord = dict(valid_base)
    t_coord["coordinateX"] = "41.31"
    assert verify_pin_signature(t_coord) is False

    # 4. Numeric 1 in boolean field (geo_verified=1) must raise TypeError, NOT evaluate to True
    with pytest.raises(TypeError, match="must be a boolean"):
        _canonical_pin_data({"id": "j1", "geo_verified": 1})
    t_geo = dict(valid_base)
    t_geo["geo_verified"] = 1
    assert verify_pin_signature(t_geo) is False

    # 5. Boolean in integer field (count=True) must raise TypeError, NOT evaluate to 1
    with pytest.raises(TypeError, match="must be an integer"):
        _canonical_pin_data({"id": "j1", "count": True})

    # 6. Boolean in coordinate field (coordinateX=True) must raise TypeError
    with pytest.raises(TypeError, match="must be a numeric float or int"):
        _canonical_pin_data({"id": "j1", "coordinateX": True})

    # 7. Non-finite coordinates (NaN, Inf) must raise ValueError
    with pytest.raises(ValueError, match="finite number"):
        _canonical_pin_data({"id": "j1", "coordinateX": float("nan")})
    with pytest.raises(ValueError, match="finite number"):
        _canonical_pin_data({"id": "j1", "coordinateY": float("inf")})

    # 8. Non-string elements in list fields must raise TypeError
    with pytest.raises(TypeError, match="pinIds element must be str"):
        _canonical_pin_data({"id": "j1", "pinIds": ["valid", 12345]})
    with pytest.raises(TypeError, match="tags element must be str"):
        _canonical_pin_data({"id": "j1", "tags": ["valid", None]})


def test_response_signature_empty_and_populated_payloads():
    """Unit tests for whole-response HMAC signing over empty lists and populated payloads."""
    from app.core.map_cache import compute_response_signature, verify_response_signature

    key = "cache:jobs:map_pins:v1:_:_:_:_:_:_:_:500"

    # Empty payload [] must compute deterministic 64-hex SHA-256 HMAC signature
    empty_sig = compute_response_signature(cache_key=key, payload=[], clustered=False, user_id=None)
    assert isinstance(empty_sig, str)
    assert len(empty_sig) == 64
    assert verify_response_signature(cache_key=key, payload=[], resp_sig=empty_sig, clustered=False, user_id=None) is True

    # Populated payload
    pin1 = {"id": "pin-1", "title": "Job 1", "salary": 2000000, "coordinateX": 41.31, "coordinateY": 69.24, "geo_verified": True}
    pin2 = {"id": "pin-2", "title": "Job 2", "salary": 3000000, "coordinateX": 41.32, "coordinateY": 69.25, "geo_verified": True}
    pop_sig = compute_response_signature(cache_key=key, payload=[pin1, pin2], clustered=False, user_id=None)
    assert len(pop_sig) == 64
    assert pop_sig != empty_sig
    assert verify_response_signature(cache_key=key, payload=[pin1, pin2], resp_sig=pop_sig, clustered=False, user_id=None) is True


def test_response_signature_context_binding():
    """Whole-response signature must be cryptographically bound to its exact cache context."""
    from app.core.map_cache import compute_response_signature, verify_response_signature

    key_a = "cache:jobs:map_pins:v1:_:_:_:_:_:_:tashkent:500"
    key_b = "cache:jobs:map_pins:v1:_:_:_:_:_:_:samarkand:500"
    payload = [{"id": "pin-1", "coordinateX": 41.31, "coordinateY": 69.24, "geo_verified": True}]

    sig_a = compute_response_signature(cache_key=key_a, payload=payload, clustered=False, user_id=None)

    # 1. Replay to different cache_key fails
    assert verify_response_signature(cache_key=key_b, payload=payload, resp_sig=sig_a, clustered=False, user_id=None) is False

    # 2. Replay across clustered=True vs False fails
    assert verify_response_signature(cache_key=key_a, payload=payload, resp_sig=sig_a, clustered=True, user_id=None) is False

    # 3. Replay across user_id (Worker A to Worker B) fails
    sig_user_a = compute_response_signature(cache_key=key_a, payload=payload, clustered=False, user_id="worker-a")
    assert verify_response_signature(cache_key=key_a, payload=payload, resp_sig=sig_user_a, clustered=False, user_id="worker-b") is False

    # 4. Replay from personalized into public (user_id=None) fails
    assert verify_response_signature(cache_key=key_a, payload=payload, resp_sig=sig_user_a, clustered=False, user_id=None) is False


def test_response_signature_payload_tampering():
    """Modifying, dropping, adding, or reordering pins invalidates response signature."""
    from app.core.map_cache import compute_response_signature, verify_response_signature

    key = "cache:jobs:map_pins:v1:_:_:_:_:_:_:_:500"
    pin1 = {"id": "pin-1", "title": "Job 1", "salary": 2000000, "coordinateX": 41.31, "coordinateY": 69.24, "geo_verified": True}
    pin2 = {"id": "pin-2", "title": "Job 2", "salary": 3000000, "coordinateX": 41.32, "coordinateY": 69.25, "geo_verified": True}
    original_payload = [pin1, pin2]
    sig = compute_response_signature(cache_key=key, payload=original_payload, clustered=False, user_id=None)

    # 1. Dropping 1 pin from the list invalidates signature
    assert verify_response_signature(cache_key=key, payload=[pin1], resp_sig=sig, clustered=False, user_id=None) is False

    # 2. Replacing list with [] invalidates signature
    assert verify_response_signature(cache_key=key, payload=[], resp_sig=sig, clustered=False, user_id=None) is False

    # 3. Adding a pin invalidates signature
    pin3 = {"id": "pin-3", "title": "Job 3", "salary": 4000000, "coordinateX": 41.33, "coordinateY": 69.26, "geo_verified": True}
    assert verify_response_signature(cache_key=key, payload=[pin1, pin2, pin3], resp_sig=sig, clustered=False, user_id=None) is False

    # 4. Modifying a field in one pin invalidates response signature
    tampered_pin2 = dict(pin2)
    tampered_pin2["salary"] = 9999999
    assert verify_response_signature(cache_key=key, payload=[pin1, tampered_pin2], resp_sig=sig, clustered=False, user_id=None) is False

    # 5. Reordering the pins invalidates signature (ordered payload list)
    assert verify_response_signature(cache_key=key, payload=[pin2, pin1], resp_sig=sig, clustered=False, user_id=None) is False


def test_make_and_verify_response_envelope():
    """Unit tests for make_response_envelope and verify_response_envelope helper functions."""
    from app.core.map_cache import make_response_envelope, verify_response_envelope

    key = "cache:jobs:map_pins:v1:_:_:_:_:_:_:_:500"
    payload = [{"id": "pin-1", "coordinateX": 41.31, "coordinateY": 69.24, "geo_verified": True}]

    env = make_response_envelope(cache_key=key, payload=payload, clustered=False, user_id=None)
    assert env["cache_key"] == key
    assert env["clustered"] is False
    assert env["user_id"] is None
    assert env["payload"] == payload
    assert len(env["resp_sig"]) == 64

    # Valid envelope returns payload
    verified = verify_response_envelope(envelope=env, expected_key=key, expected_clustered=False, expected_user_id=None)
    assert verified == payload

    # Context mismatches return None
    assert verify_response_envelope(envelope=env, expected_key="other-key", expected_clustered=False, expected_user_id=None) is None
    assert verify_response_envelope(envelope=env, expected_key=key, expected_clustered=True, expected_user_id=None) is None
    assert verify_response_envelope(envelope=env, expected_key=key, expected_clustered=False, expected_user_id="user-1") is None

    # Tampered payload inside envelope returns None
    tampered_env = dict(env)
    tampered_env["payload"] = []
    assert verify_response_envelope(envelope=tampered_env, expected_key=key, expected_clustered=False, expected_user_id=None) is None

    # Non-dict envelope returns None
    assert verify_response_envelope(envelope=[], expected_key=key, expected_clustered=False, expected_user_id=None) is None
    assert verify_response_envelope(envelope="bad string", expected_key=key, expected_clustered=False, expected_user_id=None) is None


def test_verify_response_envelope_strict_types():
    """Unit tests for FIX C: strict type enforcement in verify_response_envelope:
    - clustered must be actual bool (rejecting 1, 0, 'true', 'false')
    - cache_key must be non-empty str matching expected_key
    - user_id must match expected context
    - payload must be list of dicts
    - resp_sig must be 64-hex string
    """
    from app.core.map_cache import make_response_envelope, verify_response_envelope

    key = "cache:jobs:map_pins:v1:_:_:_:_:_:_:_:500"
    payload = [{"id": "pin-1", "coordinateX": 41.31, "coordinateY": 69.24, "geo_verified": True}]
    valid_env = make_response_envelope(cache_key=key, payload=payload, clustered=False, user_id=None)

    # 1. clustered: reject int 1 (even though 1 == True in python)
    bad_env = dict(valid_env)
    bad_env["clustered"] = 1
    assert verify_response_envelope(bad_env, expected_key=key, expected_clustered=False, expected_user_id=None) is None

    # 2. clustered: reject int 0
    bad_env = dict(valid_env)
    bad_env["clustered"] = 0
    assert verify_response_envelope(bad_env, expected_key=key, expected_clustered=False, expected_user_id=None) is None

    # 3. clustered: reject string "false"
    bad_env = dict(valid_env)
    bad_env["clustered"] = "false"
    assert verify_response_envelope(bad_env, expected_key=key, expected_clustered=False, expected_user_id=None) is None

    # 4. cache_key: reject empty string or whitespace
    bad_env = dict(valid_env)
    bad_env["cache_key"] = "   "
    assert verify_response_envelope(bad_env, expected_key="   ", expected_clustered=False, expected_user_id=None) is None

    # 5. cache_key: reject non-string
    bad_env = dict(valid_env)
    bad_env["cache_key"] = 12345
    assert verify_response_envelope(bad_env, expected_key=key, expected_clustered=False, expected_user_id=None) is None

    # 6. payload: reject non-dict elements (e.g. [1, 2, 3] or ["item"])
    bad_env = dict(valid_env)
    bad_env["payload"] = [1, 2, 3]
    assert verify_response_envelope(bad_env, expected_key=key, expected_clustered=False, expected_user_id=None) is None

    bad_env["payload"] = [{"id": "pin-1"}, "non-dict"]
    assert verify_response_envelope(bad_env, expected_key=key, expected_clustered=False, expected_user_id=None) is None

    # 7. resp_sig: reject non-hex characters (e.g. contains 'z' or 'g')
    bad_env = dict(valid_env)
    bad_env["resp_sig"] = "g" * 64
    assert verify_response_envelope(bad_env, expected_key=key, expected_clustered=False, expected_user_id=None) is None

    # 8. resp_sig: reject invalid lengths
    bad_env = dict(valid_env)
    bad_env["resp_sig"] = "a" * 63
    assert verify_response_envelope(bad_env, expected_key=key, expected_clustered=False, expected_user_id=None) is None
    bad_env["resp_sig"] = "a" * 65
    assert verify_response_envelope(bad_env, expected_key=key, expected_clustered=False, expected_user_id=None) is None

    # 9. user_id: reject empty string
    env_user = make_response_envelope(cache_key=key, payload=payload, clustered=False, user_id="user-1")
    bad_env = dict(env_user)
    bad_env["user_id"] = ""
    assert verify_response_envelope(bad_env, expected_key=key, expected_clustered=False, expected_user_id="user-1") is None


def test_pin_ids_order_preserved_and_authenticated():
    """Unit tests for FIX D: pinIds ordering preservation and tamper detection:
    - _canonical_pin_data preserves exact list order of pinIds
    - Permuting pinIds produces different HMAC signatures
    - Reordering pinIds invalidates verify_pin_signature
    - Reordering pinIds inside envelope invalidates verify_response_envelope
    """
    from app.core.map_cache import (
        _canonical_pin_data,
        compute_pin_signature,
        verify_pin_signature,
        make_response_envelope,
        verify_response_envelope,
    )

    pin_order_a = {
        "id": "cluster-1",
        "coordinateX": 41.31,
        "coordinateY": 69.24,
        "isCluster": True,
        "count": 3,
        "pinIds": ["job-alpha", "job-beta", "job-gamma"],
        "geo_verified": True,
    }
    pin_order_b = {
        "id": "cluster-1",
        "coordinateX": 41.31,
        "coordinateY": 69.24,
        "isCluster": True,
        "count": 3,
        "pinIds": ["job-gamma", "job-beta", "job-alpha"],
        "geo_verified": True,
    }

    # 1. Canonical data preserves list order, not sorted
    canon_a = _canonical_pin_data(pin_order_a)
    canon_b = _canonical_pin_data(pin_order_b)
    assert canon_a["pinIds"] == ["job-alpha", "job-beta", "job-gamma"]
    assert canon_b["pinIds"] == ["job-gamma", "job-beta", "job-alpha"]

    # 2. Different order produces distinct HMAC signatures
    sig_a = compute_pin_signature(pin_order_a)
    sig_b = compute_pin_signature(pin_order_b)
    assert sig_a != sig_b

    # 3. Modifying order in-place fails verify_pin_signature
    pin_tested = dict(pin_order_a)
    pin_tested["geo_sig"] = sig_a
    assert verify_pin_signature(pin_tested) is True

    # Tamper order: swap first two elements
    pin_tested["pinIds"] = ["job-beta", "job-alpha", "job-gamma"]
    assert verify_pin_signature(pin_tested) is False

    # 4. Modifying order in envelope fails verify_response_envelope
    key = "cache:jobs:map_pins:v1:_:_:_:_:_:_:_:0:clustered"
    signed_pin = dict(pin_order_a)
    signed_pin["geo_sig"] = sig_a
    env = make_response_envelope(cache_key=key, payload=[signed_pin], clustered=True, user_id=None)
    assert verify_response_envelope(env, expected_key=key, expected_clustered=True, expected_user_id=None) is not None

    # Tamper pinIds in envelope payload
    tampered_env = dict(env)
    tampered_pin = dict(signed_pin)
    tampered_pin["pinIds"] = ["job-gamma", "job-alpha", "job-beta"]
    tampered_env["payload"] = [tampered_pin]
    assert verify_response_envelope(tampered_env, expected_key=key, expected_clustered=True, expected_user_id=None) is None


def test_real_signature_exact_type_tamper_rejection():
    """Unit test for Issue 2: Real-signature tampering detection without dummy signatures.
    Builds authentic signed pins and response envelopes with real HMAC signatures,
    then alters exact values (false -> null, [] -> null, 41.0 -> 41) while preserving
    original signatures. Proves both verify_pin_signature and verify_response_envelope fail closed.
    """
    from app.core.map_cache import (
        compute_pin_signature,
        verify_pin_signature,
        make_response_envelope,
        verify_response_envelope,
    )

    base_pin = {
        "id": "job-exact-type-1",
        "title": "Exact Type Job",
        "company": "Baito Co",
        "salary": 5000000,
        "salaryCurrency": "UZS",
        "location": "Toshkent",
        "rawLocation": "Toshkent",
        "logoUrl": None,
        "imageUrl": None,
        "tags": [],
        "category": "Barchasi",
        "workDate": "",
        "workTime": "",
        "neededWorkers": "1",
        "coordinateX": 41.0,
        "coordinateY": 69.24,
        "latitude": 41.0,
        "longitude": 69.24,
        "urgent": False,
        "status": "open",
        "applied": False,
        "bookmarked": False,
        "hiredCount": 0,
        "vacancies": 1,
        "isCluster": False,
        "count": 1,
        "pinIds": ["job-exact-type-1"],
        "geo_verified": True,
    }
    # 1. Compute REAL HMAC signature for valid pin
    real_pin_sig = compute_pin_signature(base_pin)
    base_pin["geo_sig"] = real_pin_sig
    assert verify_pin_signature(base_pin) is True

    # 2. Compute REAL HMAC signature for response envelope
    key = "cache:jobs:map_pins:v1:_:_:_:_:_:_:_:500"
    authentic_env = make_response_envelope(
        cache_key=key,
        payload=[base_pin],
        clustered=False,
        user_id=None,
    )
    assert verify_response_envelope(authentic_env, expected_key=key, expected_clustered=False, expected_user_id=None) is not None

    tamper_cases = [
        ("applied false -> null", {"applied": None}),
        ("bookmarked false -> null", {"bookmarked": None}),
        ("tags [] -> null", {"tags": None}),
        ("pinIds [] -> null", {"pinIds": None}),
        ("coordinateX 41.0 -> 41 int", {"coordinateX": 41}),
        ("latitude 41.0 -> 41 int", {"latitude": 41}),
        ("urgent false -> null", {"urgent": None}),
        ("isCluster false -> null", {"isCluster": None}),
    ]

    for name, patch in tamper_cases:
        tampered_pin = dict(base_pin)
        tampered_pin.update(patch)
        # Verify pin-level HMAC rejection with real preserved signature
        assert verify_pin_signature(tampered_pin) is False, f"Expected {name} to fail verify_pin_signature"

        # Verify envelope-level HMAC rejection with real preserved signature
        tampered_env = {
            "cache_key": key,
            "clustered": False,
            "user_id": None,
            "payload": [tampered_pin],
            "resp_sig": authentic_env["resp_sig"],
        }
        assert verify_response_envelope(tampered_env, expected_key=key, expected_clustered=False, expected_user_id=None) is None, f"Expected {name} to fail verify_response_envelope"

