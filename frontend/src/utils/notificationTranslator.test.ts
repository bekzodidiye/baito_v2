/** Every notification the backend writes, in every language it is read in.
 *
 *  Notification titles and bodies are composed in Uzbek on the server and
 *  stored that way. The client translates them on the way out. When a template
 *  has no entry here the fallback returns it unchanged, so a Russian reader
 *  gets a Russian screen with an Uzbek sentence sitting in the middle of it —
 *  which is exactly what production was doing.
 *
 *  `backend/tests/test_notification_templates_are_known.py` walks the backend
 *  source and fails when a template appears there that is not in this list, so
 *  a new notification cannot ship without its translation.
 */
import { describe, it, expect } from 'vitest';
import { translateNotification } from './notificationTranslator';

/** Placeholders are filled the way the backend fills them. */
const TITLES = [
  'Ariza qaytarib olindi',
  'Ariza rad etildi',
  "E'lon muddati tugadi",
  "E'loningiz rad etildi",
  "E'loningiz tasdiqlandi",
  "Hisob-faktura to'landi deb belgilandi",
  'Ish beruvchi sharh qoldirdi',
  'Ish boshlandi',
  'Ish boshlandi!',
  "Ish bo'yicha nizo ochildi",
  "Ish e'loni bekor qilindi",
  "Ish holati o'zgardi",
  'Ish kuni yakunlandi',
  "Ish tayinlanishi o'zgardi",
  'Ish yakunlandi',
  "Mablag' qaytarildi",
  "Mablag' yechildi",
  'Murojaatingizga javob',
  'Nizo hal qilindi',
  "Nizo holati o'zgardi",
  'Sizni ishga qabul qilishdi!',
  'Sizni ishga tayinlashdi',
  "To'lov amalga oshirildi",
  "To'lov chiqarildi",
  "To'lov tasdiqlandi",
  'Verifikatsiya holati',
  'Yangi ariza keldi',
  "Yangi e'lon moderatsiyada",
  'Yangi nizo kelib tushdi',
  "Yangi yordam so'rovi",
  "Yechish so'rovi rad etildi",
  'Yordam markaziga xabar',
  // No longer emitted; the rows it wrote are still in the database.
  'Ishchi ishni boshlashga tayyor',
];

const MESSAGES = [
  "'Ofitsiant' bo'yicha qo'llab-quvvatlash javob berdi.",
  "'Ofitsiant' e'loni administrator tomonidan bekor qilindi.",
  "'Ofitsiant' e'loni ish beruvchi tomonidan bekor qilindi.",
  "'Ofitsiant' e'loni muddati tugaganligi sababli bekor qilindi.",
  "'Ofitsiant' e'loni tasdiqlash uchun kutilmoqda.",
  "'Ofitsiant' e'loningiz administrator tomonidan rad etildi.",
  "'Ofitsiant' e'loningiz administrator tomonidan rad etildi. Sabab: kelishmovchilik",
  "'Ofitsiant' e'loningiz administrator tomonidan tasdiqlandi va faol holatga o'tkazildi.",
  "'Ofitsiant' e'loningiz administrator tomonidan tasdiqlandi va ishchilarga ko'rina boshladi.",
  "'Ofitsiant' ishi bo'yicha arizangiz rad etildi.",
  "'Ofitsiant' ishi bo'yicha ish beruvchi sizga 5 yulduzli baho va sharh qoldirdi.",
  "'Ofitsiant' ishi bo'yicha ishchi ishni boshladi.",
  "'Ofitsiant' ishi bo'yicha nizo ish beruvchi foydasiga hal qilindi.",
  "'Ofitsiant' ishi bo'yicha nizo ishchi foydasiga hal qilindi.",
  "'Ofitsiant' ishi bo'yicha nizo ochildi va moderatorlar ko'rib chiqmoqda.",
  "'Ofitsiant' ishi bo'yicha nizo ochildi. Sabab: kelishmovchilik",
  "'Ofitsiant' ishi bo'yicha nizo sizning foydangizga hal qilindi va to'lov hisobingizga o'tkazildi.",
  "'Ofitsiant' ishi bo'yicha nizo sizning foydangizga hal qilindi.",
  "'Ofitsiant' ishi bo'yicha 100 000 so'm to'lovingiz bank hisobingizga o'tkazildi.",
  "'Ofitsiant' ishi bo'yicha muzlatilgan mablag' hisobingizga qaytarildi.",
  "'Ofitsiant' ishi bo'yicha tayinlov administrator tomonidan o'zgartirildi.",
  "'Ofitsiant' ishi bo'yicha to'lov administrator tomonidan chiqarildi.",
  "'Ofitsiant' ishi ishchi tomonidan yakunlandi. Iltimos, ishchiga baho va sharh qoldiring.",
  "'Ofitsiant' ishi qaytadan ochiq holatga o'tkazildi.",
  "'Ofitsiant' ishi rasman boshlandi.",
  "'Ofitsiant' ishiga administrator tomonidan tayinlandingiz.",
  "'Ofitsiant' ishiga qabul qilindingiz. Tafsilotlarni ko'ring.",
  "Ishchi 'Ofitsiant' ishiga ariza topshirdi.",
  "Ishchi 'Ofitsiant' ishiga topshirgan arizasini qaytarib oldi.",
  "Siz ishtirok etgan nizo bo'yicha qaror qabul qilindi: hal qilindi.",
  "Foydalanuvchi Bekzod yordam so'radi: iltimos yordam bering",
  // The reason is free text the administrator typed; only the frame around it
  // is translated, so the sample here deliberately carries no Uzbek of its own.
  "100 000 so'm balansingizga qaytarildi. Sabab: refund #42",
  "100 000 so'm kartangizga o'tkazildi.",
  "INV-20260907-1150F341 · 103 000 so'm. Ish yakunlandi.",
  "bekzod — INV-1 · 103 000 so'm. Chek ilova qilingan. Bank ko'chirmasi bilan solishtiring.",
  "bekzod — INV-1 · 103 000 so'm. Chek ilova qilinmagan. Bank ko'chirmasi bilan solishtiring.",
  // Assembled into a variable before the call, which is how they were missed.
  "'Ofitsiant' ishining 2026-09-20 kuni yakunlandi, shu kun uchun to'lov hisobingizga o'tkazildi.",
  "'Ofitsiant' ishining 2026-09-20 kuni yakunlandi. To'lov ish beruvchi tomonidan alohida amalga oshiriladi.",
  "'Ofitsiant' ishi bo'yicha to'lov hisobingizga o'tkazildi.",
  "'Ofitsiant' ishi bo'yicha to'lov hisobingizga o'tkazildi. Ish beruvchi qo'shimcha 50000 so'm bonus qo'shdi.",
  "'Ofitsiant' ishi yakunlandi. To'lov ish beruvchi tomonidan alohida amalga oshiriladi.",
  'Sizning shaxsingiz va hujjatlaringiz tasdiqlandi!',
  "Hujjatlaringiz rad etildi, iltimos qaytadan to'g'ri hujjatlarni yuklang.",
  // Still in production from a code path that has since been removed.
  "'Ofitsiant' ishi bo'yicha ishchi boshlashni so'radi. Tasdiqlang.",
];

/** Letter pairs that only occur in Uzbek, never in Russian or English output. */
const UZBEK = /\b(ishi|ishining|ishiga|yakunlandi|tasdiqlandi|qilindi|bo'yicha|hisobingizga|so'm|hujjatlaringiz|topshirdi|tayyor)\b/i;

describe('translateNotification', () => {
  it('leaves Uzbek alone', () => {
    for (const s of [...TITLES, ...MESSAGES]) {
      expect(translateNotification(s, 'uz')).toBe(s);
    }
  });

  for (const lang of ['ru', 'en'] as const) {
    describe(lang, () => {
      it.each(TITLES)('translates the title %s', (title) => {
        const got = translateNotification(title, lang);
        expect(got).not.toBe(title);
        expect(got).not.toMatch(UZBEK);
      });

      it.each(MESSAGES)('translates the message %s', (message) => {
        const got = translateNotification(message, lang);
        expect(got).not.toBe(message);
        expect(got).not.toMatch(UZBEK);
      });
    });
  }

  it('keeps the values the sentence was built around', () => {
    const got = translateNotification(
      "'Ofitsiant' ishining 2026-09-20 kuni yakunlandi, shu kun uchun to'lov hisobingizga o'tkazildi.",
      'ru',
    );
    expect(got).toContain('Ofitsiant');
    expect(got).toContain('2026-09-20');
  });

  it('carries the bonus figure across, and omits it when there was none', () => {
    const withBonus = translateNotification(
      "'Ofitsiant' ishi bo'yicha to'lov hisobingizga o'tkazildi. Ish beruvchi qo'shimcha 50000 so'm bonus qo'shdi.",
      'ru',
    );
    expect(withBonus).toContain('50000');

    const without = translateNotification(
      "'Ofitsiant' ishi bo'yicha to'lov hisobingizga o'tkazildi.",
      'ru',
    );
    expect(without).not.toMatch(/бонус/i);
  });

  it('carries a refund reason through untouched', () => {
    const got = translateNotification(
      "100 000 so'm balansingizga qaytarildi. Sabab: Ish bekor qilindi",
      'ru',
    );
    expect(got).toContain('Ish bekor qilindi');
    expect(got).toContain('возвращено на ваш баланс');
  });

  it('hands back free text an administrator typed, rather than guessing', () => {
    // Broadcasts and the editable verification templates are the admin's own
    // words. There is nothing to look up, and inventing a translation would
    // put words in their mouth.
    const typed = 'Ertaga tushdan keyin texnik ishlar bo‘ladi.';
    expect(translateNotification(typed, 'ru')).toBe(typed);
  });
});
