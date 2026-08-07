from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

res = client.post("/api/v1/users", json={
    "phone": "+998909999999",
    "password": "password123",
    "name": "Test User",
    "role": "worker"
})
print("Create:", res.status_code, res.text)

res = client.post("/api/v1/auth/login", data={
    "username": "+998909999999",
    "password": "password123"
})
print("Login:", res.status_code, res.text)
cookies = res.cookies

res = client.put("/api/v1/users/me", json={
    "name": "Test User 2",
    "phone": "+998 90 999-99-99", # Note the format!
    "email": "test@test.com",
    "gender": "male",
    "birthDate": "1996-01-19",
    "region": "Tashkent",
    "category": "IT",
    "bio": "Dev",
    "skills": ["React"],
    "passportSeries": "AB 1234567",
    "passportJshshir": "12345678901234",
    "passportDocFront": "test",
    "passportDocBack": "test",
    "selfieWithDoc": "test",
    "avatarUrl": "test"
}, cookies=cookies)
print("Update:", res.status_code, res.text)
