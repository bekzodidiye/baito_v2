import { describe, it, expect } from 'vitest';
import { parseWorkDates } from './workDates';

describe('parseWorkDates', () => {
  it('reads a single date', () => {
    expect(parseWorkDates('2026-09-06')).toEqual(['2026-09-06']);
  });

  it('reads every day of a comma-separated shift', () => {
    // The value that exposed the bug: a three-day job showed on one day.
    expect(parseWorkDates('2026-09-02, 2026-09-03, 2026-09-04')).toEqual([
      '2026-09-02',
      '2026-09-03',
      '2026-09-04',
    ]);
  });

  it('expands a day range', () => {
    const dates = parseWorkDates('2026-09-02 ~ 2026-09-05');
    expect(dates).toEqual(['2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05']);
  });

  it('does not mistake an ISO date for a range', () => {
    expect(parseWorkDates('2026-09-02')).toEqual(['2026-09-02']);
  });

  it('returns nothing for an empty or unparseable value', () => {
    expect(parseWorkDates('')).toEqual([]);
    expect(parseWorkDates(undefined)).toEqual([]);
    expect(parseWorkDates('kelishilgan holda')).toEqual([]);
  });

  it('drops junk but keeps the dates around it', () => {
    expect(parseWorkDates('2026-09-02, ???, 2026-09-04')).toEqual([
      '2026-09-02',
      '2026-09-04',
    ]);
  });
});
