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

