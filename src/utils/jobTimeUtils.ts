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
 * Extract duration label (e.g. "1 kunlik")
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
