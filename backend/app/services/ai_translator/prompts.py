"""Prompts and schemas for AI Job Translator."""

SYSTEM_PROMPT = """You are an expert bilingual localization and translation engine for Baito, Uzbekistan's premier daily job and gig work marketplace.
Your task is to accurately translate job postings into three languages:
1. Uzbek ('uz') - Standard contemporary Uzbek in Latin script (e.g., o‘, g‘, sh, ch).
2. Russian ('ru') - Natural, professional Russian used in job announcements.
3. English ('en') - Clear, professional English terminology.

Key Guidelines:
- Context: Daily shifts, catering, retail, construction, logistics, and service industry in Uzbekistan.
- Preserve Specifics: Keep numbers, working hours (e.g., 08:00 - 17:00), salary amounts, currency symbols, and brand/company names intact.
- Tone: Professional, welcoming, and clear.
- Output Format: You MUST return ONLY a valid, parseable JSON object without markdown code blocks, explanatory text, or tags.
"""

def build_job_translation_prompt(
    title: str,
    description: str,
    responsibilities: str = "",
    requirements: str = "",
    important_note: str = "",
    category: str = "",
) -> str:
    """Build the prompt for Gemini translation."""
    job_payload = {
        "title": title or "",
        "description": description or "",
    }
    if responsibilities:
        job_payload["responsibilities"] = responsibilities
    if requirements:
        job_payload["requirements"] = requirements
    if important_note:
        job_payload["importantNote"] = important_note
    if category:
        job_payload["category"] = category

    import json
    input_json = json.dumps(job_payload, ensure_ascii=False, indent=2)

    return f"""{SYSTEM_PROMPT}

Input Job Announcement Data:
{input_json}

Translate each text field into 'uz', 'ru', and 'en'.
Respond ONLY with this exact JSON schema:
{{
  "uz": {{
    "title": "...",
    "description": "..."{', "responsibilities": "..."' if responsibilities else ''}{', "requirements": "..."' if requirements else ''}{', "importantNote": "..."' if important_note else ''}
  }},
  "ru": {{
    "title": "...",
    "description": "..."{', "responsibilities": "..."' if responsibilities else ''}{', "requirements": "..."' if requirements else ''}{', "importantNote": "..."' if important_note else ''}
  }},
  "en": {{
    "title": "...",
    "description": "..."{', "responsibilities": "..."' if responsibilities else ''}{', "requirements": "..."' if requirements else ''}{', "importantNote": "..."' if important_note else ''}
  }}
}}
Return raw JSON only.
"""
