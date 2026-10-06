import { MONTHS_TRANSLATIONS, DateLanguage } from '../../utils/dateFormat';

/** Month names for the picker's header.
 *
 *  The picker carried its own Uzbek-only copy while dateFormat.ts already held
 *  all three, so a Russian employer picking dates read "Sentabr 2026" over a
 *  Russian form. This is that table, under the name the picker uses.
 */
export const monthNames = (language: DateLanguage): string[] =>
  MONTHS_TRANSLATIONS[language] ?? MONTHS_TRANSLATIONS.uz;

/** Weekday headers, **Sunday first**.
 *
 *  Deliberately not the table in dateFormat.ts: that one starts on Monday, and
 *  the grid below is laid out from `Date.getDay()`, where 0 is Sunday. Reusing
 *  it would have shifted every column by one.
 */
export const WEEKDAYS_SUNDAY_FIRST: Record<DateLanguage, string[]> = {
  uz: ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan'],
  ru: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};

export const weekdayNames = (language: DateLanguage): string[] =>
  WEEKDAYS_SUNDAY_FIRST[language] ?? WEEKDAYS_SUNDAY_FIRST.uz;

export const parseInitial24hTime = (timeValue: string): { hour: number; minute: number } => {
  if (!timeValue) return { hour: 9, minute: 0 };
  const [hStr, mStr] = timeValue.split(':');
  const h = parseInt(hStr || '9', 10);
  const m = parseInt(mStr || '0', 10);
  return {
    hour: isNaN(h) ? 9 : Math.max(0, Math.min(23, h)),
    minute: isNaN(m) ? 0 : Math.max(0, Math.min(59, m))
  };
};

export const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

export const getFirstDayOfWeek = (year: number, month: number): number => {
  return new Date(year, month, 1).getDay();
};
