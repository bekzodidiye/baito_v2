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
 *  in the reader's language ("240 000 so'm", "240 000 сум", "240 000 UZS"). */
export const formatSalary = (value: unknown, language: string): string => {
  if (value === null || value === undefined || value === '') return '';
  const str = String(value).trim();
  const digits = str.replace(/[^0-9]/g, '');
  if (!digits) return str;
  return money(digits, language);
};
