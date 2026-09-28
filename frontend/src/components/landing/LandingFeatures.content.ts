/** The six selling points on the landing page, in all three languages.
 *
 *  They were six near-identical <div> blocks with the copy written into the
 *  JSX in Uzbek, so a Russian visitor got a Russian navbar above an Uzbek
 *  pitch. Card colour and icon are the only things that actually differ.
 */
export const FEATURES_TEXTS = {
  uz: {
    badge: 'Afzalliklar va Texnologiya',
    title: "Nima uchun minglab insonlar Baito'ni tanlaydi?",
    subtitle: "Kunlik to'lovlar, xavfsiz ID tizimi va jonli geolokatsiya imkoniyatlari",
    cards: [
      { title: "Smena yakunida instant to'lov",
        body: "Ish beruvchi ishni qabul qilishi bilan maosh summasi bank kartangizga 1 daqiqa ichida o'tkaziladi." },
      { title: 'Tasdiqlangan ID Profil va Reyting',
        body: "Barcha foydalanuvchilar pasport verification bosqichidan o'tadi va ikki tomonlama reytingga ega bo'ladi." },
      { title: 'Jonli Geolokatsiya va Xarita',
        body: "Uyingiz va tumaningizdan qancha uzoqlikda ish joyi borligini real vaqt rejimida xaritadan ko'ring." },
      { title: 'Moslashuvchan Grafik va Soatbay',
        body: "O'zingizga qulay kunda, istalgan soatda ishlash imkoniyati — to'liq erkinlik." },
      { title: 'Integratsiyalangan Ichki Chat',
        body: "O'zaro savollar, tafsilotlar va joylashuv haqida bevosita muloqot qilish." },
      { title: "Kafolatlangan Bepul E'lonlar",
        body: "Ish beruvchilar uchun dastlabki 3 ta e'lon va ariza qabul qilish mutlaqo bepul." },
    ],
  },
  ru: {
    badge: 'Преимущества и технологии',
    title: 'Почему Baito выбирают тысячи людей?',
    subtitle: 'Ежедневные выплаты, проверенные ID и геолокация в реальном времени',
    cards: [
      { title: 'Моментальная оплата в конце смены',
        body: 'Как только работодатель принимает работу, зарплата поступает на вашу банковскую карту в течение минуты.' },
      { title: 'Проверенный ID-профиль и рейтинг',
        body: 'Все пользователи проходят проверку паспорта и получают двусторонний рейтинг.' },
      { title: 'Геолокация и карта в реальном времени',
        body: 'Смотрите на карте, как далеко от дома и района находится место работы — в реальном времени.' },
      { title: 'Гибкий график и почасовая оплата',
        body: 'Работайте в удобный день и в любые часы — полная свобода.' },
      { title: 'Встроенный чат',
        body: 'Обсуждайте вопросы, детали и адрес напрямую, не выходя из приложения.' },
      { title: 'Бесплатные объявления',
        body: 'Первые 3 объявления и приём заявок для работодателей — полностью бесплатно.' },
    ],
  },
  en: {
    badge: 'What you get, and how',
    title: 'Why thousands of people choose Baito',
    subtitle: 'Same-day pay, verified IDs, and live location on a map',
    cards: [
      { title: 'Paid the moment the shift ends',
        body: 'As soon as the employer accepts the work, the wage reaches your bank card within a minute.' },
      { title: 'Verified ID profiles and ratings',
        body: 'Every user passes passport verification, and both sides rate each other.' },
      { title: 'Live location and map',
        body: 'See in real time how far a job is from your home and your district.' },
      { title: 'Flexible hours, paid hourly',
        body: 'Work the days that suit you, at the hours that suit you — entirely your call.' },
      { title: 'Chat built in',
        body: 'Ask about details, requirements and the address without leaving the app.' },
      { title: 'Free postings, guaranteed',
        body: 'An employer’s first 3 postings, and the applications they bring, cost nothing.' },
    ],
  },
} as const;
