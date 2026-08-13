import re
from typing import Dict, Any

class SpamFraudDetector:
    """
    AI-assisted Anti-Fraud & Spam Moderation Engine.
    Detects blacklisted scam keywords, abnormal salary ranges, and hidden contact leaks.
    """
    SUSPICIOUS_KEYWORDS = [
        "investitsiya", "daromad 1000$", "piramida", "depozit", "kripto", 
        "1 soatda boyish", "karta raqam", "sms kodni ayting", "garov puli",
        "oldindan to'lov", "passport nusxasini tashlang", "onlayn kazino"
    ]

    @staticmethod
    def analyze_job_posting(title: str, description: str, salary: str) -> Dict[str, Any]:
        flags = []
        risk_score = 0
        full_text = f"{title} {description}".lower()

        # 1. Suspicious keywords check
        for kw in SpamFraudDetector.SUSPICIOUS_KEYWORDS:
            if kw in full_text:
                flags.append(f"Shubhali ibora aniqlandi: '{kw}'")
                risk_score += 35

        # 2. Hidden phone number in description (bypassing platform chats)
        phone_matches = re.findall(r'(\+?998[\s-]?\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2})', description)
        if phone_matches:
            flags.append("Tavsifda to'g'ridan-to'g'ri telefon raqami ko'rsatilgan (Platformadan tashqari muloqot xavfi)")
            risk_score += 20

        # 3. Abnormal / unrealistic salary check (e.g. > 100,000,000 UZS/day for manual labor)
        salary_digits = ''.join(filter(str.isdigit, salary or ''))
        if salary_digits and int(salary_digits) > 50_000_000:
            flags.append(f"Haqiqatdan yiroq maosh ko'rsatilgan ({salary_digits} so'm)")
            risk_score += 40

        is_spam = risk_score >= 50
        return {
            "is_spam": is_spam,
            "risk_score": min(100, risk_score),
            "flags": flags,
            "status": "rejected" if is_spam else "approved"
        }
