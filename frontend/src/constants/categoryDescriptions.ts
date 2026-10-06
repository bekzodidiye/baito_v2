/** What each category covers, in the three languages the app offers.
 *
 *  The description on a landing card comes from the database, where a category
 *  row holds one description and it is written in Uzbek — so every card carried
 *  an Uzbek line under a translated name. The slugs are the same ones
 *  CATEGORIES_LIST already keys on, so a category the platform ships is
 *  described in the reader's language and one an administrator adds later keeps
 *  whatever description they wrote.
 *
 *  The Uzbek text is the seed's own, verbatim (migration 0016).
 */
export const CATEGORY_DESCRIPTIONS: Record<string, { uz: string; ru: string; en: string }> = {
  retail: {
    uz: "Do'kon va supermarketlarda kassa, rasta va mijozlarga xizmat.",
    ru: 'Касса, выкладка и обслуживание покупателей в магазинах и супермаркетах.',
    en: 'Tills, shelf-stacking and serving customers in shops and supermarkets.',
  },
  food: {
    uz: 'Restoran, kafe va oshxonalarda zal va oshxona ishlari.',
    ru: 'Работа в зале и на кухне в ресторанах, кафе и столовых.',
    en: 'Front-of-house and kitchen work in restaurants, cafés and canteens.',
  },
  logistics: {
    uz: 'Ombor ishlari, yuk tashish va kuryerlik xizmati.',
    ru: 'Складские работы, погрузка и курьерская доставка.',
    en: 'Warehouse work, loading and courier delivery.',
  },
  construction: {
    uz: "Qurilish maydonlari va ta'mirlash ishlari.",
    ru: 'Стройплощадки и ремонтные работы.',
    en: 'Building sites and repair work.',
  },
  auto: {
    uz: 'Avtoservis, yuvish va haydovchilik xizmatlari.',
    ru: 'Автосервис, мойка и услуги водителя.',
    en: 'Garages, car washes and driving jobs.',
  },
  service: {
    uz: "Tozalash, xizmat ko'rsatish va maishiy ishlar.",
    ru: 'Уборка, бытовые услуги и хозяйственные работы.',
    en: 'Cleaning, household services and general upkeep.',
  },
  manufacturing: {
    uz: 'Ishlab chiqarish liniyalari va tekstil sexlari.',
    ru: 'Производственные линии и текстильные цеха.',
    en: 'Production lines and textile workshops.',
  },
  office: {
    uz: "Ofis, ma'muriyat va koll-markaz vazifalari.",
    ru: 'Офис, администрирование и работа в колл-центре.',
    en: 'Office, administration and call-centre work.',
  },
  beauty: {
    uz: "Salon, go'zallik va salomatlik xizmatlari.",
    ru: 'Салоны, красота и оздоровительные услуги.',
    en: 'Salons, beauty and wellbeing services.',
  },
  events: {
    uz: 'Tadbirlar, promo-aktsiyalar va reklama ishlari.',
    ru: 'Мероприятия, промо-акции и рекламные работы.',
    en: 'Events, promotions and advertising work.',
  },
  it: {
    uz: "IT, dizayn va raqamli marketing yo'nalishlari.",
    ru: 'ИТ, дизайн и цифровой маркетинг.',
    en: 'IT, design and digital marketing.',
  },
  education: {
    uz: "O'qituvchilik, repetitorlik va bolalar bilan ishlash.",
    ru: 'Преподавание, репетиторство и работа с детьми.',
    en: 'Teaching, tutoring and working with children.',
  },
  security: {
    uz: "Qo'riqlash va xavfsizlik xizmati.",
    ru: 'Охрана и служба безопасности.',
    en: 'Security and guarding.',
  },
  agriculture: {
    uz: "Qishloq xo'jaligi, issiqxona va bog'dorchilik.",
    ru: 'Сельское хозяйство, теплицы и садоводство.',
    en: 'Agriculture, greenhouses and horticulture.',
  },
};
