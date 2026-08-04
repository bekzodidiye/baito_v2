import { Language } from '../../translations';

export const REGIONS_LIST = [
  'Barchasi', 
  'Toshkent', 
  'Samarqand', 
  'Buxoro', 
  'Andijon', 
  'Farg\'ona', 
  'Namangan', 
  'Jizzax', 
  'Sirdaryo', 
  'Qashqadaryo', 
  'Surxondaryo', 
  'Navoiy', 
  'Xorazm', 
  'Qoraqalpog\'iston',
];

export const getRegionDisplayName = (loc: string, lang: Language): string => {
  if (loc === 'Barchasi') return lang === 'uz' ? 'Barcha hududlar' : lang === 'ru' ? 'Все регионы' : 'All regions';
  if (loc === 'Toshkent') return lang === 'uz' ? 'Toshkent' : lang === 'ru' ? 'Ташкент' : 'Tashkent';
  if (loc === 'Samarqand') return lang === 'uz' ? 'Samarqand' : lang === 'ru' ? 'Самарканд' : 'Samarkand';
  if (loc === 'Buxoro') return lang === 'uz' ? 'Buxoro' : lang === 'ru' ? 'Бухара' : 'Bukhara';
  if (loc === 'Andijon') return lang === 'uz' ? 'Andijon' : lang === 'ru' ? 'Андижан' : 'Andijan';
  if (loc === 'Farg\'ona') return lang === 'uz' ? 'Farg\'ona' : lang === 'ru' ? 'Фергана' : 'Fergana';
  if (loc === 'Namangan') return lang === 'uz' ? 'Namangan' : lang === 'ru' ? 'Наманган' : 'Namangan';
  if (loc === 'Jizzax') return lang === 'uz' ? 'Jizzax' : lang === 'ru' ? 'Джизак' : 'Jizzakh';
  if (loc === 'Sirdaryo') return lang === 'uz' ? 'Sirdaryo' : lang === 'ru' ? 'Сырдарья' : 'Sirdarya';
  if (loc === 'Qashqadaryo') return lang === 'uz' ? 'Qashqadaryo' : lang === 'ru' ? 'Кашкадарья' : 'Kashkadarya';
  if (loc === 'Surxondaryo') return lang === 'uz' ? 'Surxondaryo' : lang === 'ru' ? 'Сурхандарья' : 'Surxondarya';
  if (loc === 'Navoiy') return lang === 'uz' ? 'Navoiy' : lang === 'ru' ? 'Навои' : 'Navoiy';
  if (loc === 'Xorazm') return lang === 'uz' ? 'Xorazm' : lang === 'ru' ? 'Хорезм' : 'Khorezm';
  if (loc === "Qoraqalpog'iston") return lang === 'uz' ? "Qoraqalpog'iston" : lang === 'ru' ? 'Каракалпакстан' : 'Karakalpakstan';
  return loc;
};
