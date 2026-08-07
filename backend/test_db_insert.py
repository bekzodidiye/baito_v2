from app.db.session import SessionLocal
from app.models import Job, User
from app.schemas.job import JobCreate
import uuid

db = SessionLocal()
try:
    employer = db.query(User).filter_by(role="employer").first()
    job_in_dict = {
        "title": "Test Job",
        "company": "Test Company",
        "salary": "200000 UZS",
        "location": "Toshkent",
        "description": "test",
        "employerId": employer.id
    }
    db_job = Job(**job_in_dict)
    db.add(db_job)
    db.commit()
    print("Success")
except Exception as e:
    print("Error:", str(e))
