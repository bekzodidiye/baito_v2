"""Isolated Gemini Client for Baito translation service.

Extracted and refined from Desktop gemini-web2api.
Provides direct, zero-auth/cookie-authenticated text generation via
Google Gemini's public StreamGenerate protocol.
"""

import json
import logging
import os
import re
import ssl
import time
import urllib.parse
import urllib.request
import uuid
from typing import Optional, Dict, Any

logger = logging.getLogger("ai_translator.gemini_client")

DEFAULT_BL = "boq_assistant-bard-web-server_20260716.08_p0"
DEFAULT_TIMEOUT_SEC = 25
DEFAULT_RETRIES = 3


class GeminiClient:
    """Lightweight client communicating with Google Gemini StreamGenerate endpoint."""

    def __init__(
        self,
        cookie_file: Optional[str] = None,
        cookie_str: Optional[str] = None,
        timeout_sec: int = DEFAULT_TIMEOUT_SEC,
        retry_attempts: int = DEFAULT_RETRIES,
        gemini_bl: str = DEFAULT_BL,
    ):
        self.cookie_file = cookie_file or os.environ.get(
            "GEMINI_COOKIE_FILE",
            os.path.join(os.path.dirname(os.path.abspath(__file__)), "cookie.txt")
        )
        self.cookie_str = cookie_str or os.environ.get("GEMINI_COOKIE", "")
        self.timeout_sec = timeout_sec
        self.retry_attempts = retry_attempts
        self.gemini_bl = gemini_bl
        self._cached_cookie: str = ""
        self._cached_sapisid: Optional[str] = None
        self._cookie_mtime: float = 0
        self._ssl_ctx = ssl.create_default_context()

    def _load_cookie(self) -> tuple[str, Optional[str]]:
        """Load cookie and SAPISID with mtime caching."""
        if self.cookie_str:
            sapisid = None
            for part in self.cookie_str.split(";"):
                if "=" in part:
                    k, v = part.strip().split("=", 1)
                    if k in ("SAPISID", "__Secure-3PAPISID", "__Secure-1PAPISID"):
                        sapisid = v
                        break
            return self.cookie_str, sapisid

        if not self.cookie_file or not os.path.exists(self.cookie_file):
            return "", None

        try:
            mtime = os.path.getmtime(self.cookie_file)
            if mtime == self._cookie_mtime and self._cached_cookie:
                return self._cached_cookie, self._cached_sapisid

            with open(self.cookie_file, "r", encoding="utf-8") as f:
                content = f.read().strip()

            if content.startswith("{"):
                data = json.loads(content)
                c_str = data.get("cookie", "")
                sapisid = data.get("sapisid", "")
            else:
                c_str = content
                sapisid = None
                for part in c_str.split(";"):
                    if "=" in part:
                        k, v = part.strip().split("=", 1)
                        if k in ("SAPISID", "__Secure-3PAPISID", "__Secure-1PAPISID"):
                            sapisid = v
                            break

            self._cached_cookie = c_str
            self._cached_sapisid = sapisid or None
            self._cookie_mtime = mtime
            return self._cached_cookie, self._cached_sapisid
        except Exception as e:
            logger.warning("Failed to load Gemini cookie file: %s", e)
            return "", None

    def _make_sapisidhash(self, sapisid: str) -> str:
        """Create SAPISIDHASH auth header from SAPISID."""
        import hashlib
        ts = int(time.time())
        h = hashlib.sha1(f"{ts} {sapisid} https://gemini.google.com".encode()).hexdigest()
        return f"SAPISIDHASH {ts}_{h}"

    def _clean_text(self, text: str) -> str:
        """Clean code reference artifacts and internal UI tokens from Gemini output."""
        text = re.sub(
            r'```(?:python|javascript|text)\?code_(?:reference|stdout)&code_event_index=\d+\n.*?```\n?',
            '', text, flags=re.DOTALL
        )
        text = re.sub(r'http://googleusercontent\.com/card_content/\d+\n?', '', text)
        text = re.sub(r'<ElicitationsGroup[^>]*>[\s\S]*?</ElicitationsGroup>', '', text)
        text = re.sub(r'<Elicitation[^/]*/>', '', text)
        text = re.sub(r'</?Elicitations?>', '', text)
        text = re.sub(r'</?Section[^>]*>', '', text)
        text = re.sub(r'<TextBox[^>]*/>', '', text)
        return text.strip()

    def _extract_text_from_raw(self, raw: str) -> str:
        """Parse Gemini StreamGenerate raw wrb.fr chunks to extract the longest response text."""
        bard_err = re.search(r'BardErrorInfo\s*\[(\d+)\]', raw)
        if bard_err:
            raise RuntimeError(f"Gemini upstream returned error: BardErrorInfo [{bard_err.group(1)}]")

        last_text = ""
        for line in raw.split("\n"):
            if '"wrb.fr"' not in line or len(line) < 200:
                continue
            try:
                arr = json.loads(line)
                inner_str = arr[0][2]
                if not inner_str or len(inner_str) < 50:
                    continue
                inner = json.loads(inner_str)
                if not (isinstance(inner, list) and len(inner) > 4 and inner[4]):
                    continue
                for part in inner[4]:
                    if isinstance(part, list) and len(part) > 1 and part[1] and isinstance(part[1], list):
                        for t in part[1]:
                            if isinstance(t, str) and len(t) > len(last_text):
                                last_text = t
            except (json.JSONDecodeError, IndexError, TypeError):
                continue

        return self._clean_text(last_text)

    def _generate_via_official_api(self, prompt: str, api_key: str) -> str:
        """Call the official Google Generative Language REST API."""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.2,
                "responseMimeType": "application/json"
            }
        }
        data = json.dumps(payload).encode("utf-8")
        headers = {"Content-Type": "application/json"}
        req = urllib.request.Request(url, data=data, headers=headers, method="POST")
        with urllib.request.urlopen(req, context=self._ssl_ctx, timeout=self.timeout_sec) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            res_json = json.loads(raw)
            candidates = res_json.get("candidates", [])
            if candidates and "content" in candidates[0]:
                parts = candidates[0]["content"].get("parts", [])
                if parts and "text" in parts[0]:
                    return parts[0]["text"].strip()
        raise RuntimeError("Official Gemini API returned unexpected response structure")

    def generate(self, prompt: str, model_id: int = 1, think_mode: int = 4) -> str:
        """Execute a text generation call against official API or Gemini StreamGenerate with retry."""
        # 1. Prefer official Google API Key if provided
        api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        if api_key and api_key.strip():
            try:
                logger.info("Using official Gemini API with configured key")
                return self._generate_via_official_api(prompt, api_key.strip())
            except Exception as e:
                logger.warning("Official Gemini API call failed, falling back to cookie client: %s", e)

        # 2. Fall back to cookie-authenticated StreamGenerate protocol
        inner = [None] * 80
        inner[0] = [prompt, 0, None, None, None, None, 0]
        inner[1] = ["en"]
        inner[2] = ["", "", "", None, None, None, None, None, None, ""]
        inner[6] = [0]
        inner[7] = 1
        inner[10] = 1
        inner[11] = 0
        inner[17] = [[think_mode]]
        inner[18] = 0
        inner[27] = 1
        inner[30] = [4]
        inner[41] = [1]  # Temporary chat
        inner[45] = 1
        inner[53] = 0
        inner[59] = str(uuid.uuid4())
        inner[61] = []
        inner[68] = 1
        inner[79] = model_id

        outer = [None, json.dumps(inner)]
        body = urllib.parse.urlencode({"f.req": json.dumps(outer)}).encode("utf-8")
        reqid = int(time.time()) % 1000000
        url = (
            f"https://gemini.google.com/_/BardChatUi/data/"
            f"assistant.lamda.BardFrontendService/StreamGenerate"
            f"?bl={self.gemini_bl}&hl=en&_reqid={reqid}&rt=c"
        )

        headers = {
            "Content-Type": "application/x-www-form-urlencoded",
            "Origin": "https://gemini.google.com",
            "Referer": "https://gemini.google.com/app",
            "X-Same-Domain": "1",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        }

        cookie_str, sapisid = self._load_cookie()
        if cookie_str:
            headers["Cookie"] = cookie_str
        if sapisid:
            headers["Authorization"] = self._make_sapisidhash(sapisid)

        last_err: Optional[Exception] = None
        for attempt in range(self.retry_attempts):
            try:
                req = urllib.request.Request(url, data=body, headers=headers, method="POST")
                with urllib.request.urlopen(req, context=self._ssl_ctx, timeout=self.timeout_sec) as resp:
                    raw = resp.read().decode("utf-8", errors="replace")
                    result = self._extract_text_from_raw(raw)
                    if result:
                        return result
                    raise RuntimeError("Gemini returned empty text response")
            except Exception as e:
                last_err = e
                logger.warning("Gemini generate attempt %d/%d failed: %s", attempt + 1, self.retry_attempts, e)
                if attempt < self.retry_attempts - 1:
                    time.sleep(1.5 * (attempt + 1))

        if last_err:
            raise last_err
        raise RuntimeError("Gemini text generation failed without an explicit error")
