export interface GuideStepItem {
  id: string;
  category: 'workers' | 'employers' | 'payments' | 'safety' | 'tips';
  stepNumber?: number;
  title: string;
  description: string;
  details: string[];
  tip?: string;
  badge?: string;
  actionText?: string;
  actionScreen?: string;
}

export interface GuideContent {
  title: string;
  subtitle: string;
  welcomeTitle: string;
  welcomeBody: string;
  searchPlaceholder: string;
  categoriesTitle: string;
  allCategories: string;
  filterWorkers: string;
  filterEmployers: string;
  filterPayments: string;
  filterSafety: string;
  filterTips: string;
  step1Title: string;
  step1Body: string;
  step2Title: string;
  step2Body: string;
  step3Title: string;
  step3Body: string;
  needHelpTitle: string;
  needHelpDesc: string;
  liveChatButton: string;
  faqButton: string;
  noResultsFound: string;
  noResultsDesc: string;
  clearSearch: string;
  expandDetails: string;
  collapseDetails: string;
  proTipLabel: string;
  steps: GuideStepItem[];
}

export const QOLLANMA: Record<'uz' | 'ru' | 'en', GuideContent> = {
  uz: {
    title: "Qo'llanma",
    subtitle: "Baito platformasidan samarali va xavfsiz foydalanish bo'yicha to'liq qo'llanma",
    welcomeTitle: "Baito'ga xush kelibsiz!",
    welcomeBody:
      "Bu qo'llanma orqali ish qidiruvchilar va ish beruvchilar uchun platformaning barcha imkoniyatlaridan to'g'ri va samarali foydalanishni bilib olishingiz mumkin.",
    searchPlaceholder: "Qo'llanma bo'yicha qidirish (masalan: ariza, to'lov, smena, karta)...",
    categoriesTitle: "Yo'nalishlar",
    allCategories: "Barchasi",
    filterWorkers: "Ish qidiruvchilarga",
    filterEmployers: "Ish beruvchilarga",
    filterPayments: "To'lovlar va Moliya",
    filterSafety: "Xavfsizlik qoidalari",
    filterTips: "Foydali maslahatlar",
    step1Title: "1. Profilingizni to'ldiring",
    step1Body:
      "Ish beruvchilar e'tiborini jalb qilish uchun shaxsiy ma'lumotlaringiz, ta'lim, ko'nikmalar va tajribalaringizni aniq ko'rsating.",
    step2Title: "2. Ish qidiring",
    step2Body:
      "Qidiruv oynasidan yoki maxsus filtrlardan foydalanib o'zingizga qulay grafikdagi va yo'nalishdagi ishlarni toping.",
    step3Title: "3. Ariza topshiring",
    step3Body:
      "Mos keladigan ishni topgach \"Ariza topshirish\" tugmasini bosing va ish beruvchi javobini kuting. Natijalar xabarlar bo'limiga keladi.",
    needHelpTitle: "Savolingizga javob topmadingizmi?",
    needHelpDesc: "Bizning mutaxassislarimiz har qanday savolingiz bo'yicha 24/7 yordam berishga tayyor.",
    liveChatButton: "Qo'llab-quvvatlash chati",
    faqButton: "Ko'p beriladigan savollar",
    noResultsFound: "Hech qanday ma'lumot topilmadi",
    noResultsDesc: "Boshqa so'z bilan qidirib ko'ring yoki tanlangan filtrni bekor qiling.",
    clearSearch: "Filtrni tozalash",
    expandDetails: "Batafsil ma'lumot",
    collapseDetails: "Yopish",
    proTipLabel: "Foydali maslahat:",
    steps: [
      {
        id: 'w-profile',
        category: 'workers',
        stepNumber: 1,
        title: "1. Profilingizni to'ldiring",
        description: "Ish beruvchilar e'tiborini jalb qilish uchun shaxsiy ma'lumotlaringiz, ta'lim, ko'nikmalar va tajribalaringizni aniq ko'rsating.",
        details: [
          "Shaxsiy ma'lumotlar: Ism, familiya, telefon raqami va aniq fotosurat yuklang.",
          "Ta'lim va mutaxassislik: O'qiyotgan oliygohingiz, fakultet va qulay bo'sh vaqtlaringizni belgilang.",
          "Ko'nikmalar va tillar: Biladigan chet tillaringiz (o'zbek, rus, ingliz) va amaliy ko'nikmalaringizni kiriting.",
          "Rezyume va hujjatlar: Agar sertifikat yoki rezyumeyingiz bo'lsa, profilingizga ilova qiling."
        ],
        tip: "Fotosuratli va 100% to'ldirilgan profillar ish beruvchilar tomonidan 3 barobar tezroq tasdiqlanadi.",
        badge: "Boshlang'ich qadam",
        actionText: "Profilni ochish",
        actionScreen: "profile"
      },
      {
        id: 'w-search',
        category: 'workers',
        stepNumber: 2,
        title: "2. Ish qidiring",
        description: "Qidiruv oynasidan yoki maxsus filtrlardan foydalanib o'zingizga qulay grafikdagi va yo'nalishdagi ishlarni toping.",
        details: [
          "Kategoriya va sohalar: Umumiy ovqatlanish (ofitsiant, barista), savdo (kassir, maslahatchi), yetkazib berish (kuryer), logistika va ofis ishlari.",
          "Kunbay va sminali ishlar: O'qish bilan birga olib borish uchun 4-8 soatlik mos smenalarni tanlang.",
          "Xarita orqali qidiruv: O'zingiz yashayotgan hudud, metro yoki ta'lim maskaniga eng yaqin ishlarni interaktiv xaritadan ko'ring.",
          "Maosh filtrlari: Kunlik yoki soatlik to'lov miqdori bo'yicha saralash imkoniyati mavjud."
        ],
        tip: "Xaritadan foydalanib yo'lga minimal vaqt sarflanadigan ishlarni tanlang — bu vaqt va yo'l xarajatini tejaydi.",
        badge: "Qulay qidiruv",
        actionText: "Ishlarni ko'rish",
        actionScreen: "jobs"
      },
      {
        id: 'w-apply',
        category: 'workers',
        stepNumber: 3,
        title: "3. Ariza topshiring",
        description: "Mos keladigan ishni topgach \"Ariza topshirish\" tugmasini bosing va ish beruvchi javobini kuting. Natijalar xabarlar bo'limiga keladi.",
        details: [
          "Talablar bilan tanishish: Ish vaqti, kiyinish qoidasi (dress-code) va talab etiladigan hujjatlarni diqqat bilan o'qing.",
          "Bir marta bosishda topshirish: \"Ariza topshirish\" tugmasini bosishingiz bilan ma'lumotlaringiz ish beruvchiga yuboriladi.",
          "Holatni kuzatish: \"Arizalar\" bo'limida arizangiz 'Kutilmoqda', 'Qabul qilindi' yoki 'Rad etildi' holatini real vaqtda kuzating.",
          "Bildirishnomalar: Ish beruvchi arizangizni qabul qilganda telefoningizga tezkor bildirishnoma yetib keladi."
        ],
        tip: "Bir vaqtning o'zida bir nechta mos vakansiyalarga ariza topshirishingiz mumkin — bu tezroq ish topish imkonini beradi.",
        badge: "Tezkor ariza",
        actionText: "Arizalarim",
        actionScreen: "applications"
      },
      {
        id: 'w-shift',
        category: 'workers',
        stepNumber: 4,
        title: "4. Smena va Taqvim boshqaruvi",
        description: "Arizangiz ma'qullangach, barcha tasdiqlangan smenalar shaxsiy taqvimizda aks etadi.",
        details: [
          "Taqvim nazorati: \"Taqvim\" bo'limida barcha rejalashtirilgan ish kunlari, manzillar va aniq boshlanish vaqti ko'rinadi.",
          "O'z vaqtida yetib borish: Ish joyiga smena boshlanishidan kamida 15 daqiqa oldin borish qat'iy tavsiya etiladi.",
          "Chat orqali aloqa: Agar favqulodda sabab tufayli kechiksangiz yoki kelolmasangiz, ish beruvchini chat orqali zudlik bilan xabardor qiling.",
          "Mas'uliyat: Belgilangan smenani sifatli o'tash yuqori reyting kafolatidir."
        ],
        tip: "Taqvimdagi smenalaringiz bir-biriga to'g'ri kelib qolmasligi uchun vaqtingizni oldindan rejalashtiring.",
        badge: "Taqvim & Smena",
        actionText: "Taqvimni ko'rish",
        actionScreen: "calendar"
      },
      {
        id: 'w-payment',
        category: 'workers',
        stepNumber: 5,
        title: "5. Ish haqi va To'lovlarni qabul qilish",
        description: "Smena tugagach, ish beruvchi tizimda ishni yakunlaydi va to'lov hisobingizga o'tkaziladi.",
        details: [
          "Kafolatlangan to'lov: Baito tizimida har bir tasdiqlangan smena uchun ish beruvchi mablag'i kafolatlangan bo'ladi.",
          "Karta ulash: Uzcard yoki Humo bank kartangizni profilingizga biriktirib qo'ying.",
          "Hisob-kitob shaffofligi: Barcha tushgan va yechilgan mablag'lar tarixi \"To'lovlar\" bo'limida saqlanadi.",
          "Talabalar uchun mutlaqo bepul: Baito ishchilardan hech qanday qo'shimcha yashirin komissiya ushlab qolmaydi."
        ],
        tip: "Bank kartangizni profilingizda saqlang, shunda ishlangan pul smena tasdiqlanishi bilanoq hisobingizga tushadi.",
        badge: "Kafolatlangan to'lov",
        actionText: "Hamyon & To'lovlar",
        actionScreen: "payments"
      },
      {
        id: 'w-review',
        category: 'workers',
        stepNumber: 6,
        title: "6. Reyting va Sharhlar tizimi",
        description: "Har bir muvaffaqiyatli smenadan so'ng o'zaro baholash o'tkaziladi va reytingingiz oshadi.",
        details: [
          "Ish beruvchiga baho: Ish sharoitlari, jamoa va to'lov madaniyati haqida samimiy sharh qoldiring.",
          "Ijobiy reyting afzalligi: 5 yulduzli baholar sizni platformaning \"Top ishchilari\" safiga kiritadi.",
          "Ustuvorlik: Yuqori reytingli xodimlarning arizalari ish beruvchilar ekranida birinchi bo'lib ko'rinadi."
        ],
        tip: "Har doim o'z vaqtida kelish va samimiy muloqot orqali 5 yulduzli reyting to'plang.",
        badge: "Reyting & Obro'",
        actionText: "Mening sharhlarim",
        actionScreen: "reviews"
      },
      {
        id: 'e-profile',
        category: 'employers',
        stepNumber: 1,
        title: "1. Kompaniya profilini ochish va Tasdiqlash",
        description: "Ishonchli va mas'uliyatli xodimlarni jalb qilish uchun tashkilot profilingizni to'ldiring.",
        details: [
          "Tashkilot ma'lumotlari: Korxona yoki brend nomi, STIR (INN), logotip va faoliyat yo'nalishini kiriting.",
          "Manzillar va filiallar: Xodimlar qayerga kelishini bilishi uchun filiallar va ularning xaritadagi nuqtasini aniq ko'rsating.",
          "Verifikatsiya: Ishonchlilik belgisini olish uchun korxona tasdiqlovchi ma'lumotlarini taqdim eting."
        ],
        tip: "Verifikatsiyadan o'tgan kompaniya e'lonlariga talabalar va xodimlar 2 barobar ko'proq ishonadi va ariza topshiradi.",
        badge: "Kompaniya profili",
        actionText: "Kompaniya profili",
        actionScreen: "employer-profile"
      },
      {
        id: 'e-post',
        category: 'employers',
        stepNumber: 2,
        title: "2. E'lon (Vakansiya) joylashtirish",
        description: "Bir necha daqiqa ichida sminali yoki kunbay ishlar uchun aniq va jozibador e'lon bering.",
        details: [
          "Sarlavha va vazifalar: Xodim bajarishi kerak bo'lgan vazifalarni qisqa va tushunarli bayon qiling.",
          "Smena vaqti va sanalari: Ish qaysi kunda va qaysi soatda boshlanib tugashini ko'rsating.",
          "Xodimlar soni va maosh: Kerakli xodimlar soni va soatlik yoki kunlik aniq maosh summasini belgilang.",
          "Qo'shimcha imtiyozlar: Bepul tushlik, transport yoki maxsus forma taqdim etilsa, buni e'londa belgilang."
        ],
        tip: "Maosh va ish vaqtini aniq ko'rsatgan e'lonlar bir necha soat ichida to'liq xodimlar bilan to'ldiriladi.",
        badge: "Tezkor vakansiya",
        actionText: "E'lon berish",
        actionScreen: "employer-post"
      },
      {
        id: 'e-applicants',
        category: 'employers',
        stepNumber: 3,
        title: "3. Nomzodlarni ko'rib chiqish va Tanlash",
        description: "Arizalar oqimini qulay boshqaring va eng munosib nomzodlarni tasdiqlang.",
        details: [
          "Profil va reyting: Nomzodning ta'limi, avvalgi ish tajribalari va boshqa ish beruvchilardan olgan sharhlarini tekshiring.",
          "Biriktirilgan chat: Nomzod bilan Baito chati orqali to'g'ridan-to'g'ri suhbatlashing va savollaringizni bering.",
          "Bir marta bosishda tasdiqlash: \"Qabul qilish\" tugmasini bosing — xodimga smena tafsilotlari avtomatik yuboriladi."
        ],
        tip: "Kelib tushgan arizalarni iloji boricha tezroq tasdiqlang, chunki faol xodimlar boshqa smenalarni band qilib qo'yishi mumkin.",
        badge: "Arizalar boshqaruvi",
        actionText: "Arizalar ro'yxati",
        actionScreen: "employer-applicants"
      },
      {
        id: 'e-finish',
        category: 'employers',
        stepNumber: 4,
        title: "4. Smenani yakunlash va To'lovni tasdiqlash",
        description: "Smena tugagach, xodimlarning ishlagan soatlarini tasdiqlang va to'lovni o'tkazing.",
        details: [
          "Ishni yakunlash (Finish job): Xodim ishni bajarganini tasdiqlab, smenani yakunlang.",
          "Xavfsiz hisob-kitob: To'lov Baito depozitidan yoki biriktirilgan karta orqali avtomatik xodimga o'tadi.",
          "Elektron hisob-faktura (Invoice): Barcha to'lovlar uchun qonuniy buxgalteriya hisob-fakturalari tizimda avtomatik generatsiya qilinadi.",
          "Xodimni baholash: Xodimning mas'uliyati va sifatiga qarab 1 dan 5 gacha baho qo'ying."
        ],
        tip: "Xodimlarga o'z vaqtida to'lov qilish korxonangizning jozibadorlik reytingini keskin oshiradi.",
        badge: "Yakun & To'lov",
        actionText: "Boshqaruv paneli",
        actionScreen: "employer-dashboard"
      },
      {
        id: 'p-guaranteed-payments',
        category: 'payments',
        title: "Xavfsiz to'lov va hisob-kitob kafolati",
        description: "Baito platformasida barcha to'lovlar shaffof va qonuniy tartibda amalga oshiriladi.",
        details: [
          "To'lov kafolati: Ish beruvchi e'lon berganda ish haqi miqdori qat'iy kelishiladi.",
          "Smena yakuni: Xodim ishni muvaffaqiyatli yakunlagach, ish beruvchi ishni tasdiqlaydi va to'lov xodim hisobiga o'tkaziladi.",
          "Himoyalangan munosabatlar: Tizim xodimni maoshsiz qolishdan, ish beruvchini esa sifatsiz bajarilgan ishdan himoya qiladi."
        ],
        tip: "Mablag'ingiz xavfsizligi uchun barcha to'lovlarni faqat Baito platformasi orqali amalga oshiring.",
        badge: "Kafolat",
        actionText: "To'lovlar bo'limi",
        actionScreen: "payments"
      },
      {
        id: 'p-cards',
        category: 'payments',
        title: "Uzcard va Humo bank kartalarini boshqarish",
        description: "O'zbekistonning barcha bank kartalarini ilovaga oson va xavfsiz ulashingiz mumkin.",
        details: [
          "Karta biriktirish: \"Mening kartalarim\" bo'limida 16 xonali karta raqami va amal qilish muddatini kiriting.",
          "SMS tasdiqlash: Bank tomonidan yuborilgan xavfsizlik kodini kiritib kartani faollashtiring.",
          "Mablag' yechish: Ish haqingizni bir necha soniyada kartangizga o'tkazing.",
          "Xavfsizlik standarti: Karta ma'lumotlari xalqaro PCI DSS xavfsizlik standartlari asosida shifrlanadi."
        ],
        tip: "Siz bir nechta kartalarni kiritishingiz va ulardan birini asosiy qilib belgilashingiz mumkin.",
        badge: "Bank kartalari",
        actionText: "Mening kartalarim",
        actionScreen: "payments/my-cards"
      },
      {
        id: 's-protection',
        category: 'safety',
        title: "Shaxsiy xavfsizlik va Ma'lumotlar daxlsizligi",
        description: "Profilingiz va moliyaviy mablag'laringiz xavfsizligini ta'minlash bo'yicha muhim qoidalar.",
        details: [
          "Maxfiy kodlar: Bankdan kelgan SMS kodlarni yoki parollaringizni hech qachon hech kimga, hatto o'zini administrator deb tanishtirganlarga ham aytmang.",
          "Ish joyidagi xavfsizlik: E'lon berilgan manzil va korxona bilan tanishib chiqing, xavfsizlik texnikasi qoidalariga amal qiling.",
          "Platformadan tashqarida to'lov qilmang: Agar kimdir Baito'dan tashqarida hisob-kitob qilishni taklif qilsa, bu firibgarlik bo'lishi mumkin."
        ],
        tip: "Shubhali foydalanuvchilar yoki qoidabuzarliklarga duch kelsangiz, darhol qo'llab-quvvatlash xizmatiga xabar bering.",
        badge: "Xavfsizlik",
        actionText: "Xavfsizlik sozlamalari",
        actionScreen: "security"
      },
      {
        id: 't-support',
        category: 'tips',
        title: "24/7 Qo'llab-quvvatlash va Nizoli vaziyatlarni hal etish",
        description: "Har qanday savol, kechikish yoki tushunmovchilikda biz sizga tezkor yordam beramiz.",
        details: [
          "Jonli chat (Support chat): Ilova ichidagi operator bilan to'g'ridan-to'g'ri yozishib masalani 2-3 daqiqada hal qiling.",
          "Telefon orqali aloqa: Favqulodda vaziyatlarda +998 90 123 45 67 raqamiga qo'ng'iroq qiling.",
          "Nizolar arbitraji: Agar ish sifati yoki smena vaqti bo'yicha kelishmovchilik bo'lsa, Baito ma'muriyati shaffof tekshiruv o'tkazib adolatli qaror qabul qiladi."
        ],
        tip: "Operatorlarimiz haftada 7 kun, kechayu kunduz sizga yordam berishga tayyor.",
        badge: "Yordam 24/7",
        actionText: "Qo'llab-quvvatlash chati",
        actionScreen: "support-chat"
      }
    ]
  },

  ru: {
    title: "Руководство",
    subtitle: "Полное руководство по эффективному и безопасному использованию платформы Baito",
    welcomeTitle: "Добро пожаловать в Baito!",
    welcomeBody:
      "Это подробное руководство поможет соискателям и работодателям разобраться во всех возможностях, шагах и правилах платформы.",
    searchPlaceholder: "Поиск по руководству (например: заявка, оплата, смена, профиль)...",
    categoriesTitle: "Категории",
    allCategories: "Все",
    filterWorkers: "Соискателям",
    filterEmployers: "Работодателям",
    filterPayments: "Оплата и кошелек",
    filterSafety: "Безопасность",
    filterTips: "Советы и помощь",
    step1Title: "1. Заполните профиль",
    step1Body:
      "Чтобы привлечь внимание работодателей, укажите личные данные, образование, навыки и опыт работы как можно точнее.",
    step2Title: "2. Ищите работу",
    step2Body:
      "Через строку поиска или фильтры найдите работу с удобным для вас графиком и в подходящем направлении.",
    step3Title: "3. Подайте заявку",
    step3Body:
      "Найдя подходящую работу, нажмите «Подать заявку» и дождитесь ответа работодателя. Результат придёт в раздел сообщений.",
    needHelpTitle: "Не нашли ответ на свой вопрос?",
    needHelpDesc: "Наша служба поддержки готова помочь вам в любое время суток.",
    liveChatButton: "Чат поддержки",
    faqButton: "Частые вопросы",
    noResultsFound: "Ничего не найдено",
    noResultsDesc: "Попробуйте изменить поисковый запрос или сбросить фильтры.",
    clearSearch: "Сбросить поиск",
    expandDetails: "Подробнее",
    collapseDetails: "Свернуть",
    proTipLabel: "Совет:",
    steps: [
      {
        id: 'w-profile',
        category: 'workers',
        stepNumber: 1,
        title: "1. Заполните профиль",
        description: "Чтобы привлечь внимание работодателей, укажите личные данные, образование, навыки и опыт работы как можно точнее.",
        details: [
          "Личные данные: загрузите чёткую фотографию, укажите имя, фамилию и актуальный номер телефона.",
          "Образование и график: укажите вуз, курс и удобные часы для подработки.",
          "Навыки и языки: перечислите языки (узбекский, русский, английский) и практические навыки.",
          "Резюме и сертификаты: при наличии прикрепите подтверждающие документы."
        ],
        tip: "Анкеты с качественной фотографией и полным описанием одобряются работодателями в 3 раза чаще.",
        badge: "Первый шаг",
        actionText: "Открыть профиль",
        actionScreen: "profile"
      },
      {
        id: 'w-search',
        category: 'workers',
        stepNumber: 2,
        title: "2. Ищите работу",
        description: "Через строку поиска или фильтры найдите работу с удобным для вас графиком и в подходящем направлении.",
        details: [
          "Категории вакансий: общепит (официанты, бариста), торговля (кассиры, консультанты), курьерская доставка, логистика и офис.",
          "Посменная и подённая работа: выбирайте удобные смены от 4 до 8 часов, совмещая с учёбой.",
          "Интерактивная карта: находите вакансии рядом с домом, станцией метро или университетом.",
          "Фильтры оплаты: сортируйте предложения по дневной или почасовой ставке."
        ],
        tip: "Используйте поиск по карте, чтобы экономить время и деньги на дорогу.",
        badge: "Удобный поиск",
        actionText: "Смотреть вакансии",
        actionScreen: "jobs"
      },
      {
        id: 'w-apply',
        category: 'workers',
        stepNumber: 3,
        title: "3. Подайте заявку",
        description: "Найдя подходящую работу, нажмите «Подать заявку» и дождитесь ответа работодателя. Результат придёт в раздел сообщений.",
        details: [
          "Изучите условия: проверьте время смены, требования к форме одежды (дресс-код) и обязанности.",
          "Отклик в один клик: нажмите «Подать заявку», и ваша анкета мгновенно поступит на рассмотрение.",
          "Статус заявки: отслеживайте статус («На рассмотрении», «Принято», «Отклонено») во вкладке «Заявки».",
          "Мгновенные уведомления: при одобрении заявки вам сразу придёт уведомление на телефон."
        ],
        tip: "Вы можете откликаться на несколько подходящих смен одновременно, чтобы быстрее найти работу.",
        badge: "Быстрый отклик",
        actionText: "Мои заявки",
        actionScreen: "applications"
      },
      {
        id: 'w-shift',
        category: 'workers',
        stepNumber: 4,
        title: "4. Смена и рабочий календарь",
        description: "После подтверждения заявки смена автоматически добавляется в ваш рабочий календарь.",
        details: [
          "Календарь смен: во вкладке «Календарь» отображаются все даты, адреса и точное время выхода на работу.",
          "Пунктуальность: рекомендуем прибывать на рабочее место минимум за 15 минут до начала смены.",
          "Чат с работодателем: при непредвиденных задержках сразу предупредите менеджера через встроенный чат.",
          "Ответственность: добросовестно выполняйте согласованные задачи для высокого рейтинга."
        ],
        tip: "Планируйте расписание заранее, чтобы смены не пересекались с парами в университете.",
        badge: "Календарь и смены",
        actionText: "Открыть календарь",
        actionScreen: "calendar"
      },
      {
        id: 'w-payment',
        category: 'workers',
        stepNumber: 5,
        title: "5. Оплата и получение выплат",
        description: "По завершении смены работодатель закрывает задачу, и заработанные деньги поступают на ваш баланс.",
        details: [
          "Гарантия выплат: платформа Baito замораживает средства работодателя перед выходом сотрудника на смену.",
          "Привязка карт: привяжите банковскую карту Uzcard или Humo для моментального вывода средств.",
          "Прозрачная история: все поступления и выводы отображаются в разделе «Оплата».",
          "Без скрытых комиссий: поиск работы для студентов и соискателей полностью бесплатен."
        ],
        tip: "Привяжите карту заранее, чтобы получать выплату сразу после подтверждения смены.",
        badge: "Гарантия оплаты",
        actionText: "Кошелек и оплата",
        actionScreen: "payments"
      },
      {
        id: 'w-review',
        category: 'workers',
        stepNumber: 6,
        title: "6. Рейтинг и отзывы",
        description: "После каждой успешно отработанной смены происходит взаимная оценка, повышающая ваш статус.",
        details: [
          "Оценка работодателя: оставьте честный отзыв об условиях труда, коллективе и менеджере.",
          "Высокий рейтинг: 5-звёздочные оценки открывают доступ к самым высокооплачиваемым вакансиям.",
          "Приоритет: кандидаты с отличным рейтингом первыми отображаются в списке откликов."
        ],
        tip: "Пунктуальность и ответственность помогут вам быстро заработать отличную репутацию.",
        badge: "Репутация",
        actionText: "Мои отзывы",
        actionScreen: "reviews"
      },
      {
        id: 'e-profile',
        category: 'employers',
        stepNumber: 1,
        title: "1. Создание профиля компании",
        description: "Заполните официальный профиль вашей организации для привлечения надёжного персонала.",
        details: [
          "Реквизиты компании: укажите название, ИНН, сферу деятельности и загрузите логотип.",
          "Филиалы и локации: отметьте точные адреса и точки на карте, куда должны выходить сотрудники.",
          "Верификация: подтвердите статус юридического лица для получения значка доверия."
        ],
        tip: "Верифицированные компании получают в 2 раза больше откликов от ответственных соискателей.",
        badge: "Профиль компании",
        actionText: "Профиль компании",
        actionScreen: "employer-profile"
      },
      {
        id: 'e-post',
        category: 'employers',
        stepNumber: 2,
        title: "2. Публикация вакансии",
        description: "Создайте привлекательное объявление для посменных или временных сотрудников за пару минут.",
        details: [
          "Название и обязанности: чётко укажите требуемую специальность и список задач.",
          "Время и даты: обозначьте точные часы начала и окончания смены, а также дату выхода.",
          "Количество и ставка: укажите необходимое количество человек и ставку за смену или час.",
          "Бонусы: укажите бесплатный обед, оплату проезда или предоставление формы."
        ],
        tip: "Объявления с чётким описанием обязанностей и фиксированной оплатой закрываются быстрее всего.",
        badge: "Публикация вакансии",
        actionText: "Разместить вакансию",
        actionScreen: "employer-post"
      },
      {
        id: 'e-applicants',
        category: 'employers',
        stepNumber: 3,
        title: "3. Отбор и подтверждение кандидатов",
        description: "Удобно управляйте потоком откликов и выбирайте лучших специалистов.",
        details: [
          "Резюме и отзывы: изучайте опыт кандидатов и оценки от предыдущих работодателей.",
          "Прямой чат: задайте уточняющие вопросы кандидату через встроенный чат Baito.",
          "Одобрение в один клик: подтвердите отклик, и кандидат мгновенно получит уведомление."
        ],
        tip: "Одобряйте заявки оперативно: активные кандидаты быстро находят другие предложения.",
        badge: "Управление откликами",
        actionText: "Список откликов",
        actionScreen: "employer-applicants"
      },
      {
        id: 'e-finish',
        category: 'employers',
        stepNumber: 4,
        title: "4. Завершение смены и оплата",
        description: "Подтвердите фактически отработанные часы и переведите оплату исполнителю.",
        details: [
          "Завершение смены: нажмите «Завершить работу» после выполнения поставленных задач.",
          "Безопасный расчёт: оплата списывается с депозита Baito или корпоративной карты напрямую работнику.",
          "Электронные инвойсы: бухгалтерия получает все закрывающие документы и счета автоматически.",
          "Оценка работника: поставьте объективную оценку исполнителю за качество и дисциплину."
        ],
        tip: "Своевременные выплаты обеспечивают компании высший рейтинг работодателя.",
        badge: "Завершение и оплата",
        actionText: "Панель управления",
        actionScreen: "employer-dashboard"
      },
      {
        id: 'p-guaranteed-payments',
        category: 'payments',
        title: "Безопасные расчёты и гарантия выплат",
        description: "Все расчёты на платформе Baito осуществляются прозрачно и в установленном порядке.",
        details: [
          "Фиксация оплаты: при публикации смены размер вознаграждения чётко закрепляется.",
          "Выплата по факту: исполнитель получает средства сразу после подтверждения выполнения смены.",
          "Защита обеих сторон: защита работника от невыплаты и работодателя от срыва смены."
        ],
        tip: "Никогда не переводите оплату вне платформы: это лишает вас гарантии безопасности.",
        badge: "Гарантия",
        actionText: "Раздел оплаты",
        actionScreen: "payments"
      },
      {
        id: 'p-cards',
        category: 'payments',
        title: "Управление картами Uzcard и Humo",
        description: "Подключайте карты любых банков Узбекистана для быстрого и надёжного вывода средств.",
        details: [
          "Добавление карты: введите 16 цифр карты и срок действия в разделе «Мои карты».",
          "SMS-подтверждение: активируйте карту с помощью одноразового защитного кода от вашего банка.",
          "Мгновенный вывод: переводите заработанные средства на карту в любое время.",
          "Стандарты безопасности: данные шифруются в соответствии с международным регламентом PCI DSS."
        ],
        tip: "Вы можете привязать несколько карт и выбрать одну в качестве основной.",
        badge: "Банковские карты",
        actionText: "Мои карты",
        actionScreen: "payments/my-cards"
      },
      {
        id: 's-protection',
        category: 'safety',
        title: "Безопасность профиля и защита от мошенничества",
        description: "Ключевые правила для защиты вашего аккаунта и финансовых средств.",
        details: [
          "Конфиденциальность кодов: никогда и никому не сообщайте SMS-коды от банка или Baito.",
          "Безопасность на рабочем месте: проверяйте официальный адрес и соблюдайте инструкции по безопасности.",
          "Запрет расчётов вне платформы: предложения оплатить в обход системы могут исходить от мошенников."
        ],
        tip: "При любых подозрительных сообщениях незамедлительно обращайтесь в службу поддержки.",
        badge: "Безопасность",
        actionText: "Настройки безопасности",
        actionScreen: "security"
      },
      {
        id: 't-support',
        category: 'tips',
        title: "Круглосуточная поддержка 24/7 и решение споров",
        description: "Наша команда всегда на связи, чтобы помочь решить любые нестандартные ситуации.",
        details: [
          "Живой чат поддержки: напишите оператору прямо в приложении и получите ответ за пару минут.",
          "Телефон горячей линии: в экстренных случаях звоните по номеру +998 90 123 45 67.",
          "Арбитраж платформы: в случае споров администрация проводит объективную проверку фактов."
        ],
        tip: "Операторы службы поддержки дежурят 24 часа в сутки 7 дней в неделю.",
        badge: "Поддержка 24/7",
        actionText: "Чат поддержки",
        actionScreen: "support-chat"
      }
    ]
  },

  en: {
    title: "Guide",
    subtitle: "Comprehensive manual for using the Baito platform efficiently and securely",
    welcomeTitle: "Welcome to Baito!",
    welcomeBody:
      "This comprehensive guide walks both job seekers and employers through every feature, step, and rule across the platform.",
    searchPlaceholder: "Search the guide (e.g. apply, payment, shift, profile)...",
    categoriesTitle: "Categories",
    allCategories: "All",
    filterWorkers: "For Job Seekers",
    filterEmployers: "For Employers",
    filterPayments: "Payments & Wallet",
    filterSafety: "Safety & Rules",
    filterTips: "Tips & Support",
    step1Title: "1. Fill in your profile",
    step1Body:
      "To catch an employer’s eye, set out your personal details, education, skills and experience clearly.",
    step2Title: "2. Look for work",
    step2Body:
      "Use the search box or the filters to find shifts on a schedule and in a field that suit you.",
    step3Title: "3. Apply",
    step3Body:
      "Once you find a shift that fits, press “Apply” and wait for the employer to reply. The answer arrives in your messages.",
    needHelpTitle: "Still have questions?",
    needHelpDesc: "Our dedicated support team is available 24/7 to assist you with any inquiries.",
    liveChatButton: "Live Support Chat",
    faqButton: "Frequently Asked Questions",
    noResultsFound: "No matching guides found",
    noResultsDesc: "Try a different search term or reset the selected category filter.",
    clearSearch: "Clear filter",
    expandDetails: "View details",
    collapseDetails: "Close",
    proTipLabel: "Pro Tip:",
    steps: [
      {
        id: 'w-profile',
        category: 'workers',
        stepNumber: 1,
        title: "1. Fill in your profile",
        description: "To catch an employer’s eye, set out your personal details, education, skills and experience clearly.",
        details: [
          "Personal details: Upload a clean photo, enter your name, and verify your phone number.",
          "Education & availability: State your university, study year, and preferred working hours.",
          "Skills & languages: List the languages you speak (Uzbek, Russian, English) and practical strengths.",
          "Resume & credentials: Attach relevant certificates or previous work experience if available."
        ],
        tip: "Profiles with a verified photo and complete details are 3x more likely to be accepted.",
        badge: "First Step",
        actionText: "Open Profile",
        actionScreen: "profile"
      },
      {
        id: 'w-search',
        category: 'workers',
        stepNumber: 2,
        title: "2. Look for work",
        description: "Use the search box or the filters to find shifts on a schedule and in a field that suit you.",
        details: [
          "Categories: Hospitality (waiter, barista), retail (cashier, sales assistant), delivery, warehouse, and office work.",
          "Flexible shifts: Choose 4-8 hour shifts that fit perfectly around your study timetable.",
          "Interactive map: View nearby jobs around your neighborhood, metro station, or university.",
          "Salary filters: Filter shifts by hourly or daily wage rates."
        ],
        tip: "Use the map view to pick shifts close to you and minimize daily commuting time.",
        badge: "Search & Filter",
        actionText: "Browse Jobs",
        actionScreen: "jobs"
      },
      {
        id: 'w-apply',
        category: 'workers',
        stepNumber: 3,
        title: "3. Apply",
        description: "Once you find a shift that fits, press “Apply” and wait for the employer to reply. The answer arrives in your messages.",
        details: [
          "Review requirements: Check shift hours, dress code, and expected duties carefully.",
          "One-click application: Press 'Apply' to send your profile directly to the hiring manager.",
          "Track status: Follow application progress (Pending, Accepted, Rejected) in the 'Applications' tab.",
          "Instant alerts: Receive real-time push notifications when your application is approved."
        ],
        tip: "You can apply for multiple open shifts to maximize your chances of getting hired quickly.",
        badge: "Quick Apply",
        actionText: "My Applications",
        actionScreen: "applications"
      },
      {
        id: 'w-shift',
        category: 'workers',
        stepNumber: 4,
        title: "4. Shifts and Work Calendar",
        description: "Once approved, all your confirmed work shifts appear on your personal calendar.",
        details: [
          "Calendar tracking: Open 'Calendar' to check shift dates, locations, and start times.",
          "Punctuality: Arrive at the workplace at least 15 minutes before the shift begins.",
          "Direct communication: In case of unexpected delay or emergency, notify the manager via in-app chat.",
          "Work ethic: Performing your tasks diligently guarantees top ratings and repeat bookings."
        ],
        tip: "Plan your schedule in advance so shifts don't clash with university lectures.",
        badge: "Work Calendar",
        actionText: "Open Calendar",
        actionScreen: "calendar"
      },
      {
        id: 'w-payment',
        category: 'workers',
        stepNumber: 5,
        title: "5. Earnings and Payouts",
        description: "When the shift concludes, the employer marks the job finished and earnings are released to your balance.",
        details: [
          "Guaranteed payment: Wage amounts are verified in advance, guaranteeing prompt payout upon completed shifts.",
          "Card linking: Link your Uzcard or Humo bank card for instant and secure withdrawals.",
          "Transparent ledger: View your full transaction history and receipts in the 'Payments' section.",
          "Zero commission for students: Using Baito to find work is 100% free."
        ],
        tip: "Add your bank card early so your wages can be paid out immediately after shift confirmation.",
        badge: "Guaranteed Payout",
        actionText: "Wallet & Payments",
        actionScreen: "payments"
      },
      {
        id: 'w-review',
        category: 'workers',
        stepNumber: 6,
        title: "6. Ratings and Reviews",
        description: "After each completed shift, both parties exchange feedback to build a verified reputation.",
        details: [
          "Rate the employer: Leave an honest review about working conditions and management.",
          "Build high ratings: 5-star ratings establish you as a top-tier worker across the platform.",
          "Hiring priority: High-rated candidates appear at the top of employer applicant lists."
        ],
        tip: "Consistently positive reviews unlock higher hourly wages on future bookings.",
        badge: "Reputation",
        actionText: "My Reviews",
        actionScreen: "reviews"
      },
      {
        id: 'e-profile',
        category: 'employers',
        stepNumber: 1,
        title: "1. Company Profile & Verification",
        description: "Set up an official corporate profile to attract reliable and motivated workers.",
        details: [
          "Company details: Enter legal business name, Tax ID (INN), logo, and primary industry.",
          "Locations & branches: Pinpoint your exact branches and physical work locations on the map.",
          "Verification: Complete business verification to earn a verified employer badge."
        ],
        tip: "Verified business profiles receive twice as many applications from top candidates.",
        badge: "Company Profile",
        actionText: "Company Profile",
        actionScreen: "employer-profile"
      },
      {
        id: 'e-post',
        category: 'employers',
        stepNumber: 2,
        title: "2. Posting a Job Shift",
        description: "Create attractive listings for shifts or temporary roles in just a few minutes.",
        details: [
          "Title and duties: Clearly outline the job responsibilities and basic requirements.",
          "Dates and hours: Specify exact shift dates, start times, and finish times.",
          "Headcount and pay: State the number of workers needed and the hourly/daily compensation.",
          "Perks: Highlight perks like free lunch, uniform provided, or transport reimbursement."
        ],
        tip: "Shifts with transparent duties and competitive wages are filled within hours.",
        badge: "Quick Posting",
        actionText: "Post a Shift",
        actionScreen: "employer-post"
      },
      {
        id: 'e-applicants',
        category: 'employers',
        stepNumber: 3,
        title: "3. Reviewing and Selecting Applicants",
        description: "Filter applicants efficiently and accept the most qualified candidates.",
        details: [
          "Profiles & ratings: Inspect applicant resumes, experience, and past employer ratings.",
          "Direct chat: Message candidates directly through Baito chat to coordinate details.",
          "One-tap approval: Tap 'Accept' to confirm workers and send them shift details instantly."
        ],
        tip: "Accept strong candidates promptly before they are booked by other businesses.",
        badge: "Applicant Review",
        actionText: "Review Applicants",
        actionScreen: "employer-applicants"
      },
      {
        id: 'e-finish',
        category: 'employers',
        stepNumber: 4,
        title: "4. Completing Shifts & Payouts",
        description: "Confirm worked hours and release payout upon shift completion.",
        details: [
          "Finish job: Tap 'Finish job' to verify that workers fulfilled their scheduled tasks.",
          "Secure settlement: Payout is released automatically from your Baito deposit or corporate card.",
          "Official invoices: Electronic VAT/accounting invoices are generated automatically in the portal.",
          "Rate your workers: Give honest ratings from 1 to 5 stars to maintain community standards."
        ],
        tip: "Prompt payouts boost your company reputation and attract top workers repeatedly.",
        badge: "Completion & Pay",
        actionText: "Employer Dashboard",
        actionScreen: "employer-dashboard"
      },
      {
        id: 'p-guaranteed-payments',
        category: 'payments',
        title: "Guaranteed Payouts and Safe Settlements",
        description: "All transactions on Baito are safeguarded by our verified payment workflow.",
        details: [
          "Payment commitment: Wage amounts are explicitly agreed upon when shifts are published.",
          "Timely release: Earnings are disbursed to the worker once shift completion is confirmed.",
          "Two-way protection: Workers are protected from non-payment; employers are protected from no-shows."
        ],
        tip: "Never arrange off-platform cash transactions, as they void platform protections.",
        badge: "Guaranteed Payout",
        actionText: "Payments Overview",
        actionScreen: "payments"
      },
      {
        id: 'p-cards',
        category: 'payments',
        title: "Managing Uzcard & Humo Cards",
        description: "Connect Uzbekistan bank cards easily for fast, automated payouts and top-ups.",
        details: [
          "Add card: Enter the 16-digit card number and expiry date in 'My Cards'.",
          "SMS authorization: Confirm card binding with the secure SMS code from your bank.",
          "Instant withdrawal: Transfer your balance to your bank card within seconds.",
          "Security compliance: Card data is encrypted adhering to international PCI DSS standards."
        ],
        tip: "You can save multiple cards and set one as your primary payout card.",
        badge: "Bank Cards",
        actionText: "My Cards",
        actionScreen: "payments/my-cards"
      },
      {
        id: 's-protection',
        category: 'safety',
        title: "Account Security & Fraud Prevention",
        description: "Essential rules for keeping your account and financial assets safe.",
        details: [
          "Keep codes private: Never share your SMS confirmation codes or passwords with anyone.",
          "Workplace safety: Verify employer premises and adhere to proper safety guidelines.",
          "Avoid off-platform payments: Paying outside the platform is a common vector for scams."
        ],
        tip: "Report any suspicious users or unauthorized requests immediately to support.",
        badge: "Security",
        actionText: "Security Settings",
        actionScreen: "security"
      },
      {
        id: 't-support',
        category: 'tips',
        title: "24/7 Dedicated Support & Dispute Resolution",
        description: "Our dedicated support team is available round-the-clock for any questions or disputes.",
        details: [
          "Live support chat: Message an operator directly in the app for assistance within minutes.",
          "Hotline phone: For urgent operational issues, call +998 90 123 45 67.",
          "Fair arbitration: In case of dispute over hours or duties, our team conducts a fair evidence-based review."
        ],
        tip: "Our support specialists are on duty 24 hours a day, 7 days a week.",
        badge: "Support 24/7",
        actionText: "Open Support Chat",
        actionScreen: "support-chat"
      }
    ]
  }
};
