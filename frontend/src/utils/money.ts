/** A sum of money, in the reader's language.
 *
 *  The amount was formatted in a dozen local helpers, each slightly different,
 *  and the word after it was written into the JSX as `so'm` in thirty-three
 *  places. A Russian reader saw "1 000 so'm" on their own screen; an English
 *  one saw the same.
 */
export type MoneyLanguage = 'uz' | 'ru' | 'en';

/** What the currency is called. English keeps the ISO code, which is what an
 *  English speaker reading an Uzbek invoice expects to see. */
export const CURRENCY: Record<MoneyLanguage, string> = {
  uz: "so'm",
  ru: 'сум',
  en: 'UZS',
};

const LOCALE: Record<MoneyLanguage, string> = {
  uz: 'uz-UZ',
  ru: 'ru-RU',
  en: 'en-US',
};

const lang = (language: string): MoneyLanguage =>
  language === 'ru' || language === 'en' ? language : 'uz';

/** `1000000` → `1 000 000`. Grouped with a non-breaking space so a figure
 *  never wraps across two lines in the middle. */
export const amount = (value: unknown, language: string): string => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  return n.toLocaleString(LOCALE[lang(language)]).replace(/[\s  ]/g, ' ');
};

/** `1000000, 'ru'` → `1 000 000 сум`. */
export const money = (value: unknown, language: string): string =>
  `${amount(value, language)} ${CURRENCY[lang(language)]}`;

/** If a salary string has a raw number or messy currency attached (e.g. "240000",
 *  "240000 UZS", "240 000 so'm"), extract the number and format it cleanly
 *  in the reader's language.
 *  @example formatSalary("240000", "uz") => "240 000 so'm"
 *  @example formatSalary("240000", "ru") => "240 000 сум"
 *  @example formatSalary("240000", "en") => "240 000 UZS"
 */
export const formatSalary = (value: unknown, language: string): string => {
  if (value === null || value === undefined || value === '') return '';
  const str = String(value).trim();
  if (!str) return '';

  // Extract optional period/unit suffix like "/ oy", "/ kun", "/ soat"
  const suffixMatch = str.match(/\s*(\/[a-zA-Zа-яА-ЯёЁo‘o'O‘O'\s]+)$/);
  const suffix = suffixMatch ? ` ${suffixMatch[1].trim()}` : '';
  let mainPart = suffixMatch ? str.slice(0, suffixMatch.index).trim() : str;

  // Strip trailing currency words if any (so'm, сум, UZS)
  mainPart = mainPart.replace(/\s*(?:so['\u2019]m|сум|UZS)\s*$/i, '').trim();
  mainPart = mainPart.replace(/^(?:dan|от|from)\s+/i, '').trim();

  // Check for salary range: "1 500 000 - 2 000 000", "1 500 000 dan 2 000 000 gacha", "от 1 500 000 до 2 000 000", "1.5m ~ 2m", etc.
  const rangeMatch = mainPart.match(
    /^(.+?)(?:\s*(?:[-–—~]|\.{2,})\s*|\s+(?:dan|to|до)\s+)(.+?)(?:\s*(?:gacha|до|to))?$/i,
  );
  if (rangeMatch) {
    const d1 = rangeMatch[1].replace(/[^0-9]/g, '');
    const d2 = rangeMatch[2].replace(/[^0-9]/g, '');
    if (d1 && d2) {
      return `${amount(d1, language)} – ${amount(d2, language)} ${CURRENCY[lang(language)]}${suffix}`;
    }
  }

  const digits = mainPart.replace(/[^0-9]/g, '');
  if (!digits) return str;
  return `${amount(digits, language)} ${CURRENCY[lang(language)]}${suffix}`;
};
