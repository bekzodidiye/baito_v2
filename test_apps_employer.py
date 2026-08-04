from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Job, Application, User

engine = create_engine("sqlite:///./baito_new.db")
Session = sessionmaker(bind=engine)
session = Session()

user = session.query(User).filter(User.name == 'Korzinka Retail HR').first()
print(f"User: {user.id}")

jobs = session.query(Job).filter(Job.employerId == user.id).all()
job_ids = [j.id for j in jobs]
print(f"Jobs: {job_ids}")

apps = session.query(Application).filter(Application.jobId.in_(job_ids)).all()
print(f"Apps: {[a.id for a in apps]}")

worker_ids = {a.workerId for a in apps}
workers = session.query(User).filter(User.id.in_(worker_ids)).all()
print(f"Workers: {[w.id for w in workers]}")

