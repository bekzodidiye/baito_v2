import { Job } from '../types';

export interface CategoryInfo {
  id: string;
  nameUz: string;
  nameRu: string;
  nameEn: string;
  hexColor: string;
  badgeBg: string;
  badgeText: string;
  borderClass: string;
  dotBg: string;
}

export const CATEGORIES_CONFIG: Record<string, CategoryInfo> = {
  courier: {
    id: 'courier',
    nameUz: 'Kuryerlik & Yetkazish',
    nameRu: 'Доставка и курьеры',
    nameEn: 'Delivery & Courier',
    hexColor: '#f59e0b',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-700',
    borderClass: 'border-amber-200/70',
    dotBg: 'bg-amber-500',
  },
  food: {
    id: 'food',
    nameUz: 'Restoran & Kafe',
    nameRu: 'Рестораны и кафе',
    nameEn: 'Food & Restaurants',
    hexColor: '#e11d48',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-700',
    borderClass: 'border-rose-200/70',
    dotBg: 'bg-rose-500',
  },
  retail: {
    id: 'retail',
    nameUz: 'Savdo & Kassirlik',
    nameRu: 'Торговля и касса',
    nameEn: 'Retail & Cashier',
    hexColor: '#10b981',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    borderClass: 'border-emerald-200/70',
    dotBg: 'bg-emerald-500',
  },
  construction: {
    id: 'construction',
    nameUz: 'Qurilish & Yuk tashish',
    nameRu: 'Строительство и погрузка',
    nameEn: 'Construction & Moving',
    hexColor: '#2563eb',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
    borderClass: 'border-blue-200/70',
    dotBg: 'bg-blue-500',
  },
  service: {
    id: 'service',
    nameUz: 'Xizmatlar & Tozalash',
    nameRu: 'Услуги и уборка',
    nameEn: 'Services & Cleaning',
    hexColor: '#8b5cf6',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-700',
    borderClass: 'border-purple-200/70',
    dotBg: 'bg-purple-500',
  },
};

export const getJobCategory = (job: Job): CategoryInfo => {
  const text = `${job.title} ${job.company} ${(job.tags || []).join(' ')} ${job.description}`.toLowerCase();

  if (/kuryer|delivery|yetkaz|posilka|courier|samokat|velosiped/.test(text)) {
    return CATEGORIES_CONFIG.courier;
  }
  if (/ofitsiant|barista|fastfood|restoran|kafe|oshpaz|idish|ovqat|oshxona|bakery|promouter|promoter|oziq-ovqat/.test(text)) {
    return CATEGORIES_CONFIG.food;
  }
  if (/kassir|supermarket|korzinka|sotuvchi|chakana|magazin|konsultant|savdo|retail/.test(text)) {
    return CATEGORIES_CONFIG.retail;
  }
  if (/yuk|vagon|sement|qurilish|usta|santexnik|elektrik|mebel|tashuvchi|ombor|ishchi|mender|soatsoz/.test(text)) {
    return CATEGORIES_CONFIG.construction;
  }
  return CATEGORIES_CONFIG.service;
};

export const CATEGORY_FILTERS_LIST = [
  { id: 'Barchasi', labelUz: 'Barcha kategoriyalar', labelRu: 'Все категории', labelEn: 'All categories', shortUz: 'Barchasi' },
  { id: 'courier', labelUz: 'Kuryerlik & Yetkazish', labelRu: 'Доставка и курьеры', labelEn: 'Delivery & Courier', shortUz: 'Kuryerlik' },
  { id: 'food', labelUz: 'Restoran & Kafe', labelRu: 'Рестораны и кафе', labelEn: 'Food & Restaurants', shortUz: 'Restoran' },
  { id: 'retail', labelUz: 'Savdo & Kassirlik', labelRu: 'Торговля и касса', labelEn: 'Retail & Cashier', shortUz: 'Savdo' },
  { id: 'construction', labelUz: 'Qurilish & Yuk tashish', labelRu: 'Строительство и погрузка', labelEn: 'Construction & Moving', shortUz: 'Qurilish' },
  { id: 'service', labelUz: 'Xizmatlar & Tozalash', labelRu: 'Услуги и уборка', labelEn: 'Services & Cleaning', shortUz: 'Xizmatlar' },
];
