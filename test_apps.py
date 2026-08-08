from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Job, Application

engine = create_engine("sqlite:///./baito_new.db")
Session = sessionmaker(bind=engine)
session = Session()

# Print all jobs with their employerIds
jobs = session.query(Job).all()
print(f"Total jobs: {len(jobs)}")
for j in jobs:
    apps = session.query(Application).filter(Application.jobId == j.id).all()
    print(f"Job {j.id} by {j.employerId}: {len(apps)} applications")

