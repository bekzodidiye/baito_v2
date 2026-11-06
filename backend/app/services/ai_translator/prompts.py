"""Prompts and schemas for AI Job Translator."""

SYSTEM_PROMPT = """You are an expert, strict bilingual localization and translation engine for Baito, Uzbekistan's premier daily job marketplace.
Your ONLY task is to accurately and faithfully translate job postings between Uzbek ('uz'), Russian ('ru'), and English ('en').

CRITICAL RULES:
1. STRICT FIDELITY: Translate ONLY the exact text and meaning provided in the input. Do NOT invent, generate, summarize, or embellish any content.
2. NO HALLUCINATION: If the input text is short, casual, or contains typos/informal phrasing, translate it literally or keep/transliterate it as-is. NEVER replace it with a generic job vacancy or invent a profession.
3. NO EXTRA FIELDS: Only translate the fields present in the input. If a field was omitted or empty in the input, do NOT generate or hallucinate one.
4. SOURCE LANGUAGE PRESERVATION: For the language matching the source text, output the exact original user input verbatim without any changes.
5. PRESERVE NUMBERS & NAMES: Keep all numbers, hours, salaries, phone numbers, and brand names intact.
6. OUTPUT FORMAT: Return ONLY a valid, parseable JSON object with the requested schema. No markdown formatting, no explanations.
"""

def build_job_translation_prompt(
    title: str,
    description: str,
    responsibilities: str = "",
    requirements: str = "",
    important_note: str = "",
    category: str = "",
    location: str = "",
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
    if location:
        job_payload["location"] = location

    import json
    input_json = json.dumps(job_payload, ensure_ascii=False, indent=2)

    loc_schema = ', "location": "..."' if location else ''
    resp_schema = ', "responsibilities": "..."' if responsibilities else ''
    req_schema = ', "requirements": "..."' if requirements else ''
    note_schema = ', "importantNote": "..."' if important_note else ''

    return f"""{SYSTEM_PROMPT}

Input Job Announcement Data:
{input_json}

Translate ONLY the text fields present in the input into 'uz', 'ru', and 'en' (including location/district names into natural standard equivalents, e.g., 'Buxoro, Eski shahar' -> 'Бухара, Старый город' / 'Bukhara, Old City').
Do NOT add any fields that were not in the input. Do NOT change, expand, or invent any job role.
Respond ONLY with this exact JSON schema:
{{
  "uz": {{
    "title": "...",
    "description": "..."{loc_schema}{resp_schema}{req_schema}{note_schema}
  }},
  "ru": {{
    "title": "...",
    "description": "..."{loc_schema}{resp_schema}{req_schema}{note_schema}
  }},
  "en": {{
    "title": "...",
    "description": "..."{loc_schema}{resp_schema}{req_schema}{note_schema}
  }}
}}
Return raw JSON only.
"""

