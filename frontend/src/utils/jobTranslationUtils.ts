import { Job } from '../types';

export interface LocalizedJobFields {
  title: string;
  description: string;
  responsibilities?: string;
  requirements?: string;
  importantNote?: string;
  location?: string;
}

export const UZBEKISTAN_LOCATION_MAP: Record<string, { ru: string; en: string }> = {
  // Regions and major cities
  "toshkent": { ru: "Ташкент", en: "Tashkent" },
  "samarqand": { ru: "Самарканд", en: "Samarkand" },
  "buxoro": { ru: "Бухара", en: "Bukhara" },
  "navoiy": { ru: "Навои", en: "Navoiy" },
  "andijon": { ru: "Андижан", en: "Andijan" },
  "farg'ona": { ru: "Фергана", en: "Fergana" },
  "fargona": { ru: "Фергана", en: "Fergana" },
  "namangan": { ru: "Наманган", en: "Namangan" },
  "nukus": { ru: "Нукус", en: "Nukus" },
  "urganch": { ru: "Ургенч", en: "Urgench" },
  "xiva": { ru: "Хива", en: "Khiva" },
  "xorazm": { ru: "Хорезм", en: "Khorezm" },
  "qashqadaryo": { ru: "Кашкадарья", en: "Kashkadarya" },
  "surxondaryo": { ru: "Сурхандарья", en: "Surkhandarya" },
  "jizzax": { ru: "Джизак", en: "Jizzakh" },
  "sirdaryo": { ru: "Сырдарья", en: "Sirdarya" },
  "qoraqalpog'iston": { ru: "Каракалпакстан", en: "Karakalpakstan" },
  "qoraqalpogiston": { ru: "Каракалпакстан", en: "Karakalpakstan" },
  "qo'qon": { ru: "Коканд", en: "Kokand" },
  "qoqon": { ru: "Коканд", en: "Kokand" },
  "marg'ilon": { ru: "Маргилан", en: "Margilan" },
  "margilon": { ru: "Маргилан", en: "Margilan" },
  "shahrixon": { ru: "Шахрихан", en: "Shakhrikhan" },
  "chortoq": { ru: "Чартак", en: "Chortoq" },
  "zarafshon": { ru: "Зарафшан", en: "Zarafshan" },
  "xo'jayli": { ru: "Ходжейли", en: "Khojeyli" },
  "xojayli": { ru: "Ходжейли", en: "Khojeyli" },
  "qarshi": { ru: "Карши", en: "Karshi" },
  "termiz": { ru: "Термез", en: "Termez" },
  "guliston": { ru: "Гулистан", en: "Gulistan" },
  "chirchiq": { ru: "Чирчик", en: "Chirchiq" },
  "olmaliq": { ru: "Алмалык", en: "Almalyk" },
  "angren": { ru: "Ангрен", en: "Angren" },
  "bekobod": { ru: "Бекабад", en: "Bekabad" },

  // Districts / Areas
  "eski shahar": { ru: "Старый город", en: "Old City" },
  "registon": { ru: "Регистан", en: "Registan" },
  "chilonzor": { ru: "Чиланзар", en: "Chilanzar" },
  "yunusobod": { ru: "Юнусабад", en: "Yunusabad" },
  "yakkasaroy": { ru: "Яккасарай", en: "Yakkasaray" },
  "mirobod": { ru: "Мирабад", en: "Mirabad" },
  "mirzo ulug'bek": { ru: "Мирзо Улугбек", en: "Mirzo Ulugbek" },
  "mirzo ulugbek": { ru: "Мирзо Улугбек", en: "Mirzo Ulugbek" },
  "shayxontohur": { ru: "Шайхантахур", en: "Shaykhontohur" },
  "olmazor": { ru: "Алмазар", en: "Almazar" },
  "uchtepa": { ru: "Учтепа", en: "Uchtepa" },
  "sergeli": { ru: "Сергели", en: "Sergeli" },
  "yangi hayot": { ru: "Янгихаёт", en: "Yangi Hayot" },
  "yashnobod": { ru: "Яшнабад", en: "Yashnabad" },
  "bektemir": { ru: "Бектемир", en: "Bektemir" },
  "chorsu": { ru: "Чорсу", en: "Chorsu" },
  "qoraqamish": { ru: "Каракамыш", en: "Karakamysh" },
  "qo'yliq": { ru: "Куйлюк", en: "Kuyluk" },
  "qoyliq": { ru: "Куйлюк", en: "Kuyluk" },
};

/**
 * Translates an Uzbekistan location string (e.g. "Buxoro, Eski shahar") into Russian or English.
 */
export function translateJobLocation(rawLocation: string | undefined | null, language: string): string {
  if (!rawLocation) return '';
  const langKey = language?.toLowerCase() || 'uz';
  if (langKey === 'uz') return rawLocation;

  // Split by comma if composite location (e.g. "Buxoro, Eski shahar")
  const parts = rawLocation.split(',').map(p => p.trim());
  const translatedParts = parts.map(part => {
    const key = part.toLowerCase();
    const entry = UZBEKISTAN_LOCATION_MAP[key];
    if (entry && (langKey === 'ru' || langKey === 'en')) {
      return entry[langKey];
    }
    return part;
  });

  return translatedParts.join(', ');
}

const isCyrillic = (text?: string | null) => !!text && /[\u0400-\u04FF]/.test(text);

/**
 * Returns translated fields for a job matching the user's selected language ('uz', 'ru', 'en').
 * Gracefully falls back to the job's original fields if a translation is not yet available.
 */
export function getJobLocalizedFields(job: Job, language: string): LocalizedJobFields {
  const langKey = language?.toLowerCase() || 'uz';
  const originalIsCyrillic = isCyrillic(job.title || job.description);

  // If viewing in Uzbek and original was written in Uzbek Latin, always use employer's authentic input
  if (langKey === 'uz' && !originalIsCyrillic) {
    return {
      title: job.title,
      description: job.description,
      responsibilities: job.responsibilities,
      requirements: job.requirements,
      importantNote: job.importantNote,
      location: job.location,
    };
  }

  // If viewing in Russian and original was written in Russian Cyrillic, always use employer's authentic input
  if (langKey === 'ru' && originalIsCyrillic) {
    return {
      title: job.title,
      description: job.description,
      responsibilities: job.responsibilities,
      requirements: job.requirements,
      importantNote: job.importantNote,
      location: translateJobLocation(job.location, 'ru'),
    };
  }

  const trans = job.translations?.[langKey];

  return {
    title: (trans?.title && trans.title.trim()) || job.title,
    description: (trans?.description && trans.description.trim()) || job.description,
    responsibilities: (trans?.responsibilities && trans.responsibilities.trim()) || job.responsibilities,
    requirements: (trans?.requirements && trans.requirements.trim()) || job.requirements,
    importantNote: (trans?.importantNote && trans.importantNote.trim()) || job.importantNote,
    location: (trans?.location && trans.location.trim()) || translateJobLocation(job.location, langKey),
  };
}

export function getJobTitle(job: Job, language: string): string {
  const langKey = language?.toLowerCase() || 'uz';
  const originalIsCyrillic = isCyrillic(job.title);

  if (langKey === 'uz' && !originalIsCyrillic) {
    return job.title;
  }
  if (langKey === 'ru' && originalIsCyrillic) {
    return job.title;
  }

  return (job.translations?.[langKey]?.title && job.translations[langKey].title!.trim()) || job.title;
}

export function getJobDescription(job: Job, language: string): string {
  const langKey = language?.toLowerCase() || 'uz';
  const originalIsCyrillic = isCyrillic(job.title || job.description);

  if (langKey === 'uz' && !originalIsCyrillic) {
    return job.description;
  }
  if (langKey === 'ru' && originalIsCyrillic) {
    return job.description;
  }

  return (job.translations?.[langKey]?.description && job.translations[langKey].description!.trim()) || job.description;
}

export function getJobLocation(job: Job, language: string): string {
  const langKey = language?.toLowerCase() || 'uz';
  if (langKey === 'uz') return job.location;
  if (job.translations?.[langKey]?.location && job.translations[langKey].location.trim()) {
    return job.translations[langKey].location.trim();
  }
  return translateJobLocation(job.location, langKey);
}

