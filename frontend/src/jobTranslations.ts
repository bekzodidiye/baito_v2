import { Job } from './types';
import { Language } from './translations';
import { jobDataRu } from './jobDataRu';
import { jobDataRu2 } from './jobDataRu2';
import { jobDataEn } from './jobDataEn';
import { jobDataEn2 } from './jobDataEn2';

const combinedRu = { 
  ...jobDataRu, 
  ...jobDataRu2,
};

const combinedEn = { 
  ...jobDataEn, 
  ...jobDataEn2,
};

const jobTransData: Record<string, Record<'ru' | 'en', any>> = {};

// Build translation map
Object.keys(combinedRu).forEach(id => {
  jobTransData[id] = {
    ru: combinedRu[id],
    en: combinedEn[id]
  };
});

import { translateJobLocation } from './utils/jobTranslationUtils';

export const getTranslatedJob = (job: Job, lang: Language): Job => {
  if (!job) return job;

  const isCyrillic = (text?: string | null) => !!text && /[\u0400-\u04FF]/.test(text);
  const originalIsCyrillic = isCyrillic(job.title || job.description);

  // If viewing in same script family as original input, preserve authentic user input
  if ((lang === 'uz' && !originalIsCyrillic) || (lang === 'ru' && originalIsCyrillic)) {
    return {
      ...job,
      location: translateJobLocation(job.location, lang),
      rawLocation: job.rawLocation || job.location,
    };
  }

  // 1. Check for dynamic AI translations saved with the job
  if (job.translations && job.translations[lang]) {
    const t = job.translations[lang];
    return {
      ...job,
      title: t.title || job.title,
      description: t.description || job.description,
      responsibilities: t.responsibilities || job.responsibilities,
      requirements: t.requirements || job.requirements,
      importantNote: t.importantNote || job.importantNote,
      location: t.location || translateJobLocation(job.location, lang),
      rawLocation: job.rawLocation || job.location,
    };
  }

  if (lang === 'uz') return job;

  const trans = jobTransData[job.id];
  if (!trans || !trans[lang]) {
    return {
      ...job,
      location: translateJobLocation(job.location, lang),
      rawLocation: job.rawLocation || job.location,
    };
  }

  const t = trans[lang];
  return {
    ...job,
    title: t.title || job.title,
    company: t.company || job.company,
    salary: t.salary || job.salary,
    tags: t.tags || job.tags,
    location: t.location || translateJobLocation(job.location, lang),
    rawLocation: job.rawLocation || job.location,
    description: t.description || job.description,
    hourlyRate: t.hourlyRate || job.hourlyRate,
    transportRate: t.transportRate || job.transportRate,
    durationLabel: t.durationLabel || job.durationLabel,
  };
};

