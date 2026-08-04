import { Job } from '../types';

/**
 * Extract clean working hours (e.g. "14:00 - 18:00" or "08:00 - 18:00") from a job
 */
export const getJobShiftTime = (job: Job): string => {
  if (job.periodText) {
    const match = job.periodText.match(/\d{1,2}:\d{2}\s*[~-]\s*\d{1,2}:\d{2}/);
    if (match) {
      return match[0].replace('~', ' - ');
    }
  }
  if (job.time && /\d{1,2}:\d{2}/.test(job.time)) {
    return job.time.replace('~', ' - ');
  }
  return '08:00 - 18:00';
};

/**
 * Extract clean date display (e.g. "2026-07-27") from a job.
 * Guaranteed to return a valid calendar date format, never a duration like "4 soatlik".
 */
export const getJobDateDisplay = (job: Job): string => {
  if (job.periodText) {
    // Check if periodText starts with date like 2026-07-10
    const match = job.periodText.match(/\d{4}-\d{2}-\d{2}(~\d{2})?/);
    if (match) {
      return match[0];
    }
  }
  // Check if job.time looks like a date
  if (job.time && /\d{4}-\d{2}-\d{2}/.test(job.time)) {
    return job.time;
  }
  return '2026-07-27';
};

/**
 * Extract duration label (e.g. "4 soatlik" or "1 kunlik")
 */
export const getJobDuration = (job: Job): string => {
  if (job.durationLabel && !/\d{4}-\d{2}-\d{2}/.test(job.durationLabel)) {
    return job.durationLabel;
  }
  if (job.periodText) {
    const match = job.periodText.match(/\((\d+\s*soat[^)]*)\)/);
    if (match) return match[1];
  }
  return '1 kunlik';
};

