# OWASP LLM Top 10 — not applicable

`QA.md` §8.1 asks for one row per OWASP LLM ID with the test and the outcome.
This product has **no LLM component**, so there is nothing to test and nothing
to report as passing.

Basis for that conclusion, checked in Phase 0:

- No model-provider SDK in `backend/requirements.txt` (no `openai`,
  `anthropic`, `google-generativeai`, `langchain`, `cohere`, `mistralai`,
  `ollama`).
- No embedding model, no vector store, no retrieval pipeline.
- The two modules whose names suggest AI are rule-based:
  - `app/services/ai_matcher.py` — `AIMatchmaker.calculate_match_score`
    computes a 0–100 score from skills, location, rating and category with
    arithmetic. No network call.
  - `app/services/spam_detector.py` — keyword and regex scoring against a
    built-in list plus an administrator-configured list. No network call.
- A grep for outbound model calls (`client.chat`, `.generate(`, `api_key`) in
  both files returns zero matches.

Recorded as **N/A**, not as passed (§2 MUST NOT 6 and 8).

Classic application security for this product is in
`../REPORT.md` §4 and the `scans/` directory.
