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
