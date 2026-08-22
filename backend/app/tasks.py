import logging
import httpx
from app.celery_app import celery_app
from app.core.config import settings

logger = logging.getLogger(__name__)

@celery_app.task(name="app.tasks.send_sms_task")
def send_sms_task(phone: str, code: str) -> bool:
    """
    Celery task to send SMS using TextUp in the background.
    """
    if not settings.TEXTUP_EMAIL or not settings.TEXTUP_PASSWORD:
        logger.info(f"SMS simulated (no credentials) for {phone}: {code}")
        return True

    try:
        with httpx.Client() as client:
            login_res = client.post("https://api-auth.textup.uz/v1/login", json={
                "email": settings.TEXTUP_EMAIL,
                "password": settings.TEXTUP_PASSWORD
            })
            
            if login_res.status_code == 200:
                token_data = login_res.json()
                access_token = token_data.get("accessToken")
                user_id = token_data.get("user", {}).get("id")
                
                sms_payload = {
                    "message": f"Baito ilovasiga kirish uchun tasdiqlash kodi: {code}",
                    "userId": user_id,
                    "name": "Baito Verification",
                    "templateId": "f885a2db-85e9-4d51-9c92-fe260fb7af59",
                    "recipients": [phone]
                }
                
                sms_res = client.post(
                    "https://sms-api.textup.uz/v1/send",
                    headers={"Authorization": f"Bearer {access_token}"},
                    json=sms_payload
                )
                
                if sms_res.status_code in (200, 201):
                    logger.info(f"Successfully sent SMS to {phone}")
                    return True
                else:
                    logger.error(f"TextUp SMS send failed: {sms_res.text}")
                    return False
            else:
                logger.error(f"Failed to authenticate with Textup.uz: {login_res.text}")
                return False
    except Exception as e:
        logger.error(f"Error in Celery SMS task: {e}")
        return False
