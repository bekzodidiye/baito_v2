import { describe, it, expect } from 'vitest';
import { formatDateDisplay } from './components/JobPostStepTwo.utils';
import { monthNames, weekdayNames } from '../../components/common/DateTimePickerModal.utils';

/** Found by creating a real posting on the deployed site with the interface in
 *  Russian. The whole flow answered in Uzbek or in English: the date picker's
 *  months and weekday headers, the date summary, and — in six places — a
 *  ternary whose Russian branch had been filled with the English text. */
describe('The date picker speaks the employer’s language', () => {
  it('names the months', () => {
    expect(monthNames('ru')[8]).toBe('Сентябрь');
    expect(monthNames('en')[8]).toBe('September');
    expect(monthNames('uz')[8]).toBe('Sentyabr');
  });

  it('gives every language twelve months', () => {
    for (const lang of ['uz', 'ru', 'en'] as const) {
      expect(monthNames(lang)).toHaveLength(12);
    }
  });

  it('heads the columns with weekdays', () => {
    expect(weekdayNames('ru')[0]).toBe('Вс');
    expect(weekdayNames('en')[0]).toBe('Sun');
    expect(weekdayNames('uz')[0]).toBe('Yak');
  });

  /** The grid is laid out from Date.getDay(), where 0 is Sunday. A
   *  Monday-first table would shift every column by one — which is why this
   *  does not reuse the one in dateFormat.ts. */
  it('starts the week on Sunday in every language', () => {
    for (const lang of ['uz', 'ru', 'en'] as const) {
      expect(weekdayNames(lang)).toHaveLength(7);
    }
    expect(weekdayNames('ru')).toEqual(['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']);
  });
});

describe('The date summary on step two', () => {
  const RANGE = '2026-09-20, 2026-09-21, 2026-09-22';

  it('abbreviates the month in the right language', () => {
    expect(formatDateDisplay(RANGE, 'ru')).toBe('20 - 22 сен, 2026');
    expect(formatDateDisplay(RANGE, 'en')).toBe('20 - 22 Sep, 2026');
    expect(formatDateDisplay(RANGE, 'uz')).toBe('20 - 22 Sen, 2026');
  });

  it('handles a single day the same way', () => {
    expect(formatDateDisplay('2026-09-20', 'ru')).toBe('20-сен, 2026');
    expect(formatDateDisplay('2026-09-20', 'en')).toBe('20-Sep, 2026');
  });

  it('lists non-consecutive days rather than pretending they are a range', () => {
    const shown = formatDateDisplay('2026-09-20, 2026-09-22', 'ru');
    expect(shown).toContain('20, 22');
    expect(shown).not.toContain('20 - 22');
  });

  it('says nothing when there is no date, rather than inventing one', () => {
    // It used to return a hardcoded '2026-08-05'.
    expect(formatDateDisplay('', 'ru')).toBe('');
  });

  it('defaults to Uzbek when no language is given', () => {
    expect(formatDateDisplay(RANGE)).toBe('20 - 22 Sen, 2026');
  });
});
