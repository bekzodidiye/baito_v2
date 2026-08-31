import re
from typing import Any, Dict, Optional, Sequence


def keywords_from_settings(db) -> Optional[list[str]]:
    """The administrator's own keyword list, if they have set one.

    The list used to live only in this file, so the "forbidden words" control
    in the admin panel edited a React array and nothing else.
    """
    try:
        from app import models

        row = (
            db.query(models.SystemSetting)
            .filter(models.SystemSetting.id == "singleton")
            .first()
        )
        raw = getattr(row, "spamKeywords", None) if row else None
    except Exception:
        return None
    if not raw:
        return None
    words = [w.strip().lower() for w in re.split(r"[\n,]", raw) if w.strip()]
    return words or None


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
    def analyze_job_posting(
        title: str,
        description: str,
        salary: str,
        keywords: Optional[Sequence[str]] = None,
    ) -> Dict[str, Any]:
        flags = []
        risk_score = 0
        full_text = f"{title} {description}".lower()

        # 1. Suspicious keywords. The built-in list is a heuristic — a hit
        # raises the score and three other signals can still clear it. A list
        # an administrator typed into "forbidden words" is not a heuristic:
        # if they forbade the word, the posting is refused.
        configured = list(keywords) if keywords else []
        for kw in (configured or SpamFraudDetector.SUSPICIOUS_KEYWORDS):
            if kw in full_text:
                flags.append(f"Shubhali ibora aniqlandi: '{kw}'")
                risk_score += 100 if configured else 35

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
