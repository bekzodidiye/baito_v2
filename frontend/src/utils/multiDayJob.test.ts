import { describe, it, expect } from 'vitest';
import { parseWorkDates } from './workDates';
import { getJobDuration } from './jobTimeUtils';
import type { Job } from '../types';

const job = (over: Partial<Job> = {}) => ({
  id: 'job-1', title: 'Omborxona', company: 'Korzinka',
  salary: '100000', location: 'Samarqand',
  workDate: '2026-09-02, 2026-09-03, 2026-09-04, 2026-09-05, 2026-09-06',
  ...over,
}) as Job;

/** A five-day shift was briefly created as five separate one-day postings, so
 *  the jobs list showed five identical cards. It is one posting again — which
 *  means the one card has to say how long it actually runs for, and the admin's
 *  day view has to find that one posting under each of its days. */
describe('A multi-day posting is one card that tells the truth', () => {
  it('counts the days rather than falling through to "1 kunlik"', () => {
    expect(getJobDuration(job())).toBe('5 kunlik');
  });

  it('says it in the reader’s language', () => {
    expect(getJobDuration(job(), 'ru')).toBe('5 дн.');
    expect(getJobDuration(job(), 'en')).toBe('5 days');
  });

  it('still reads "1 kunlik" for a single day', () => {
    expect(getJobDuration(job({ workDate: '2026-09-02' }))).toBe('1 kunlik');
    expect(getJobDuration(job({ workDate: '2026-09-02' }), 'en')).toBe('1 day');
  });

  it('handles the tilde range the form also writes', () => {
    expect(getJobDuration(job({ workDate: '2026-09-02~06' }))).toBe('5 kunlik');
  });

  it('prefers an explicit durationLabel when the row carries one', () => {
    expect(getJobDuration(job({ durationLabel: '2 haftalik' } as Partial<Job>))).toBe('2 haftalik');
  });

  it('never claims less than a day, even for an unparseable date', () => {
    expect(getJobDuration(job({ workDate: 'kelishilgan holda' }))).toBe('1 kunlik');
  });
});

/** AdminDailyJobs filters by `parseWorkDates(j.workDate).includes(selectedDate)`,
 *  which is what puts one posting on each of its days in the admin panel —
 *  separate rows to work through, one underlying job. */
describe('The admin day view finds the one posting under each of its days', () => {
  const onDay = (d: string) => parseWorkDates(job().workDate).includes(d);

  it('shows it on every day it is worked', () => {
    for (const d of ['2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05', '2026-09-06']) {
      expect(onDay(d)).toBe(true);
    }
  });

  it('does not show it on a day it is not worked', () => {
    expect(onDay('2026-09-07')).toBe(false);
    expect(onDay('2026-09-01')).toBe(false);
  });

  it('expands a tilde range to the same five days', () => {
    expect(parseWorkDates('2026-09-02~06')).toHaveLength(5);
  });
});
