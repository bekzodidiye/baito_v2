import { describe, it, expect } from 'vitest';
import { parseWorkDates, workDateSummary } from './workDates';

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

describe('what a card says about a shift that runs over days', () => {
  it('shows a single day as itself', () => {
    expect(workDateSummary('2026-09-21', 'uz')).toEqual({
      label: '2026-09-21', full: '2026-09-21',
    });
  });

  it('shows several days as the first one and a count', () => {
    // The whole list wrapped onto three lines on the card; the count does not.
    expect(workDateSummary('2026-09-20, 2026-09-21, 2026-09-22', 'uz')?.label)
      .toBe('2026-09-20 · 3 kun');
  });

  it('counts a gap in the days rather than claiming a range', () => {
    // 14, 15, 17, 18 — nobody works the 16th, so "14 → 18" would be a lie.
    const s = workDateSummary('2026-09-14, 2026-09-15, 2026-09-17, 2026-09-18', 'uz');
    expect(s?.label).toBe('2026-09-14 · 4 kun');
    expect(s?.label).not.toContain('18');
  });

  it('keeps the whole list for the tooltip', () => {
    expect(workDateSummary('2026-09-20, 2026-09-21', 'uz')?.full)
      .toBe('2026-09-20, 2026-09-21');
  });

  it('counts the days in the reader’s language', () => {
    const many = '2026-09-20, 2026-09-21, 2026-09-22';
    expect(workDateSummary(many, 'ru')?.label).toContain('3 дн.');
    expect(workDateSummary(many, 'en')?.label).toContain('3 days');
    // Russian must not be the Uzbek word carried across.
    expect(workDateSummary(many, 'ru')?.label).not.toContain('kun');
  });

  it('says nothing at all when the posting names no day', () => {
    expect(workDateSummary('', 'uz')).toBeNull();
    expect(workDateSummary(null, 'uz')).toBeNull();
    expect(workDateSummary(undefined, 'uz')).toBeNull();
  });

  it('understands a range the same way the rest of the app does', () => {
    // "10~12" is three days, and the card should say so.
    expect(workDateSummary('10~12', 'uz')?.label).toContain('3 kun');
  });
});
