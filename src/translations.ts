import { uz } from './translations/uz';
import { ru } from './translations/ru';
import { en } from './translations/en';

export type Language = 'uz' | 'ru' | 'en';

export const translations = {
  uz,
  ru,
  en
};

export const translateRegion = (name: string, lang: Language): string => {
  if (lang === 'uz') return name;
  const regionMap: Record<string, { ru: string; en: string }> = {
    "O'zbekiston": { ru: "Узбекистан", en: "Uzbekistan" },
    "Barchasi": { ru: "Все", en: "All" },
    // Short names
    "Qoraqalpog'iston": { ru: "Каракалпакстан", en: "Karakalpakstan" },
    "Xorazm": { ru: "Хорезм", en: "Khorezm" },
    "Navoiy": { ru: "Навои", en: "Navoiy" },
    "Buxoro": { ru: "Бухара", en: "Bukhara" },
    "Samarqand": { ru: "Самарканд", en: "Samarkand" },
    "Qashqadaryo": { ru: "Кашкадарья", en: "Kashkadarya" },
    "Surxondaryo": { ru: "Сурхандарья", en: "Surxondarya" },
    "Jizzax": { ru: "Джизак", en: "Jizzakh" },
    "Sirdaryo": { ru: "Сырдарья", en: "Sirdarya" },
    "Toshkent": { ru: "Ташкент", en: "Tashkent" },
    "Namangan": { ru: "Наманган", en: "Namangan" },
    "Farg'ona": { ru: "Фергана", en: "Fergana" },
    "Andijon": { ru: "Андижан", en: "Andijan" },

    // Full names
    "Toshkent viloyati": { ru: "Ташкентская область", en: "Tashkent region" },
    "Samarqand viloyati": { ru: "Самаркандская область", en: "Samarkand region" },
    "Buxoro viloyati": { ru: "Бухарская область", en: "Bukhara region" },
    "Farg'ona viloyati": { ru: "Ферганская область", en: "Fergana region" },
    "Andijon viloyati": { ru: "Андижанская область", en: "Andijan region" },
    "Namangan viloyati": { ru: "Наманганская область", en: "Namangan region" },
    "Qashqadaryo viloyati": { ru: "Кашкадарьинская область", en: "Kashkadarya region" },
    "Surxondaryo viloyati": { ru: "Сурхандарьинская область", en: "Surxondarya region" },
    "Jizzax viloyati": { ru: "Джизакская область", en: "Jizzakh region" },
    "Sirdaryo viloyati": { ru: "Сырдарьинская область", en: "Sirdarya region" },
    "Navoiy viloyati": { ru: "Навоийская область", en: "Navoiy region" },
    "Xorazm viloyati": { ru: "Хорезмская область", en: "Khorezm region" },
    "Qoraqalpog'iston Respublikasi": { ru: "Республика Каракалпакстан", en: "Republic of Karakalpakstan" },
    "Toshkent shahri": { ru: "Город Ташкент", en: "Tashkent city" },
  };

  const matched = regionMap[name];
  if (matched) return matched[lang];

  // Map districts
  if (name.toLowerCase().includes("tumani")) {
    const base = name.replace(/tumani/gi, "").trim();
    if (lang === 'ru') return `${base} район`;
    if (lang === 'en') return `${base} district`;
  }
  if (name.toLowerCase().includes("shahri")) {
    const base = name.replace(/shahri/gi, "").trim();
    if (lang === 'ru') return `город ${base}`;
    if (lang === 'en') return `${base} city`;
  }

  return name;
};
