import re
from typing import Any, Dict, Optional, Sequence

from app.core.money import parse_salary_amounts


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

        # 3. Abnormal / unrealistic salary. A high-but-usable figure is a
        # heuristic worth 40. A figure the parser cannot represent is not: it
        # resolves to zero, so hiring took nothing into escrow while the listing
        # advertised the full amount, and the worker was owed nothing.
        written = parse_salary_amounts(salary, bounded=False)
        if written and not parse_salary_amounts(salary):
            flags.append(
                f"Maosh tizim qabul qila oladigan chegaradan oshib ketgan "
                f"({max(written)} so'm)"
            )
            risk_score += 100
        elif written and max(written) > 50_000_000:
            flags.append(f"Haqiqatdan yiroq maosh ko'rsatilgan ({max(written)} so'm)")
            risk_score += 40

        is_spam = risk_score >= 50
        return {
            "is_spam": is_spam,
            "risk_score": min(100, risk_score),
            "flags": flags,
            "status": "rejected" if is_spam else "approved"
        }
