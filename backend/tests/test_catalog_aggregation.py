import uuid
from app.db.session import SessionLocal
from app.models import Category, Job
from app.models.job import JobStatus
from tests.conftest import make_user


def test_list_categories_aggregation(client):
    employer = make_user(role="employer", phone=f"+99890{uuid.uuid4().int % 10000000:07d}")

    cat_slug = f"test-cat-{uuid.uuid4().hex[:6]}"
    cat_id = str(uuid.uuid4())

    with SessionLocal() as db:
        category = Category(id=cat_id, name="Test Category", slug=cat_slug, icon="wrench")
        db.add(category)

        # 1. Open job with normal salary
        j1 = Job(
            id=str(uuid.uuid4()),
            employerId=employer.id,
            title="Job 1",
            company="Company 1",
            category=cat_slug,
            salary=200_000,
            location="Tashkent",
            description="Work",
            status=JobStatus.OPEN,
        )
        # 2. Open job with higher salary
        j2 = Job(
            id=str(uuid.uuid4()),
            employerId=employer.id,
            title="Job 2",
            company="Company 1",
            category=cat_slug,
            salary=500_000,
            location="Tashkent",
            description="Work",
            status=JobStatus.OPEN,
        )
        # 3. Completed job (must NOT be counted in activeJobsCount)
        j3 = Job(
            id=str(uuid.uuid4()),
            employerId=employer.id,
            title="Job 3",
            company="Company 1",
            category=cat_slug,
            salary=1_000_000,
            location="Tashkent",
            description="Work",
            status=JobStatus.COMPLETED,
        )
        db.add_all([j1, j2, j3])
        db.commit()

    res = client.get("/api/v1/categories")
    assert res.status_code == 200
    items = res.json()
    cat_item = next((c for c in items if c["id"] == cat_id), None)
    assert cat_item is not None
    assert cat_item["activeJobsCount"] == 2
    assert cat_item["salaryFrom"] == 200_000
    assert cat_item["salaryTo"] == 500_000
