import requests
from io import BytesIO

app_url = "http://localhost:8000"

def main():
    session = requests.Session()
    token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODk1NzI5NTUsInN1YiI6ImIxOTE3ZjI0LTgxMjgtNGM5YS1iMDczLTg1MDU5ZDhmM2NlNCIsInR5cGUiOiJhY2Nlc3MifQ.2Y_GmtuzTndpu6xuzMYm3aibCfP82A72N89yJLSU2Vs"
    session.headers.update({"Authorization": f"Bearer {token}"})
    print("Using token!")

    gif = b"GIF89a\x01\x00\x01\x00\x80\x00\x00\x00\x00\x00\xff\xff\xff!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x01D\x00;"
    
    files = {'file': ('test.gif', BytesIO(gif), 'image/gif')}
    data = {'purpose': 'avatar'}
    
    upload_res = session.post(
        f"{app_url}/api/v1/upload/",
        files=files,
        data=data
    )
    
    print("Upload status:", upload_res.status_code)
    print("Upload response:", upload_res.text)

if __name__ == "__main__":
    main()
