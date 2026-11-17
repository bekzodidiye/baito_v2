import pytest
from fastapi.testclient import TestClient

from app.main import app
from app import models
from app.db.session import SessionLocal
from app.models.job import JobStatus


@pytest.fixture
def client():
    return TestClient(app)


def test_map_pins_endpoint_returns_lightweight_pins(client):
    with SessionLocal() as db_session:
        # Create a test job with coordinates
        job = models.Job(
        title="Map Pin Kuryer",
        company="Fast Delivery LLC",
        location="Toshkent, Chilonzor",
        rawLocation="Chilonzor tumani",
        coordinateX=41.28,
        coordinateY=69.21,
        salary=250000,
        salaryCurrency="UZS",
        description="Juda uzun tavsif matni, 5000 ta belgi bo'lishi mumkin va xaritaga mutlaqo keraksiz",
        responsibilities="Juda uzun vazifalar matni",
        requirements="Juda uzun talablar matni",
        status=JobStatus.OPEN,
        employerId="test-employer-id",
        neededWorkers="2",
    )
    # Ensure employer user exists for foreign key if needed
    employer = db_session.query(models.User).filter_by(id="test-employer-id").first()
    if not employer:
        employer = models.User(
            id="test-employer-id",
            phone="+998901112233",
            role="employer",
            name="Test Employer",
        )
        db_session.add(employer)
        db_session.flush()

    db_session.add(job)
    db_session.commit()

    # Call map pins endpoint
    res = client.get("/api/v1/jobs/map")
    assert res.status_code == 200
    assert "public" in res.headers.get("Cache-Control", "")
    assert "max-age" in res.headers.get("Cache-Control", "")

    pins = res.json()
    assert isinstance(pins, list)
    target = next((p for p in pins if p["id"] == job.id), None)
    assert target is not None

    # Validate essential map fields exist
    assert target["title"] == "Map Pin Kuryer"
    assert target["company"] == "Fast Delivery LLC"
    assert target["coordinateX"] == 41.28
    assert target["coordinateY"] == 69.21
    assert target["salary"] == 250000
    assert target["status"] in JobStatus.OPEN_STATUSES

    # Validate heavy text fields are excluded to prevent UI freezes
    assert "description" not in target
    assert "responsibilities" not in target
    assert "requirements" not in target
    assert "importantNote" not in target
    assert "translations" not in target
    assert "hiredWorkers" not in target


def test_map_pins_etag_caching(client):
    res1 = client.get("/api/v1/jobs/map")
    assert res1.status_code == 200
    etag = res1.headers.get("ETag")
    if etag:
        res2 = client.get("/api/v1/jobs/map", headers={"If-None-Match": etag})
        assert res2.status_code == 304


def test_location_counts_endpoint(client):
    with SessionLocal() as db_session:
        employer = db_session.query(models.User).filter_by(id="test-employer-id").first()
        if not employer:
            employer = models.User(
                id="test-employer-id",
                phone="+998901112233",
                role="employer",
                name="Test Employer",
            )
            db_session.add(employer)
            db_session.flush()

        job = models.Job(
            title="Location Counts Test Job",
            company="Count Co",
            location="Toshkent, Chilonzor",
            rawLocation="Chilonzor tumani",
            coordinateX=41.28,
            coordinateY=69.21,
            salary=200000,
            salaryCurrency="UZS",
            description="Tavsif matni",
            status=JobStatus.OPEN,
            employerId="test-employer-id",
            neededWorkers="1",
        )
        db_session.add(job)
        db_session.commit()

    # Clear cached counts to ensure fresh calculation from DB
    from app.redis_client import redis_client
    try:
        redis_client.delete("cache:jobs:location_counts")
    except Exception:
        pass

    res1 = client.get("/api/v1/jobs/location-counts")
    assert res1.status_code == 200
    assert "public" in res1.headers.get("Cache-Control", "")
    assert "max-age" in res1.headers.get("Cache-Control", "")
    
    data = res1.json()
    assert "total" in data
    assert "regions" in data
    assert "districts" in data
    assert isinstance(data["regions"], dict)
    assert isinstance(data["districts"], dict)
    assert "Toshkent" in data["regions"]
    assert data["regions"]["Toshkent"] >= 1
    assert "Chilonzor" in data["districts"]
    assert data["districts"]["Chilonzor"] >= 1

    etag = res1.headers.get("ETag")
    if etag:
        res2 = client.get("/api/v1/jobs/location-counts", headers={"If-None-Match": etag})
        assert res2.status_code == 304


def test_map_pins_spatial_bounding_box(client):
    """Test spatial bounding box filtering queries using partial spatial index."""
    with SessionLocal() as db_session:
        employer = db_session.query(models.User).filter_by(id="test-employer-id").first()
        if not employer:
            employer = models.User(
                id="test-employer-id",
                phone="+998901112233",
                role="employer",
                name="Test Employer",
            )
            db_session.add(employer)
            db_session.flush()

        # Job in Samarkand
        job_samarkand = models.Job(
            title="Samarkand Barista",
            company="Registan Cafe",
            location="Samarqand, Markaz",
            coordinateX=39.65,
            coordinateY=66.96,
            salary=220000,
            description="Tavsif",
            status=JobStatus.OPEN,
            employerId="test-employer-id",
        )
        # Job in Tashkent
        job_tashkent = models.Job(
            title="Tashkent Oshpaz",
            company="Chorsu Osh",
            location="Toshkent, Shayxontohur",
            coordinateX=41.32,
            coordinateY=69.24,
            salary=300000,
            description="Tavsif",
            status=JobStatus.OPEN,
            employerId="test-employer-id",
        )
        db_session.add(job_samarkand)
        db_session.add(job_tashkent)
        db_session.commit()

    # Query bounding box covering ONLY Tashkent (lat 41..42, lng 69..70)
    res = client.get("/api/v1/jobs/map?min_lat=41.0&max_lat=42.0&min_lng=69.0&max_lng=70.0")
    assert res.status_code == 200
    pins = res.json()
    pin_titles = [p["title"] for p in pins]
    assert "Tashkent Oshpaz" in pin_titles
    assert "Samarkand Barista" not in pin_titles

    # Query bounding box covering ONLY Samarkand (lat 39..40, lng 66..68)
    res_sam = client.get("/api/v1/jobs/map?min_lat=39.0&max_lat=40.0&min_lng=66.0&max_lng=68.0")
    assert res_sam.status_code == 200
    pins_sam = res_sam.json()
    sam_titles = [p["title"] for p in pins_sam]
    assert "Samarkand Barista" in sam_titles
    assert "Tashkent Oshpaz" not in sam_titles


def test_map_pins_atomic_cache_invalidation(client):
    """Test that invalidate_map_cache instantly increments version and refreshes data."""
    from app.core.map_cache import get_map_cache_version, invalidate_map_cache
    v1 = get_map_cache_version()
    invalidate_map_cache()
    v2 = get_map_cache_version()
    assert v2 > v1


def test_nearby_jobs_with_commute_estimates(client):
    """Test /api/v1/jobs/nearby returns jobs within radius with commute calculation."""
    res = client.get("/api/v1/jobs/nearby?lat=41.32&lng=69.24&radius_km=10")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    if data:
        item = data[0]
        assert "job" in item
        assert "distance_km" in item
        assert "commute_estimate" in item
        commute = item["commute_estimate"]
        assert "walking_time_min" in commute
        assert "transit_time_min" in commute
        assert "driving_time_min" in commute
        assert "recommended_mode" in commute


def test_map_geojson_feature_collection(client):
    """Test /api/v1/jobs/map/geojson returns valid GeoJSON FeatureCollection."""
    res = client.get("/api/v1/jobs/map/geojson")
    assert res.status_code == 200
    assert "application/geo+json" in res.headers.get("content-type", "")
    data = res.json()
    assert data["type"] == "FeatureCollection"
    assert "features" in data
    assert isinstance(data["features"], list)
    if data["features"]:
        feat = data["features"][0]
        assert feat["type"] == "Feature"
        assert "geometry" in feat
        assert feat["geometry"]["type"] == "Point"
        assert len(feat["geometry"]["coordinates"]) == 2
        assert "properties" in feat
        assert "title" in feat["properties"]


def test_map_tile_endpoint(client):
    """Test /api/v1/jobs/map/tile/{z}/{x}/{y} converts slippy tile to bounds and returns pins."""
    res = client.get("/api/v1/jobs/map/tile/7/77/46")
    assert res.status_code == 200
    assert "public" in res.headers.get("Cache-Control", "")
    data = res.json()
    assert isinstance(data, list)


def test_authenticated_user_map_caching_and_etag(client):
    """Test that authenticated users get personalized private cached map pins with ETag and 304 support."""
    from tests.conftest import make_user, login
    user = make_user(role="worker")
    login(client, user)

    # First request: generates and caches user pins
    res1 = client.get("/api/v1/jobs/map")
    assert res1.status_code == 200
    assert "private" in res1.headers.get("Cache-Control", "")
    etag = res1.headers.get("ETag")
    assert etag is not None

    # Second request with If-None-Match: must return 304 Not Modified
    res2 = client.get("/api/v1/jobs/map", headers={"If-None-Match": etag})
    assert res2.status_code == 304
    assert res2.headers.get("ETag") == etag


def test_user_cache_invalidation_on_bookmark(client):
    """Test that toggling a bookmark invalidates user cache and updates bookmarked status on map."""
    from tests.conftest import make_user, make_job, login
    emp = make_user(role="employer", phone="+998909998877")
    worker = make_user(role="worker", phone="+998908887766")
    job = make_job(employer_id=emp.id, coordinateX=41.31, coordinateY=69.24)

    login(client, worker)

    # Seed cache
    res1 = client.get("/api/v1/jobs/map")
    assert res1.status_code == 200
    etag1 = res1.headers.get("ETag")

    # Bookmark the job
    bm_res = client.post(f"/api/v1/jobs/{job.id}/bookmark")
    assert bm_res.status_code == 200
    assert bm_res.json()["bookmarked"] is True

    # Fetch map again: user version must have incremented, returning updated data
    res2 = client.get("/api/v1/jobs/map")
    assert res2.status_code == 200
    etag2 = res2.headers.get("ETag")
    # ETags must differ because bookmarked flag changed
    assert etag1 != etag2
    pins = res2.json()
    bookmarked_pin = next((p for p in pins if p["id"] == job.id), None)
    assert bookmarked_pin is not None
    assert bookmarked_pin["bookmarked"] is True


