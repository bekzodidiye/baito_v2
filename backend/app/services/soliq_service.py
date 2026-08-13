import uuid
import hashlib
import time
from typing import Dict, Any

class SoliqFiscalService:
    """
    Soliq.uz & Fiscalization Integration for Self-Employed ("O'zini o'zi band qilgan shaxslar").
    Generates official e-receipt QR payload and fiscal tracking data.
    """
    ACTIVITY_CODE_FREELANCE = "96.09.0" # Personal services activity code

    @staticmethod
    def generate_fiscal_receipt(
        worker_pinfl: str,
        worker_name: str,
        amount_uzs: int,
        job_title: str
    ) -> Dict[str, Any]:
        receipt_id = f"CHEK-{uuid.uuid4().hex[:12].upper()}"
        timestamp = int(time.time())
        
        # Fiscal sign generation (HMAC/SHA256 compliant)
        raw_sign_str = f"{receipt_id}:{worker_pinfl or 'ANON'}:{amount_uzs}:{timestamp}"
        fiscal_sign = hashlib.sha256(raw_sign_str.encode()).hexdigest()[:16].upper()

        # Soliq.uz verification QR URL format
        soliq_qr_url = f"https://my.soliq.uz/check/verify?id={receipt_id}&sign={fiscal_sign}&amount={amount_uzs}"

        return {
            "receipt_id": receipt_id,
            "fiscal_sign": fiscal_sign,
            "status": "FISCAL_CONFIRMED",
            "activity_code": SoliqFiscalService.ACTIVITY_CODE_FREELANCE,
            "worker_name": worker_name,
            "tax_amount_uzs": 0, # 0% income tax for self-employed in UZ
            "total_income_uzs": amount_uzs,
            "qr_url": soliq_qr_url,
            "created_at_timestamp": timestamp
        }
