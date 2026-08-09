export interface RegionListItem {
  id: string;
  name: string;
  count: string;
  isTashkentCity?: boolean;
  isTashkentViloyat?: boolean;
}

export const REGIONS_LIST: RegionListItem[] = [
  { id: "Toshkent", name: "Toshkent viloyati", count: "350+ bo'sh ish o'rni", isTashkentViloyat: true },
  { id: "Samarqand", name: "Samarqand viloyati", count: "1,200+ bo'sh ish o'rni" },
  { id: "Buxoro", name: "Buxoro viloyati", count: "450+ bo'sh ish o'rni" },
  { id: "Farg'ona", name: "Farg'ona viloyati", count: "600+ bo'sh ish o'rni" },
  { id: "Andijon", name: "Andijon viloyati", count: "500+ bo'sh ish o'rni" },
  { id: "Namangan", name: "Namangan viloyati", count: "400+ bo'sh ish o'rni" },
  { id: "Qashqadaryo", name: "Qashqadaryo viloyati", count: "300+ bo'sh ish o'rni" },
  { id: "Surxondaryo", name: "Surxondaryo viloyati", count: "180+ bo'sh ish o'rni" },
  { id: "Jizzax", name: "Jizzax viloyati", count: "150+ bo'sh ish o'rni" },
  { id: "Sirdaryo", name: "Sirdaryo viloyati", count: "120+ bo'sh ish o'rni" },
  { id: "Navoiy", name: "Navoiy viloyati", count: "140+ bo'sh ish o'rni" },
  { id: "Xorazm", name: "Xorazm viloyati", count: "210+ bo'sh ish o'rni" },
  { id: "Qoraqalpog'iston", name: "Qoraqalpog'iston Respublikasi", count: "250+ bo'sh ish o'rni" }
];

export const TASHKENT_CITY_DISTRICTS = [
  "Yunusobod tumani", "Chilonzor tumani", "Bektemir tumani", "Mirzo Ulug'bek tumani", 
  "Mirobod tumani", "Yashnobod tumani", "Shayxontohur tumani", "Uchtepa tumani", 
  "Yakkasaroy tumani", "Olmazor tumani", "Sergeli tumani", "Yangihayot tumani"
];

export const TASHKENT_VILOYATI_DISTRICTS = [
  "Chinoz tumani", "Quyi Chirchiq tumani", "Yangiyo'l tumani", "Oqqorg'on tumani", 
  "Bo'ka tumani", "Piskent tumani", "O'rtachirchiq tumani", "Parkent tumani", 
  "Bo'stonliq tumani", "Qibray tumani", "Ohangaron tumani", "Zangiota tumani"
];
