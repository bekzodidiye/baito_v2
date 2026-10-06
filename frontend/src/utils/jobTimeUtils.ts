import { parseWorkDates } from './workDates';
import { Job } from '../types';

/**
 * Extract clean working hours (e.g. "09:00 - 18:00") from a job
 */
export const getJobShiftTime = (job: Job): string => {
  if (job.workTime) {
    return job.workTime;
  }
  if (job.periodText) {
    const match = job.periodText.match(/\d{1,2}:\d{2}\s*[~-]\s*\d{1,2}:\d{2}/);
    if (match) {
      return match[0].replace('~', ' - ');
    }
  }
  if (job.time && /\d{1,2}:\d{2}/.test(job.time)) {
    return job.time.replace('~', ' - ');
  }
  return '09:00 - 18:00';
};

/**
 * Extract clean date display (e.g. "2026-08-05") from a job.
 */
export const getJobDateDisplay = (job: Job): string => {
  if (job.workDate) {
    return job.workDate;
  }
  if (job.periodText) {
    const match = job.periodText.match(/\d{4}-\d{2}-\d{2}(~\d{2})?/);
    if (match) {
      return match[0];
    }
  }
  if (job.time && /\d{4}-\d{2}-\d{2}/.test(job.time)) {
    return job.time;
  }
  return new Date().toISOString().split('T')[0];
};

/**
 * How long a posting runs for, as it appears on its card.
 *
 * This used to fall through to a flat "1 kunlik" whenever `durationLabel` was
 * missing, which is always: the field is on the Job row but not on JobCreate,
 * so nothing a client sends ever reaches it. That was survivable while a
 * five-day shift was five separate one-day postings. It is one posting again,
 * so a card that says "1 kunlik" for a five-day run is now simply wrong —
 * count the days instead.
 */
export const getJobDuration = (job: Job, language: 'uz' | 'ru' | 'en' = 'uz'): string => {
  if (job.durationLabel && !/\d{4}-\d{2}-\d{2}/.test(job.durationLabel)) {
    return job.durationLabel;
  }
  if (job.periodText) {
    const match = job.periodText.match(/\((\d+\s*soat[^)]*)\)/);
    if (match) return match[1];
  }
  const days = Math.max(1, parseWorkDates(job.workDate).length);
  if (language === 'ru') return `${days} дн.`;
  if (language === 'en') return days === 1 ? '1 day' : `${days} days`;
  return `${days} kunlik`;
};
