"""Job translation service utilizing Gemini AI client."""

import json
import logging
import re
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from .gemini_client import GeminiClient
from .prompts import build_job_translation_prompt

logger = logging.getLogger("ai_translator.job_translator")

_default_client: Optional[GeminiClient] = None


def get_gemini_client() -> GeminiClient:
    """Singleton getter for GeminiClient."""
    global _default_client
    if _default_client is None:
        _default_client = GeminiClient()
    return _default_client


def _parse_json_from_response(raw_text: str) -> Optional[Dict[str, Any]]:
    """Safely extract and parse JSON from model response text."""
    if not raw_text or not raw_text.strip():
        return None

    cleaned = raw_text.strip()

    # 1. Direct parse attempt
    try:
        data = json.loads(cleaned)
        if isinstance(data, dict):
            return data
    except Exception:
        pass

    # 2. Markdown code block extraction
    m = re.search(r'```(?:json)?\s*(\{[\s\S]*?\})\s*```', cleaned)
    if m:
        try:
            data = json.loads(m.group(1))
            if isinstance(data, dict):
                return data
        except Exception:
            pass

    # 3. First '{' to last '}' bracket extraction
    first_brace = cleaned.find("{")
    last_brace = cleaned.rfind("}")
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        try:
            data = json.loads(cleaned[first_brace : last_brace + 1])
            if isinstance(data, dict):
                return data
        except Exception:
            pass

    return None


def _build_fallback_translations(
    title: str,
    description: str,
    responsibilities: str = "",
    requirements: str = "",
    important_note: str = "",
) -> Dict[str, Dict[str, str]]:
    """Construct fallback translations if AI service is temporarily unavailable."""
    base = {
        "title": title or "",
        "description": description or "",
    }
    if responsibilities:
        base["responsibilities"] = responsibilities
    if requirements:
        base["requirements"] = requirements
    if important_note:
        base["importantNote"] = important_note

    return {
        "uz": dict(base),
        "ru": dict(base),
        "en": dict(base),
    }


def translate_job_content(
    title: str,
    description: str,
    responsibilities: str = "",
    requirements: str = "",
    important_note: str = "",
    category: str = "",
    client: Optional[GeminiClient] = None,
) -> Dict[str, Any]:
    """Translate job announcement fields into uz, ru, and en.

    Returns a dict with 'uz', 'ru', 'en' containing translated fields.
    Falls back gracefully if the translation model is unavailable.
    """
    if not title and not description:
        return _build_fallback_translations(title, description, responsibilities, requirements, important_note)

    prompt = build_job_translation_prompt(
        title=title,
        description=description,
        responsibilities=responsibilities,
        requirements=requirements,
        important_note=important_note,
        category=category,
    )

    ai_client = client or get_gemini_client()

    try:
        logger.info("Requesting Gemini translation for job title: %s", title[:50])
        response_text = ai_client.generate(prompt)
        parsed = _parse_json_from_response(response_text)

        if parsed and isinstance(parsed, dict):
            # Validate essential language keys
            has_uz = "uz" in parsed and isinstance(parsed["uz"], dict)
            has_ru = "ru" in parsed and isinstance(parsed["ru"], dict)
            has_en = "en" in parsed and isinstance(parsed["en"], dict)

            if has_uz and has_ru and has_en:
                logger.info("Successfully translated job into 3 languages via Gemini")
                return parsed

        logger.warning("Gemini response did not match expected 3-language schema: %s", response_text[:200])
    except Exception as e:
        logger.warning("Gemini translation error (falling back to original): %s", e)

    return _build_fallback_translations(title, description, responsibilities, requirements, important_note)


def translate_and_save_job(db: Session, job_id: str) -> Optional[Dict[str, Any]]:
    """Translate an existing job by ID and persist the translations in the database."""
    from app import models

    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        logger.warning("Job %s not found for translation", job_id)
        return None

    translations = translate_job_content(
        title=job.title,
        description=job.description,
        responsibilities=job.responsibilities or "",
        requirements=job.requirements or "",
        important_note=job.importantNote or "",
        category=job.category or "",
    )

    job.translations = translations
    db.add(job)
    db.commit()
    db.refresh(job)
    logger.info("Saved translations for job %s: %s", job_id, list(translations.keys()))
    return translations
