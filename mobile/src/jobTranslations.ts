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

export const getTranslatedJob = (job: Job, lang: Language): Job => {
  if (lang === 'uz') return job;

  const trans = jobTransData[job.id];
  if (!trans || !trans[lang]) return job;

  const t = trans[lang];
  return {
    ...job,
    title: t.title || job.title,
    company: t.company || job.company,
    salary: t.salary || job.salary,
    tags: t.tags || job.tags,
    location: t.location || job.location,
    rawLocation: job.location,
    description: t.description || job.description,
    hourlyRate: t.hourlyRate || job.hourlyRate,
    transportRate: t.transportRate || job.transportRate,
    durationLabel: t.durationLabel || job.durationLabel,
  };
};
