import json
from contextlib import contextmanager
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from sqlalchemy import event
from app.main import app
from app import models
from app.db.session import SessionLocal, engine
from app.models.job import JobStatus
from app.redis_client import redis_client
from app.core.map_cache import (
    invalidate_map_cache,
    invalidate_user_map_cache,
    build_map_pins_cache_key,
    get_map_cache_key_for_request,
    get_map_cache_version,
)
from tests.conftest import make_user, login


@contextmanager
def capture_sql_queries():
    """Captures all SQL statements executed on the SQLAlchemy engine across any session."""
    queries = []

    def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        queries.append(statement)

    event.listen(engine, "before_cursor_execute", before_cursor_execute)
    try:
        yield queries
    finally:
        event.remove(engine, "before_cursor_execute", before_cursor_execute)


@pytest.fixture
def client():
    return TestClient(app)


def test_map_clustering_accounts_for_over_1200_jobs_without_limit_cutoff(client):
    """Prove that clustered=true aggregates over 1,205 jobs across Uzbekistan without being cut off by limit=500."""
    invalidate_map_cache()
    try:
        redis_client.flushdb()
    except Exception:
        pass

    with SessionLocal() as db_session:
        # Create an employer
        employer = db_session.query(models.User).filter_by(id="emp-cluster-test").first()
        if not employer:
            employer = models.User(
                id="emp-cluster-test",
                phone="+998901234567",
                role="employer",
                name="Cluster Employer",
            )
            db_session.add(employer)
            db_session.flush()

        # Clean existing jobs for deterministic count
        db_session.query(models.Job).filter(models.Job.employerId == "emp-cluster-test").delete()
        db_session.commit()

        # Generate 1,205 jobs across 4 distinct regions:
        # Tashkent: 500 jobs around (41.31, 69.24)
        # Samarkand: 400 jobs around (39.65, 66.96)
        # Bukhara: 200 jobs around (39.77, 64.42)
        # Fergana: 105 jobs around (40.38, 71.78)
        # Total = 500 + 400 + 200 + 105 = 1,205 jobs
        regions = [
            ("Toshkent", 41.31, 69.24, 500),
            ("Samarqand", 39.65, 66.96, 400),
            ("Buxoro", 39.77, 64.42, 200),
            ("Farg'ona", 40.38, 71.78, 105),
        ]
        job_objs = []
        for reg_name, base_lat, base_lng, count in regions:
            for i in range(count):
                job_objs.append(
                    models.Job(
                        id=f"job-{reg_name.lower()}-{i}",
                        title=f"{reg_name} Ishchi {i}",
                        company=f"{reg_name} Corp",
                        location=f"{reg_name}, Markaz",
                        coordinateX=base_lat + (i % 5) * 0.01,
                        coordinateY=base_lng + (i % 5) * 0.01,
                        salary=150000 + (i % 10) * 10000,
                        salaryCurrency="UZS",
                        description="Tavsif matni",
                        status=JobStatus.OPEN,
                        employerId="emp-cluster-test",
                        neededWorkers="1",
                    )
                )

        # Also add 10 jobs with NULL coordinates to verify they are completely excluded
        for i in range(10):
            job_objs.append(
                models.Job(
                    id=f"job-null-coord-{i}",
                    title=f"Null Coord Job {i}",
                    company="Ghost Corp",
                    location="Toshkent",
                    description="Tavsif matni",
                    coordinateX=None,
                    coordinateY=None,
                    salary=100000,
                    status=JobStatus.OPEN,
                    employerId="emp-cluster-test",
                )
            )

        # Also add 5 jobs with (0.0, 0.0) coordinates
        for i in range(5):
            job_objs.append(
                models.Job(
                    id=f"job-zero-coord-{i}",
                    title=f"Zero Coord Job {i}",
                    company="Zero Corp",
                    location="Nowhere",
                    description="Tavsif matni",
                    coordinateX=0.0,
                    coordinateY=0.0,
                    salary=100000,
                    status=JobStatus.OPEN,
                    employerId="emp-cluster-test",
                )
            )

        # Also add 10 closed/cancelled jobs to verify status filter
        for i in range(10):
            job_objs.append(
                models.Job(
                    id=f"job-cancelled-{i}",
                    title=f"Cancelled Job {i}",
                    company="Cancelled Corp",
                    location="Toshkent",
                    description="Tavsif matni",
                    coordinateX=41.31,
                    coordinateY=69.24,
                    salary=100000,
                    status=JobStatus.CANCELLED,
                    employerId="emp-cluster-test",
                )
            )

        db_session.bulk_save_objects(job_objs)
        db_session.commit()

    # 1. Clustered query: must include ALL 1,205 valid jobs and ignore null/zero/closed jobs
    res_clustered = client.get("/api/v1/jobs/map?clustered=true")
    assert res_clustered.status_code == 200
    clusters = res_clustered.json()

    total_clustered_count = sum(c.get("count", 1) for c in clusters)
    assert total_clustered_count == 1205, f"Expected exactly 1205 jobs, got {total_clustered_count}"

    # Verify that clusters returned is a small number (e.g. < 50) rather than 1205 individual pins
    assert len(clusters) < 50
    for c in clusters:
        assert c["coordinateX"] is not None
        assert c["coordinateY"] is not None
        assert c["coordinateX"] != 0.0
        assert c["coordinateY"] != 0.0
        if c.get("isCluster"):
            assert c["count"] > 1
            assert len(c["pinIds"]) == c["count"]

    # 2. Unclustered query: must strictly obey limit=500
    res_unclustered = client.get("/api/v1/jobs/map?clustered=false&limit=500")
    assert res_unclustered.status_code == 200
    raw_pins = res_unclustered.json()
    assert len(raw_pins) == 500


def test_map_clustering_filters_preservation(client):
    """Test that search, category, location, and status filters are strictly preserved before clustering."""
    invalidate_map_cache()

    with SessionLocal() as db_session:
        emp = db_session.query(models.User).filter_by(id="emp-filter-test").first()
        if not emp:
            emp = models.User(id="emp-filter-test", phone="+998901119988", role="employer", name="Filter Emp")
            db_session.add(emp)
            db_session.flush()

        # Create 10 Samarkand jobs and 5 Tashkent jobs
        jobs = []
        for i in range(10):
            jobs.append(models.Job(
                id=f"sam-job-{i}",
                title=f"Samarqand Oshpaz {i}",
                company="Samarqand Milliy",
                location="Samarqand, Markaz",
                description="Tavsif",
                coordinateX=39.65 + i * 0.001,
                coordinateY=66.96 + i * 0.001,
                salary=200000,
                status=JobStatus.OPEN,
                category="Oshxona",
                employerId="emp-filter-test",
            ))
        for i in range(5):
            jobs.append(models.Job(
                id=f"tash-job-{i}",
                title=f"Toshkent Haydovchi {i}",
                company="Toshkent Express",
                location="Toshkent, Chilonzor",
                description="Tavsif",
                coordinateX=41.28 + i * 0.001,
                coordinateY=69.21 + i * 0.001,
                salary=300000,
                status=JobStatus.OPEN,
                category="Haydovchi",
                employerId="emp-filter-test",
            ))
        db_session.bulk_save_objects(jobs)
        db_session.commit()

    # Filter by category
    res_cat = client.get("/api/v1/jobs/map?clustered=true&category=Haydovchi")
    assert res_cat.status_code == 200
    haydovchi_clusters = res_cat.json()
    haydovchi_total = sum(c.get("count", 1) for c in haydovchi_clusters)
    assert haydovchi_total == 5

    # Filter by search
    res_search = client.get("/api/v1/jobs/map?clustered=true&search=Samarqand")
    assert res_search.status_code == 200
    sam_clusters = res_search.json()
    sam_total = sum(c.get("count", 1) for c in sam_clusters)
    assert sam_total == 10


def test_map_clustering_cache_isolation_and_personalization(client):
    """Test that authenticated users get correct personalization via fast cache assembly without leaking to others."""
    from tests.conftest import make_user, login

    worker1 = make_user(role="worker", phone="+998909876541")
    worker2 = make_user(role="worker", phone="+998909876542")

    invalidate_map_cache()
    try:
        redis_client.flushdb()
    except Exception:
        pass

    with SessionLocal() as db_session:
        emp = db_session.query(models.User).filter_by(id="emp-cache-test").first()
        if not emp:
            emp = models.User(id="emp-cache-test", phone="+998905554433", role="employer", name="Cache Emp")
            db_session.add(emp)
            db_session.flush()

        # Add 3 jobs in same grid cell to form a cluster
        c_jobs = [
            models.Job(
                id=f"c-job-{i}",
                title=f"Cluster Job {i}",
                company="Cache Corp",
                location="Toshkent, Yunusobod",
                description="Tavsif",
                coordinateX=41.36 + i * 0.002,
                coordinateY=69.28 + i * 0.002,
                salary=250000,
                status=JobStatus.OPEN,
                employerId="emp-cache-test",
            )
            for i in range(3)
        ]
        db_session.bulk_save_objects(c_jobs)
        db_session.commit()

    # Public request primes the base cache
    res_pub = client.get("/api/v1/jobs/map?clustered=true")
    assert res_pub.status_code == 200
    pub_clusters = res_pub.json()
    target_cluster = next(c for c in pub_clusters if c.get("isCluster") and "c-job-0" in c.get("pinIds", []))
    assert target_cluster["count"] == 3

    # Worker1 bookmarks one of the jobs inside the cluster
    target_job_id = "c-job-0"
    login(client, worker1)
    bm_res = client.post(f"/api/v1/jobs/{target_job_id}/bookmark")
    assert bm_res.status_code == 200

    # Worker1 requests clustered map: target cluster must have bookmarked=True
    res_w1 = client.get("/api/v1/jobs/map?clustered=true")
    assert res_w1.status_code == 200
    w1_clusters = res_w1.json()
    w1_target = next(c for c in w1_clusters if c["id"] == target_cluster["id"])
    assert w1_target["bookmarked"] is True

    # Fast assembly path check: request again, served from Redis
    res_w1_cached = client.get("/api/v1/jobs/map?clustered=true")
    assert res_w1_cached.status_code == 200
    w1_cached_target = next(c for c in res_w1_cached.json() if c["id"] == target_cluster["id"])
    assert w1_cached_target["bookmarked"] is True

    # User isolation check: worker2 must NOT see worker1's bookmark
    login(client, worker2)
    res_w2 = client.get("/api/v1/jobs/map?clustered=true")
    assert res_w2.status_code == 200
    w2_target = next(c for c in res_w2.json() if c["id"] == target_cluster["id"])
    assert w2_target["bookmarked"] is False

    # Public visitor must NOT see worker1's bookmark
    client.cookies.clear()
    client.headers.pop("Authorization", None)
    res_anon = client.get("/api/v1/jobs/map?clustered=true")
    assert res_anon.status_code == 200
    anon_target = next(c for c in res_anon.json() if c["id"] == target_cluster["id"])
    assert anon_target["bookmarked"] is False


def test_map_clustering_deterministic_grid_assignment():
    """Verify GeoSpatialService.cluster_pins deterministically assigns pins to exactly one bucket."""
    from app.services.geo_service import GeoSpatialService

    pins = [
        {"id": "p1", "coordinateX": 41.3101, "coordinateY": 69.2401, "salary": 200000, "status": "open"},
        {"id": "p2", "coordinateX": 41.3105, "coordinateY": 69.2405, "salary": 250000, "status": "open"},
        {"id": "p3", "coordinateX": 39.6501, "coordinateY": 66.9601, "salary": 300000, "status": "open"},
    ]

    res1 = GeoSpatialService.cluster_pins(pins, grid_size=0.4)
    res2 = GeoSpatialService.cluster_pins(pins, grid_size=0.4)

    assert len(res1) == 2  # p1 and p2 together, p3 separate
    assert len(res2) == 2
    assert res1 == res2

    cluster = next(c for c in res1 if c.get("isCluster"))
    single = next(c for c in res1 if not c.get("isCluster"))

    assert cluster["count"] == 2
    assert set(cluster["pinIds"]) == {"p1", "p2"}
    assert cluster["salaryMin"] == 200000
    assert cluster["salaryMax"] == 250000
    assert cluster["salary"] == 225000

    assert single["id"] == "p3"
    assert single["count"] == 1
    assert single["pinIds"] == ["p3"]


def test_map_clustering_invalid_and_out_of_range_coordinates(client):
    """Test that coordinates like NaN, Inf, out of range (>90, >180), or (0,0) are safely ignored."""
    invalidate_map_cache()

    with SessionLocal() as db_session:
        emp = db_session.query(models.User).filter_by(id="emp-invalid-coord").first()
        if not emp:
            emp = models.User(id="emp-invalid-coord", phone="+998909990011", role="employer", name="Invalid Coord Emp")
            db_session.add(emp)
            db_session.flush()

        invalid_jobs = [
            models.Job(
                id="inv-job-1",
                title="Out of range lat",
                company="Inv Corp",
                location="Invalid",
                description="Tavsif",
                coordinateX=95.0,  # > 90
                coordinateY=69.0,
                salary=100000,
                status=JobStatus.OPEN,
                employerId="emp-invalid-coord",
            ),
            models.Job(
                id="inv-job-2",
                title="Out of range lng",
                company="Inv Corp",
                location="Invalid",
                description="Tavsif",
                coordinateX=41.0,
                coordinateY=200.0,  # > 180
                salary=100000,
                status=JobStatus.OPEN,
                employerId="emp-invalid-coord",
            ),
            models.Job(
                id="inv-job-outside-uzb-1",
                title="Moscow Job Outside Uzb",
                company="Inv Corp",
                location="Moscow",
                description="Tavsif",
                coordinateX=55.75,  # Outside Uzbekistan (lat > 45.8)
                coordinateY=37.61,  # Outside Uzbekistan (lng < 55.9)
                salary=100000,
                status=JobStatus.OPEN,
                employerId="emp-invalid-coord",
            ),
            models.Job(
                id="inv-job-outside-uzb-2",
                title="Baghdad Job Outside Uzb",
                company="Inv Corp",
                location="Baghdad",
                description="Tavsif",
                coordinateX=33.31,  # Outside Uzbekistan (lat < 37.0)
                coordinateY=44.36,  # Outside Uzbekistan (lng < 55.9)
                salary=100000,
                status=JobStatus.OPEN,
                employerId="emp-invalid-coord",
            ),
            models.Job(
                id="inv-job-3",
                title="Zero Zero Island",
                company="Inv Corp",
                location="Zero Island",
                description="Tavsif",
                coordinateX=0.0,
                coordinateY=0.0,
                salary=100000,
                status=JobStatus.OPEN,
                employerId="emp-invalid-coord",
            ),
            models.Job(
                id="valid-job-alone",
                title="Valid Isolated Job",
                company="Valid Corp",
                location="Toshkent",
                description="Tavsif",
                coordinateX=41.31,
                coordinateY=69.24,
                salary=200000,
                status=JobStatus.OPEN,
                employerId="emp-invalid-coord",
            ),
        ]
        db_session.bulk_save_objects(invalid_jobs)
        db_session.commit()

    res = client.get("/api/v1/jobs/map?clustered=true&search=Invalid")
    assert res.status_code == 200
    # The 3 invalid jobs must be excluded
    assert res.json() == []

    # Valid job alone must be returned with count 1
    res_valid = client.get("/api/v1/jobs/map?clustered=true&search=Valid")
    assert res_valid.status_code == 200
    pins = res_valid.json()
    assert len(pins) == 1
    assert pins[0]["count"] == 1
    assert pins[0]["coordinateX"] == 41.31
    assert pins[0]["coordinateY"] == 69.24


def test_map_clustering_application_status_personalization(client):
    """Test that applied=True is correctly populated on a cluster when user has an active application."""
    from tests.conftest import make_user, login

    worker = make_user(role="worker", phone="+998907776655")
    invalidate_map_cache()
    try:
        redis_client.flushdb()
    except Exception:
        pass

    with SessionLocal() as db_session:
        emp = db_session.query(models.User).filter_by(id="emp-app-test").first()
        if not emp:
            emp = models.User(id="emp-app-test", phone="+998906665544", role="employer", name="App Emp")
            db_session.add(emp)
            db_session.flush()

        j1 = models.Job(
            id="app-job-1",
            title="App Job 1",
            company="App Corp",
            location="Toshkent, Mirzo Ulug'bek",
            description="Tavsif",
            coordinateX=41.32,
            coordinateY=69.30,
            salary=220000,
            status=JobStatus.OPEN,
            employerId="emp-app-test",
        )
        j2 = models.Job(
            id="app-job-2",
            title="App Job 2",
            company="App Corp",
            location="Toshkent, Mirzo Ulug'bek",
            description="Tavsif",
            coordinateX=41.321,
            coordinateY=69.301,
            salary=230000,
            status=JobStatus.OPEN,
            employerId="emp-app-test",
        )
        db_session.add_all([j1, j2])
        db_session.commit()

    login(client, worker)
    # Apply to j1
    apply_res = client.post("/api/v1/jobs/app-job-1/apply")
    assert apply_res.status_code in (200, 201)

    # Request map with clustered=true
    res = client.get("/api/v1/jobs/map?clustered=true&search=App+Job")
    assert res.status_code == 200
    clusters = res.json()
    assert len(clusters) == 1
    c = clusters[0]
    assert c["isCluster"] is True
    assert c["count"] == 2
    assert c["applied"] is True
    assert c["bookmarked"] is False


def test_filled_job_applied_by_user_does_not_leak_into_public_cache(client):
    """
    Test that an is_filled (e.g. in_progress / completed) job that an authenticated user applied to
    is returned to that user, BUT does NOT enter the public cache base_pins or leak to other users / guests.
    """
    from tests.conftest import make_user, login
    from app.core.map_cache import build_map_pins_cache_key, get_map_cache_version
    import json

    worker_applied = make_user(role="worker", phone="+998901112233")
    worker_other = make_user(role="worker", phone="+998904445566")

    invalidate_map_cache()
    try:
        redis_client.flushdb()
    except Exception:
        pass

    with SessionLocal() as db_session:
        emp = db_session.query(models.User).filter_by(id="emp-leak-test").first()
        if not emp:
            emp = models.User(id="emp-leak-test", phone="+998909998877", role="employer", name="Leak Emp")
            db_session.add(emp)
            db_session.flush()

        open_job = models.Job(
            id="job-public-open",
            title="Public Open Job",
            company="Leak Corp",
            location="Toshkent, Chilonzor",
            description="Tavsif",
            coordinateX=41.285,
            coordinateY=69.205,
            salary=200000,
            status=JobStatus.OPEN,
            employerId="emp-leak-test",
            neededWorkers="1",
        )
        filled_job = models.Job(
            id="job-user-filled",
            title="Filled InProgress Job",
            company="Leak Corp",
            location="Toshkent, Chilonzor",
            description="Tavsif",
            coordinateX=41.286,
            coordinateY=69.206,
            salary=250000,
            status=JobStatus.IN_PROGRESS,  # is_filled == True!
            employerId="emp-leak-test",
            neededWorkers="1",
        )
        db_session.add_all([open_job, filled_job])
        db_session.commit()

        # worker_applied applies to filled_job
        app_entry = models.Application(
            id="app-leak-1",
            jobId="job-user-filled",
            workerId=worker_applied.id,
            status="in_progress",
        )
        db_session.add(app_entry)
        db_session.commit()

    # 1. worker_applied hits the Cold DB Path first
    login(client, worker_applied)
    res_applied = client.get("/api/v1/jobs/map?clustered=false&search=Leak")
    assert res_applied.status_code == 200
    applied_pins = res_applied.json()
    applied_ids = {p["id"] for p in applied_pins}
    assert "job-public-open" in applied_ids
    assert "job-user-filled" in applied_ids  # user sees their own applied filled job!

    # 2. Check the public cache in Redis directly
    version = get_map_cache_version()
    base_key = build_map_pins_cache_key(
        version=version,
        min_lat=None,
        max_lat=None,
        min_lng=None,
        max_lng=None,
        location=None,
        category=None,
        search="leak",
        limit=500,
    )
    raw_cached = redis_client.get(base_key)
    assert raw_cached is not None, "Base cache must be populated"
    base_pins_cached = json.loads(raw_cached.decode("utf-8") if isinstance(raw_cached, bytes) else str(raw_cached))
    cached_payload = base_pins_cached["payload"] if isinstance(base_pins_cached, dict) and "payload" in base_pins_cached else base_pins_cached
    cached_ids = {p["id"] for p in cached_payload}
    assert "job-public-open" in cached_ids
    assert "job-user-filled" not in cached_ids, "Filled job MUST NOT leak into public base cache!"

    # 3. Anonymous visitor hits the map -> must NOT see job-user-filled
    client.cookies.clear()
    client.headers.pop("Authorization", None)
    res_anon = client.get("/api/v1/jobs/map?clustered=false&search=Leak")
    assert res_anon.status_code == 200
    anon_pins = res_anon.json()
    anon_ids = {p["id"] for p in anon_pins}
    assert "job-public-open" in anon_ids
    assert "job-user-filled" not in anon_ids

    # 4. Another user (worker_other) hits the map -> must NOT see job-user-filled
    login(client, worker_other)
    res_other = client.get("/api/v1/jobs/map?clustered=false&search=Leak")
    assert res_other.status_code == 200
    other_pins = res_other.json()
    other_ids = {p["id"] for p in other_pins}
    assert "job-public-open" in other_ids
    assert "job-user-filled" not in other_ids


def test_user_sees_applied_filled_job_even_when_public_cache_prefilled(client):
    """
    Test that when public cache was prefilled by an anonymous visitor (no filled jobs in base_pins),
    an authenticated user who applied to a filled job STILL receives that job via Fast Assembly Path.
    """
    from tests.conftest import make_user, login
    import json

    worker_applied = make_user(role="worker", phone="+998902223344")

    invalidate_map_cache()
    try:
        redis_client.flushdb()
    except Exception:
        pass

    with SessionLocal() as db_session:
        emp = db_session.query(models.User).filter_by(id="emp-prefill-test").first()
        if not emp:
            emp = models.User(id="emp-prefill-test", phone="+998908887766", role="employer", name="Prefill Emp")
            db_session.add(emp)
            db_session.flush()

        open_job = models.Job(
            id="job-prefill-open",
            title="Prefill Open Job",
            company="Prefill Corp",
            location="Toshkent, Yunusobod",
            description="Tavsif",
            coordinateX=41.365,
            coordinateY=69.285,
            salary=210000,
            status=JobStatus.OPEN,
            employerId="emp-prefill-test",
            neededWorkers="1",
        )
        filled_job = models.Job(
            id="job-prefill-filled",
            title="Prefill Filled InProgress Job",
            company="Prefill Corp",
            location="Toshkent, Yunusobod",
            description="Tavsif",
            coordinateX=41.366,
            coordinateY=69.286,
            salary=260000,
            status=JobStatus.IN_PROGRESS,
            employerId="emp-prefill-test",
            neededWorkers="1",
        )
        db_session.add_all([open_job, filled_job])
        db_session.commit()

        app_entry = models.Application(
            id="app-prefill-1",
            jobId="job-prefill-filled",
            workerId=worker_applied.id,
            status="in_progress",
        )
        db_session.add(app_entry)
        db_session.commit()

    # 1. Anonymous visitor hits the map FIRST -> primes the public base cache
    client.cookies.clear()
    client.headers.pop("Authorization", None)
    res_anon = client.get("/api/v1/jobs/map?clustered=false&search=Prefill")
    assert res_anon.status_code == 200
    anon_pins = res_anon.json()
    anon_ids = {p["id"] for p in anon_pins}
    assert "job-prefill-open" in anon_ids
    assert "job-prefill-filled" not in anon_ids

    # 2. worker_applied visits now -> hits Fast Assembly Path from cached_base
    login(client, worker_applied)
    res_applied = client.get("/api/v1/jobs/map?clustered=false&search=Prefill")
    assert res_applied.status_code == 200
    applied_pins = res_applied.json()
    applied_ids = {p["id"] for p in applied_pins}
    assert "job-prefill-open" in applied_ids
    assert "job-prefill-filled" in applied_ids, "User must receive their applied filled job via Fast Assembly Path!"
    applied_job_pin = next(p for p in applied_pins if p["id"] == "job-prefill-filled")
    assert applied_job_pin["applied"] is True
    assert applied_job_pin["status"] == "in_progress"


def test_cancelled_pending_rejected_jobs_never_leak_to_public_cache_even_with_applications(client):
    """
    Test that jobs with CANCELLED, PENDING, or REJECTED status NEVER leak into public cache (base_pins),
    nor are returned to anonymous visitors or other users, even if a user has applied to them.
    Tests both Cold DB path and Fast Assembly Path.
    """
    from tests.conftest import make_user, login
    from app.core.map_cache import build_map_pins_cache_key, get_map_cache_version
    import json

    worker_applied = make_user(role="worker", phone="+998901119988")
    worker_other = make_user(role="worker", phone="+998902229988")

    invalidate_map_cache()
    try:
        redis_client.flushdb()
    except Exception:
        pass

    with SessionLocal() as db_session:
        emp = db_session.query(models.User).filter_by(id="emp-status-leak-test").first()
        if not emp:
            emp = models.User(id="emp-status-leak-test", phone="+998903339988", role="employer", name="Status Leak Emp")
            db_session.add(emp)
            db_session.flush()

        open_job = models.Job(
            id="job-status-open",
            title="Valid Open Status Job",
            company="Status Leak Corp",
            location="Toshkent, Mirzo Ulugbek",
            description="Tavsif",
            coordinateX=41.32,
            coordinateY=69.28,
            salary=200000,
            status=JobStatus.OPEN,
            employerId="emp-status-leak-test",
            neededWorkers="1",
        )
        cancelled_job = models.Job(
            id="job-status-cancelled",
            title="Cancelled Status Job",
            company="Status Leak Corp",
            location="Toshkent, Mirzo Ulugbek",
            description="Tavsif",
            coordinateX=41.321,
            coordinateY=69.281,
            salary=200000,
            status=JobStatus.CANCELLED,
            employerId="emp-status-leak-test",
            neededWorkers="1",
        )
        pending_job = models.Job(
            id="job-status-pending",
            title="Pending Status Job",
            company="Status Leak Corp",
            location="Toshkent, Mirzo Ulugbek",
            description="Tavsif",
            coordinateX=41.322,
            coordinateY=69.282,
            salary=200000,
            status=JobStatus.PENDING,
            employerId="emp-status-leak-test",
            neededWorkers="1",
        )
        rejected_job = models.Job(
            id="job-status-rejected",
            title="Rejected Status Job",
            company="Status Leak Corp",
            location="Toshkent, Mirzo Ulugbek",
            description="Tavsif",
            coordinateX=41.323,
            coordinateY=69.283,
            salary=200000,
            status=JobStatus.REJECTED,
            employerId="emp-status-leak-test",
            neededWorkers="1",
        )
        db_session.add_all([open_job, cancelled_job, pending_job, rejected_job])
        db_session.commit()

        # worker_applied has applications to all three non-open jobs
        db_session.add_all([
            models.Application(id="app-st-1", jobId="job-status-cancelled", workerId=worker_applied.id, status="applied"),
            models.Application(id="app-st-2", jobId="job-status-pending", workerId=worker_applied.id, status="applied"),
            models.Application(id="app-st-3", jobId="job-status-rejected", workerId=worker_applied.id, status="applied"),
        ])
        db_session.commit()

    # 1. worker_applied visits Cold DB path first
    login(client, worker_applied)
    res_worker = client.get("/api/v1/jobs/map?clustered=false&search=Status%20Leak")
    assert res_worker.status_code == 200
    worker_pins = res_worker.json()
    worker_pin_ids = {p["id"] for p in worker_pins}
    assert "job-status-open" in worker_pin_ids
    assert "job-status-cancelled" not in worker_pin_ids, "Cancelled job must never be returned on map"
    assert "job-status-pending" not in worker_pin_ids, "Pending job must never be returned on map"
    assert "job-status-rejected" not in worker_pin_ids, "Rejected job must never be returned on map"

    # 2. Inspect Redis public base cache directly
    version = get_map_cache_version()
    base_key = build_map_pins_cache_key(
        version=version,
        min_lat=None,
        max_lat=None,
        min_lng=None,
        max_lng=None,
        location=None,
        category=None,
        search="status leak",
        limit=500,
    )
    raw_cached = redis_client.get(base_key)
    assert raw_cached is not None, "Base cache must be primed"
    base_pins_cached = json.loads(raw_cached.decode("utf-8") if isinstance(raw_cached, bytes) else str(raw_cached))
    cached_payload = base_pins_cached["payload"] if isinstance(base_pins_cached, dict) and "payload" in base_pins_cached else base_pins_cached
    cached_ids = {p["id"] for p in cached_payload}
    assert "job-status-open" in cached_ids
    assert "job-status-cancelled" not in cached_ids, "Cancelled job leaked into base cache!"
    assert "job-status-pending" not in cached_ids, "Pending job leaked into base cache!"
    assert "job-status-rejected" not in cached_ids, "Rejected job leaked into base cache!"

    # 3. Anonymous visitor hits map
    client.cookies.clear()
    client.headers.pop("Authorization", None)
    res_anon = client.get("/api/v1/jobs/map?clustered=false&search=Status%20Leak")
    assert res_anon.status_code == 200
    anon_pins = res_anon.json()
    anon_ids = {p["id"] for p in anon_pins}
    assert "job-status-open" in anon_ids
    assert "job-status-cancelled" not in anon_ids
    assert "job-status-pending" not in anon_ids
    assert "job-status-rejected" not in anon_ids

    # 4. Another user visits map
    login(client, worker_other)
    res_other = client.get("/api/v1/jobs/map?clustered=false&search=Status%20Leak")
    assert res_other.status_code == 200
    other_pins = res_other.json()
    other_ids = {p["id"] for p in other_pins}
    assert "job-status-open" in other_ids
    assert "job-status-cancelled" not in other_ids
    assert "job-status-pending" not in other_ids
    assert "job-status-rejected" not in other_ids

    # 5. Fast Assembly Path test: Invalidate only user cache, keeping base cache primed
    invalidate_user_map_cache(worker_applied.id)
    login(client, worker_applied)
    res_fast = client.get("/api/v1/jobs/map?clustered=false&search=Status%20Leak")
    assert res_fast.status_code == 200
    fast_pins = res_fast.json()
    fast_ids = {p["id"] for p in fast_pins}
    assert "job-status-open" in fast_ids
    assert "job-status-cancelled" not in fast_ids, "Cancelled job leaked through Fast Assembly Path!"
    assert "job-status-pending" not in fast_ids, "Pending job leaked through Fast Assembly Path!"
    assert "job-status-rejected" not in fast_ids, "Rejected job leaked through Fast Assembly Path!"


def test_coordinates_inside_bbox_but_outside_polygon_are_rejected(client):
    """
    Test that coordinates within the coarse rectangular bounding box (UZBEKISTAN_BBOX)
    but outside the real territorial GeoJSON polygon boundary of Uzbekistan (e.g. Shymkent, Dashoguz)
    are rejected by GeoSpatialService and excluded from clustered map pin aggregations.
    """
    from app.services.geo_service import GeoSpatialService

    # 1. Direct unit verification:
    # Coarse BBox is min_lat=37.0, max_lat=45.8, min_lng=55.9, max_lng=73.5
    # Shymkent, Kazakhstan: (42.3417, 69.5901) -> inside BBox, but OUTSIDE polygon
    assert GeoSpatialService.UZBEKISTAN_BBOX["min_lat"] <= 42.3417 <= GeoSpatialService.UZBEKISTAN_BBOX["max_lat"]
    assert GeoSpatialService.UZBEKISTAN_BBOX["min_lng"] <= 69.5901 <= GeoSpatialService.UZBEKISTAN_BBOX["max_lng"]
    assert GeoSpatialService.is_inside_uzbekistan(42.3417, 69.5901) is False, "Shymkent must be rejected by polygon check"

    # Dashoguz, Turkmenistan: (41.8333, 59.9667) -> inside BBox, but OUTSIDE polygon
    assert GeoSpatialService.UZBEKISTAN_BBOX["min_lat"] <= 41.8333 <= GeoSpatialService.UZBEKISTAN_BBOX["max_lat"]
    assert GeoSpatialService.UZBEKISTAN_BBOX["min_lng"] <= 59.9667 <= GeoSpatialService.UZBEKISTAN_BBOX["max_lng"]
    assert GeoSpatialService.is_inside_uzbekistan(41.8333, 59.9667) is False, "Dashoguz must be rejected by polygon check"

    # Tashkent: (41.31, 69.24) -> inside BBox AND INSIDE polygon
    assert GeoSpatialService.is_inside_uzbekistan(41.31, 69.24) is True, "Tashkent must be inside Uzbekistan polygon"

    # 2. Integration verification via clustered map endpoint:
    invalidate_map_cache()
    try:
        redis_client.flushdb()
    except Exception:
        pass

    with SessionLocal() as db_session:
        emp = db_session.query(models.User).filter_by(id="emp-geo-poly-test").first()
        if not emp:
            emp = models.User(id="emp-geo-poly-test", phone="+998904449988", role="employer", name="Geo Poly Emp")
            db_session.add(emp)
            db_session.flush()

        tashkent_job = models.Job(
            id="job-geo-tashkent",
            title="Tashkent Valid Job",
            company="GeoPoly Corp",
            location="Toshkent",
            description="Tavsif",
            coordinateX=41.31,
            coordinateY=69.24,
            salary=300000,
            status=JobStatus.OPEN,
            employerId="emp-geo-poly-test",
            neededWorkers="1",
        )
        shymkent_job = models.Job(
            id="job-geo-shymkent",
            title="Shymkent Foreign Job",
            company="GeoPoly Corp",
            location="Shymkent",
            description="Tavsif",
            coordinateX=42.3417,
            coordinateY=69.5901,
            salary=300000,
            status=JobStatus.OPEN,
            employerId="emp-geo-poly-test",
            neededWorkers="1",
        )
        dashoguz_job = models.Job(
            id="job-geo-dashoguz",
            title="Dashoguz Foreign Job",
            company="GeoPoly Corp",
            location="Dashoguz",
            description="Tavsif",
            coordinateX=41.8333,
            coordinateY=59.9667,
            salary=300000,
            status=JobStatus.OPEN,
            employerId="emp-geo-poly-test",
            neededWorkers="1",
        )
        db_session.add_all([tashkent_job, shymkent_job, dashoguz_job])
        db_session.commit()

    res = client.get("/api/v1/jobs/map?clustered=true&search=GeoPoly")
    assert res.status_code == 200
    clusters = res.json()

    # The cluster must only contain the Tashkent job, Shymkent and Dashoguz must be filtered out
    total_count = sum(c.get("count", 1) for c in clusters)
    assert total_count == 1, f"Expected exactly 1 job inside Uzbekistan, got {total_count}"
    all_pin_ids = []
    for c in clusters:
        all_pin_ids.extend(c.get("pinIds") or [c["id"]])
    assert "job-geo-tashkent" in all_pin_ids
    assert "job-geo-shymkent" not in all_pin_ids
    assert "job-geo-dashoguz" not in all_pin_ids


def test_ray_casting_handles_polygons_multipolygons_and_interior_holes(client):
    """
    Test that GeoSpatialService ray-casting accurately handles:
    1. Polygons (e.g. Samarqand, Buxoro)
    2. MultiPolygons (e.g. Toshkent City, Farg'ona)
    3. Interior holes / enclaves (e.g. Sarvan enclave hole inside Namangan region is rejected)
    Points are taken directly from the official uzbekistan_regions GeoJSON features.
    """
    from app.services.geo_service import GeoSpatialService

    GeoSpatialService._is_inside_polygon_cached.cache_clear()
    GeoSpatialService._POLYGONS_LOADED = False
    GeoSpatialService._init_polygons()

    # 1. Standard Polygons:
    assert GeoSpatialService.is_inside_uzbekistan(39.654, 66.960) is True, "Samarqand must be inside"
    assert GeoSpatialService.is_inside_uzbekistan(39.775, 64.428) is True, "Buxoro must be inside"

    # 2. MultiPolygons:
    assert GeoSpatialService.is_inside_uzbekistan(41.311, 69.279) is True, "Toshkent City MultiPolygon must be inside"
    assert GeoSpatialService.is_inside_uzbekistan(40.380, 71.780) is True, "Farg'ona MultiPolygon must be inside"

    # 3. Interior holes: Namangan region has 1 hole (Sarvan foreign enclave, Tajikistan)
    # A point in Namangan city (exterior ring, outside hole) must be True:
    assert GeoSpatialService.is_inside_uzbekistan(41.000, 71.670) is True, "Namangan city must be inside"
    # A point inside the Sarvan enclave hole (lat 40.9909, lng 70.5500) must be REJECTED (False):
    assert GeoSpatialService.is_inside_uzbekistan(40.9909362, 70.5499591) is False, (
        "Point inside the Sarvan interior hole must be rejected as outside Uzbekistan territory"
    )

    # 4. Toshkent region exterior around the capital:
    assert GeoSpatialService.is_inside_uzbekistan(41.470, 69.580) is True, "Chirchiq in Toshkent Region must be inside"


def test_geo_service_fails_closed_when_geojson_unavailable(client, caplog):
    """
    Test that if the GeoJSON boundary file is missing or fails to load,
    the system DOES NOT silently fall back to bounding box and accept foreign coordinates.
    Instead, it fails closed (rejects coordinates) and logs a prominent error without flooding logs.
    """
    import logging
    from app.services.geo_service import GeoSpatialService

    try:
        # Simulate uninitialized / empty polygons state
        GeoSpatialService._is_inside_polygon_cached.cache_clear()
        GeoSpatialService._PREPARED_POLYGONS = []
        GeoSpatialService._POLYGONS_LOADED = True
        GeoSpatialService._LOGGED_FAIL_CLOSED_WARNING = False

        with caplog.at_level(logging.ERROR):
            # Query multiple coordinates
            for _ in range(10):
                shymkent_result = GeoSpatialService.is_inside_uzbekistan(42.3417, 69.5901)
                assert shymkent_result is False, "Must NOT accept foreign point when polygons are missing"

                tashkent_result = GeoSpatialService.is_inside_uzbekistan(41.311, 69.279)
                assert tashkent_result is False, "Fail-closed safety mode must reject points rather than fallback to BBox"

            # Verify that log flooding is avoided: fail-closed error is logged only once
            fail_closed_logs = [r for r in caplog.records if "fail-closed" in r.message]
            assert len(fail_closed_logs) == 1, f"Expected exactly 1 fail-closed error log, got {len(fail_closed_logs)}"
    finally:
        # Restore normal loaded state
        GeoSpatialService._is_inside_polygon_cached.cache_clear()
        GeoSpatialService._POLYGONS_LOADED = False
        GeoSpatialService._init_polygons()


def test_unclustered_map_pins_exclude_foreign_coordinates_for_anon_and_auth_users(client):
    """
    Test that when clustered=false (raw map pins):
    1. Foreign coordinates (e.g. Shymkent in Kazakhstan, Dashoguz in Turkmenistan) are excluded.
    2. Foreign pins NEVER enter Redis public base cache.
    3. Anonymous visitors never receive foreign pins.
    4. Authenticated users never receive foreign pins.
    5. Pre-cached/stale foreign pins in Redis are sanitized and pruned from responses.
    """
    from tests.conftest import make_user, login
    from app.core.map_cache import build_map_pins_cache_key, get_map_cache_version
    import json

    worker = make_user(role="worker", phone="+998905551122")

    invalidate_map_cache()
    try:
        redis_client.flushdb()
    except Exception:
        pass

    with SessionLocal() as db_session:
        emp = db_session.query(models.User).filter_by(id="emp-foreign-unclustered").first()
        if not emp:
            emp = models.User(id="emp-foreign-unclustered", phone="+998906661122", role="employer", name="Foreign Test Emp")
            db_session.add(emp)
            db_session.flush()

        tashkent_job = models.Job(
            id="job-unclustered-tashkent",
            title="Tashkent Job",
            company="Foreign Test Corp",
            location="Toshkent",
            description="Tavsif",
            coordinateX=41.31,
            coordinateY=69.24,
            salary=250000,
            status=JobStatus.OPEN,
            employerId="emp-foreign-unclustered",
            neededWorkers="1",
        )
        shymkent_job = models.Job(
            id="job-unclustered-shymkent",
            title="Shymkent Foreign Job",
            company="Foreign Test Corp",
            location="Shymkent",
            description="Tavsif",
            coordinateX=42.3417,
            coordinateY=69.5901,
            salary=250000,
            status=JobStatus.OPEN,
            employerId="emp-foreign-unclustered",
            neededWorkers="1",
        )
        dashoguz_job = models.Job(
            id="job-unclustered-dashoguz",
            title="Dashoguz Foreign Job",
            company="Foreign Test Corp",
            location="Dashoguz",
            description="Tavsif",
            coordinateX=41.8333,
            coordinateY=59.9667,
            salary=250000,
            status=JobStatus.OPEN,
            employerId="emp-foreign-unclustered",
            neededWorkers="1",
        )
        db_session.add_all([tashkent_job, shymkent_job, dashoguz_job])
        db_session.commit()

        # Worker applied to all 3 jobs
        db_session.add_all([
            models.Application(id="app-for-1", jobId="job-unclustered-tashkent", workerId=worker.id, status="applied"),
            models.Application(id="app-for-2", jobId="job-unclustered-shymkent", workerId=worker.id, status="applied"),
            models.Application(id="app-for-3", jobId="job-unclustered-dashoguz", workerId=worker.id, status="applied"),
        ])
        db_session.commit()

    # 1. Anonymous visitor hits Cold DB Path with clustered=false
    client.cookies.clear()
    client.headers.pop("Authorization", None)
    res_anon = client.get("/api/v1/jobs/map?clustered=false&search=Foreign%20Test")
    assert res_anon.status_code == 200
    anon_pins = res_anon.json()
    anon_pin_ids = {p["id"] for p in anon_pins}
    assert "job-unclustered-tashkent" in anon_pin_ids
    assert "job-unclustered-shymkent" not in anon_pin_ids, "Shymkent must not be returned in unclustered map"
    assert "job-unclustered-dashoguz" not in anon_pin_ids, "Dashoguz must not be returned in unclustered map"

    # 2. Verify Redis public base cache directly
    version = get_map_cache_version()
    base_key = build_map_pins_cache_key(
        version=version,
        min_lat=None,
        max_lat=None,
        min_lng=None,
        max_lng=None,
        location=None,
        category=None,
        search="foreign test",
        limit=500,
    )
    raw_cached = redis_client.get(base_key)
    assert raw_cached is not None, "Base cache must be created"
    base_pins = json.loads(raw_cached.decode("utf-8") if isinstance(raw_cached, bytes) else str(raw_cached))
    cached_payload = base_pins["payload"] if isinstance(base_pins, dict) and "payload" in base_pins else base_pins
    cached_ids = {p["id"] for p in cached_payload}
    assert "job-unclustered-tashkent" in cached_ids
    assert "job-unclustered-shymkent" not in cached_ids, "Shymkent leaked into Redis base cache!"
    assert "job-unclustered-dashoguz" not in cached_ids, "Dashoguz leaked into Redis base cache!"

    # 3. Authenticated visitor hits Fast Assembly Path with clustered=false
    login(client, worker)
    res_auth = client.get("/api/v1/jobs/map?clustered=false&search=Foreign%20Test")
    assert res_auth.status_code == 200
    auth_pins = res_auth.json()
    auth_pin_ids = {p["id"] for p in auth_pins}
    assert "job-unclustered-tashkent" in auth_pin_ids
    assert "job-unclustered-shymkent" not in auth_pin_ids, "Shymkent must not be returned to authenticated user"
    assert "job-unclustered-dashoguz" not in auth_pin_ids, "Dashoguz must not be returned to authenticated user"

    # 4. Pre-cached stale foreign pin injection test:
    # Intentionally inject foreign pins into Redis effective cache and verify fast path sanitizes them
    corrupted_cache = json.dumps([
        {"id": "job-unclustered-tashkent", "coordinateX": 41.31, "coordinateY": 69.24, "status": "open", "title": "T"},
        {"id": "job-injected-shymkent", "coordinateX": 42.3417, "coordinateY": 69.5901, "status": "open", "title": "S"},
        {"id": "job-injected-dashoguz", "coordinateX": 41.8333, "coordinateY": 59.9667, "status": "open", "title": "D"},
    ])
    client.cookies.clear()
    client.headers.pop("Authorization", None)
    redis_client.set(base_key, corrupted_cache, ex=60)

    res_sanitized = client.get("/api/v1/jobs/map?clustered=false&search=Foreign%20Test")
    assert res_sanitized.status_code == 200
    sanitized_pins = res_sanitized.json()
    sanitized_ids = {p["id"] for p in sanitized_pins}
    assert "job-unclustered-tashkent" in sanitized_ids
    assert "job-injected-shymkent" not in sanitized_ids, "Stale Shymkent pin leaked from cache!"
    assert "job-injected-dashoguz" not in sanitized_ids, "Stale Dashoguz pin leaked from cache!"


def test_atomic_geojson_preparation_rejects_partial_state_when_invalid_feature_follows_valid(caplog):
    """
    Test that _init_polygons() prepares GeoJSON atomically:
    When a valid polygon is followed by an invalid/corrupt feature in the same dataset,
    the entire dataset is rejected, leaving zero partially loaded polygons in _PREPARED_POLYGONS.
    Even coordinates inside the valid polygon must be rejected in fail-closed safety mode.
    """
    import logging
    from app.services.geo_service import GeoSpatialService

    # Construct GeoJSON where feature 0 is a valid polygon over Tashkent,
    # but feature 1 is corrupted (invalid coordinates structure)
    valid_feature = {
        "type": "Feature",
        "properties": {"name": "Valid Tashkent Region"},
        "geometry": {
            "type": "Polygon",
            "coordinates": [
                [
                    [69.1, 41.2],
                    [69.4, 41.2],
                    [69.4, 41.4],
                    [69.1, 41.4],
                    [69.1, 41.2],
                ]
            ],
        },
    }
    corrupted_feature = {
        "type": "Feature",
        "properties": {"name": "Corrupt Feature"},
        "geometry": {
            "type": "Polygon",
            "coordinates": "not_a_valid_coordinate_list",  # Malformed!
        },
    }
    malformed_geojson = {
        "type": "FeatureCollection",
        "features": [valid_feature, corrupted_feature],
    }

    try:
        GeoSpatialService._is_inside_polygon_cached.cache_clear()
        with caplog.at_level(logging.ERROR):
            GeoSpatialService._init_polygons(override_data=malformed_geojson)

        # Atomic guarantee: _PREPARED_POLYGONS must be completely empty (no partial state with valid_feature)
        assert len(GeoSpatialService._PREPARED_POLYGONS) == 0, (
            "Must NOT leave partially prepared polygons when subsequent features fail"
        )

        # Even a point strictly inside the valid polygon must be rejected because the dataset failed validation
        tashkent_point_inside_valid_feature = (41.3, 69.25)
        res = GeoSpatialService.is_inside_uzbekistan(
            tashkent_point_inside_valid_feature[0], tashkent_point_inside_valid_feature[1]
        )
        assert res is False, "Point inside valid feature must still be rejected when GeoJSON failed atomic validation"

        # Check that multiple calls don't flood logs (deduplication)
        with caplog.at_level(logging.ERROR):
            for _ in range(5):
                GeoSpatialService.is_inside_uzbekistan(41.3, 69.25)
            fail_closed_logs = [r for r in caplog.records if "fail-closed" in r.message]
            assert len(fail_closed_logs) == 1, f"Expected 1 fail-closed error, got {len(fail_closed_logs)}"
    finally:
        # Restore normal loaded state
        GeoSpatialService._is_inside_polygon_cached.cache_clear()
        GeoSpatialService._POLYGONS_LOADED = False
        GeoSpatialService._init_polygons()


def test_clustered_fast_path_invalidates_and_rebuilds_when_cluster_contains_foreign_pin(client):
    """
    Test that when clustered=True, Fast Path and Fast Assembly Path sanitize stale cluster caches:
    If a cluster in Redis cache has a centroid inside Uzbekistan, but its member pinIds
    contain a job located outside Uzbekistan (e.g. Shymkent, Kazakhstan), the system:
    1. Detects the invalid/foreign member pin.
    2. Safely invalidates the corrupt cache from Redis.
    3. Falls through to the Cold DB path to rebuild clean clusters from trusted database records.
    4. Accurately recomputes count, pinIds, and returned cluster count without foreign jobs.
    5. Correctly serves both anonymous and authenticated callers.
    """
    worker = make_user(role="worker", phone="+998909990098")
    invalidate_map_cache()

    with SessionLocal() as db_session:
        emp = db_session.query(models.User).filter_by(id="emp-corrupt-cluster").first()
        if not emp:
            emp = models.User(
                id="emp-corrupt-cluster",
                phone="+998909990099",
                role="employer",
                name="Corrupt Cluster Employer",
            )
            db_session.add(emp)
            db_session.commit()

        # Clean existing test jobs if any
        test_job_ids = [
            "job-cl-tashkent-1",
            "job-cl-tashkent-2",
            "job-cl-shymkent",
            "job-cl-solo-tashkent",
            "job-cl-solo-dashoguz",
        ]
        db_session.query(models.Job).filter(models.Job.id.in_(test_job_ids)).delete(synchronize_session=False)
        db_session.commit()

        # Multi-pin cluster jobs: 2 valid Tashkent jobs + 1 Shymkent foreign job
        multi_jobs = [
            models.Job(
                id="job-cl-tashkent-1",
                title="Corrupt Cluster Multi Test 1",
                company="Tashkent Tech",
                location="Toshkent",
                description="Tavsif matni",
                coordinateX=41.3100,
                coordinateY=69.2400,
                salary=4000000,
                status=JobStatus.OPEN,
                employerId="emp-corrupt-cluster",
                neededWorkers="1",
            ),
            models.Job(
                id="job-cl-tashkent-2",
                title="Corrupt Cluster Multi Test 2",
                company="Tashkent Digital",
                location="Toshkent",
                description="Tavsif matni",
                coordinateX=41.3200,
                coordinateY=69.2500,
                salary=4500000,
                status=JobStatus.OPEN,
                employerId="emp-corrupt-cluster",
                neededWorkers="1",
            ),
            models.Job(
                id="job-cl-shymkent",
                title="Corrupt Cluster Multi Test 3",
                company="Kazakhstan Logistics",
                location="Shymkent",
                description="Tavsif matni",
                coordinateX=42.3417,  # Shymkent, Kazakhstan (Foreign)
                coordinateY=69.5901,
                salary=5000000,
                status=JobStatus.OPEN,
                employerId="emp-corrupt-cluster",
                neededWorkers="1",
            ),
        ]
        db_session.add_all(multi_jobs)
        db_session.commit()

    # Scenario 1: Multi-job cluster containing 2 Tashkent jobs + 1 Shymkent job
    # Artificially inject stale cluster into Redis with count=3 and centroid in Tashkent
    version = get_map_cache_version()
    base_key = build_map_pins_cache_key(
        version=version,
        min_lat=None,
        max_lat=None,
        min_lng=None,
        max_lng=None,
        location=None,
        category=None,
        search="corrupt cluster multi test",
        limit=0,
    ) + ":clustered"

    corrupted_cluster_payload = json.dumps([
        {
            "id": "cluster_corrupt_multi",
            "isCluster": True,
            "count": 3,
            "pinIds": ["job-cl-tashkent-1", "job-cl-tashkent-2", "job-cl-shymkent"],
            "coordinateX": 41.3150,  # Centroid is inside Tashkent!
            "coordinateY": 69.2450,
            "latitude": 41.3150,
            "longitude": 69.2450,
            "title": "3 ta bo'sh ish o'rni",
            "company": "Toshkent",
            "location": "Toshkent",
            "salary": 4500000,
            "salaryCurrency": "UZS",
            "status": "open",
            "urgent": False,
            "vacancies": 3,
            "hiredCount": 0,
            "applied": False,
            "bookmarked": False,
        }
    ])
    redis_client.set(base_key, corrupted_cluster_payload, ex=120)

    # 1. Anonymous visitor hits Fast Path:
    # Must detect foreign pin inside cluster, invalidate stale cache, rebuild from DB, and return count=2
    client.cookies.clear()
    client.headers.pop("Authorization", None)
    res_anon = client.get("/api/v1/jobs/map?clustered=true&search=Corrupt%20Cluster%20Multi%20Test")
    assert res_anon.status_code == 200
    clusters_anon = res_anon.json()

    assert len(clusters_anon) == 1, f"Expected 1 cluster, got {len(clusters_anon)}"
    c_anon = clusters_anon[0]
    assert c_anon["isCluster"] is True, "Cluster with 2 remaining Tashkent jobs must remain a cluster"
    assert c_anon["count"] == 2, f"Count must be sanitized from 3 to 2, got {c_anon['count']}"
    assert set(c_anon["pinIds"]) == {"job-cl-tashkent-1", "job-cl-tashkent-2"}
    assert "job-cl-shymkent" not in c_anon["pinIds"], "Foreign Shymkent job must not leak in cluster pinIds!"

    # 2. Authenticated visitor hits Fast Assembly Path:
    # Must also receive the sanitized cluster with count=2 and without Shymkent
    login(client, worker)
    res_auth = client.get("/api/v1/jobs/map?clustered=true&search=Corrupt%20Cluster%20Multi%20Test")
    assert res_auth.status_code == 200
    clusters_auth = res_auth.json()
    assert len(clusters_auth) == 1
    c_auth = clusters_auth[0]
    assert c_auth["count"] == 2
    assert set(c_auth["pinIds"]) == {"job-cl-tashkent-1", "job-cl-tashkent-2"}
    assert "job-cl-shymkent" not in c_auth["pinIds"]

    # Scenario 2: Single valid job + 1 foreign job (Cluster downgrade scenario)
    # A cluster in cache contains 1 Tashkent job + 1 Dashoguz job.
    # When sanitized, only 1 valid job remains; system must downgrade it to a single unclustered pin.
    with SessionLocal() as db_session:
        solo_jobs = [
            models.Job(
                id="job-cl-solo-tashkent",
                title="Corrupt Cluster Solo Test 1",
                company="Solo Tech",
                location="Toshkent",
                description="Tavsif matni",
                coordinateX=41.3000,
                coordinateY=69.2300,
                salary=3000000,
                status=JobStatus.OPEN,
                employerId="emp-corrupt-cluster",
                neededWorkers="1",
            ),
            models.Job(
                id="job-cl-solo-dashoguz",
                title="Corrupt Cluster Solo Test 2",
                company="Turkmen Logistics",
                location="Dashoguz",
                description="Tavsif matni",
                coordinateX=41.8333,  # Dashoguz, Turkmenistan (Foreign)
                coordinateY=59.9667,
                salary=3500000,
                status=JobStatus.OPEN,
                employerId="emp-corrupt-cluster",
                neededWorkers="1",
            ),
        ]
        db_session.add_all(solo_jobs)
        db_session.commit()

    base_key_solo = build_map_pins_cache_key(
        version=version,
        min_lat=None,
        max_lat=None,
        min_lng=None,
        max_lng=None,
        location=None,
        category=None,
        search="corrupt cluster solo test",
        limit=0,
    ) + ":clustered"

    corrupted_solo_payload = json.dumps([
        {
            "id": "cluster_corrupt_solo",
            "isCluster": True,
            "count": 2,
            "pinIds": ["job-cl-solo-tashkent", "job-cl-solo-dashoguz"],
            "coordinateX": 41.3000,  # Tashkent centroid
            "coordinateY": 69.2300,
            "title": "2 ta bo'sh ish o'rni",
            "status": "open",
        }
    ])
    redis_client.set(base_key_solo, corrupted_solo_payload, ex=120)

    client.cookies.clear()
    client.headers.pop("Authorization", None)
    res_solo = client.get("/api/v1/jobs/map?clustered=true&search=Corrupt%20Cluster%20Solo%20Test")
    assert res_solo.status_code == 200
    pins_solo = res_solo.json()

    assert len(pins_solo) == 1, f"Expected 1 pin after cluster downgrade, got {len(pins_solo)}"
    p_solo = pins_solo[0]
    assert p_solo["isCluster"] is False, "Single remaining pin must be downgraded from cluster"
    assert p_solo["count"] == 1
    assert p_solo["id"] == "job-cl-solo-tashkent"
    assert p_solo["pinIds"] == ["job-cl-solo-tashkent"]
    assert "job-cl-solo-dashoguz" not in (p_solo.get("pinIds") or [])

    # Scenario 3: Deleted / Non-existent pinId in cluster cache
    # Cluster references a job that was deleted from DB.
    # Fast path detects stale pinId, invalidates cache, and rebuilds from DB.
    base_key_deleted = build_map_pins_cache_key(
        version=version,
        min_lat=None,
        max_lat=None,
        min_lng=None,
        max_lng=None,
        location=None,
        category=None,
        search="corrupt cluster solo test",
        limit=0,
    ) + ":clustered"

    deleted_cluster_payload = json.dumps([
        {
            "id": "cluster_corrupt_deleted",
            "isCluster": True,
            "count": 2,
            "pinIds": ["job-cl-solo-tashkent", "non-existent-deleted-job-id"],
            "coordinateX": 41.3000,
            "coordinateY": 69.2300,
            "title": "2 ta bo'sh ish o'rni",
            "status": "open",
        }
    ])
    redis_client.set(base_key_deleted, deleted_cluster_payload, ex=120)

    client.cookies.clear()
    client.headers.pop("Authorization", None)
    res_del = client.get("/api/v1/jobs/map?clustered=true&search=Corrupt%20Cluster%20Solo%20Test")
    assert res_del.status_code == 200
    pins_del = res_del.json()
    assert len(pins_del) == 1
    assert "non-existent-deleted-job-id" not in (pins_del[0].get("pinIds") or [])


def test_unclustered_limit_not_starved_by_foreign_candidates_in_bounding_box(client):
    """
    Test that when clustered=false (raw map pins):
    1. If the first N candidates matching the query order are foreign coordinates (e.g. Shymkent/Dashoguz in BBOX),
       they do NOT exhaust the requested limit before exact polygon filtering.
    2. Valid Uzbekistan jobs with older timestamps are successfully retrieved up to the requested limit.
    3. Valid jobs are not lost due to candidate starvation.
    4. clustered=true behavior is preserved without limit cutoffs.
    """
    from datetime import datetime, timedelta

    invalidate_map_cache()

    with SessionLocal() as db_session:
        emp = db_session.query(models.User).filter_by(id="emp-starvation-test").first()
        if not emp:
            emp = models.User(
                id="emp-starvation-test",
                phone="+998909990088",
                role="employer",
                name="Starvation Test Emp",
            )
            db_session.add(emp)
            db_session.commit()

        # Clean old test jobs
        db_session.query(models.Job).filter(models.Job.employerId == "emp-starvation-test").delete()
        db_session.commit()

        now = datetime.utcnow()
        # Create 10 foreign jobs with NEWER timestamps (inside Uzbekistan bounding box, but outside boundary polygon)
        # 5 Shymkent (42.3417, 69.5901) and 5 Dashoguz (41.8333, 59.9667)
        foreign_jobs = []
        for i in range(5):
            foreign_jobs.append(
                models.Job(
                    id=f"job-foreign-shymkent-{i}",
                    title=f"Limit Starvation Test Foreign Shymkent {i}",
                    company="Kazakh Corp",
                    location="Shymkent",
                    description="Tavsif",
                    coordinateX=42.3417,
                    coordinateY=69.5901,
                    salary=3000000,
                    status=JobStatus.OPEN,
                    employerId="emp-starvation-test",
                    createdAt=now - timedelta(minutes=i),
                )
            )
        for i in range(5):
            foreign_jobs.append(
                models.Job(
                    id=f"job-foreign-dashoguz-{i}",
                    title=f"Limit Starvation Test Foreign Dashoguz {i}",
                    company="Turkmen Corp",
                    location="Dashoguz",
                    description="Tavsif",
                    coordinateX=41.8333,
                    coordinateY=59.9667,
                    salary=3200000,
                    status=JobStatus.OPEN,
                    employerId="emp-starvation-test",
                    createdAt=now - timedelta(minutes=10 + i),
                )
            )

        # Create 5 valid Tashkent jobs with OLDER timestamps
        valid_tashkent_jobs = []
        for i in range(5):
            valid_tashkent_jobs.append(
                models.Job(
                    id=f"job-valid-tashkent-{i}",
                    title=f"Limit Starvation Test Valid Tashkent {i}",
                    company="Tashkent Corp",
                    location="Toshkent",
                    description="Tavsif",
                    coordinateX=41.3100 + (i * 0.01),
                    coordinateY=69.2400 + (i * 0.01),
                    salary=4000000,
                    status=JobStatus.OPEN,
                    employerId="emp-starvation-test",
                    createdAt=now - timedelta(minutes=100 + i),
                )
            )

        db_session.add_all(foreign_jobs + valid_tashkent_jobs)
        db_session.commit()

    # 1. Test with limit=5:
    # If .limit(5) was applied before polygon filtering, all 5 items would be Shymkent,
    # and 0 items would be returned.
    # With batching, exactly 5 valid Tashkent jobs must be returned!
    client.cookies.clear()
    client.headers.pop("Authorization", None)
    res_limit5 = client.get("/api/v1/jobs/map?clustered=false&limit=5&search=Limit%20Starvation%20Test")
    assert res_limit5.status_code == 200
    pins_limit5 = res_limit5.json()

    assert len(pins_limit5) == 5, f"Expected 5 valid pins, got {len(pins_limit5)} (proves limit was not starved by foreign jobs)"
    pin_ids_limit5 = {p["id"] for p in pins_limit5}
    for p in pins_limit5:
        assert "foreign" not in p["id"], f"Foreign job {p['id']} must not be in response"
        assert "valid-tashkent" in p["id"]

    # 2. Test with limit=3:
    invalidate_map_cache()
    res_limit3 = client.get("/api/v1/jobs/map?clustered=false&limit=3&search=Limit%20Starvation%20Test")
    assert res_limit3.status_code == 200
    pins_limit3 = res_limit3.json()
    assert len(pins_limit3) == 3, f"Expected exactly 3 valid pins, got {len(pins_limit3)}"
    for p in pins_limit3:
        assert "valid-tashkent" in p["id"]

    # 3. Test that clustered=true aggregates all 5 valid jobs without limit cutoffs
    invalidate_map_cache()
    res_clustered = client.get("/api/v1/jobs/map?clustered=true&search=Limit%20Starvation%20Test")
    assert res_clustered.status_code == 200
    clusters = res_clustered.json()
    assert len(clusters) == 1
    assert clusters[0]["count"] == 5, f"Clustered view must aggregate all 5 valid jobs, got {clusters[0]['count']}"
    for pid in clusters[0]["pinIds"]:
        assert "valid-tashkent" in pid
        assert "foreign" not in pid


def test_clean_cache_hit_requires_zero_db_queries(client):
    """
    Profile and prove that once the spatial map cache is populated cleanly:
    1. A subsequent Fast Path cache hit executes EXACTLY 0 database queries on non-empty dataset.
    2. Clusters contain valid geo_verified=True and cryptographic geo_sig.
    3. ETag and 304 Not Modified match the verified sanitized response.
    """
    from sqlalchemy import event
    from app.db.session import engine
    from app.core.map_cache import verify_cluster_signature

    invalidate_map_cache()
    try:
        redis_client.flushdb()
    except Exception:
        pass

    with SessionLocal() as db_session:
        # Create at least 3 valid jobs in Tashkent to guarantee non-empty cache
        employer = db_session.query(models.User).filter_by(id="emp-zero-db").first()
        if not employer:
            employer = models.User(
                id="emp-zero-db",
                phone="+998909990001",
                role="employer",
                name="Zero DB Employer",
            )
            db_session.add(employer)
            db_session.flush()

        db_session.query(models.Job).filter(models.Job.employerId == "emp-zero-db").delete()
        for i in range(3):
            j = models.Job(
                id=f"job-zero-db-{i}",
                employerId="emp-zero-db",
                title=f"Zero DB Job {i}",
                company="Baito Co",
                description="Test Description",
                status=JobStatus.OPEN,
                coordinateX=41.31 + (i * 0.005),
                coordinateY=69.24 + (i * 0.005),
                location="Toshkent",
                neededWorkers="1",
            )
            db_session.add(j)
        db_session.commit()

    # 1. Prime the cache: Request 1 executes Cold DB Path and writes geo_verified=True & geo_sig to Redis
    res_prime = client.get("/api/v1/jobs/map?clustered=true")
    assert res_prime.status_code == 200
    prime_data = res_prime.json()
    assert len(prime_data) > 0, "Test must NOT pass on trivial empty list; real jobs must be returned"
    cluster = prime_data[0]
    assert cluster.get("geo_verified") is True
    assert cluster.get("geo_sig") is not None
    assert verify_cluster_signature(cluster) is True
    etag = res_prime.headers.get("ETag")
    assert etag is not None

    # Test 304 Not Modified
    res_304 = client.get("/api/v1/jobs/map?clustered=true", headers={"if-none-match": etag})
    assert res_304.status_code == 304

    # 2. Profile Fast Path on clean cache hit: Must execute ZERO SQL queries!
    executed_queries = []

    def before_cursor_execute_listener(conn, cursor, statement, parameters, context, executemany):
        stmt = statement.strip().upper()
        if not stmt.startswith("PRAGMA") and not stmt.startswith("ROLLBACK") and not stmt.startswith("COMMIT"):
            executed_queries.append(statement)

    event.listen(engine, "before_cursor_execute", before_cursor_execute_listener)
    try:
        res_fast = client.get("/api/v1/jobs/map?clustered=true")
        assert res_fast.status_code == 200
    finally:
        event.remove(engine, "before_cursor_execute", before_cursor_execute_listener)

    assert len(executed_queries) == 0, (
        f"Clean cache hit MUST execute 0 DB queries, but executed {len(executed_queries)}: {executed_queries}"
    )


def test_public_cache_candidate_isolation_with_authenticated_user_first(client):
    """
    Regression Test for Section 1:
    Ensure that when an authenticated user with personal IN_PROGRESS or COMPLETED shifts
    makes a request first (Cold DB Path), those personal shifts NEVER consume the public
    candidate limit and NEVER leak into base_pins / base_cache_key.
    The public base cache and subsequent anonymous/other-user requests must receive the
    full limit of valid open jobs, and never see the worker's personal private shifts.
    """
    invalidate_map_cache()
    try:
        redis_client.flushdb()
    except Exception:
        pass

    with SessionLocal() as db_session:
        employer = db_session.query(models.User).filter_by(id="emp-cluster-test").first()
        if not employer:
            employer = models.User(
                id="emp-cluster-test",
                phone="+998901234567",
                role="employer",
                name="Cluster Employer",
            )
            db_session.add(employer)
            db_session.commit()

        db_session.query(models.Application).filter(models.Application.id.like("app-iso-%")).delete()
        db_session.query(models.Job).filter(models.Job.id.like("job-iso-%")).delete()
        db_session.commit()

        from tests.conftest import get_password_hash, TEST_PASSWORD

        w1 = db_session.query(models.User).filter_by(id="worker-iso-1").first()
        if not w1:
            w1 = models.User(
                id="worker-iso-1",
                uid="worker-iso-1",
                phone="+998901110001",
                name="Worker 1",
                role="worker",
                hashed_password=get_password_hash(TEST_PASSWORD),
                isVerified=True,
                isBanned=False,
            )
            db_session.add(w1)
            db_session.commit()

        w2 = db_session.query(models.User).filter_by(id="worker-iso-2").first()
        if not w2:
            w2 = models.User(
                id="worker-iso-2",
                uid="worker-iso-2",
                phone="+998901110002",
                name="Worker 2",
                role="worker",
                hashed_password=get_password_hash(TEST_PASSWORD),
                isVerified=True,
                isBanned=False,
            )
            db_session.add(w2)
            db_session.commit()

        # Create 5 valid public open jobs (Tashkent coords)
        open_jobs = []
        for i in range(5):
            j = models.Job(
                id=f"job-iso-open-{i}",
                employerId="emp-cluster-test",
                title=f"Open Job Iso {i}",
                company="Baito Co",
                description="Test Description",
                status=JobStatus.OPEN,
                coordinateX=41.31 + (i * 0.001),
                coordinateY=69.24 + (i * 0.001),
                location="Toshkent",
                neededWorkers="1",
            )
            open_jobs.append(j)
        db_session.add_all(open_jobs)

        # Create 10 IN_PROGRESS jobs applied by Worker 1
        private_jobs = []
        apps = []
        for i in range(10):
            pj = models.Job(
                id=f"job-iso-prog-{i}",
                employerId="emp-cluster-test",
                title=f"In Progress Job Iso {i}",
                company="Baito Co",
                description="Test Description",
                status=JobStatus.IN_PROGRESS,
                coordinateX=41.32 + (i * 0.001),
                coordinateY=69.25 + (i * 0.001),
                location="Toshkent",
                neededWorkers="1",
            )
            private_jobs.append(pj)
            app_record = models.Application(
                id=f"app-iso-{i}",
                jobId=pj.id,
                workerId=w1.id,
                status="in_progress",
            )
            apps.append(app_record)
        db_session.add_all(private_jobs)
        db_session.flush()
        db_session.add_all(apps)
        db_session.commit()
        db_session.refresh(w1)
        db_session.refresh(w2)
        db_session.expunge(w1)
        db_session.expunge(w2)

    # Worker 1 logs in and hits Cold DB Path first with limit=5
    login(client, w1)
    res_w1 = client.get("/api/v1/jobs/map?clustered=false&limit=5&search=Iso")
    assert res_w1.status_code == 200
    w1_pins = res_w1.json()
    w1_pids = {p["id"] for p in w1_pins}
    assert any("job-iso-prog-" in pid for pid in w1_pids)
    assert any("job-iso-open-" in pid for pid in w1_pids)

    # Anonymous user requests public map with limit=5: MUST get full 5 open jobs and 0 private jobs
    anon_client = TestClient(app)
    res_anon = anon_client.get("/api/v1/jobs/map?clustered=false&limit=5&search=Iso")
    assert res_anon.status_code == 200
    anon_pins = res_anon.json()
    assert len(anon_pins) == 5, f"Anonymous user MUST get full limit=5 open jobs, got {len(anon_pins)}"
    for p in anon_pins:
        assert "job-iso-open-" in p["id"], f"Anonymous user must NOT see private job: {p['id']}"
        assert "job-iso-prog-" not in p["id"]

    # Worker 2 logs in: must NOT see Worker 1's in_progress jobs, but MUST get full open jobs
    w2_client = TestClient(app)
    login(w2_client, w2)
    res_w2 = w2_client.get("/api/v1/jobs/map?clustered=false&limit=5&search=Iso")
    assert res_w2.status_code == 200
    w2_pins = res_w2.json()
    assert len(w2_pins) == 5
    for p in w2_pins:
        assert "job-iso-open-" in p["id"]
        assert "job-iso-prog-" not in p["id"]


def test_geojson_strict_validation_and_ring_normalization():
    """
    Regression Test for Section 2:
    Strict RFC 7946 linear ring validation and normalization:
    Rejects string coordinates, NaN, Infinity, short positions, unclosed rings.
    Verifies atomic fail-closed behavior on corrupted GeoJSON and clean recovery.
    """
    from app.services.geo_service import GeoSpatialService

    # 1. String coordinates rejected
    bad_str_ring = [["69.24", "41.31"], ["69.25", "41.31"], ["69.25", "41.32"], ["69.24", "41.31"]]
    assert GeoSpatialService._validate_and_normalize_ring(bad_str_ring) is None

    # 2. NaN rejected
    bad_nan_ring = [[float("nan"), 41.31], [69.25, 41.31], [69.25, 41.32], [float("nan"), 41.31]]
    assert GeoSpatialService._validate_and_normalize_ring(bad_nan_ring) is None

    # 3. Infinity rejected
    bad_inf_ring = [[float("inf"), 41.31], [69.25, 41.31], [69.25, 41.32], [float("inf"), 41.31]]
    assert GeoSpatialService._validate_and_normalize_ring(bad_inf_ring) is None

    # 4. -Infinity rejected
    bad_ninf_ring = [[-float("inf"), 41.31], [69.25, 41.31], [69.25, 41.32], [-float("inf"), 41.31]]
    assert GeoSpatialService._validate_and_normalize_ring(bad_ninf_ring) is None

    # 5. Short coordinate rejected (len < 2)
    bad_short_ring = [[69.24], [69.25, 41.31], [69.25, 41.32], [69.24]]
    assert GeoSpatialService._validate_and_normalize_ring(bad_short_ring) is None

    # 6. Unclosed ring rejected (first != last)
    bad_unclosed_ring = [[69.24, 41.31], [69.25, 41.31], [69.25, 41.32], [69.24, 41.33]]
    assert GeoSpatialService._validate_and_normalize_ring(bad_unclosed_ring) is None

    # 7. Valid ring normalized to List[Tuple[float, float]]
    valid_ring = [[69.24, 41.31], [69.25, 41.31], [69.25, 41.32], [69.24, 41.31]]
    normalized = GeoSpatialService._validate_and_normalize_ring(valid_ring)
    assert normalized is not None
    assert len(normalized) == 4
    for pt in normalized:
        assert isinstance(pt, tuple)
        assert isinstance(pt[0], float) and isinstance(pt[1], float)

    # 8. Valid feature followed by invalid feature fails closed atomically
    corrupt_geojson = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[[69.20, 41.30], [69.30, 41.30], [69.30, 41.40], [69.20, 41.30]]],
                },
                "properties": {"name": "Valid Triangle"},
            },
            {
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[[ "invalid_str", 41.30 ], [69.30, 41.30], [69.30, 41.40], [69.20, 41.30]]],
                },
                "properties": {"name": "Corrupted Polygon"},
            },
        ],
    }

    try:
        # Atomic init should raise or fail closed
        GeoSpatialService._init_polygons(override_data=corrupt_geojson)
        assert GeoSpatialService._PREPARED_POLYGONS == []
        # In fail-closed mode, even points inside Feature 1 are rejected
        assert GeoSpatialService.is_inside_uzbekistan(41.35, 69.25) is False
    finally:
        # 9. Clean recovery: reloading valid GeoJSON restores service
        GeoSpatialService._init_polygons(override_data=None, force_reload=True)
        assert len(GeoSpatialService._PREPARED_POLYGONS) > 0
        assert GeoSpatialService.is_inside_uzbekistan(41.31, 69.24) is True
        # Enclave in hole (Sarvan) rejected
        assert GeoSpatialService.is_inside_uzbekistan(40.9909362, 70.5499591) is False


def test_cluster_corruption_1_to_12_regression(client):
    """
    Regression Tests for Section 3:
    12 mandatory test cases verifying cluster cache integrity and HMAC trust boundaries.
    """
    from app.core.map_cache import compute_cluster_signature

    invalidate_map_cache()
    try:
        redis_client.flushdb()
    except Exception:
        pass

    with SessionLocal() as db_session:
        employer = db_session.query(models.User).filter_by(id="emp-cluster-test").first()
        if not employer:
            employer = models.User(
                id="emp-cluster-test",
                phone="+998901234567",
                role="employer",
                name="Cluster Employer",
            )
            db_session.add(employer)
            db_session.commit()

        db_session.query(models.Job).filter(models.Job.id.like("job-corrupt-%")).delete()
        valid_job = models.Job(
            id="job-corrupt-valid-1",
            employerId="emp-cluster-test",
            title="Corrupt Test Valid 1",
            company="Baito Co",
            description="Test Description",
            status=JobStatus.OPEN,
            coordinateX=41.31,
            coordinateY=69.24,
            location="Toshkent",
            neededWorkers="1",
        )
        valid_job2 = models.Job(
            id="job-corrupt-valid-2",
            employerId="emp-cluster-test",
            title="Corrupt Test Valid 2",
            company="Baito Co",
            description="Test Description",
            status=JobStatus.OPEN,
            coordinateX=41.312,
            coordinateY=69.242,
            location="Toshkent",
            neededWorkers="1",
        )
        shymkent_job = models.Job(
            id="job-corrupt-shymkent",
            employerId="emp-cluster-test",
            title="Corrupt Test Shymkent",
            company="Baito Co",
            description="Test Description",
            status=JobStatus.OPEN,
            coordinateX=42.3417,
            coordinateY=69.5901,
            location="Shymkent",
            neededWorkers="1",
        )
        cancelled_job = models.Job(
            id="job-corrupt-cancelled",
            employerId="emp-cluster-test",
            title="Corrupt Test Cancelled",
            company="Baito Co",
            description="Test Description",
            status=JobStatus.CANCELLED,
            coordinateX=41.315,
            coordinateY=69.245,
            location="Toshkent",
            neededWorkers="1",
        )
        db_session.add_all([valid_job, valid_job2, shymkent_job, cancelled_job])
        db_session.commit()

    ver = get_map_cache_version()
    base_key = build_map_pins_cache_key(version=ver, search="corrupt test", limit=500)

    # 1. Legacy cluster with foreign pin
    legacy_cluster = {
        "isCluster": True,
        "id": "cluster_legacy",
        "count": 2,
        "coordinateX": 41.31,
        "coordinateY": 69.24,
        "pinIds": ["job-corrupt-valid-1", "job-corrupt-shymkent"],
    }
    redis_client.set(base_key, json.dumps([legacy_cluster]), ex=120)
    res = client.get("/api/v1/jobs/map?clustered=true&search=Corrupt%20Test")
    assert res.status_code == 200
    for p in res.json():
        if p.get("isCluster"):
            assert "job-corrupt-shymkent" not in p.get("pinIds", [])

    # 2. Forged geo_verified=True cluster with foreign pin (HMAC missing/invalid)
    forged_cluster = {
        "isCluster": True,
        "id": "cluster_forged",
        "count": 2,
        "coordinateX": 41.31,
        "coordinateY": 69.24,
        "pinIds": ["job-corrupt-valid-1", "job-corrupt-shymkent"],
        "geo_verified": True,
        "geo_sig": "invalid_hmac_signature",
    }
    redis_client.set(base_key, json.dumps([forged_cluster]), ex=120)
    res = client.get("/api/v1/jobs/map?clustered=true&search=Corrupt%20Test")
    assert res.status_code == 200
    for p in res.json():
        if p.get("isCluster"):
            assert "job-corrupt-shymkent" not in p.get("pinIds", [])

    # 3. Missing pinIds
    bad_c3 = {"isCluster": True, "id": "c3", "count": 2, "coordinateX": 41.31, "coordinateY": 69.24}
    redis_client.set(base_key, json.dumps([bad_c3]), ex=120)
    res = client.get("/api/v1/jobs/map?clustered=true&search=Corrupt%20Test")
    assert res.status_code == 200

    # 4. Empty pinIds=[]
    bad_c4 = {"isCluster": True, "id": "c4", "count": 2, "coordinateX": 41.31, "coordinateY": 69.24, "pinIds": []}
    redis_client.set(base_key, json.dumps([bad_c4]), ex=120)
    res = client.get("/api/v1/jobs/map?clustered=true&search=Corrupt%20Test")
    assert res.status_code == 200

    # 5. Duplicate pinIds
    bad_c5 = {
        "isCluster": True,
        "id": "c5",
        "count": 2,
        "coordinateX": 41.31,
        "coordinateY": 69.24,
        "pinIds": ["job-corrupt-valid-1", "job-corrupt-valid-1"],
    }
    redis_client.set(base_key, json.dumps([bad_c5]), ex=120)
    res = client.get("/api/v1/jobs/map?clustered=true&search=Corrupt%20Test")
    assert res.status_code == 200

    # 6. count mismatch (count=3, len(pinIds)=2)
    bad_c6 = {
        "isCluster": True,
        "id": "c6",
        "count": 3,
        "coordinateX": 41.31,
        "coordinateY": 69.24,
        "pinIds": ["job-corrupt-valid-1", "job-corrupt-valid-2"],
    }
    redis_client.set(base_key, json.dumps([bad_c6]), ex=120)
    res = client.get("/api/v1/jobs/map?clustered=true&search=Corrupt%20Test")
    assert res.status_code == 200

    # 7. Deleted pinId in DB
    bad_c7 = {
        "isCluster": True,
        "id": "c7",
        "count": 2,
        "coordinateX": 41.31,
        "coordinateY": 69.24,
        "pinIds": ["job-corrupt-valid-1", "non-existent-deleted-job-id"],
    }
    redis_client.set(base_key, json.dumps([bad_c7]), ex=120)
    res = client.get("/api/v1/jobs/map?clustered=true&search=Corrupt%20Test")
    assert res.status_code == 200

    # 8. Foreign pin in DB
    bad_c8 = {
        "isCluster": True,
        "id": "c8",
        "count": 2,
        "coordinateX": 41.31,
        "coordinateY": 69.24,
        "pinIds": ["job-corrupt-valid-1", "job-corrupt-shymkent"],
    }
    redis_client.set(base_key, json.dumps([bad_c8]), ex=120)
    res = client.get("/api/v1/jobs/map?clustered=true&search=Corrupt%20Test")
    assert res.status_code == 200

    # 9. Cancelled pin in DB
    bad_c9 = {
        "isCluster": True,
        "id": "c9",
        "count": 2,
        "coordinateX": 41.31,
        "coordinateY": 69.24,
        "pinIds": ["job-corrupt-valid-1", "job-corrupt-cancelled"],
    }
    redis_client.set(base_key, json.dumps([bad_c9]), ex=120)
    res = client.get("/api/v1/jobs/map?clustered=true&search=Corrupt%20Test")
    assert res.status_code == 200

    # 10. Single remaining valid pin downgraded to unclustered pin
    res_pins = [p for p in res.json() if p["id"] == "job-corrupt-valid-1"]
    if res_pins:
        p0 = res_pins[0]
        assert p0.get("isCluster") is False or p0.get("count") == 1

    # 11. Authenticated user hits corrupt cache first (Fast Assembly Path)
    with SessionLocal() as db_session:
        worker = db_session.query(models.User).filter_by(id="worker-fast-asm").first()
        if not worker:
            worker = make_user(role="worker", phone="+998902220001", name="Worker Fast Asm")
            worker.id = "worker-fast-asm"
            db_session.add(worker)
            db_session.commit()
            db_session.refresh(worker)

    bad_c11 = {
        "isCluster": True,
        "id": "c11",
        "count": 2,
        "coordinateX": 41.31,
        "coordinateY": 69.24,
        "pinIds": ["job-corrupt-valid-1", "job-corrupt-shymkent"],
    }
    redis_client.set(base_key, json.dumps([bad_c11]), ex=120)
    auth_client = TestClient(app)
    login(auth_client, worker)
    res_auth = auth_client.get("/api/v1/jobs/map?clustered=true&search=Corrupt%20Test")
    assert res_auth.status_code == 200
    for p in res_auth.json():
        if p.get("isCluster"):
            assert "job-corrupt-shymkent" not in p.get("pinIds", [])

    # 12. Anonymous user hits corrupt cache first (Fast Path)
    bad_c12 = {
        "isCluster": True,
        "id": "c12",
        "count": 2,
        "coordinateX": 41.31,
        "coordinateY": 69.24,
        "pinIds": ["job-corrupt-valid-1", "job-corrupt-shymkent"],
    }
    redis_client.set(base_key, json.dumps([bad_c12]), ex=120)
    anon_client2 = TestClient(app)
    res_anon2 = anon_client2.get("/api/v1/jobs/map?clustered=true&search=Corrupt%20Test")
    assert res_anon2.status_code == 200
    for p in res_anon2.json():
        if p.get("isCluster"):
            assert "job-corrupt-shymkent" not in p.get("pinIds", [])


def test_limit_batching_first_batch_foreign_second_batch_valid(client):
    """
    Regression Test for Section 4:
    Verify that when the first candidate batch consists entirely of foreign coordinates,
    batching scans forward to retrieve limit valid jobs (tested for limit=3 and limit=5).
    """
    invalidate_map_cache()
    try:
        redis_client.flushdb()
    except Exception:
        pass

    with SessionLocal() as db_session:
        employer = db_session.query(models.User).filter_by(id="emp-cluster-test").first()
        if not employer:
            employer = models.User(
                id="emp-cluster-test",
                phone="+998901234567",
                role="employer",
                name="Cluster Employer",
            )
            db_session.add(employer)
            db_session.commit()

        db_session.query(models.Job).filter(models.Job.id.like("job-batch-%")).delete()
        # 105 foreign jobs in Shymkent with newer timestamps
        foreign_jobs = []
        for i in range(105):
            j = models.Job(
                id=f"job-batch-foreign-{i}",
                employerId="emp-cluster-test",
                title="Batch Starvation Test Foreign",
                company="Baito Co",
                description="Test Description",
                status=JobStatus.OPEN,
                coordinateX=42.3417,
                coordinateY=69.5901,
                location="Shymkent",
                neededWorkers="1",
            )
            foreign_jobs.append(j)
        db_session.add_all(foreign_jobs)

        # 10 valid jobs in Tashkent with slightly older timestamps
        valid_jobs = []
        for i in range(10):
            j = models.Job(
                id=f"job-batch-valid-{i}",
                employerId="emp-cluster-test",
                title="Batch Starvation Test Valid",
                company="Baito Co",
                description="Test Description",
                status=JobStatus.OPEN,
                coordinateX=41.31 + (i * 0.002),
                coordinateY=69.24 + (i * 0.002),
                location="Toshkent",
                neededWorkers="1",
            )
            valid_jobs.append(j)
        db_session.add_all(valid_jobs)
        db_session.commit()

    # Test limit=3
    invalidate_map_cache()
    res3 = client.get("/api/v1/jobs/map?clustered=false&limit=3&search=Batch%20Starvation%20Test")
    assert res3.status_code == 200
    data3 = res3.json()
    assert len(data3) == 3, f"Expected 3 valid jobs, got {len(data3)}"
    for item in data3:
        assert "job-batch-valid-" in item["id"]

    # Test limit=5
    invalidate_map_cache()
    res5 = client.get("/api/v1/jobs/map?clustered=false&limit=5&search=Batch%20Starvation%20Test")
    assert res5.status_code == 200
    data5 = res5.json()
    assert len(data5) == 5, f"Expected 5 valid jobs, got {len(data5)}"
    for item in data5:
        assert "job-batch-valid-" in item["id"]


# =====================================================================
# REMEDIATION REGRESSION TESTS: ALL 15 TAMPER & CACHE SECURITY SCENARIOS
# =====================================================================

def _ensure_cluster_emp(db_session):
    emp = db_session.query(models.User).filter_by(id="emp-cluster-test").first()
    if not emp:
        emp = models.User(
            id="emp-cluster-test",
            phone="+998901234567",
            role="employer",
            name="Cluster Employer",
        )
        db_session.add(emp)
        db_session.commit()
        db_session.refresh(emp)
    return emp


def test_tamper_scenario_1_ordinary_pin_id(client):
    """Scenario 1: Tampered ordinary-pin ID in cached payload must fail verification, evict cache, and rebuild from DB."""
    from app.core.map_cache import compute_pin_signature
    invalidate_map_cache()
    try:
        redis_client.flushdb()
    except Exception:
        pass

    with SessionLocal() as db_session:
        emp = _ensure_cluster_emp(db_session)
        db_session.query(models.Job).filter(models.Job.id.in_(["job-sec-1", "job-sec-forged"])).delete()
        j1 = models.Job(
            id="job-sec-1",
            employerId=emp.id,
            title="Sec Job 1",
            company="Baito Co",
            description="Test Description",
            status=JobStatus.OPEN,
            coordinateX=41.31,
            coordinateY=69.24,
            location="Toshkent",
            neededWorkers="1",
        )
        db_session.add(j1)
        db_session.commit()

    # Pre-populate cache with tampered ID (signature signed for job-sec-1, but ID altered to job-sec-forged)
    pin = {
        "id": "job-sec-1",
        "title": "Sec Job 1",
        "company": "Baito Co",
        "coordinateX": 41.31,
        "coordinateY": 69.24,
        "status": "open",
        "applied": False,
        "bookmarked": False,
        "isCluster": False,
        "count": 1,
        "pinIds": ["job-sec-1"],
        "geo_verified": True,
    }
    valid_sig = compute_pin_signature(pin)
    tampered_pin = dict(pin)
    tampered_pin["id"] = "job-sec-forged"
    tampered_pin["geo_sig"] = valid_sig  # signature does NOT match job-sec-forged!

    ver = get_map_cache_version()
    base_key = get_map_cache_key_for_request(version=ver, search="Sec Job 1", limit=500, clustered=False)
    redis_client.set(base_key, json.dumps([tampered_pin]), ex=120)

    res = client.get("/api/v1/jobs/map?clustered=false&search=Sec%20Job%201")
    assert res.status_code == 200
    pins = res.json()
    assert len(pins) == 1
    assert pins[0]["id"] == "job-sec-1"
    assert pins[0]["id"] != "job-sec-forged"


def test_tamper_scenario_2_ordinary_pin_status_applied_bookmarked(client):
    """Scenario 2: Tampered status/applied/bookmarked on ordinary pin invalidates signature and forces DB rebuild."""
    from app.core.map_cache import compute_pin_signature
    invalidate_map_cache()
    try:
        redis_client.flushdb()
    except Exception:
        pass

    with SessionLocal() as db_session:
        emp = _ensure_cluster_emp(db_session)
        db_session.query(models.Job).filter_by(id="job-sec-2").delete()
        j2 = models.Job(
            id="job-sec-2",
            employerId=emp.id,
            title="Sec Job 2",
            company="Baito Co",
            description="Test Description",
            status=JobStatus.OPEN,
            coordinateX=41.31,
            coordinateY=69.24,
            location="Toshkent",
            neededWorkers="1",
        )
        db_session.add(j2)
        db_session.commit()

    pin = {
        "id": "job-sec-2",
        "title": "Sec Job 2",
        "company": "Baito Co",
        "coordinateX": 41.31,
        "coordinateY": 69.24,
        "status": "open",
        "applied": False,
        "bookmarked": False,
        "isCluster": False,
        "count": 1,
        "pinIds": ["job-sec-2"],
        "geo_verified": True,
    }
    sig = compute_pin_signature(pin)
    # Tamper status to 'closed' without re-signing
    tampered_pin = dict(pin)
    tampered_pin["status"] = "closed"
    tampered_pin["geo_sig"] = sig

    ver = get_map_cache_version()
    base_key = get_map_cache_key_for_request(version=ver, search="Sec Job 2", limit=500, clustered=False)
    redis_client.set(base_key, json.dumps([tampered_pin]), ex=120)

    res = client.get("/api/v1/jobs/map?clustered=false&search=Sec%20Job%202")
    assert res.status_code == 200
    pins = res.json()
    assert len(pins) == 1
    assert pins[0]["status"] == "open"  # restored authentically from DB


def test_tamper_scenario_3_ordinary_pin_coordinates(client):
    """Scenario 3: Tampered coordinates on ordinary pin rejected and restored from DB."""
    from app.core.map_cache import compute_pin_signature
    invalidate_map_cache()
    try:
        redis_client.flushdb()
    except Exception:
        pass

    with SessionLocal() as db_session:
        emp = _ensure_cluster_emp(db_session)
        db_session.query(models.Job).filter_by(id="job-sec-3").delete()
        j3 = models.Job(
            id="job-sec-3",
            employerId=emp.id,
            title="Sec Job 3",
            company="Baito Co",
            description="Test Description",
            status=JobStatus.OPEN,
            coordinateX=41.31,
            coordinateY=69.24,
            location="Toshkent",
            neededWorkers="1",
        )
        db_session.add(j3)
        db_session.commit()

    pin = {
        "id": "job-sec-3",
        "title": "Sec Job 3",
        "company": "Baito Co",
        "coordinateX": 41.31,
        "coordinateY": 69.24,
        "latitude": 41.31,
        "longitude": 69.24,
        "status": "open",
        "applied": False,
        "bookmarked": False,
        "isCluster": False,
        "count": 1,
        "pinIds": ["job-sec-3"],
        "geo_verified": True,
    }
    sig = compute_pin_signature(pin)
    tampered_pin = dict(pin)
    tampered_pin["coordinateX"] = 41.38
    tampered_pin["latitude"] = 41.38
    tampered_pin["geo_sig"] = sig

    ver = get_map_cache_version()
    base_key = get_map_cache_key_for_request(version=ver, search="Sec Job 3", limit=500, clustered=False)
    redis_client.set(base_key, json.dumps([tampered_pin]), ex=120)

    res = client.get("/api/v1/jobs/map?clustered=false&search=Sec%20Job%203")
    assert res.status_code == 200
    pins = res.json()
    assert len(pins) == 1
    assert abs(pins[0]["coordinateX"] - 41.31) < 1e-3


def test_tamper_scenario_4_missing_or_invalid_ordinary_pin_signature(client):
    """Scenario 4: Missing or invalid signature on ordinary pin is safely evicted and restored from DB."""
    invalidate_map_cache()
    try:
        redis_client.flushdb()
    except Exception:
        pass

    with SessionLocal() as db_session:
        emp = _ensure_cluster_emp(db_session)
        db_session.query(models.Job).filter_by(id="job-sec-4").delete()
        j4 = models.Job(
            id="job-sec-4",
            employerId=emp.id,
            title="Sec Job 4",
            company="Baito Co",
            description="Test Description",
            status=JobStatus.OPEN,
            coordinateX=41.31,
            coordinateY=69.24,
            location="Toshkent",
            neededWorkers="1",
        )
        db_session.add(j4)
        db_session.commit()

    pin = {
        "id": "job-sec-4",
        "title": "Sec Job 4",
        "company": "Baito Co",
        "coordinateX": 41.31,
        "coordinateY": 69.24,
        "latitude": 41.31,
        "longitude": 69.24,
        "status": "open",
        "applied": False,
        "bookmarked": False,
        "isCluster": False,
        "count": 1,
        "pinIds": ["job-sec-4"],
        "geo_verified": False,
        "geo_sig": None,
    }

    ver = get_map_cache_version()
    base_key = get_map_cache_key_for_request(version=ver, search="Sec Job 4", limit=500, clustered=False)
    redis_client.set(base_key, json.dumps([pin]), ex=120)

    res = client.get("/api/v1/jobs/map?clustered=false&search=Sec%20Job%204")
    assert res.status_code == 200
    pins = res.json()
    assert len(pins) == 1
    assert pins[0]["geo_verified"] is True
    assert len(pins[0]["geo_sig"]) == 64


def test_tamper_scenario_5_cluster_centroid_mismatch(client):
    """Scenario 5: Cluster centroid mismatch against actual DB members forces cache invalidation."""
    invalidate_map_cache()
    try:
        redis_client.flushdb()
    except Exception:
        pass

    with SessionLocal() as db_session:
        emp = _ensure_cluster_emp(db_session)
        db_session.query(models.Job).filter(models.Job.id.in_(["job-sec-5a", "job-sec-5b"])).delete()
        j5a = models.Job(
            id="job-sec-5a",
            employerId=emp.id,
            title="Sec Job 5a",
            company="Baito Co",
            description="Test Description",
            status=JobStatus.OPEN,
            coordinateX=41.31,
            coordinateY=69.24,
            location="Toshkent",
            neededWorkers="1",
        )
        j5b = models.Job(
            id="job-sec-5b",
            employerId=emp.id,
            title="Sec Job 5b",
            company="Baito Co",
            description="Test Description",
            status=JobStatus.OPEN,
            coordinateX=41.33,
            coordinateY=69.26,
            location="Toshkent",
            neededWorkers="1",
        )
        db_session.add_all([j5a, j5b])
        db_session.commit()

    # Actual DB centroid average is (41.32, 69.25). Put fake centroid (41.39, 69.35) in cache without valid signature
    bad_cluster = {
        "isCluster": True,
        "id": "c-tamper-centroid",
        "count": 2,
        "coordinateX": 41.39,
        "coordinateY": 69.35,
        "latitude": 41.39,
        "longitude": 69.35,
        "pinIds": ["job-sec-5a", "job-sec-5b"],
        "geo_verified": False,
        "geo_sig": None,
    }
    ver = get_map_cache_version()
    base_key = get_map_cache_key_for_request(version=ver, search="Sec Job 5", clustered=True)
    redis_client.set(base_key, json.dumps([bad_cluster]), ex=120)
    assert redis_client.get(base_key) is not None, "Injected cache must be present"

    with patch.object(redis_client, "get", wraps=redis_client.get) as spy_get:
        res = client.get("/api/v1/jobs/map?clustered=true&search=Sec%20Job%205")
        assert res.status_code == 200
        assert any(call.args and call.args[0] == base_key for call in spy_get.call_args_list), "Fast path must read injected key"

    clusters = res.json()
    assert len(clusters) == 1
    # Real average must be close to 41.32, NOT 41.39!
    assert abs(clusters[0]["coordinateX"] - 41.32) < 1e-2
    assert clusters[0]["geo_verified"] is True
    assert len(clusters[0]["geo_sig"]) == 64


def test_tamper_scenario_6_incorrect_cluster_count(client):
    """Scenario 6: Cluster count != len(pinIds) caught structurally and rejected."""
    invalidate_map_cache()
    try:
        redis_client.flushdb()
    except Exception:
        pass

    with SessionLocal() as db_session:
        emp = _ensure_cluster_emp(db_session)
        db_session.query(models.Job).filter(models.Job.id.in_(["job-sec-6a", "job-sec-6b"])).delete()
        j6a = models.Job(
            id="job-sec-6a",
            employerId=emp.id,
            title="Sec Job 6a",
            company="Baito Co",
            description="Test Description",
            status=JobStatus.OPEN,
            coordinateX=41.31,
            coordinateY=69.24,
            location="Toshkent",
            neededWorkers="1",
        )
        j6b = models.Job(
            id="job-sec-6b",
            employerId=emp.id,
            title="Sec Job 6b",
            company="Baito Co",
            description="Test Description",
            status=JobStatus.OPEN,
            coordinateX=41.31,
            coordinateY=69.24,
            location="Toshkent",
            neededWorkers="1",
        )
        db_session.add_all([j6a, j6b])
        db_session.commit()

    bad_cluster = {
        "isCluster": True,
        "id": "c-bad-count",
        "count": 5,  # claimed 5, but pinIds has 2!
        "coordinateX": 41.31,
        "coordinateY": 69.24,
        "pinIds": ["job-sec-6a", "job-sec-6b"],
    }
    ver = get_map_cache_version()
    base_key = get_map_cache_key_for_request(version=ver, search="Sec Job 6", clustered=True)
    redis_client.set(base_key, json.dumps([bad_cluster]), ex=120)
    assert redis_client.get(base_key) is not None, "Injected cache must be present"

    with patch.object(redis_client, "get", wraps=redis_client.get) as spy_get:
        res = client.get("/api/v1/jobs/map?clustered=true&search=Sec%20Job%206")
        assert res.status_code == 200
        assert any(call.args and call.args[0] == base_key for call in spy_get.call_args_list), "Fast path must read injected key"

    clusters = res.json()
    assert len(clusters) == 1
    assert clusters[0]["count"] == 2  # restored accurately from DB
    assert clusters[0]["geo_verified"] is True
    assert len(clusters[0]["geo_sig"]) == 64


def test_tamper_scenario_7_duplicate_pin_ids_within_cluster(client):
    """Scenario 7: Duplicate pinIds within single cluster caught structurally and rejected."""
    invalidate_map_cache()
    try:
        redis_client.flushdb()
    except Exception:
        pass

    with SessionLocal() as db_session:
        emp = _ensure_cluster_emp(db_session)
        db_session.query(models.Job).filter_by(id="job-sec-7").delete()
        j7 = models.Job(
            id="job-sec-7",
            employerId=emp.id,
            title="Sec Job 7",
            company="Baito Co",
            description="Test Description",
            status=JobStatus.OPEN,
            coordinateX=41.31,
            coordinateY=69.24,
            location="Toshkent",
            neededWorkers="1",
        )
        db_session.add(j7)
        db_session.commit()

    bad_cluster = {
        "isCluster": True,
        "id": "c-dup-internal",
        "count": 2,
        "coordinateX": 41.31,
        "coordinateY": 69.24,
        "pinIds": ["job-sec-7", "job-sec-7"],  # duplicate ID!
    }
    ver = get_map_cache_version()
    base_key = get_map_cache_key_for_request(version=ver, search="Sec Job 7", clustered=True)
    redis_client.set(base_key, json.dumps([bad_cluster]), ex=120)
    assert redis_client.get(base_key) is not None, "Injected cache must be present"

    with patch.object(redis_client, "get", wraps=redis_client.get) as spy_get:
        res = client.get("/api/v1/jobs/map?clustered=true&search=Sec%20Job%207")
        assert res.status_code == 200
        assert any(call.args and call.args[0] == base_key for call in spy_get.call_args_list), "Fast path must read injected key"

    clusters = res.json()
    assert len(clusters) == 1
    assert clusters[0]["pinIds"] == ["job-sec-7"]
    assert clusters[0]["count"] == 1
    assert clusters[0]["geo_verified"] is True
    assert len(clusters[0]["geo_sig"]) == 64


def test_tamper_scenario_8_cross_cluster_member_duplication(client):
    """Scenario 8: Member repeated across multiple clusters in payload caught and rejected."""
    invalidate_map_cache()
    try:
        redis_client.flushdb()
    except Exception:
        pass

    with SessionLocal() as db_session:
        emp = _ensure_cluster_emp(db_session)
        db_session.query(models.Job).filter(models.Job.id.in_(["job-sec-8a", "job-sec-8b", "job-sec-8c"])).delete()
        for jid, lat, lng in [("job-sec-8a", 41.31, 69.24), ("job-sec-8b", 41.31, 69.24), ("job-sec-8c", 39.65, 66.96)]:
            db_session.add(models.Job(
                id=jid,
                employerId=emp.id,
                title="Sec Job 8",
                company="Baito Co",
                description="Test Description",
                status=JobStatus.OPEN,
                coordinateX=lat,
                coordinateY=lng,
                location="Uzbekistan",
                neededWorkers="1",
            ))
        db_session.commit()

    bad_c1 = {
        "isCluster": True,
        "id": "c8-1",
        "count": 2,
        "coordinateX": 41.31,
        "coordinateY": 69.24,
        "pinIds": ["job-sec-8a", "job-sec-8b"],
    }
    bad_c2 = {
        "isCluster": True,
        "id": "c8-2",
        "count": 2,
        "coordinateX": 39.65,
        "coordinateY": 66.96,
        "pinIds": ["job-sec-8b", "job-sec-8c"],  # job-sec-8b duplicated in cluster 2!
    }
    ver = get_map_cache_version()
    base_key = get_map_cache_key_for_request(version=ver, search="Sec Job 8", clustered=True)
    redis_client.set(base_key, json.dumps([bad_c1, bad_c2]), ex=120)
    assert redis_client.get(base_key) is not None, "Injected cache must be present"

    with patch.object(redis_client, "get", wraps=redis_client.get) as spy_get:
        res = client.get("/api/v1/jobs/map?clustered=true&search=Sec%20Job%208")
        assert res.status_code == 200
        assert any(call.args and call.args[0] == base_key for call in spy_get.call_args_list), "Fast path must read injected key"

    clusters = res.json()
    all_pids = [pid for c in clusters for pid in (c.get("pinIds") or [c.get("id")])]
    assert len(all_pids) == len(set(all_pids)), "No member ID may appear in multiple clusters"


def test_tamper_scenario_9_deleted_member_in_db(client):
    """Scenario 9: Unverified cluster with member missing in DB is evicted."""
    invalidate_map_cache()
    try:
        redis_client.flushdb()
    except Exception:
        pass

    with SessionLocal() as db_session:
        emp = _ensure_cluster_emp(db_session)
        db_session.query(models.Job).filter(models.Job.id.in_(["job-sec-9-valid", "job-sec-9-ghost"])).delete()
        db_session.add(models.Job(
            id="job-sec-9-valid",
            employerId=emp.id,
            title="Sec Job 9",
            company="Baito Co",
            description="Test Description",
            status=JobStatus.OPEN,
            coordinateX=41.31,
            coordinateY=69.24,
            location="Toshkent",
            neededWorkers="1",
        ))
        db_session.commit()

    bad_cluster = {
        "isCluster": True,
        "id": "c-ghost",
        "count": 2,
        "coordinateX": 41.31,
        "coordinateY": 69.24,
        "pinIds": ["job-sec-9-valid", "job-sec-9-ghost"],  # job-sec-9-ghost does not exist in DB
    }
    ver = get_map_cache_version()
    base_key = get_map_cache_key_for_request(version=ver, search="Sec Job 9", clustered=True)
    redis_client.set(base_key, json.dumps([bad_cluster]), ex=120)
    assert redis_client.get(base_key) is not None, "Injected cache must be present"

    with patch.object(redis_client, "get", wraps=redis_client.get) as spy_get:
        res = client.get("/api/v1/jobs/map?clustered=true&search=Sec%20Job%209")
        assert res.status_code == 200
        assert any(call.args and call.args[0] == base_key for call in spy_get.call_args_list), "Fast path must read injected key"

    data = res.json()
    for item in data:
        assert "job-sec-9-ghost" not in (item.get("pinIds") or [item.get("id")])


def test_tamper_scenario_10_foreign_coordinate_member_in_db(client):
    """Scenario 10: Unverified cluster containing member located in Shymkent is evicted."""
    invalidate_map_cache()
    try:
        redis_client.flushdb()
    except Exception:
        pass

    with SessionLocal() as db_session:
        emp = _ensure_cluster_emp(db_session)
        db_session.query(models.Job).filter(models.Job.id.in_(["job-sec-10-valid", "job-sec-10-shymkent"])).delete()
        db_session.add_all([
            models.Job(
                id="job-sec-10-valid",
                employerId=emp.id,
                title="Sec Job 10",
                company="Baito Co",
                description="Test Description",
                status=JobStatus.OPEN,
                coordinateX=41.31,
                coordinateY=69.24,
                location="Toshkent",
                neededWorkers="1",
            ),
            models.Job(
                id="job-sec-10-shymkent",
                employerId=emp.id,
                title="Sec Job 10 Shymkent",
                company="Baito Co",
                description="Test Description",
                status=JobStatus.OPEN,
                coordinateX=42.3417,
                coordinateY=69.5901,
                location="Shymkent",
                neededWorkers="1",
            )
        ])
        db_session.commit()

    bad_cluster = {
        "isCluster": True,
        "id": "c-foreign-member",
        "count": 2,
        "coordinateX": 41.31,
        "coordinateY": 69.24,
        "pinIds": ["job-sec-10-valid", "job-sec-10-shymkent"],
    }
    ver = get_map_cache_version()
    base_key = get_map_cache_key_for_request(version=ver, search="Sec Job 10", clustered=True)
    redis_client.set(base_key, json.dumps([bad_cluster]), ex=120)
    assert redis_client.get(base_key) is not None, "Injected cache must be present"

    with patch.object(redis_client, "get", wraps=redis_client.get) as spy_get:
        res = client.get("/api/v1/jobs/map?clustered=true&search=Sec%20Job%2010")
        assert res.status_code == 200
        assert any(call.args and call.args[0] == base_key for call in spy_get.call_args_list), "Fast path must read injected key"

    data = res.json()
    for item in data:
        assert "job-sec-10-shymkent" not in (item.get("pinIds") or [item.get("id")])


def test_tamper_scenario_11_ineligible_status_member_in_db(client):
    """Scenario 11: Unverified cluster containing cancelled/closed job member is evicted."""
    invalidate_map_cache()
    try:
        redis_client.flushdb()
    except Exception:
        pass

    with SessionLocal() as db_session:
        emp = _ensure_cluster_emp(db_session)
        db_session.query(models.Job).filter(models.Job.id.in_(["job-sec-11-valid", "job-sec-11-cancelled"])).delete()
        db_session.add_all([
            models.Job(
                id="job-sec-11-valid",
                employerId=emp.id,
                title="Sec Job 11",
                company="Baito Co",
                description="Test Description",
                status=JobStatus.OPEN,
                coordinateX=41.31,
                coordinateY=69.24,
                location="Toshkent",
                neededWorkers="1",
            ),
            models.Job(
                id="job-sec-11-cancelled",
                employerId=emp.id,
                title="Sec Job 11 Cancelled",
                company="Baito Co",
                description="Test Description",
                status=JobStatus.CANCELLED,
                coordinateX=41.31,
                coordinateY=69.24,
                location="Toshkent",
                neededWorkers="1",
            )
        ])
        db_session.commit()

    bad_cluster = {
        "isCluster": True,
        "id": "c-cancelled-member",
        "count": 2,
        "coordinateX": 41.31,
        "coordinateY": 69.24,
        "pinIds": ["job-sec-11-valid", "job-sec-11-cancelled"],
    }
    ver = get_map_cache_version()
    base_key = get_map_cache_key_for_request(version=ver, search="Sec Job 11", clustered=True)
    redis_client.set(base_key, json.dumps([bad_cluster]), ex=120)
    assert redis_client.get(base_key) is not None, "Injected cache must be present"

    with patch.object(redis_client, "get", wraps=redis_client.get) as spy_get:
        res = client.get("/api/v1/jobs/map?clustered=true&search=Sec%20Job%2011")
        assert res.status_code == 200
        assert any(call.args and call.args[0] == base_key for call in spy_get.call_args_list), "Fast path must read injected key"

    data = res.json()
    for item in data:
        assert "job-sec-11-cancelled" not in (item.get("pinIds") or [item.get("id")])
    assert res.status_code == 200
    data = res.json()
    for item in data:
        assert "job-sec-11-cancelled" not in (item.get("pinIds") or [item.get("id")])


def test_tamper_scenario_12_malformed_cached_json_or_invalid_shapes(client):
    """Scenario 12: Corrupted non-JSON string, non-list, or non-dict shapes handled safely without 500 error."""
    invalidate_map_cache()
    try:
        redis_client.flushdb()
    except Exception:
        pass

    with SessionLocal() as db_session:
        emp = _ensure_cluster_emp(db_session)
        db_session.query(models.Job).filter_by(id="job-sec-12").delete()
        db_session.add(models.Job(
            id="job-sec-12",
            employerId=emp.id,
            title="Sec Job 12",
            company="Baito Co",
            description="Test Description",
            status=JobStatus.OPEN,
            coordinateX=41.31,
            coordinateY=69.24,
            location="Toshkent",
            neededWorkers="1",
        ))
        db_session.commit()

    ver = get_map_cache_version()
    base_key = build_map_pins_cache_key(version=ver, search="Sec Job 12", limit=500)

    # 1. Non-JSON corrupt string
    redis_client.set(base_key, "MALFORMED_GARBAGE_NOT_JSON", ex=120)
    res1 = client.get("/api/v1/jobs/map?clustered=false&search=Sec%20Job%2012")
    assert res1.status_code == 200
    assert len(res1.json()) == 1

    # 2. JSON dict instead of list
    redis_client.set(base_key, json.dumps({"not": "a list"}), ex=120)
    res2 = client.get("/api/v1/jobs/map?clustered=false&search=Sec%20Job%2012")
    assert res2.status_code == 200
    assert len(res2.json()) == 1

    # 3. List of non-dict items
    redis_client.set(base_key, json.dumps([123, "not_dict", None]), ex=120)
    res3 = client.get("/api/v1/jobs/map?clustered=false&search=Sec%20Job%2012")
    assert res3.status_code == 200
    assert len(res3.json()) == 1


def test_personal_active_shifts_partitioned_from_open_clusters(client):
    """Scenario 13: Personal active shifts (in_progress, completed) remain distinct pins preserving true title and status."""
    invalidate_map_cache()
    try:
        redis_client.flushdb()
    except Exception:
        pass

    worker = make_user(role="worker", phone="+998905554433", name="Shift Worker")

    with SessionLocal() as db_session:
        emp = _ensure_cluster_emp(db_session)
        db_session.query(models.Job).filter(models.Job.id.in_(["job-active-shift", "job-open-v1", "job-open-v2"])).delete()
        j_shift = models.Job(
            id="job-active-shift",
            employerId=emp.id,
            title="Partition Active Shift",
            company="Baito Co",
            description="Test Description",
            status=JobStatus.IN_PROGRESS,
            coordinateX=41.31,
            coordinateY=69.24,
            location="Toshkent",
            neededWorkers="1",
        )
        j_open1 = models.Job(
            id="job-open-v1",
            employerId=emp.id,
            title="Partition Open Vacancy 1",
            company="Baito Co",
            description="Test Description",
            status=JobStatus.OPEN,
            coordinateX=41.311,
            coordinateY=69.241,
            location="Toshkent",
            neededWorkers="1",
        )
        j_open2 = models.Job(
            id="job-open-v2",
            employerId=emp.id,
            title="Partition Open Vacancy 2",
            company="Baito Co",
            description="Test Description",
            status=JobStatus.OPEN,
            coordinateX=41.312,
            coordinateY=69.242,
            location="Toshkent",
            neededWorkers="1",
        )
        db_session.add_all([j_shift, j_open1, j_open2])
        db_session.commit()

        # Worker applied to j_shift
        db_session.query(models.Application).filter_by(jobId="job-active-shift", workerId=worker.id).delete()
        db_session.add(models.Application(
            id="app-shift-1",
            jobId="job-active-shift",
            workerId=worker.id,
            status="in_progress",
        ))
        db_session.commit()

    login(client, worker)
    res = client.get("/api/v1/jobs/map?clustered=true&search=Partition")
    assert res.status_code == 200
    pins = res.json()

    # Find the active shift pin
    active_shift_pins = [p for p in pins if p["id"] == "job-active-shift"]
    assert len(active_shift_pins) == 1, "Personal active shift must be present"
    active_pin = active_shift_pins[0]
    assert active_pin["isCluster"] is False, "Active shift must remain a distinct unclustered pin"
    assert active_pin["status"] == "in_progress", "Active shift status must be preserved"
    assert active_pin["title"] == "Partition Active Shift", "Active shift title must NOT be overwritten by cluster title"
    assert active_pin["applied"] is True

    # Find the open vacancy cluster
    open_clusters = [p for p in pins if p.get("isCluster")]
    assert len(open_clusters) == 1
    assert open_clusters[0]["count"] == 2
    assert "job-active-shift" not in open_clusters[0]["pinIds"]


def test_worker_a_private_shifts_never_visible_to_worker_b_or_public(client):
    """Scenario 14: Worker A's active shift is never leaked to public visitors or Worker B."""
    invalidate_map_cache()
    try:
        redis_client.flushdb()
    except Exception:
        pass

    worker_a = make_user(role="worker", phone="+998906667788", name="Worker A")
    worker_b = make_user(role="worker", phone="+998907778899", name="Worker B")

    with SessionLocal() as db_session:
        emp = _ensure_cluster_emp(db_session)
        db_session.query(models.Job).filter(models.Job.id.in_(["job-private-a", "job-public-iso"])).delete()
        j_priv = models.Job(
            id="job-private-a",
            employerId=emp.id,
            title="Iso Test Private Shift",
            company="Baito Co",
            description="Test Description",
            status=JobStatus.IN_PROGRESS,
            coordinateX=41.31,
            coordinateY=69.24,
            location="Toshkent",
            neededWorkers="1",
        )
        j_pub = models.Job(
            id="job-public-iso",
            employerId=emp.id,
            title="Iso Test Public Job",
            company="Baito Co",
            description="Test Description",
            status=JobStatus.OPEN,
            coordinateX=41.31,
            coordinateY=69.24,
            location="Toshkent",
            neededWorkers="1",
        )
        db_session.add_all([j_priv, j_pub])
        db_session.commit()

        # Worker A applied
        db_session.query(models.Application).filter_by(jobId="job-private-a").delete()
        db_session.add(models.Application(
            id="app-priv-a",
            jobId="job-private-a",
            workerId=worker_a.id,
            status="in_progress",
        ))
        db_session.commit()

    # 1. Anonymous visitor hits map
    anon_client = TestClient(app)
    res_anon = anon_client.get("/api/v1/jobs/map?clustered=false&search=Iso%20Test")
    assert res_anon.status_code == 200
    anon_ids = {p["id"] for p in res_anon.json()}
    assert "job-private-a" not in anon_ids
    assert "job-public-iso" in anon_ids

    # 2. Worker B logs in and hits map
    client_b = TestClient(app)
    login(client_b, worker_b)
    res_b = client_b.get("/api/v1/jobs/map?clustered=false&search=Iso%20Test")
    assert res_b.status_code == 200
    b_ids = {p["id"] for p in res_b.json()}
    assert "job-private-a" not in b_ids
    assert "job-public-iso" in b_ids

    # 3. Worker A logs in and hits map
    client_a = TestClient(app)
    login(client_a, worker_a)
    res_a = client_a.get("/api/v1/jobs/map?clustered=false&search=Iso%20Test")
    assert res_a.status_code == 200
    a_ids = {p["id"] for p in res_a.json()}
    assert "job-private-a" in a_ids
    assert "job-public-iso" in a_ids


def test_clean_cache_hit_preserves_zero_db_queries_on_non_empty_dataset(client):
    """Scenario 15: Clean cache hit executes 0 database queries on non-empty dataset."""
    from unittest.mock import patch
    invalidate_map_cache()
    try:
        redis_client.flushdb()
    except Exception:
        pass

    with SessionLocal() as db_session:
        emp = _ensure_cluster_emp(db_session)
        db_session.query(models.Job).filter_by(id="job-sec-15").delete()
        db_session.add(models.Job(
            id="job-sec-15",
            employerId=emp.id,
            title="Clean Cache Hit Job",
            company="Baito Co",
            description="Test Description",
            status=JobStatus.OPEN,
            coordinateX=41.31,
            coordinateY=69.24,
            location="Toshkent",
            neededWorkers="1",
        ))
        db_session.commit()

    # Request 1: Cold DB Path populates Redis with signed authentic payload
    res1 = client.get("/api/v1/jobs/map?clustered=true&search=Clean%20Cache%20Hit%20Job")
    assert res1.status_code == 200
    assert len(res1.json()) == 1

    # Request 2: Clean Fast Path hit. Intercept engine cursor execution to prove 0 SQL statements are executed
    with capture_sql_queries() as sql_queries:
        res2 = client.get("/api/v1/jobs/map?clustered=true&search=Clean%20Cache%20Hit%20Job")
        assert res2.status_code == 200
        assert len(res2.json()) == 1
        assert len(sql_queries) == 0, f"Clean cache hit must execute 0 SQL queries, executed: {sql_queries}"


def test_tamper_display_fields_with_valid_original_signature(client):
    """Tampered display fields with an otherwise valid original signature must fail verification, evict cache, and rebuild from DB."""
    from app.core.map_cache import compute_pin_signature
    invalidate_map_cache()
    try:
        redis_client.flushdb()
    except Exception:
        pass

    with SessionLocal() as db_session:
        emp = _ensure_cluster_emp(db_session)
        db_session.query(models.Job).filter_by(id="job-disp-tamper").delete()
        db_session.add(models.Job(
            id="job-disp-tamper",
            employerId=emp.id,
            title="Halol Oshpaz",
            company="Chayxona N1",
            salary=3500000,
            location="Toshkent",
            tags=["oshxona", "milliy"],
            description="Test Description",
            status=JobStatus.OPEN,
            coordinateX=41.31,
            coordinateY=69.24,
            neededWorkers="1",
        ))
        db_session.commit()

    # Create authentic pin and sign it
    original_pin = {
        "id": "job-disp-tamper",
        "title": "Halol Oshpaz",
        "company": "Chayxona N1",
        "salary": 3500000,
        "salaryCurrency": "UZS",
        "location": "Toshkent",
        "rawLocation": "Toshkent",
        "logoUrl": None,
        "imageUrl": None,
        "tags": ["oshxona", "milliy"],
        "category": "Barchasi",
        "workDate": "",
        "workTime": "",
        "neededWorkers": "1",
        "coordinateX": 41.31,
        "coordinateY": 69.24,
        "latitude": 41.31,
        "longitude": 69.24,
        "urgent": False,
        "status": "open",
        "applied": False,
        "bookmarked": False,
        "hiredCount": 0,
        "vacancies": 1,
        "isCluster": False,
        "count": 1,
        "pinIds": ["job-disp-tamper"],
        "geo_verified": True,
    }
    valid_sig = compute_pin_signature(original_pin)

    # Attacker tampers title and salary while leaving valid_sig unchanged
    tampered_pin = dict(original_pin)
    tampered_pin["title"] = "Scam Hacker Title"
    tampered_pin["salary"] = 999999999
    tampered_pin["geo_sig"] = valid_sig

    ver = get_map_cache_version()
    base_key = get_map_cache_key_for_request(version=ver, search="Oshpaz", clustered=False)
    redis_client.set(base_key, json.dumps([tampered_pin]), ex=120)

    res = client.get("/api/v1/jobs/map?clustered=false&search=Oshpaz")
    assert res.status_code == 200
    pins = res.json()
    assert len(pins) == 1
    assert pins[0]["title"] == "Halol Oshpaz", "Must restore authentic title from DB"
    assert pins[0]["salary"] == 3500000, "Must restore authentic salary from DB"
    assert pins[0]["title"] != "Scam Hacker Title"
    assert pins[0]["geo_verified"] is True
    assert len(pins[0]["geo_sig"]) == 64


def test_tamper_cluster_status_applied_bookmarked_invalid_sig(client):
    """An invalid-signature cluster whose status, applied, or bookmarked values were changed must be rejected and rebuilt."""
    invalidate_map_cache()
    try:
        redis_client.flushdb()
    except Exception:
        pass

    with SessionLocal() as db_session:
        emp = _ensure_cluster_emp(db_session)
        db_session.query(models.Job).filter(models.Job.id.in_(["job-cstat-1", "job-cstat-2"])).delete()
        for jid in ["job-cstat-1", "job-cstat-2"]:
            db_session.add(models.Job(
                id=jid,
                employerId=emp.id,
                title="Cluster Status Vacancy",
                company="Baito Co",
                description="Test Description",
                status=JobStatus.OPEN,
                coordinateX=41.31,
                coordinateY=69.24,
                location="Toshkent",
                neededWorkers="1",
            ))
        db_session.commit()

    tampered_cluster = {
        "isCluster": True,
        "id": "c-status-tamper",
        "count": 2,
        "coordinateX": 41.31,
        "coordinateY": 69.24,
        "latitude": 41.31,
        "longitude": 69.24,
        "pinIds": ["job-cstat-1", "job-cstat-2"],
        "status": "in_progress",  # tampered status
        "applied": True,          # tampered applied flag
        "bookmarked": True,       # tampered bookmark flag
        "geo_verified": True,
        "geo_sig": "invalid_sig_00000000000000000000000000000000000000000000000000000000",
    }
    ver = get_map_cache_version()
    base_key = get_map_cache_key_for_request(version=ver, search="Cluster Status", clustered=True)
    redis_client.set(base_key, json.dumps([tampered_cluster]), ex=120)

    res = client.get("/api/v1/jobs/map?clustered=true&search=Cluster%20Status")
    assert res.status_code == 200
    clusters = res.json()
    assert len(clusters) == 1
    assert clusters[0]["status"] == "open", "Must restore open status from DB"
    assert clusters[0]["applied"] is False, "Anonymous visitor must have applied=False"
    assert clusters[0]["bookmarked"] is False
    assert clusters[0]["geo_verified"] is True
    assert len(clusters[0]["geo_sig"]) == 64


def test_ordinary_pins_duplicated_by_membership_in_cluster(client):
    """Ordinary pin duplicated by membership in a cluster must be caught structurally and rejected."""
    invalidate_map_cache()
    try:
        redis_client.flushdb()
    except Exception:
        pass

    with SessionLocal() as db_session:
        emp = _ensure_cluster_emp(db_session)
        db_session.query(models.Job).filter(models.Job.id.in_(["job-dup-pin-1", "job-dup-pin-2"])).delete()
        for jid in ["job-dup-pin-1", "job-dup-pin-2"]:
            db_session.add(models.Job(
                id=jid,
                employerId=emp.id,
                title="Dup Test Job",
                company="Baito Co",
                description="Test Description",
                status=JobStatus.OPEN,
                coordinateX=41.31,
                coordinateY=69.24,
                location="Toshkent",
                neededWorkers="1",
            ))
        db_session.commit()

    cluster_item = {
        "isCluster": True,
        "id": "c-dup-mem",
        "count": 2,
        "coordinateX": 41.31,
        "coordinateY": 69.24,
        "latitude": 41.31,
        "longitude": 69.24,
        "pinIds": ["job-dup-pin-1", "job-dup-pin-2"],
        "geo_verified": False,
        "geo_sig": None,
    }
    ordinary_item = {
        "isCluster": False,
        "id": "job-dup-pin-1",  # duplicate of cluster member!
        "title": "Dup Test Job",
        "coordinateX": 41.31,
        "coordinateY": 69.24,
        "latitude": 41.31,
        "longitude": 69.24,
        "status": "open",
        "geo_verified": False,
        "geo_sig": None,
    }
    ver = get_map_cache_version()
    base_key = get_map_cache_key_for_request(version=ver, search="Dup Test", clustered=True)
    redis_client.set(base_key, json.dumps([cluster_item, ordinary_item]), ex=120)

    res = client.get("/api/v1/jobs/map?clustered=true&search=Dup%20Test")
    assert res.status_code == 200
    pins = res.json()
    all_pids = [pid for p in pins for pid in (p.get("pinIds") or [p.get("id")])]
    assert len(all_pids) == len(set(all_pids)), "No member ID may be duplicated between cluster and ordinary pin"


def test_cluster_members_fail_endpoint_query_filters_excluded_on_rebuild(client):
    """Cluster members that are valid open jobs but fail query filters are excluded upon cold DB rebuild."""
    invalidate_map_cache()
    try:
        redis_client.flushdb()
    except Exception:
        pass

    with SessionLocal() as db_session:
        emp = _ensure_cluster_emp(db_session)
        db_session.query(models.Job).filter(models.Job.id.in_(["job-match-barista", "job-unmatch-dev"])).delete()
        db_session.add_all([
            models.Job(
                id="job-match-barista",
                employerId=emp.id,
                title="Barista Coffee Master",
                company="Coffee Co",
                description="Test Description",
                status=JobStatus.OPEN,
                coordinateX=41.31,
                coordinateY=69.24,
                location="Toshkent",
                neededWorkers="1",
            ),
            models.Job(
                id="job-unmatch-dev",
                employerId=emp.id,
                title="Python Developer",
                company="Tech Co",
                description="Test Description",
                status=JobStatus.OPEN,
                coordinateX=41.31,
                coordinateY=69.24,
                location="Toshkent",
                neededWorkers="1",
            )
        ])
        db_session.commit()

    # Unverified cluster claims to contain both
    bad_cluster = {
        "isCluster": True,
        "id": "c-unmatched-filter",
        "count": 2,
        "coordinateX": 41.31,
        "coordinateY": 69.24,
        "pinIds": ["job-match-barista", "job-unmatch-dev"],
        "geo_verified": False,
        "geo_sig": None,
    }
    ver = get_map_cache_version()
    base_key = get_map_cache_key_for_request(version=ver, search="Barista", clustered=True)
    redis_client.set(base_key, json.dumps([bad_cluster]), ex=120)

    res = client.get("/api/v1/jobs/map?clustered=true&search=Barista")
    assert res.status_code == 200
    clusters = res.json()
    assert len(clusters) == 1
    returned_pids = [pid for c in clusters for pid in (c.get("pinIds") or [c.get("id")])]
    assert "job-match-barista" in returned_pids
    assert "job-unmatch-dev" not in returned_pids, "Unmatched query member must be excluded on DB rebuild"


def test_invalid_signature_valid_id_tampered_descriptive_fields(client):
    """Invalid signature plus valid ID with tampered descriptive fields must be evicted and restored from DB."""
    invalidate_map_cache()
    try:
        redis_client.flushdb()
    except Exception:
        pass

    with SessionLocal() as db_session:
        emp = _ensure_cluster_emp(db_session)
        db_session.query(models.Job).filter_by(id="job-desc-tamper-1").delete()
        db_session.add(models.Job(
            id="job-desc-tamper-1",
            employerId=emp.id,
            title="Real DB Job Title",
            company="Real Company",
            salary=2000000,
            location="Toshkent",
            description="Test Description",
            status=JobStatus.OPEN,
            coordinateX=41.31,
            coordinateY=69.24,
            neededWorkers="1",
        ))
        db_session.commit()

    tampered_pin = {
        "id": "job-desc-tamper-1",
        "title": "Hacked Title With Valid ID",
        "company": "Fake Company",
        "salary": 999999999,
        "coordinateX": 41.31,
        "coordinateY": 69.24,
        "latitude": 41.31,
        "longitude": 69.24,
        "status": "open",
        "applied": False,
        "bookmarked": False,
        "isCluster": False,
        "count": 1,
        "pinIds": ["job-desc-tamper-1"],
        "geo_verified": True,
        "geo_sig": "invalid_signature_hex_00000000000000000000000000000000000000000000000",
    }
    ver = get_map_cache_version()
    base_key = get_map_cache_key_for_request(version=ver, search="Real DB Job", clustered=False)
    redis_client.set(base_key, json.dumps([tampered_pin]), ex=120)

    res = client.get("/api/v1/jobs/map?clustered=false&search=Real%20DB%20Job")
    assert res.status_code == 200
    pins = res.json()
    assert len(pins) == 1
    assert pins[0]["title"] == "Real DB Job Title"
    assert pins[0]["company"] == "Real Company"
    assert pins[0]["salary"] == 2000000
    assert pins[0]["geo_verified"] is True
    assert len(pins[0]["geo_sig"]) == 64


def test_no_id_or_blank_id_or_null_id_ordinary_pin_anonymous_and_authenticated(client):
    """In-boundary ordinary pin with missing, null, blank ID or wrong type fails closed in both anon and auth paths."""
    invalidate_map_cache()
    try:
        redis_client.flushdb()
    except Exception:
        pass

    with SessionLocal() as db_session:
        emp = _ensure_cluster_emp(db_session)
        db_session.query(models.Job).filter_by(id="job-noid-legit").delete()
        db_session.add(models.Job(
            id="job-noid-legit",
            employerId=emp.id,
            title="Legit No-ID Test Job",
            company="Baito Co",
            description="Test Description",
            status=JobStatus.OPEN,
            coordinateX=41.31,
            coordinateY=69.24,
            location="Toshkent",
            neededWorkers="1",
        ))
        db_session.commit()

    ver = get_map_cache_version()

    # 1. Anonymous path: Missing / blank / null / int IDs
    bad_pins_anon = [
        {"coordinateX": 41.31, "coordinateY": 69.24, "latitude": 41.31, "longitude": 69.24, "status": "open", "geo_verified": True},  # missing ID
        {"id": None, "coordinateX": 41.31, "coordinateY": 69.24, "status": "open", "geo_verified": True},  # null ID
        {"id": "   ", "coordinateX": 41.31, "coordinateY": 69.24, "status": "open", "geo_verified": True},  # blank whitespace ID
        {"id": 12345, "coordinateX": 41.31, "coordinateY": 69.24, "status": "open", "geo_verified": True},  # wrong object type (int)
    ]
    for bad_pin in bad_pins_anon:
        base_key = get_map_cache_key_for_request(version=ver, search="Legit No-ID", clustered=False)
        redis_client.set(base_key, json.dumps([bad_pin]), ex=120)

        res = client.get("/api/v1/jobs/map?clustered=false&search=Legit%20No-ID")
        assert res.status_code == 200
        pins = res.json()
        assert len(pins) == 1
        assert pins[0]["id"] == "job-noid-legit"

    # 2. Authenticated path: Base cache with missing ID
    user = make_user(role="worker", phone="+998901112244", name="Auth NoID User")
    login(client, user)
    base_key = get_map_cache_key_for_request(version=ver, search="Legit No-ID", clustered=False)
    redis_client.set(base_key, json.dumps([{"id": "", "coordinateX": 41.31, "coordinateY": 69.24, "status": "open", "geo_verified": True}]), ex=120)

    res_auth = client.get("/api/v1/jobs/map?clustered=false&search=Legit%20No-ID")
    assert res_auth.status_code == 200
    pins_auth = res_auth.json()
    assert len(pins_auth) == 1
    assert pins_auth[0]["id"] == "job-noid-legit"


def test_malformed_cached_structures_effective_and_base_cache(client):
    """Malformed cached structures in both effective and base caches must rebuild cleanly without 500 errors."""
    invalidate_map_cache()
    try:
        redis_client.flushdb()
    except Exception:
        pass

    with SessionLocal() as db_session:
        emp = _ensure_cluster_emp(db_session)
        db_session.query(models.Job).filter_by(id="job-malform-1").delete()
        db_session.add(models.Job(
            id="job-malform-1",
            employerId=emp.id,
            title="Malformed Cache Job",
            company="Baito Co",
            description="Test Description",
            status=JobStatus.OPEN,
            coordinateX=41.31,
            coordinateY=69.24,
            location="Toshkent",
            neededWorkers="1",
        ))
        db_session.commit()

    ver = get_map_cache_version()
    base_key = get_map_cache_key_for_request(version=ver, search="Malformed Cache", clustered=False)

    # Effective cache: non-JSON corrupt string
    redis_client.set(base_key, "NOT_VALID_JSON_AT_ALL!!!", ex=120)
    res1 = client.get("/api/v1/jobs/map?clustered=false&search=Malformed%20Cache")
    assert res1.status_code == 200
    assert len(res1.json()) == 1

    # Effective cache: dict instead of list
    redis_client.set(base_key, json.dumps({"error": "some object"}), ex=120)
    res2 = client.get("/api/v1/jobs/map?clustered=false&search=Malformed%20Cache")
    assert res2.status_code == 200
    assert len(res2.json()) == 1

    # Base cache for authenticated user: corrupt JSON
    user = make_user(role="worker", phone="+998902223355", name="Auth Malform User")
    login(client, user)
    redis_client.set(base_key, "MALFORMED_BASE_JSON", ex=120)
    res3 = client.get("/api/v1/jobs/map?clustered=false&search=Malformed%20Cache")
    assert res3.status_code == 200
    assert len(res3.json()) == 1


def test_clean_authenticated_and_anonymous_cache_hits_zero_db_queries(client):
    """Clean valid signed cache hits retain 0 DB queries for both anonymous and authenticated visitors."""
    invalidate_map_cache()
    try:
        redis_client.flushdb()
    except Exception:
        pass

    with SessionLocal() as db_session:
        emp = _ensure_cluster_emp(db_session)
        db_session.query(models.Job).filter_by(id="job-zero-db").delete()
        db_session.add(models.Job(
            id="job-zero-db",
            employerId=emp.id,
            title="Zero DB Hit Job",
            company="Baito Co",
            description="Test Description",
            status=JobStatus.OPEN,
            coordinateX=41.31,
            coordinateY=69.24,
            location="Toshkent",
            neededWorkers="1",
        ))
        db_session.commit()

    # 1. Anonymous: Prime cache on Request 1
    anon_client = TestClient(app)
    res1 = anon_client.get("/api/v1/jobs/map?clustered=false&search=Zero%20DB")
    assert res1.status_code == 200
    assert len(res1.json()) == 1

    # Request 2 (Anonymous): Fast Path clean hit -> 0 SQL statements
    with capture_sql_queries() as anon_queries:
        res2 = anon_client.get("/api/v1/jobs/map?clustered=false&search=Zero%20DB")
        assert res2.status_code == 200
        assert len(res2.json()) == 1
        assert len(anon_queries) == 0, f"Anonymous clean cache hit must execute 0 SQL queries, executed: {anon_queries}"

    # 2. Authenticated: Prime effective cache on Request 1
    user = make_user(role="worker", phone="+998903334466", name="Zero DB Worker")
    auth_client = TestClient(app)
    login(auth_client, user)

    res3 = auth_client.get("/api/v1/jobs/map?clustered=false&search=Zero%20DB")
    assert res3.status_code == 200
    assert len(res3.json()) == 1

    # Request 2 (Authenticated): Fast Path clean hit -> exactly 2 auth queries (active_sessions & user check via deps.get_current_user_optional), 0 map/job queries
    with capture_sql_queries() as auth_queries:
        res4 = auth_client.get("/api/v1/jobs/map?clustered=false&search=Zero%20DB")
        assert res4.status_code == 200
        assert len(res4.json()) == 1
        assert len(auth_queries) == 2, f"Authenticated clean cache hit must execute exactly 2 auth queries, executed: {auth_queries}"
        assert not any("from jobs" in q.lower() or "from applications" in q.lower() or "from bookmarks" in q.lower() for q in auth_queries), "Must not execute any map domain queries"


def test_route_tamper_replace_populated_cache_with_raw_empty_list(client):
    """Replacing populated cache in Redis with raw [] must fail envelope verification, evict cache, and rebuild from DB."""
    invalidate_map_cache()
    try:
        redis_client.flushdb()
    except Exception:
        pass

    with SessionLocal() as db_session:
        emp = _ensure_cluster_emp(db_session)
        db_session.query(models.Job).filter_by(id="job-rep-empty").delete()
        db_session.add(models.Job(
            id="job-rep-empty",
            employerId=emp.id,
            title="Replace With Empty Job",
            company="Baito Co",
            description="Test Description",
            status=JobStatus.OPEN,
            coordinateX=41.31,
            coordinateY=69.24,
            location="Toshkent",
            neededWorkers="1",
        ))
        db_session.commit()

    # 1. Prime cache legitimately via Cold DB Path
    res1 = client.get("/api/v1/jobs/map?clustered=false&search=Replace%20With%20Empty")
    assert res1.status_code == 200
    assert len(res1.json()) == 1

    # 2. Attacker replaces cached key in Redis with raw empty list '[]' (missing envelope & signature)
    ver = get_map_cache_version()
    base_key = get_map_cache_key_for_request(version=ver, search="Replace With Empty", clustered=False)
    assert redis_client.get(base_key) is not None
    redis_client.set(base_key, "[]", ex=120)

    # 3. Client request must fail envelope verification, evict corrupt entry, and rebuild from DB
    res2 = client.get("/api/v1/jobs/map?clustered=false&search=Replace%20With%20Empty")
    assert res2.status_code == 200
    pins = res2.json()
    assert len(pins) == 1
    assert pins[0]["id"] == "job-rep-empty"
    # Prove that Redis cache was evicted and rebuilt with a proper envelope
    new_cached = json.loads(redis_client.get(base_key))
    assert isinstance(new_cached, dict) and "resp_sig" in new_cached


def test_route_tamper_dropping_one_pin_from_envelope(client):
    """Dropping 1 pin from a valid response envelope invalidates resp_sig, causing eviction and full DB rebuild."""
    invalidate_map_cache()
    try:
        redis_client.flushdb()
    except Exception:
        pass

    with SessionLocal() as db_session:
        emp = _ensure_cluster_emp(db_session)
        db_session.query(models.Job).filter(models.Job.id.in_(["job-drop-1", "job-drop-2"])).delete()
        db_session.add_all([
            models.Job(
                id="job-drop-1",
                employerId=emp.id,
                title="Drop Test Job 1",
                company="Baito Co",
                description="Test Description",
                status=JobStatus.OPEN,
                coordinateX=41.31,
                coordinateY=69.24,
                location="Toshkent",
                neededWorkers="1",
            ),
            models.Job(
                id="job-drop-2",
                employerId=emp.id,
                title="Drop Test Job 2",
                company="Baito Co",
                description="Test Description",
                status=JobStatus.OPEN,
                coordinateX=41.32,
                coordinateY=69.25,
                location="Toshkent",
                neededWorkers="1",
            ),
        ])
        db_session.commit()

    # 1. Prime cache legitimately via Cold DB Path
    res1 = client.get("/api/v1/jobs/map?clustered=false&search=Drop%20Test%20Job")
    assert res1.status_code == 200
    assert len(res1.json()) == 2

    # 2. Attacker inspects envelope in Redis and drops 1 pin from payload while keeping original resp_sig
    ver = get_map_cache_version()
    base_key = get_map_cache_key_for_request(version=ver, search="Drop Test Job", clustered=False)
    env = json.loads(redis_client.get(base_key))
    assert len(env["payload"]) == 2
    env["payload"] = [env["payload"][0]]  # Tamper by dropping pin 2
    redis_client.set(base_key, json.dumps(env), ex=120)

    # 3. Client request must detect resp_sig mismatch, evict corrupt key, and restore both pins from DB
    res2 = client.get("/api/v1/jobs/map?clustered=false&search=Drop%20Test%20Job")
    assert res2.status_code == 200
    pins = res2.json()
    assert len(pins) == 2
    assert {p["id"] for p in pins} == {"job-drop-1", "job-drop-2"}


def test_route_tamper_copy_envelope_across_search_keys(client):
    """Copying a valid envelope from search key A into search key B fails cache_key binding, evicting and rebuilding."""
    invalidate_map_cache()
    try:
        redis_client.flushdb()
    except Exception:
        pass

    with SessionLocal() as db_session:
        emp = _ensure_cluster_emp(db_session)
        db_session.query(models.Job).filter(models.Job.id.in_(["job-search-oshpaz", "job-search-duradgor"])).delete()
        db_session.add_all([
            models.Job(
                id="job-search-oshpaz",
                employerId=emp.id,
                title="Oshpaz Oshxona",
                company="Chayxona",
                description="Test Description",
                status=JobStatus.OPEN,
                coordinateX=41.31,
                coordinateY=69.24,
                location="Toshkent",
                neededWorkers="1",
            ),
            models.Job(
                id="job-search-duradgor",
                employerId=emp.id,
                title="Duradgor Usta",
                company="Mebel Co",
                description="Test Description",
                status=JobStatus.OPEN,
                coordinateX=41.32,
                coordinateY=69.25,
                location="Toshkent",
                neededWorkers="1",
            ),
        ])
        db_session.commit()

    ver = get_map_cache_version()
    # 1. Prime cache for search=Oshpaz
    res_oshpaz = client.get("/api/v1/jobs/map?clustered=false&search=Oshpaz")
    assert res_oshpaz.status_code == 200
    assert len(res_oshpaz.json()) == 1
    assert res_oshpaz.json()[0]["id"] == "job-search-oshpaz"

    key_oshpaz = get_map_cache_key_for_request(version=ver, search="Oshpaz", clustered=False)
    key_duradgor = get_map_cache_key_for_request(version=ver, search="Duradgor", clustered=False)
    env_oshpaz_raw = redis_client.get(key_oshpaz)
    assert env_oshpaz_raw is not None

    # 2. Attacker copies valid Oshpaz envelope into Duradgor's cache key
    redis_client.set(key_duradgor, env_oshpaz_raw, ex=120)

    # 3. Client requests search=Duradgor. Fast Path must detect cache_key mismatch, evict key_duradgor, and return Duradgor from DB
    res_duradgor = client.get("/api/v1/jobs/map?clustered=false&search=Duradgor")
    assert res_duradgor.status_code == 200
    pins_duradgor = res_duradgor.json()
    assert len(pins_duradgor) == 1
    assert pins_duradgor[0]["id"] == "job-search-duradgor"
    assert pins_duradgor[0]["title"] == "Duradgor Usta"


def test_route_tamper_copy_envelope_across_viewports(client):
    """Copying a valid envelope from Viewport A into Viewport B fails cache_key binding, evicting and rebuilding."""
    invalidate_map_cache()
    try:
        redis_client.flushdb()
    except Exception:
        pass

    with SessionLocal() as db_session:
        emp = _ensure_cluster_emp(db_session)
        db_session.query(models.Job).filter(models.Job.id.in_(["job-vp-tashkent", "job-vp-samarkand"])).delete()
        db_session.add_all([
            models.Job(
                id="job-vp-tashkent",
                employerId=emp.id,
                title="Tashkent Center Job",
                company="Tashkent Co",
                description="Test Description",
                status=JobStatus.OPEN,
                coordinateX=41.31,
                coordinateY=69.24,
                location="Toshkent",
                neededWorkers="1",
            ),
            models.Job(
                id="job-vp-samarkand",
                employerId=emp.id,
                title="Samarkand Center Job",
                company="Samarkand Co",
                description="Test Description",
                status=JobStatus.OPEN,
                coordinateX=39.65,
                coordinateY=66.97,
                location="Samarqand",
                neededWorkers="1",
            ),
        ])
        db_session.commit()

    ver = get_map_cache_version()
    # 1. Prime cache for Tashkent viewport (min_lat=41.2, max_lat=41.4, min_lng=69.2, max_lng=69.3)
    res_tashkent = client.get("/api/v1/jobs/map?clustered=false&min_lat=41.2&max_lat=41.4&min_lng=69.2&max_lng=69.3")
    assert res_tashkent.status_code == 200
    assert any(p["id"] == "job-vp-tashkent" for p in res_tashkent.json())

    key_tashkent = get_map_cache_key_for_request(
        version=ver, min_lat=41.2, max_lat=41.4, min_lng=69.2, max_lng=69.3, clustered=False
    )
    key_samarkand = get_map_cache_key_for_request(
        version=ver, min_lat=39.5, max_lat=39.8, min_lng=66.8, max_lng=67.1, clustered=False
    )
    env_tashkent_raw = redis_client.get(key_tashkent)
    assert env_tashkent_raw is not None

    # 2. Attacker copies Tashkent envelope into Samarkand's cache key
    redis_client.set(key_samarkand, env_tashkent_raw, ex=120)

    # 3. Client requests Samarkand viewport. Fast Path detects context mismatch, evicts, and queries DB for Samarkand bounds
    res_samarkand = client.get("/api/v1/jobs/map?clustered=false&min_lat=39.5&max_lat=39.8&min_lng=66.8&max_lng=67.1")
    assert res_samarkand.status_code == 200
    pins_samarkand = res_samarkand.json()
    assert any(p["id"] == "job-vp-samarkand" for p in pins_samarkand)
    assert not any(p["id"] == "job-vp-tashkent" for p in pins_samarkand)


def test_route_tamper_copy_worker_a_envelope_into_worker_b(client):
    """Copying Worker A's personalized envelope into Worker B's key fails user_id binding, preventing state leakage."""
    invalidate_map_cache()
    try:
        redis_client.flushdb()
    except Exception:
        pass

    worker_a = make_user(role="worker", phone="+998901110022", name="Worker A")
    worker_b = make_user(role="worker", phone="+998901110033", name="Worker B")

    with SessionLocal() as db_session:
        emp = _ensure_cluster_emp(db_session)
        db_session.query(models.Job).filter_by(id="job-replay-user").delete()
        db_session.add(models.Job(
            id="job-replay-user",
            employerId=emp.id,
            title="User Replay Job",
            company="Baito Co",
            description="Test Description",
            status=JobStatus.OPEN,
            coordinateX=41.31,
            coordinateY=69.24,
            location="Toshkent",
            neededWorkers="1",
        ))
        db_session.commit()

        # Worker A applied; Worker B did NOT apply
        db_session.query(models.Application).filter_by(jobId="job-replay-user").delete()
        db_session.add(models.Application(
            id="app-replay-1",
            jobId="job-replay-user",
            workerId=worker_a.id,
            status="applied",
        ))
        db_session.commit()

    ver = get_map_cache_version()
    # 1. Worker A hits map -> primes personalized cache where applied=True
    client_a = TestClient(app)
    login(client_a, worker_a)
    res_a = client_a.get("/api/v1/jobs/map?clustered=false&search=User%20Replay")
    assert res_a.status_code == 200
    pins_a = res_a.json()
    assert len(pins_a) == 1
    assert pins_a[0]["applied"] is True

    key_a = get_map_cache_key_for_request(version=ver, search="User Replay", clustered=False, user_id=worker_a.id)
    key_b = get_map_cache_key_for_request(version=ver, search="User Replay", clustered=False, user_id=worker_b.id)
    env_a_raw = redis_client.get(key_a)
    assert env_a_raw is not None

    # 2. Attacker copies Worker A's envelope into Worker B's cache key
    redis_client.set(key_b, env_a_raw, ex=120)

    # 3. Worker B hits map. Fast Path detects user_id mismatch (Worker A != Worker B), evicts key_b, and rebuilds for Worker B
    client_b = TestClient(app)
    login(client_b, worker_b)
    res_b = client_b.get("/api/v1/jobs/map?clustered=false&search=User%20Replay")
    assert res_b.status_code == 200
    pins_b = res_b.json()
    assert len(pins_b) == 1
    assert pins_b[0]["applied"] is False, "Worker B must NOT see applied=True from Worker A's replayed cache!"


def test_route_tamper_copy_personalized_envelope_into_public_cache(client):
    """Copying a personalized envelope into the public base cache key fails user_id binding (None != user_id)."""
    invalidate_map_cache()
    try:
        redis_client.flushdb()
    except Exception:
        pass

    worker_a = make_user(role="worker", phone="+998901110044", name="Worker A Pub")

    with SessionLocal() as db_session:
        emp = _ensure_cluster_emp(db_session)
        db_session.query(models.Job).filter_by(id="job-replay-pub").delete()
        db_session.add(models.Job(
            id="job-replay-pub",
            employerId=emp.id,
            title="Public Replay Job",
            company="Baito Co",
            description="Test Description",
            status=JobStatus.OPEN,
            coordinateX=41.31,
            coordinateY=69.24,
            location="Toshkent",
            neededWorkers="1",
        ))
        db_session.commit()

        db_session.query(models.Application).filter_by(jobId="job-replay-pub").delete()
        db_session.add(models.Application(
            id="app-replay-pub-1",
            jobId="job-replay-pub",
            workerId=worker_a.id,
            status="applied",
        ))
        db_session.commit()

    ver = get_map_cache_version()
    client_a = TestClient(app)
    login(client_a, worker_a)
    res_a = client_a.get("/api/v1/jobs/map?clustered=false&search=Public%20Replay")
    assert res_a.status_code == 200

    key_a = get_map_cache_key_for_request(version=ver, search="Public Replay", clustered=False, user_id=worker_a.id)
    key_pub = get_map_cache_key_for_request(version=ver, search="Public Replay", clustered=False)
    env_a_raw = redis_client.get(key_a)
    assert env_a_raw is not None

    # Attacker copies Worker A's personalized envelope into public cache key
    redis_client.set(key_pub, env_a_raw, ex=120)

    # Anonymous visitor visits map. Fast Path checks expected_user_id=None != worker_a.id, evicts key_pub, rebuilds clean public pins
    anon_client = TestClient(app)
    res_anon = anon_client.get("/api/v1/jobs/map?clustered=false&search=Public%20Replay")
    assert res_anon.status_code == 200
    pins_anon = res_anon.json()
    assert len(pins_anon) == 1
    assert pins_anon[0]["applied"] is False, "Public visitor must NOT see applied=True from replayed personal envelope!"


def test_route_tamper_type_collisions_rejected_and_rebuilt(client):
    """Route-level tests proving type collisions in cached envelopes fail closed, are evicted, and rebuilt from DB:
    - salary: 3500000.9 (float in integer field)
    - applied: "false" (string in boolean field)
    - geo_verified: 1 (int in boolean field)
    - coordinateX: "41.31" (numeric string in coordinate field)
    """
    invalidate_map_cache()
    try:
        redis_client.flushdb()
    except Exception:
        pass

    with SessionLocal() as db_session:
        emp = _ensure_cluster_emp(db_session)
        db_session.query(models.Job).filter_by(id="job-type-col").delete()
        db_session.add(models.Job(
            id="job-type-col",
            employerId=emp.id,
            title="Type Collision Job",
            company="Baito Co",
            description="Test Description",
            status=JobStatus.OPEN,
            coordinateX=41.0,
            coordinateY=69.24,
            salary=3500000,
            location="Toshkent",
            neededWorkers="1",
        ))
        db_session.commit()

    from app.core.map_cache import (
        compute_pin_signature,
        make_response_envelope,
        verify_pin_signature,
        verify_response_envelope,
    )

    ver = get_map_cache_version()
    base_key = get_map_cache_key_for_request(version=ver, search="Type Collision", clustered=False)

    valid_pin = {
        "id": "job-type-col",
        "title": "Type Collision Job",
        "company": "Baito Co",
        "salary": 3500000,
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
        "pinIds": ["job-type-col"],
        "geo_verified": True,
    }
    # 1. Authentic HMAC signature over valid pin
    valid_pin["geo_sig"] = compute_pin_signature(valid_pin)
    assert verify_pin_signature(valid_pin) is True, "Authentic valid pin must pass verification"

    # 2. Authentic HMAC response envelope over authentic payload
    authentic_env = make_response_envelope(
        cache_key=base_key,
        payload=[valid_pin],
        clustered=False,
        user_id=None,
    )
    assert verify_response_envelope(authentic_env, expected_key=base_key, expected_clustered=False, expected_user_id=None) is not None

    test_variations = [
        ("applied false -> null", {"applied": None}),
        ("bookmarked false -> null", {"bookmarked": None}),
        ("tags [] -> null", {"tags": None}),
        ("pinIds [] -> null", {"pinIds": None}),
        ("coordinateX 41.0 -> 41 int", {"coordinateX": 41}),
        ("salary float", {"salary": 3500000.9}),
        ("applied string", {"applied": "false"}),
        ("geo_verified int", {"geo_verified": 1}),
        ("coordinateX string", {"coordinateX": "41.0"}),
    ]

    for desc, overrides in test_variations:
        tampered_pin = dict(valid_pin)
        tampered_pin.update(overrides)

        # A. Verify HMAC verification rejects altered payload directly with preserved real signature
        assert verify_pin_signature(tampered_pin) is False, f"HMAC verification must reject {desc}"

        tampered_env = {
            "cache_key": base_key,
            "clustered": False,
            "user_id": None,
            "payload": [tampered_pin],
            "resp_sig": authentic_env["resp_sig"],  # Preserving original real envelope signature
        }
        assert verify_response_envelope(tampered_env, expected_key=base_key, expected_clustered=False, expected_user_id=None) is None, f"Envelope verification must reject {desc}"

        # B. Verify actual route invalidates affected cache and rebuilds trusted DB results
        redis_client.set(base_key, json.dumps(tampered_env), ex=120)

        res = client.get("/api/v1/jobs/map?clustered=false&search=Type%20Collision")
        assert res.status_code == 200, f"Variation {desc} must return 200 after rebuild"
        pins = res.json()
        assert len(pins) == 1, f"Variation {desc} must return 1 authentic pin"
        assert pins[0]["id"] == "job-type-col"
        assert pins[0]["salary"] == 3500000, f"Variation {desc} must restore authentic int salary"
        assert type(pins[0]["salary"]) is int
        assert pins[0]["applied"] is False
        assert type(pins[0]["applied"]) is bool
        assert pins[0]["bookmarked"] is False
        assert type(pins[0]["bookmarked"]) is bool
        assert pins[0]["tags"] == []
        assert isinstance(pins[0]["tags"], list)
        assert pins[0]["pinIds"] == ["job-type-col"]
        assert isinstance(pins[0]["pinIds"], list)
        assert pins[0]["coordinateX"] == 41.0
        assert type(pins[0]["coordinateX"]) is float


# =====================================================================
# REMEDIATION REGRESSION TESTS: FIX A & FIX B
# =====================================================================

def test_fix_a_redis_uid_tamper_fails_to_impersonate(client):
    """FIX A: Tampering Redis keys cannot allow Worker A to impersonate Worker B or get B's personalized cache.
    Identity is strictly derived from verified DB user identity via deps.get_current_user_optional.
    """
    invalidate_map_cache()
    try:
        redis_client.flushdb()
    except Exception:
        pass

    worker_a = make_user(role="worker", phone="+998901111111", name="Worker A Real")
    worker_b = make_user(role="worker", phone="+998902222222", name="Worker B Real")

    with SessionLocal() as db_session:
        emp = _ensure_cluster_emp(db_session)
        db_session.query(models.Application).filter_by(jobId="job-impersonate-test").delete()
        db_session.query(models.Job).filter_by(id="job-impersonate-test").delete()
        job = models.Job(
            id="job-impersonate-test",
            employerId=emp.id,
            title="Impersonate Test Job",
            company="Baito Co",
            description="Test Description",
            status=JobStatus.OPEN,
            coordinateX=41.31,
            coordinateY=69.24,
            location="Toshkent",
            neededWorkers="1",
        )
        db_session.add(job)
        db_session.commit()

        # Worker B applied to the job, Worker A did NOT
        db_session.add(models.Application(
            id="app-worker-b-test",
            jobId=job.id,
            workerId=worker_b.id,
            status="applied",
        ))
        db_session.commit()

    # Attacker sets a rogue Redis mapping attempting to map Worker A's UID to Worker B's ID
    rogue_key = f"cache:user:uid_to_id:{worker_a.uid}"
    redis_client.set(rogue_key, worker_b.id, ex=3600)

    # Worker A makes request with their token
    client_a = TestClient(app)
    login(client_a, worker_a)

    res = client_a.get("/api/v1/jobs/map?clustered=false&search=Impersonate%20Test")
    assert res.status_code == 200
    pins = res.json()
    assert len(pins) == 1
    # Worker A must see applied=False because Worker A did not apply, ignoring rogue Redis key
    assert pins[0]["applied"] is False, "Worker A must NOT get Worker B's applied status via Redis tampering!"


def test_fix_a_deleted_user_treated_as_guest(client):
    """FIX A: A user whose record is deleted in DB is rejected by deps.get_current_user_optional and treated as guest."""
    invalidate_map_cache()
    try:
        redis_client.flushdb()
    except Exception:
        pass

    worker = make_user(role="worker", phone="+998903333333", name="Worker To Delete")
    worker_client = TestClient(app)
    login(worker_client, worker)

    with SessionLocal() as db_session:
        emp = _ensure_cluster_emp(db_session)
        db_session.query(models.Job).filter_by(id="job-deleted-user-test").delete()
        db_session.add(models.Job(
            id="job-deleted-user-test",
            employerId=emp.id,
            title="Deleted User Test Job",
            company="Baito Co",
            description="Test Description",
            status=JobStatus.OPEN,
            coordinateX=41.31,
            coordinateY=69.24,
            location="Toshkent",
            neededWorkers="1",
        ))
        db_session.commit()

        # Delete user from DB
        db_session.query(models.User).filter_by(id=worker.id).delete()
        db_session.commit()

    res = worker_client.get("/api/v1/jobs/map?clustered=false&search=Deleted%20User%20Test")
    assert res.status_code == 200
    pins = res.json()
    assert len(pins) == 1
    assert pins[0]["applied"] is False


def test_fix_a_banned_user_treated_as_guest(client):
    """FIX A: A user marked isBanned=True is rejected by deps.get_current_user_optional and treated as guest."""
    invalidate_map_cache()
    try:
        redis_client.flushdb()
    except Exception:
        pass

    worker = make_user(role="worker", phone="+998904444444", name="Worker To Ban")
    worker_client = TestClient(app)
    login(worker_client, worker)

    with SessionLocal() as db_session:
        emp = _ensure_cluster_emp(db_session)
        db_session.query(models.Job).filter_by(id="job-banned-user-test").delete()
        db_session.add(models.Job(
            id="job-banned-user-test",
            employerId=emp.id,
            title="Banned User Test Job",
            company="Baito Co",
            description="Test Description",
            status=JobStatus.OPEN,
            coordinateX=41.31,
            coordinateY=69.24,
            location="Toshkent",
            neededWorkers="1",
        ))
        db_session.commit()

        # Ban user in DB
        u = db_session.query(models.User).filter_by(id=worker.id).first()
        u.isBanned = True
        db_session.commit()

    res = worker_client.get("/api/v1/jobs/map?clustered=false&search=Banned%20User%20Test")
    assert res.status_code == 200
    pins = res.json()
    assert len(pins) == 1
    assert pins[0]["applied"] is False


def test_fix_a_revoked_session_treated_as_guest(client):
    """FIX A: A user whose active session is revoked is rejected by deps.get_current_user_optional and treated as guest."""
    invalidate_map_cache()
    try:
        redis_client.flushdb()
    except Exception:
        pass

    worker = make_user(role="worker", phone="+998905555555", name="Worker Revoked Session")
    worker_client = TestClient(app)
    login(worker_client, worker)

    with SessionLocal() as db_session:
        emp = _ensure_cluster_emp(db_session)
        db_session.query(models.Job).filter_by(id="job-revoked-session-test").delete()
        db_session.add(models.Job(
            id="job-revoked-session-test",
            employerId=emp.id,
            title="Revoked Session Test Job",
            company="Baito Co",
            description="Test Description",
            status=JobStatus.OPEN,
            coordinateX=41.31,
            coordinateY=69.24,
            location="Toshkent",
            neededWorkers="1",
        ))
        # Deactivate all sessions for this user
        db_session.query(models.ActiveSession).filter_by(user_uid=worker.uid).update({"is_active": False})
        db_session.commit()

    res = worker_client.get("/api/v1/jobs/map?clustered=false&search=Revoked%20Session%20Test")
    assert res.status_code == 200
    pins = res.json()
    assert len(pins) == 1
    assert pins[0]["applied"] is False


def test_fix_b_personal_only_dataset_unclustered(client):
    """FIX B: When 0 open jobs match, an authenticated user's IN_PROGRESS job is returned to them,
    while the public base cache strictly receives and serves payload=[], not leaking or starving.
    Both Cold DB Path and Fast Assembly Path are verified.
    """
    invalidate_map_cache()
    try:
        redis_client.flushdb()
    except Exception:
        pass

    worker = make_user(role="worker", phone="+998906666666", name="Worker Personal Only")
    worker_client = TestClient(app)
    login(worker_client, worker)

    with SessionLocal() as db_session:
        emp = _ensure_cluster_emp(db_session)
        db_session.query(models.Application).filter_by(jobId="job-personal-only-in-progress").delete()
        db_session.query(models.Job).filter_by(id="job-personal-only-in-progress").delete()
        job = models.Job(
            id="job-personal-only-in-progress",
            employerId=emp.id,
            title="Personal Shift In Progress",
            company="Baito Co",
            description="Test Description",
            status=JobStatus.IN_PROGRESS,
            coordinateX=41.31,
            coordinateY=69.24,
            location="Toshkent",
            neededWorkers="1",
        )
        db_session.add(job)
        db_session.commit()

        db_session.add(models.Application(
            id="app-personal-only-test",
            jobId=job.id,
            workerId=worker.id,
            status="in_progress",
        ))
        db_session.commit()

    ver = get_map_cache_version()
    base_key = get_map_cache_key_for_request(version=ver, search="Personal Shift In Progress", clustered=False)
    eff_key = get_map_cache_key_for_request(version=ver, search="Personal Shift In Progress", clustered=False, user_id=worker.id)

    # 1. Cold DB Path (Worker request)
    res_worker = worker_client.get("/api/v1/jobs/map?clustered=false&search=Personal%20Shift%20In%20Progress")
    assert res_worker.status_code == 200
    worker_pins = res_worker.json()
    assert len(worker_pins) == 1, "Worker must see their active in_progress personal shift!"
    assert worker_pins[0]["id"] == "job-personal-only-in-progress"
    assert worker_pins[0]["applied"] is True
    assert worker_pins[0]["status"] == "in_progress"

    # 2. Verify base cache strictly received payload=[]
    raw_base = redis_client.get(base_key)
    assert raw_base is not None, "Base cache must be primed with empty payload"
    base_env = json.loads(raw_base.decode("utf-8") if isinstance(raw_base, bytes) else str(raw_base))
    assert base_env["payload"] == [], "Public base cache must strictly have payload=[]"

    # 3. Anonymous visitor receives [] from base cache
    anon_client = TestClient(app)
    res_anon = anon_client.get("/api/v1/jobs/map?clustered=false&search=Personal%20Shift%20In%20Progress")
    assert res_anon.status_code == 200
    assert res_anon.json() == [], "Anonymous visitor must receive empty list"

    # 4. Fast Assembly / warm cache hit (Worker request 2)
    res_worker_warm = worker_client.get("/api/v1/jobs/map?clustered=false&search=Personal%20Shift%20In%20Progress")
    assert res_worker_warm.status_code == 200
    worker_warm_pins = res_worker_warm.json()
    assert len(worker_warm_pins) == 1
    assert worker_warm_pins[0]["id"] == "job-personal-only-in-progress"


def test_fix_b_personal_only_dataset_clustered(client):
    """FIX B: In clustered mode with 0 open jobs, user's active personal shift is returned as singleton pin.
    Public base cache receives [], anonymous gets [], and warm path succeeds.
    """
    invalidate_map_cache()
    try:
        redis_client.flushdb()
    except Exception:
        pass

    worker = make_user(role="worker", phone="+998907777777", name="Worker Personal Clustered")
    worker_client = TestClient(app)
    login(worker_client, worker)

    with SessionLocal() as db_session:
        emp = _ensure_cluster_emp(db_session)
        db_session.query(models.Application).filter_by(jobId="job-personal-clustered-shift").delete()
        db_session.query(models.Job).filter_by(id="job-personal-clustered-shift").delete()
        job = models.Job(
            id="job-personal-clustered-shift",
            employerId=emp.id,
            title="Personal Clustered Shift",
            company="Baito Co",
            description="Test Description",
            status=JobStatus.IN_PROGRESS,
            coordinateX=41.31,
            coordinateY=69.24,
            location="Toshkent",
            neededWorkers="1",
        )
        db_session.add(job)
        db_session.commit()

        db_session.add(models.Application(
            id="app-personal-clustered-test",
            jobId=job.id,
            workerId=worker.id,
            status="in_progress",
        ))
        db_session.commit()

    ver = get_map_cache_version()
    base_key = get_map_cache_key_for_request(version=ver, search="Personal Clustered Shift", clustered=True)

    # 1. Cold DB Path
    res_worker = worker_client.get("/api/v1/jobs/map?clustered=true&search=Personal%20Clustered%20Shift")
    assert res_worker.status_code == 200
    worker_pins = res_worker.json()
    assert len(worker_pins) == 1
    assert worker_pins[0]["id"] == "job-personal-clustered-shift"
    assert worker_pins[0]["isCluster"] is False
    assert worker_pins[0]["count"] == 1
    assert worker_pins[0]["pinIds"] == ["job-personal-clustered-shift"]
    assert worker_pins[0]["applied"] is True

    # 2. Base cache strictly has payload=[]
    raw_base = redis_client.get(base_key)
    assert raw_base is not None
    base_env = json.loads(raw_base.decode("utf-8") if isinstance(raw_base, bytes) else str(raw_base))
    assert base_env["payload"] == []

    # 3. Anonymous visitor receives []
    anon_client = TestClient(app)
    res_anon = anon_client.get("/api/v1/jobs/map?clustered=true&search=Personal%20Clustered%20Shift")
    assert res_anon.status_code == 200
    assert res_anon.json() == []

    # 4. Fast Assembly Path / warm request
    res_warm = worker_client.get("/api/v1/jobs/map?clustered=true&search=Personal%20Clustered%20Shift")
    assert res_warm.status_code == 200
    assert len(res_warm.json()) == 1
    assert res_warm.json()[0]["id"] == "job-personal-clustered-shift"


def test_fix_b_fast_assembly_clustered_with_extra_user_pins(client):
    """FIX B: Fast Assembly Path correctly clusters extra personal pins when base pins are already cached."""
    invalidate_map_cache()
    try:
        redis_client.flushdb()
    except Exception:
        pass

    worker = make_user(role="worker", phone="+998908888888", name="Worker Extra Clustered")
    worker_client = TestClient(app)
    login(worker_client, worker)

    with SessionLocal() as db_session:
        emp = _ensure_cluster_emp(db_session)
        # 2 open jobs nearby each other (will cluster in base)
        for i in (1, 2):
            jid = f"job-cluster-base-{i}"
            db_session.query(models.Application).filter_by(jobId=jid).delete()
            db_session.query(models.Job).filter_by(id=jid).delete()
            db_session.add(models.Job(
                id=jid,
                employerId=emp.id,
                title=f"Base Clustered Job {i}",
                company="Baito Co",
                description="Test Description",
                status=JobStatus.OPEN,
                coordinateX=41.31 + (i * 0.001),
                coordinateY=69.24 + (i * 0.001),
                location="Toshkent",
                neededWorkers="1",
            ))
        # 1 in_progress job for worker matching search
        db_session.query(models.Application).filter_by(jobId="job-extra-personal").delete()
        db_session.query(models.Job).filter_by(id="job-extra-personal").delete()
        db_session.add(models.Job(
            id="job-extra-personal",
            employerId=emp.id,
            title="Base Clustered Extra Personal",
            company="Baito Co",
            description="Test Description",
            status=JobStatus.IN_PROGRESS,
            coordinateX=41.35,
            coordinateY=69.28,
            location="Toshkent",
            neededWorkers="1",
        ))
        db_session.commit()

        db_session.add(models.Application(
            id="app-extra-personal-test",
            jobId="job-extra-personal",
            workerId=worker.id,
            status="in_progress",
        ))
        db_session.commit()

    # 1. Prime public base cache via anonymous request
    anon_client = TestClient(app)
    res_base = anon_client.get("/api/v1/jobs/map?clustered=true&search=Base%20Clustered")
    assert res_base.status_code == 200
    assert len(res_base.json()) == 1, "2 nearby open jobs must form 1 cluster"
    assert res_base.json()[0]["isCluster"] is True
    assert res_base.json()[0]["count"] == 2

    # 2. Worker requests with same filters. Hits Fast Assembly Path.
    res_worker = worker_client.get("/api/v1/jobs/map?clustered=true&search=Base%20Clustered")
    assert res_worker.status_code == 200
    worker_pins = res_worker.json()
    # Worker sees the public cluster of 2 open jobs + 1 personal singleton pin
    assert len(worker_pins) == 2, f"Expected 2 pins (1 cluster + 1 personal singleton), got {len(worker_pins)}"
    cluster_pins = [p for p in worker_pins if p.get("isCluster")]
    single_pins = [p for p in worker_pins if not p.get("isCluster")]
    assert len(cluster_pins) == 1
    assert cluster_pins[0]["count"] == 2
    assert len(single_pins) == 1
    assert single_pins[0]["id"] == "job-extra-personal"
    assert single_pins[0]["applied"] is True
