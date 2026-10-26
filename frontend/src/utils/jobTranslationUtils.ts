import { Job } from '../types';

export interface LocalizedJobFields {
  title: string;
  description: string;
  responsibilities?: string;
  requirements?: string;
  importantNote?: string;
}

/**
 * Returns translated fields for a job matching the user's selected language ('uz', 'ru', 'en').
 * Gracefully falls back to the job's original fields if a translation is not yet available.
 */
export function getJobLocalizedFields(job: Job, language: string): LocalizedJobFields {
  const langKey = language?.toLowerCase() || 'uz';
  const trans = job.translations?.[langKey];

  return {
    title: (trans?.title && trans.title.trim()) || job.title,
    description: (trans?.description && trans.description.trim()) || job.description,
    responsibilities: (trans?.responsibilities && trans.responsibilities.trim()) || job.responsibilities,
    requirements: (trans?.requirements && trans.requirements.trim()) || job.requirements,
    importantNote: (trans?.importantNote && trans.importantNote.trim()) || job.importantNote,
  };
}

export function getJobTitle(job: Job, language: string): string {
  const langKey = language?.toLowerCase() || 'uz';
  return (job.translations?.[langKey]?.title && job.translations[langKey].title!.trim()) || job.title;
}

export function getJobDescription(job: Job, language: string): string {
  const langKey = language?.toLowerCase() || 'uz';
  return (job.translations?.[langKey]?.description && job.translations[langKey].description!.trim()) || job.description;
}
