import requests

base_url = "http://localhost:8000/api/v1"

# 2. Login to get token
login_data = {
    "username": "+998901234599",
    "password": "password123"
}
r_login = requests.post(f"{base_url}/login/access-token", data=login_data)
print("Login Status code:", r_login.status_code)
print("Login Response:", r_login.text)

