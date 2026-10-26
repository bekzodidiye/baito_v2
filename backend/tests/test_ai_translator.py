"""Tests for AI Translator service."""

import unittest
from unittest.mock import MagicMock, patch
from app.services.ai_translator.job_translator import (
    _parse_json_from_response,
    _build_fallback_translations,
    translate_job_content,
    translate_and_save_job,
)
from app.services.ai_translator.gemini_client import GeminiClient


class TestAITranslator(unittest.TestCase):
    def test_parse_json_from_response_direct(self):
        raw = '{"uz": {"title": "Oshpaz"}, "ru": {"title": "Повар"}, "en": {"title": "Cook"}}'
        parsed = _parse_json_from_response(raw)
        self.assertIsNotNone(parsed)
        self.assertEqual(parsed["uz"]["title"], "Oshpaz")
        self.assertEqual(parsed["ru"]["title"], "Повар")
        self.assertEqual(parsed["en"]["title"], "Cook")

    def test_parse_json_from_response_markdown(self):
        raw = '''Here is the translation:
```json
{
  "uz": {"title": "Haydovchi", "description": "Taksi haydovchisi"},
  "ru": {"title": "Водитель", "description": "Водитель такси"},
  "en": {"title": "Driver", "description": "Taxi driver"}
}
```
Hope that helps!'''
        parsed = _parse_json_from_response(raw)
        self.assertIsNotNone(parsed)
        self.assertEqual(parsed["uz"]["title"], "Haydovchi")
        self.assertEqual(parsed["ru"]["title"], "Водитель")
        self.assertEqual(parsed["en"]["title"], "Driver")

    def test_parse_json_from_response_invalid(self):
        raw = "Not a json response"
        parsed = _parse_json_from_response(raw)
        self.assertIsNone(parsed)

    def test_fallback_translations(self):
        fb = _build_fallback_translations(
            title="Oshpaz kerak",
            description="Restoranga",
            responsibilities="Idish yuvish",
            requirements="1 yil tajriba",
            important_note="Ertalab kelish",
        )
        self.assertIn("uz", fb)
        self.assertIn("ru", fb)
        self.assertIn("en", fb)
        self.assertEqual(fb["uz"]["title"], "Oshpaz kerak")
        self.assertEqual(fb["ru"]["title"], "Oshpaz kerak")
        self.assertEqual(fb["en"]["title"], "Oshpaz kerak")
        self.assertEqual(fb["ru"]["responsibilities"], "Idish yuvish")

    def test_translate_job_content_with_mock_client(self):
        mock_client = MagicMock(spec=GeminiClient)
        mock_client.generate.return_value = '''{
            "uz": {"title": "Kassir", "description": "Do'konga kassir kerak"},
            "ru": {"title": "Кассир", "description": "В магазин требуется кассир"},
            "en": {"title": "Cashier", "description": "Cashier needed for a store"}
        }'''

        res = translate_job_content(
            title="Kassir",
            description="Do'konga kassir kerak",
            client=mock_client
        )
        self.assertEqual(res["uz"]["title"], "Kassir")
        self.assertEqual(res["ru"]["title"], "Кассир")
        self.assertEqual(res["en"]["title"], "Cashier")
        mock_client.generate.assert_called_once()

    def test_translate_job_content_fallback_on_error(self):
        mock_client = MagicMock(spec=GeminiClient)
        mock_client.generate.side_effect = RuntimeError("Network timeout")

        res = translate_job_content(
            title="Yuk tashuvchi",
            description="Omborga ishchi kerak",
            client=mock_client
        )
        self.assertEqual(res["uz"]["title"], "Yuk tashuvchi")
        self.assertEqual(res["ru"]["title"], "Yuk tashuvchi")
        self.assertEqual(res["en"]["title"], "Yuk tashuvchi")


if __name__ == "__main__":
    unittest.main()

