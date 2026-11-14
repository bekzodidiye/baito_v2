"""Job translation service utilizing Gemini AI client."""

import json
import logging
import re
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from .gemini_client import GeminiClient
from .agent import JobTranslationAgent, get_translation_agent

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
    location: str = "",
) -> Dict[str, Dict[str, str]]:
    """Construct fallback translations if AI service is temporarily unavailable."""
    base = {
        "title": title or "",
        "description": description or "",
    }
    if location:
        base["location"] = location
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


def _detect_source_language(text: str) -> str:
    """Detect whether source text is primarily Cyrillic (Russian) or Latin (Uzbek/English)."""
    if re.search(r'[\u0400-\u04FF]', text):
        return "ru"
    return "uz"

def translate_job_content(
    title: str,
    description: str,
    responsibilities: str = "",
    requirements: str = "",
    important_note: str = "",
    category: str = "",
    location: str = "",
    client: Optional[GeminiClient] = None,
) -> Dict[str, Any]:
    """Translate job announcement fields into uz, ru, and en via JobTranslationAgent.

    Returns a dict with 'uz', 'ru', 'en' containing translated fields.
    Falls back gracefully if the translation model is unavailable.
    """
    agent = JobTranslationAgent(client=client) if client else get_translation_agent()
    return agent.translate(
        title=title,
        description=description,
        responsibilities=responsibilities,
        requirements=requirements,
        important_note=important_note,
        location=location,
    )


def translate_and_save_job(db: Session, job_id: str) -> Optional[Dict[str, Any]]:
    """Translate an existing job by ID and persist the translations in the database via JobTranslationAgent."""
    agent = get_translation_agent()
    return agent.translate_and_save(db=db, job_id=job_id)

