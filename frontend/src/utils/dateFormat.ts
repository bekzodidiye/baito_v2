export type DateLanguage = 'uz' | 'ru' | 'en';

// Chrome's ICU data has no month names for the uz locale: asking it for a
// named month gives "M09" instead of "Sentyabr", while ru and en resolve
// correctly. Every named-month date in the app therefore has to come from
// here rather than from toLocaleDateString.
export const MONTHS_TRANSLATIONS: Record<DateLanguage, string[]> = {
  uz: [
    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
    'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'
  ],
  ru: [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ],
  en: [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
};

const MONTHS_SHORT: Record<DateLanguage, string[]> = {
  uz: ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'],
  ru: ['янв.', 'февр.', 'мар.', 'апр.', 'мая', 'июн.', 'июл.', 'авг.', 'сент.', 'окт.', 'нояб.', 'дек.'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
};

export const WEEKDAYS_TRANSLATIONS: Record<DateLanguage, string[]> = {
  uz: ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'],
  ru: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
  en: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
};

const pad = (n: number) => String(n).padStart(2, '0');

/** Formats date into localized long string representation.
 * @example "3-sentyabr, 2026" (uz) · "3 сентября 2026 г." (ru) · "September 3, 2026" (en)
 */
export function formatLongDate(value: Date | string | number, language: DateLanguage): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const month = MONTHS_TRANSLATIONS[language][d.getMonth()];
  if (language === 'uz') return `${d.getDate()}-${month.toLowerCase()}, ${d.getFullYear()}`;
  if (language === 'ru') return `${d.getDate()} ${month.toLowerCase()} ${d.getFullYear()} г.`;
  return `${month} ${d.getDate()}, ${d.getFullYear()}`;
}

/** "3-sen" · "3 сент." · "Sep 3" — optionally with the time appended. */
export function formatShortDate(
  value: Date | string | number,
  language: DateLanguage,
  withTime = false
): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const month = MONTHS_SHORT[language][d.getMonth()];
  const date = language === 'en' ? `${month} ${d.getDate()}` : `${d.getDate()} ${month}`;
  return withTime ? `${date}, ${pad(d.getHours())}:${pad(d.getMinutes())}` : date;
}
