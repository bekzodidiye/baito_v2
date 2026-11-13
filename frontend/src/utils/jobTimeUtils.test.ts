import { describe, it, expect } from 'vitest';
import { getJobShiftTime, getJobDateDisplay, getJobDuration, getJobShiftHours } from './jobTimeUtils';
import type { Job } from '../types';

/**
 * These three read a shift's time out of whichever field happens to carry it —
 * the data has arrived in several shapes over the life of the product. The
 * order they try those fields in is the whole behaviour, and it is invisible
 * until a listing shows the wrong hours.
 */
const job = (fields: Partial<Job>) => fields as Job;

describe('getJobShiftTime', () => {
  it('prefers the explicit field over anything it would have to parse', () => {
    expect(getJobShiftTime(job({
      workTime: '10:00 - 19:00',
      periodText: '2026-08-05 (08:00~17:00)',
    }))).toBe('10:00 - 19:00');
  });

  it('parses the range out of periodText, normalising the tilde', () => {
    expect(getJobShiftTime(job({ periodText: '2026-08-05 (08:00~17:00)' })))
      .toBe('08:00 - 17:00');
  });

  it('falls back to the legacy time field when it holds a clock time', () => {
    expect(getJobShiftTime(job({ time: '07:30~16:30' }))).toBe('07:30 - 16:30');
  });

  it('ignores a legacy time field that holds a date, not a time', () => {
    expect(getJobShiftTime(job({ time: '2026-08-05' }))).toBe('09:00 - 18:00');
  });

  it('has a default rather than showing an empty slot', () => {
    expect(getJobShiftTime(job({}))).toBe('09:00 - 18:00');
  });
});

describe('getJobDateDisplay', () => {
  it('prefers the explicit field', () => {
    expect(getJobDateDisplay(job({ workDate: '2026-09-01', periodText: '2026-08-05' })))
      .toBe('2026-09-01');
  });

  it('parses a date out of periodText', () => {
    expect(getJobDateDisplay(job({ periodText: '2026-08-05 (08:00~17:00)' })))
      .toBe('2026-08-05');
  });

  it('keeps a range suffix when the posting carries one', () => {
    expect(getJobDateDisplay(job({ periodText: '2026-08-05~07 smena' })))
      .toBe('2026-08-05~07');
  });

  it('falls back to today rather than to an empty string', () => {
    expect(getJobDateDisplay(job({}))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('getJobDuration', () => {
  it('uses the label when there is one', () => {
    expect(getJobDuration(job({ durationLabel: '3 kunlik' }))).toBe('3 kunlik');
  });

  it('rejects a label that is really a date, and looks further', () => {
    expect(getJobDuration(job({
      durationLabel: '2026-08-05',
      periodText: '2026-08-05 (9 soatlik smena)',
    }))).toBe('9 soatlik smena');
  });

  it('falls back to a single day', () => {
    expect(getJobDuration(job({}))).toBe('1 kunlik');
  });
});

describe('getJobShiftHours', () => {
  it('calculates duration for standard shift 09:00 - 18:00 as 9 hours', () => {
    expect(getJobShiftHours(job({ workTime: '09:00 - 18:00' }))).toBe(9);
  });

  it('calculates duration for 08:00 - 16:00 as 8 hours', () => {
    expect(getJobShiftHours(job({ workTime: '08:00 - 16:00' }))).toBe(8);
  });

  it('handles overnight shifts e.g. 22:00 - 06:00', () => {
    expect(getJobShiftHours(job({ workTime: '22:00 - 06:00' }))).toBe(8);
  });
});
