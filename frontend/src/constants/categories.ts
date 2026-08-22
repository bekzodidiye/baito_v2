export interface CategoryOption {
  id: string;
  labelUz: string;
  labelRu: string;
  labelEn: string;
  iconName?: string;
}

export const CATEGORIES_LIST: CategoryOption[] = [
  { id: 'retail', labelUz: 'Chakana savdo va Supermarket', labelRu: 'Розничная торговля', labelEn: 'Retail & Supermarket' },
  { id: 'food', labelUz: 'Oziq-ovqat va Restoran', labelRu: 'Рестораны и Питание', labelEn: 'Restaurants & Catering' },
  { id: 'logistics', labelUz: 'Ombor va Kuryerlik / Kuryer', labelRu: 'Склад и Доставка', labelEn: 'Logistics & Delivery' },
  { id: 'construction', labelUz: 'Qurilish va Ta\'mirlash', labelRu: 'Строительство и Ремонт', labelEn: 'Construction & Repair' },
  { id: 'auto', labelUz: 'Avtoservis va Haydovchilik', labelRu: 'Автосервис и Вождение', labelEn: 'Auto Service & Transport' },
  { id: 'service', labelUz: 'Xizmat ko\'rsatish va Tozalash', labelRu: 'Обслуживание и Клининг', labelEn: 'Services & Cleaning' },
  { id: 'manufacturing', labelUz: 'Ishlab chiqarish va Tekstil', labelRu: 'Производство и Текстиль', labelEn: 'Manufacturing & Textile' },
  { id: 'office', labelUz: 'Ofis, Ma\'muriyat va Koll-sentr', labelRu: 'Офис, Админ и Колл-центр', labelEn: 'Office, Admin & Call Center' },
  { id: 'beauty', labelUz: 'Go\'zallik va Salomatlik', labelRu: 'Красота и Здоровье', labelEn: 'Beauty & Wellness' },
  { id: 'events', labelUz: 'Tadbirlar va Promo-aktsiya', labelRu: 'Мероприятия и Промо', labelEn: 'Events & Promotions' },
  { id: 'it', labelUz: 'IT, Dizayn va Marketing', labelRu: 'ИТ, Дизайн и Маркетинг', labelEn: 'IT, Design & Marketing' },
  { id: 'education', labelUz: 'Ta\'lim va Repetitorlik', labelRu: 'Образование и Репетиторство', labelEn: 'Education & Tutoring' },
  { id: 'security', labelUz: 'Xavfsizlik va Qo\'riqlash', labelRu: 'Безопасность и Охрана', labelEn: 'Security & Guarding' },
  { id: 'agriculture', labelUz: 'Qishloq xo\'jaligi va Bog\'dorchilik', labelRu: 'Сельское хозяйство', labelEn: 'Agriculture & Gardening' },
];

export const getCategoryLabel = (id: string, lang: 'uz' | 'ru' | 'en' = 'uz'): string => {
  const cat = CATEGORIES_LIST.find(c => c.id === id);
  if (!cat) return id;
  if (lang === 'ru') return cat.labelRu;
  if (lang === 'en') return cat.labelEn;
  return cat.labelUz;
};
