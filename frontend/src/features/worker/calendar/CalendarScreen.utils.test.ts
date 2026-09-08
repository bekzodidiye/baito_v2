import { describe, it, expect } from 'vitest';
import { isDayInPast } from './CalendarScreen.utils';

// The calendar is showing September 2026 (currentMonth is 0-indexed, so 8) and
// its reference date — the day the app considers "now" — is 2026-09-03, which
// arrives already parsed from a YYYY-MM-DD string, so its month is 1-indexed.
const SEPT = 8;
const REF = { year: 2026, month: 9, day: 3 };

const past = (day: number, year = 2026, month = SEPT) =>
  isDayInPast(day, year, month, REF.year, REF.month, REF.day);

describe('isDayInPast', () => {
  it('does not treat the reference day itself as past', () => {
    // The 0-indexed/1-indexed mix-up made this true, which labelled a job due
    // today as "O'tkazib yuborildi" (missed) in its own calendar tooltip.
    expect(past(3)).toBe(false);
  });

  it('does not treat later days of the same month as past', () => {
    expect(past(4)).toBe(false);
    expect(past(30)).toBe(false);
  });

  it('still treats earlier days of the same month as past', () => {
    expect(past(1)).toBe(true);
    expect(past(2)).toBe(true);
  });

  it('treats every day of an earlier month as past', () => {
    expect(past(28, 2026, 7)).toBe(true);  // August
    expect(past(1, 2026, 0)).toBe(true);   // January
  });

  it('treats no day of a later month as past', () => {
    expect(past(1, 2026, 9)).toBe(false);  // October
    expect(past(31, 2026, 11)).toBe(false); // December
  });

  it('compares the year before anything else', () => {
    expect(past(31, 2025, 11)).toBe(true);  // Dec 2025, before the ref year
    expect(past(1, 2027, 0)).toBe(false);   // Jan 2027, after it
  });
});
