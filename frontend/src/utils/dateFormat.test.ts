import { describe, it, expect } from 'vitest';
import { formatLongDate, formatShortDate } from './dateFormat';

// 3 September 2026, 14:05 local time.
const d = new Date(2026, 8, 3, 14, 5);

describe('formatLongDate', () => {
  it('names the month in Uzbek instead of ICU\'s "M09"', () => {
    // Chrome ICU lacks standalone Uzbek month names, requiring our mapped lookup
    const out = formatLongDate(d, 'uz');
    expect(out).toContain('sentyabr');
    expect(out).not.toMatch(/M\d\d/);
  });

  it('still reads correctly in Russian and English', () => {
    expect(formatLongDate(d, 'ru')).toContain('сентябрь'.slice(0, 6));
    expect(formatLongDate(d, 'en')).toContain('September');
  });

  it('returns an empty string for an unparseable date rather than "Invalid Date"', () => {
    expect(formatLongDate('not a date', 'uz')).toBe('');
  });
});

describe('formatShortDate', () => {
  it('never emits the ICU "M09" placeholder in any language', () => {
    for (const lang of ['uz', 'ru', 'en'] as const) {
      expect(formatShortDate(d, lang)).not.toMatch(/M\d\d/);
    }
  });

  it('appends a zero-padded time when asked', () => {
    expect(formatShortDate(d, 'uz', true)).toMatch(/\d{2}:\d{2}$/);
    expect(formatShortDate(new Date(2026, 8, 3, 9, 5), 'uz', true)).toContain('09:05');
  });

  it('accepts an ISO string, the shape the API returns', () => {
    expect(formatShortDate('2026-09-03T14:05:00', 'uz')).toContain('Sen');
  });

  it('returns an empty string for an unparseable date', () => {
    expect(formatShortDate('', 'uz')).toBe('');
  });
});
