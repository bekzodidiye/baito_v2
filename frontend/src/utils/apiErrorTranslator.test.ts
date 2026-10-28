/** Every message the server can put in front of a person, in their language.
 *
 *  The backend answers a failed request with an Uzbek `detail`, and the client
 *  shows it — that is what makes a failure actionable. Shown raw it hands
 *  Uzbek to a Russian reader, which is what saving a profile with a taken
 *  email did: "Bu email allaqachon ro'yxatdan o'tgan" on a Russian screen.
 *
 *  `backend/tests/test_error_details_are_known.py` walks the backend source
 *  and fails when a detail appears that this file does not cover.
 */
import { describe, it, expect } from 'vitest';
import { translateApiError } from './apiErrorTranslator';

const LANGS = ['ru', 'en'] as const;

/** Letter pairs that occur in Uzbek and in neither of the other two. */
const UZBEK = /\b(bo['’]lmaydi|yo['’]q|topilmadi|emas|kerak|qiling|huquqingiz|allaqachon|mumkin|yuborilmagan|tasdiqlang|kiriting)\b/i;

const SAMPLES = [
  "Bu email allaqachon ro'yxatdan o'tgan",
  "Bu raqam allaqachon ro'yxatdan o'tgan",
  'Telefon raqam yoki parol xato',
  'Joriy parol xato',
  "Balansda yetarli mablag' mavjud emas",
  "Bu e'lon yopilgan",
  "Bu e'lonni tahrirlash huquqingiz yo'q",
  'Ish topilmadi',
  'Foydalanuvchi topilmadi',
  "Faqat ishchilar ariza topshira oladi",
  "Iltimos, ariza topshirishdan oldin profilingizni to'liq to'ldiring",
  'Hisobingiz bloklangan',
  "Sessiya muddati tugagan, qayta kiring",
  "Bir kunda ko'pi bilan 2 ta ishga ariza topshirishingiz mumkin!",
  "Bu ishchi ushbu ish uchun yollanmagan — to'lov chiqarib bo'lmaydi",
  "Yollangan ishchini rad etib bo'lmaydi, avval ishni bekor qiling",
  'Fayl hajmi 15 MB dan oshmasligi kerak',
  "To'lov tizimi hozircha ulanmagan. Iltimos, keyinroq urinib ko'ring.",
  "Yakunlangan ishni bekor qilib bo'lmaydi",
  "Ishda tayinlangan ishchi yo'q, nizo ochish mumkin emas",
  "Bu ish allaqachon bekor qilingan",
  "Nizo holatidagi ishni bekor qilib bo'lmaydi, avval nizoni hal qiling",
];

describe('translateApiError', () => {
  it('leaves Uzbek alone', () => {
    for (const s of SAMPLES) expect(translateApiError(s, 'uz')).toBe(s);
  });

  for (const lang of LANGS) {
    it.each(SAMPLES)(`translates %s into ${lang}`, (detail) => {
      const got = translateApiError(detail, lang);
      expect(got).not.toBe(detail);
      expect(got).not.toMatch(UZBEK);
      expect(got.trim()).not.toBe('');
    });
  }

  it('answers a Russian reader in Cyrillic', () => {
    for (const s of SAMPLES) {
      expect(translateApiError(s, 'ru'), s).toMatch(/[а-яА-ЯёЁ]/);
    }
  });

  it('carries the value a templated message was built around', () => {
    const ru = translateApiError("Bu ish bo'yicha barcha 5 ta o'rin to'lgan", 'ru');
    expect(ru).toContain('5');
    expect(ru).toMatch(/[а-яА-Я]/);

    const en = translateApiError("Ko'pi bilan 3 ta karta qo'shish mumkin", 'en');
    expect(en).toContain('3');
    expect(en).not.toMatch(/karta/i);

    const status = translateApiError("Bu so'rov allaqachon ko'rib chiqilgan (holat: rad etilgan)", 'ru');
    expect(status).toContain('rad etilgan');
  });

  it('carries the date a refusal was built around', () => {
    const ru = translateApiError("2026-09-21 hali kelmadi — o'sha kuni yakunlang", 'ru');
    expect(ru).toContain('2026-09-21');
    expect(ru).toMatch(/[а-яА-Я]/);
    expect(ru).not.toMatch(/kelmadi|yakunlang/);

    const en = translateApiError("2026-09-21 hali kelmadi — o'sha kuni yakunlang", 'en');
    expect(en).toContain('2026-09-21');
    expect(en).not.toMatch(/kelmadi/);
  });

  it('hands back a provider string untouched', () => {
    // "Card not found" from the payment gateway is the same word a support
    // conversation will use; translating it would only make that harder.
    for (const s of ['Card not found', 'Invalid signature', 'Amount mismatch']) {
      expect(translateApiError(s, 'ru')).toBe(s);
    }
  });

  it('hands back something it has never seen rather than a shrug', () => {
    const odd = 'Proxy timed out after 30s';
    expect(translateApiError(odd, 'ru')).toBe(odd);
  });

  it('survives an empty or missing detail', () => {
    for (const bad of ['', '   ', undefined as unknown as string, null as unknown as string]) {
      expect(() => translateApiError(bad, 'ru')).not.toThrow();
      expect(translateApiError(bad, 'ru')).toBe('');
    }
  });
});
