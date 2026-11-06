"""Baito Job Translation Agent.

A specialized, autonomous translation agent whose single, strictly defined mission
is faithful, verbatim translation of job postings into Uzbek (uz), Russian (ru),
and English (en).

Core Directives:
1. Pure Translation Only: Never acts as an assistant, copywriter, advisor, or generator.
2. 100% Fidelity: Translates strictly what was typed by the user, preserving tone, brevity,
   numbers, names, and even informal text.
3. Zero Hallucination: Never invents positions, responsibilities, or requirements.
4. Source Language Verbatim Guarantee: The original input language is always preserved as-is.
"""

import json
import logging
import re
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from .gemini_client import GeminiClient
from .prompts import build_job_translation_prompt

logger = logging.getLogger("ai_translator.agent")


class JobTranslationAgent:
    """Specialized AI Agent dedicated strictly to job announcement translation."""

    AGENT_NAME = "BaitoJobTranslationAgent"
    VERSION = "1.0.0"

    def __init__(self, client: Optional[GeminiClient] = None):
        self.client = client or GeminiClient()

    @staticmethod
    def detect_source_language(text: str) -> str:
        """Detect whether source text is primarily Cyrillic (Russian) or Latin (Uzbek/English)."""
        if re.search(r'[\u0400-\u04FF]', text):
            return "ru"
        return "uz"

    def parse_response(self, raw_text: str) -> Optional[Dict[str, Any]]:
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

        # 2. Markdown block extraction
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
                data = json.loads(cleaned[first_brace:last_brace + 1])
                if isinstance(data, dict):
                    return data
            except Exception:
                pass

        return None

    def build_fallback(
        self,
        title: str,
        description: str,
        responsibilities: str = "",
        requirements: str = "",
        important_note: str = "",
        location: str = "",
    ) -> Dict[str, Dict[str, str]]:
        """Construct fallback translation preserving original fields across all locales."""
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

    def translate(
        self,
        title: str,
        description: str,
        responsibilities: str = "",
        requirements: str = "",
        important_note: str = "",
        location: str = "",
    ) -> Dict[str, Any]:
        """Translate job announcement fields strictly as written.

        Returns verified dictionary with 'uz', 'ru', 'en'.
        """
        user_original = {
            "title": title or "",
            "description": description or "",
        }
        if responsibilities:
            user_original["responsibilities"] = responsibilities
        if requirements:
            user_original["requirements"] = requirements
        if important_note:
            user_original["importantNote"] = important_note
        if location:
            user_original["location"] = location

        if not title and not description:
            return self.build_fallback(title, description, responsibilities, requirements, important_note, location)

        prompt = build_job_translation_prompt(
            title=title,
            description=description,
            responsibilities=responsibilities,
            requirements=requirements,
            important_note=important_note,
            location=location,
        )

        try:
            logger.info("[%s] Translating job: '%s' (loc: '%s')", self.AGENT_NAME, title[:50], location)
            response_text = self.client.generate(prompt)
            parsed = self.parse_response(response_text)

            if parsed and isinstance(parsed, dict):
                has_uz = "uz" in parsed and isinstance(parsed["uz"], dict)
                has_ru = "ru" in parsed and isinstance(parsed["ru"], dict)
                has_en = "en" in parsed and isinstance(parsed["en"], dict)

                if has_uz and has_ru and has_en:
                    src_lang = self.detect_source_language(f"{title} {description} {responsibilities}")

                    # 1. Guarantee source language matches authentic input verbatim
                    parsed[src_lang] = dict(user_original)

                    # 2. Strict guardrails against hallucinated fields
                    allowed_keys = set(user_original.keys())
                    for lang_code in ("uz", "ru", "en"):
                        if lang_code in parsed and isinstance(parsed[lang_code], dict):
                            if not parsed[lang_code].get("title"):
                                parsed[lang_code]["title"] = title
                            if not parsed[lang_code].get("description"):
                                parsed[lang_code]["description"] = description

                            extra_keys = [k for k in parsed[lang_code].keys() if k not in allowed_keys]
                            for k in extra_keys:
                                parsed[lang_code].pop(k, None)

                    logger.info("[%s] Translation successful (source: %s preserved)", self.AGENT_NAME, src_lang)
                    return parsed

            logger.warning("[%s] Model response did not match expected schema: %s", self.AGENT_NAME, response_text[:200] if response_text else "None")
        except Exception as e:
            logger.warning("[%s] Translation error (falling back to original): %s", self.AGENT_NAME, e)

        return self.build_fallback(title, description, responsibilities, requirements, important_note, location)

    def translate_and_save(self, db: Session, job_id: str) -> Optional[Dict[str, Any]]:
        """Translate a job by ID and commit translations to database."""
        from app import models

        job = db.query(models.Job).filter(models.Job.id == job_id).first()
        if not job:
            logger.warning("[%s] Job %s not found for translation", self.AGENT_NAME, job_id)
            return None

        translations = self.translate(
            title=job.title,
            description=job.description,
            responsibilities=job.responsibilities or "",
            requirements=job.requirements or "",
            important_note=job.importantNote or "",
            location=job.location or "",
        )

        job.translations = translations
        db.add(job)
        db.commit()
        db.refresh(job)
        logger.info("[%s] Saved translations for job %s: %s", self.AGENT_NAME, job_id, list(translations.keys()))
        return translations


# Global singleton instance
_default_agent: Optional[JobTranslationAgent] = None


def get_translation_agent() -> JobTranslationAgent:
    """Singleton getter for JobTranslationAgent."""
    global _default_agent
    if _default_agent is None:
        _default_agent = JobTranslationAgent()
    return _default_agent
