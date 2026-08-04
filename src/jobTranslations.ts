import { Job } from './types';
import { Language } from './translations';
import { jobDataRu } from './jobDataRu';
import { jobDataRu2 } from './jobDataRu2';
import { jobDataEn } from './jobDataEn';
import { jobDataEn2 } from './jobDataEn2';

import { samarqandJobsRu, samarqandJobsEn } from './data/samarqandJobs';
import { buxoroJobsRu, buxoroJobsEn } from './data/buxoroJobs';
import { ferganaJobsRu, ferganaJobsEn } from './data/ferganaJobs';
import { andijonJobsRu, andijonJobsEn } from './data/andijonJobs';
import { namanganJobsRu, namanganJobsEn } from './data/namanganJobs';
import { southernJobsRu, southernJobsEn } from './data/southernJobs';
import { centralJobsRu, centralJobsEn } from './data/centralJobs';
import { westernJobsRu, westernJobsEn } from './data/westernJobs';
import { generatedJobsRu, generatedJobsEn } from './data/jobGenerator';

const combinedRu = { 
  ...jobDataRu, 
  ...jobDataRu2,
  ...samarqandJobsRu,
  ...buxoroJobsRu,
  ...ferganaJobsRu,
  ...andijonJobsRu,
  ...namanganJobsRu,
  ...southernJobsRu,
  ...centralJobsRu,
  ...westernJobsRu,
  ...generatedJobsRu
};

const combinedEn = { 
  ...jobDataEn, 
  ...jobDataEn2,
  ...samarqandJobsEn,
  ...buxoroJobsEn,
  ...ferganaJobsEn,
  ...andijonJobsEn,
  ...namanganJobsEn,
  ...southernJobsEn,
  ...centralJobsEn,
  ...westernJobsEn,
  ...generatedJobsEn
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
