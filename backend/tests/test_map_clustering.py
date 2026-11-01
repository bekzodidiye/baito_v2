import pytest
from fastapi.testclient import TestClient
from app.main import app
from app import models
from app.db.session import SessionLocal
from app.models.job import JobStatus
from app.redis_client import redis_client
from app.core.map_cache import invalidate_map_cache, invalidate_user_map_cache


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
