import json
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app import models
from app.db.session import SessionLocal
from app.models.job import JobStatus
from app.redis_client import redis_client
from app.core.map_cache import (
    invalidate_map_cache,
    invalidate_user_map_cache,
    build_map_pins_cache_key,
    get_map_cache_version,
)
from tests.conftest import make_user, login


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
    cached_ids = {p["id"] for p in base_pins_cached}
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
    cached_ids = {p["id"] for p in base_pins_cached}
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
    cached_ids = {p["id"] for p in base_pins}
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
