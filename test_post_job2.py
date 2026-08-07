import requests

base_url = "http://localhost:8000/api/v1"

# 1. Register a test employer
user_data = {
    "phone": "+998909998877",
    "password": "password123",
    "name": "Test Employer",
    "role": "employer",
    "companyName": "Test Company"
}
try:
    requests.post(f"{base_url}/users", json=user_data)
except Exception:
    pass

# 2. Login to get token using form data (OAuth2 form)
login_data = {
    "username": "+998909998877",
    "password": "password123"
}
session = requests.Session()
r_login = session.post(f"{base_url}/auth/login", data=login_data)
print("Login Status code:", r_login.status_code)
print("Login Response:", r_login.text)

# 3. Post a job
job_data = {
    "title": "Test Job",
    "company": "Test Company",
    "salary": "200000 UZS",
    "location": "Toshkent",
    "description": "test",
    "durationLabel": "1 kunlik",
    "workDate": "2026-10-10",
    "workTime": "09:00 - 18:00",
    "neededWorkers": "1",
    "hourlyRate": "",
    "transportRate": "",
    "category": "retail",
    "responsibilities": "test",
    "requirements": "",
    "importantNote": "",
    "tags": [],
    "coordinateX": 50,
    "coordinateY": 50
}
r_job = session.post(f"{base_url}/jobs", json=job_data)
print("Job Status code:", r_job.status_code)
print("Job Response:", r_job.text)

