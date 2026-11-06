import { describe, it, expect } from 'vitest';
import { 
  getJobTitle, 
  getJobDescription, 
  getJobLocalizedFields,
  translateJobLocation,
  getJobLocation,
} from './jobTranslationUtils';
import { getTranslatedJob } from '../jobTranslations';
import { Job } from '../types';

describe('Job Translation Utilities', () => {
  const mockJob: Job = {
    id: 'test-job-1',
    title: 'Kassir kerak',
    company: 'Korzinka',
    salary: '250000',
    tags: ['savdo', 'kassa'],
    location: 'Toshkent',
    coordinates: { x: 50, y: 50 },
    time: '09:00 - 18:00',
    urgent: false,
    applied: false,
    bookmarked: false,
    status: 'open',
    description: 'Do\'konga tajribali kassir kerak. Tushlik bepul.',
    responsibilities: 'Kassada ishlash\nCheklarni urish',
    requirements: '1 yil tajriba\nHalollik',
    importantNote: 'Pasport bilan kelish',
    translations: {
      uz: {
        title: 'Kassir kerak',
        description: 'Do\'konga tajribali kassir kerak. Tushlik bepul.',
        responsibilities: 'Kassada ishlash\nCheklarni urish',
        requirements: '1 yil tajriba\nHalollik',
        importantNote: 'Pasport bilan kelish',
      },
      ru: {
        title: 'Требуется кассир',
        description: 'В магазин требуется опытный кассир. Бесплатный обед.',
        responsibilities: 'Работа на кассе\nПробитие чеков',
        requirements: 'Опыт от 1 года\nЧестность',
        importantNote: 'Приходить с паспортом',
      },
      en: {
        title: 'Cashier Needed',
        description: 'An experienced cashier is needed for a store. Free lunch.',
        responsibilities: 'Cash register operations\nPrinting receipts',
        requirements: '1 year experience\nHonesty',
        importantNote: 'Bring passport',
      },
    },
  };

  it('correctly retrieves translated title for each language', () => {
    expect(getJobTitle(mockJob, 'uz')).toBe('Kassir kerak');
    expect(getJobTitle(mockJob, 'ru')).toBe('Требуется кассир');
    expect(getJobTitle(mockJob, 'en')).toBe('Cashier Needed');
  });

  it('correctly retrieves translated description for each language', () => {
    expect(getJobDescription(mockJob, 'uz')).toContain('tajribali kassir kerak');
    expect(getJobDescription(mockJob, 'ru')).toContain('требуется опытный кассир');
    expect(getJobDescription(mockJob, 'en')).toContain('experienced cashier is needed');
  });

  it('falls back to default title and description when translation is missing', () => {
    const jobWithoutTrans: Job = {
      ...mockJob,
      translations: undefined,
    };
    expect(getJobTitle(jobWithoutTrans, 'ru')).toBe('Kassir kerak');
    expect(getJobDescription(jobWithoutTrans, 'en')).toBe(mockJob.description);
  });

  it('getJobLocalizedFields returns all localized fields', () => {
    const fieldsRu = getJobLocalizedFields(mockJob, 'ru');
    expect(fieldsRu.title).toBe('Требуется кассир');
    expect(fieldsRu.description).toContain('опытный кассир');
    expect(fieldsRu.responsibilities).toContain('Работа на кассе');
    expect(fieldsRu.requirements).toContain('Опыт от 1 года');
    expect(fieldsRu.importantNote).toBe('Приходить с паспортом');

    const fieldsEn = getJobLocalizedFields(mockJob, 'en');
    expect(fieldsEn.title).toBe('Cashier Needed');
    expect(fieldsEn.responsibilities).toContain('Cash register operations');
  });

  it('getTranslatedJob integrates dynamic translations into full Job object', () => {
    const translatedRu = getTranslatedJob(mockJob, 'ru');
    expect(translatedRu.title).toBe('Требуется кассир');
    expect(translatedRu.description).toContain('опытный кассир');
    expect(translatedRu.responsibilities).toBe('Работа на кассе\nПробитие чеков');

    const translatedEn = getTranslatedJob(mockJob, 'en');
    expect(translatedEn.title).toBe('Cashier Needed');
    expect(translatedEn.description).toContain('experienced cashier');

    const translatedUz = getTranslatedJob(mockJob, 'uz');
    expect(translatedUz.title).toBe('Kassir kerak');
  });

  it('preserves authentic Uzbek Latin title and description on uz locale even if translations object has different text', () => {
    const jobWithAlteredTrans: Job = {
      ...mockJob,
      title: 'Omborchi kerak',
      description: 'Omborda yuk ortish',
      responsibilities: 'Yuk tushirish',
      translations: {
        uz: {
          title: 'Sotuvchi-kassir', // AI hallucinated title
          description: 'Chakana savdo do\'koni',
          responsibilities: 'Kassada ishlash',
        },
        ru: {
          title: 'Грузчик на склад',
          description: 'Погрузка на складе',
          responsibilities: 'Разгрузка',
        },
        en: {
          title: 'Warehouse Loader',
          description: 'Loading at warehouse',
          responsibilities: 'Unloading',
        },
      },
    };

    // On Uzbek locale, must NEVER display the AI hallucinated "Sotuvchi-kassir", but the employer's real input
    expect(getJobTitle(jobWithAlteredTrans, 'uz')).toBe('Omborchi kerak');
    expect(getJobDescription(jobWithAlteredTrans, 'uz')).toBe('Omborda yuk ortish');
    const fieldsUz = getJobLocalizedFields(jobWithAlteredTrans, 'uz');
    expect(fieldsUz.title).toBe('Omborchi kerak');
    expect(fieldsUz.responsibilities).toBe('Yuk tushirish');

    // On Russian and English locales, it correctly displays the translations
    expect(getJobTitle(jobWithAlteredTrans, 'ru')).toBe('Грузчик на склад');
    expect(getJobTitle(jobWithAlteredTrans, 'en')).toBe('Warehouse Loader');
  });

  it('preserves authentic Russian Cyrillic title on ru locale and translates to uz locale', () => {
    const russianJob: Job = {
      ...mockJob,
      title: 'Повар горячего цеха',
      description: 'Приготовление блюд',
      translations: {
        uz: {
          title: 'Issiq sex oshpazi',
          description: 'Taomlar tayyorlash',
        },
        ru: {
          title: 'Шеф-повар ресторана', // altered
        },
        en: {
          title: 'Hot Line Cook',
        },
      },
    };

    // On ru locale, original Russian input is preserved
    expect(getJobTitle(russianJob, 'ru')).toBe('Повар горячего цеха');
    // On uz locale, translated Uzbek is shown
    expect(getJobTitle(russianJob, 'uz')).toBe('Issiq sex oshpazi');
  });

  describe('Location Translation QA Edge Cases', () => {
    it('correctly translates composite location into Russian and English', () => {
      expect(translateJobLocation('Buxoro, Eski shahar', 'ru')).toBe('Бухара, Старый город');
      expect(translateJobLocation('Buxoro, Eski shahar', 'en')).toBe('Bukhara, Old City');
      expect(translateJobLocation('Toshkent, Yunusobod', 'ru')).toBe('Ташкент, Юнусабад');
      expect(translateJobLocation('Toshkent, Yunusobod', 'en')).toBe('Tashkent, Yunusabad');
      expect(translateJobLocation('Urganch, Xiva', 'ru')).toBe('Ургенч, Хива');
      expect(translateJobLocation('Urganch, Xiva', 'en')).toBe('Urgench, Khiva');
    });

    it('preserves Uzbek original on uz locale', () => {
      expect(translateJobLocation('Buxoro, Eski shahar', 'uz')).toBe('Buxoro, Eski shahar');
    });

    it('gracefully handles missing, unknown, or empty locations without throwing', () => {
      expect(translateJobLocation('', 'ru')).toBe('');
      expect(translateJobLocation(null as any, 'ru')).toBe('');
      expect(translateJobLocation(undefined as any, 'en')).toBe('');
      expect(translateJobLocation('Unknown Street 99', 'ru')).toBe('Unknown Street 99');
    });

    it('prioritizes dynamic AI location if present in translations', () => {
      const jobWithAILoc: Job = {
        ...mockJob,
        location: 'Buxoro, Eski shahar',
        translations: {
          ru: {
            title: 'Повар',
            location: 'Бухара, Древняя крепость',
          },
        },
      };
      expect(getJobLocation(jobWithAILoc, 'ru')).toBe('Бухара, Древняя крепость');
    });
  });
});

