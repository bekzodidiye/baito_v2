import { Job } from '../types';
import { REGION_INFOS } from './regionInfos';
import { TEMPLATES } from './jobTemplates';

export const allGeneratedJobs: Job[] = [];
export const generatedJobsRu: Record<string, any> = {};
export const generatedJobsEn: Record<string, any> = {};

function getSeededHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

function getSeededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Generate exactly 1 job for EVERY district in ONLY Samarqand region of Uzbekistan
REGION_INFOS.forEach(info => {
  if (info.id !== "Samarqand") return;

  info.districtsUz.forEach((distUz, distIndex) => {
    const distRu = info.districtsRu[distIndex] || distUz;
    const distEn = info.districtsEn[distIndex] || distUz;

    // Deterministic random count: exactly 1 job per district
    const countToGenerate = 1;

    for (let j = 0; j < countToGenerate; j++) {
      const seed = getSeededHash(distUz) + j * 100;
      const template = TEMPLATES[seed % TEMPLATES.length];
      const jobId = `gen_${info.id.toLowerCase().replace(/['\s]/g, '')}_${distIndex}_${j}`;

      // Scatter cleanly within district boundaries in a pseudo-random natural pattern
      const randX = getSeededRandom(seed + 1);
      const randY = getSeededRandom(seed + 2);
      
      const x = Math.round(20 + randX * 60); // Spread within 20% to 80% range around the center
      const y = Math.round(20 + randY * 60);

      // Vary salary slightly to make it look dynamic
      const baseSalary = parseInt(template.salary.replace(/\s/g, ''));
      const salaryOffset = ((seed % 7) - 3) * 10000; // -30,000 to +30,000
      const finalSalaryVal = Math.max(100000, baseSalary + salaryOffset);
      
      const salaryUz = `${finalSalaryVal.toLocaleString('ru-RU').replace(/,/g, ' ')} so'm / kunlik`;
      const salaryRu = `${finalSalaryVal.toLocaleString('ru-RU').replace(/,/g, ' ')} сум / в день`;
      const salaryEn = `${finalSalaryVal.toLocaleString('en-US')} UZS / daily`;

      const generatedJob: Job = {
        id: jobId,
        title: template.title(distUz),
        company: template.company,
        logoUrl: template.logoUrl,
        salary: salaryUz,
        tags: template.tags,
        location: `${info.id}, ${distUz}`,
        coordinates: { x: Math.max(15, Math.min(85, x)), y: Math.max(15, Math.min(85, y)) },
        time: `2026-07-${(19 - j) < 10 ? '0' + (19 - j) : (19 - j)}`,
        urgent: j % 3 === 0,
        applied: false,
        bookmarked: false,
        status: 'none',
        description: template.description(distUz),
        hourlyRate: Math.round(finalSalaryVal / 8).toString(),
        transportRate: template.transportRate,
        periodText: `2026-07-${10 + (j % 20)} 09:00~17:00`,
        durationLabel: template.durationLabel
      };

      allGeneratedJobs.push(generatedJob);

      // Russian Translation
      generatedJobsRu[jobId] = {
        title: template.titleRu(distRu),
        company: template.companyRu,
        salary: salaryRu,
        tags: template.tagsRu,
        location: `${info.id === "Qoraqalpog'iston" ? "Каракалпакстан" : info.id === "Farg'ona" ? "Фергана" : info.id}, ${distRu}`,
        description: template.descriptionRu(distRu),
        durationLabel: template.durationLabelRu,
        hourlyRate: Math.round(finalSalaryVal / 8).toString(),
        transportRate: template.transportRateRu
      };

      // English Translation
      generatedJobsEn[jobId] = {
        title: template.titleEn(distEn),
        company: template.companyEn,
        salary: salaryEn,
        tags: template.tagsEn,
        location: `${info.id === "Qoraqalpog'iston" ? "Karakalpakstan" : info.id === "Farg'ona" ? "Fergana" : info.id}, ${distEn}`,
        description: template.descriptionEn(distEn),
        durationLabel: template.durationLabelEn,
        hourlyRate: Math.round(finalSalaryVal / 8).toString(),
        transportRate: template.transportRateEn
      };
    }
  });
});
