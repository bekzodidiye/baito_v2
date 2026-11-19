"""Tests for AI Translator service."""

import unittest
from unittest.mock import MagicMock
from app.services.ai_translator.job_translator import (
    _parse_json_from_response,
    _build_fallback_translations,
    translate_job_content,
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

    def test_preserves_original_uzbek_verbatim_despite_ai_rewriting(self):
        mock_client = MagicMock(spec=GeminiClient)
        # AI tries to rewrite the title to something else completely
        mock_client.generate.return_value = '''{
            "uz": {"title": "Sotuvchi-kassir", "description": "Chakana savdo tarmog'imizga tajribali sotuvchi kerak"},
            "ru": {"title": "Продавец-кассир", "description": "В розничную сеть требуется продавец"},
            "en": {"title": "Cashier", "description": "Retail chain needs a cashier"}
        }'''

        res = translate_job_content(
            title="Omborchi kerak",
            description="Yuk ortish va tushirish ishlari",
            responsibilities="Yuklarni joylashtirish",
            client=mock_client
        )
        # uz MUST be the user's authentic input, NOT the AI's rewritten "Sotuvchi-kassir"
        self.assertEqual(res["uz"]["title"], "Omborchi kerak")
        self.assertEqual(res["uz"]["description"], "Yuk ortish va tushirish ishlari")
        self.assertEqual(res["uz"]["responsibilities"], "Yuklarni joylashtirish")

        # ru and en receive the translated output
        self.assertEqual(res["ru"]["title"], "Продавец-кассир")
        self.assertEqual(res["en"]["title"], "Cashier")

    def test_strips_hallucinated_fields_not_in_user_input(self):
        mock_client = MagicMock(spec=GeminiClient)
        # AI hallucinates requirements and importantNote which the user never entered
        mock_client.generate.return_value = '''{
            "uz": {
                "title": "Haydovchi", "description": "Taksi haydovchisi",
                "requirements": "3 yil staj", "importantNote": "Mashina o'ziniki bo'lishi kerak"
            },
            "ru": {
                "title": "Водитель", "description": "Водитель такси",
                "requirements": "3 года стажа", "importantNote": "Личный авто"
            },
            "en": {
                "title": "Driver", "description": "Taxi driver",
                "requirements": "3 years exp", "importantNote": "Own car"
            }
        }'''

        res = translate_job_content(
            title="Haydovchi",
            description="Taksi haydovchisi",
            client=mock_client
        )
        # Since user never passed requirements or importantNote, they must NOT exist in the translations
        self.assertNotIn("requirements", res["uz"])
        self.assertNotIn("requirements", res["ru"])
        self.assertNotIn("requirements", res["en"])
        self.assertNotIn("importantNote", res["uz"])
        self.assertNotIn("importantNote", res["ru"])
        self.assertNotIn("importantNote", res["en"])

    def test_job_translation_agent_identity_and_methods(self):
        from app.services.ai_translator.agent import JobTranslationAgent, get_translation_agent

        agent = get_translation_agent()
        self.assertEqual(agent.AGENT_NAME, "BaitoJobTranslationAgent")
        self.assertEqual(agent.VERSION, "1.0.0")

        mock_client = MagicMock(spec=GeminiClient)
        mock_client.generate.return_value = '''{
            "uz": {"title": "Duradgor", "description": "Mebel yasash"},
            "ru": {"title": "Плотник", "description": "Изготовление мебели"},
            "en": {"title": "Carpenter", "description": "Furniture making"}
        }'''
        custom_agent = JobTranslationAgent(client=mock_client)
        res = custom_agent.translate(
            title="Duradgor",
            description="Mebel yasash"
        )
        self.assertEqual(res["uz"]["title"], "Duradgor")
        self.assertEqual(res["ru"]["title"], "Плотник")
        self.assertEqual(res["en"]["title"], "Carpenter")


if __name__ == "__main__":
    unittest.main()

