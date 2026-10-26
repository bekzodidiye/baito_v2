export interface FaqEntry {
  q: string;
  a: string;
  category?: 'general' | 'workers' | 'employers' | 'payments' | 'security';
}

export interface FaqContentSection {
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  allCategories: string;
  filterGeneral: string;
  filterWorkers: string;
  filterEmployers: string;
  filterPayments: string;
  filterSecurity: string;
  needHelpTitle: string;
  needHelpDesc: string;
  liveChatButton: string;
  guideButton: string;
  noResultsFound: string;
  noResultsDesc: string;
  clearSearch: string;
  entries: FaqEntry[];
}

export const FAQ_CONTENT: Record<'uz' | 'ru' | 'en', FaqContentSection> = {
  uz: {
    title: "Ko'p so'raladigan savollar",
    subtitle: "Baito platformasi, ish qidirish, e'lon berish va to'lovlar bo'yicha eng muhim savollarga javoblar",
    searchPlaceholder: "Savollardan qidirish (masalan: to'lov, bepulmi, ariza, profil)...",
    allCategories: "Barchasi",
    filterGeneral: "Umumiy",
    filterWorkers: "Ish qidiruvchilarga",
    filterEmployers: "Ish beruvchilarga",
    filterPayments: "To'lovlar va Moliya",
    filterSecurity: "Xavfsizlik",
    needHelpTitle: "Savolingizga javob topmadingizmi?",
    needHelpDesc: "Bizning qo'llab-quvvatlash xizmatimiz 24/7 rejimida har qanday savolingizga yordam berishga tayyor.",
    liveChatButton: "Qo'llab-quvvatlash chati",
    guideButton: "Foydalanish qo'llanmasi",
    noResultsFound: "Savollar topilmadi",
    noResultsDesc: "Boshqa so'z bilan qidirib ko'ring yoki tanlangan filtrni bekor qiling.",
    clearSearch: "Qidiruvni tozalash",
    entries: [
      {
        q: 'Baito nima?',
        a: "Baito — O'zbekistonda talabalar va vaqtinchalik ish qidiruvchilar uchun kunbay, sminali va erkin grafikdagi ishlarni topish, hamda korxonalar uchun tezkor, ishonchli xodimlarni jalb qilishga mo'ljallangan zamonaviy platformadir.",
        category: 'general'
      },
      {
        q: "Qanday qilib ishga topshirsam bo'ladi?",
        a: "Asosiy ekrandagi ishlar ro'yxatidan yoki interaktiv xaritadan o'zingizga qulay smena va manzilni tanlab, 'Ariza topshirish' tugmasini bosishingiz kifoya. Natijalar Arizalar bo'limida va bildirishnomalarda ko'rinadi.",
        category: 'workers'
      },
      {
        q: 'Xizmat butunlay bepulmi?',
        a: "Ha, talabalar va ish qidiruvchilar uchun Baito platformasidan foydalanish, ro'yxatdan o'tish, rezyume yaratish va ishlarga ariza topshirish mutlaqo bepul. Hech qanday yashirin to'lov yoki komissiya olinmaydi.",
        category: 'general'
      },
      {
        q: 'Profilimni qanday yangilayman?',
        a: "Profil bo'limiga o'tib, 'Tahrirlash' tugmasini bosish orqali fotosuratingiz, ta'lim ma'lumotlari, ko'nikmalaringiz va telefon raqamingizni istalgan vaqtda o'zgartirishingiz mumkin.",
        category: 'general'
      },
      {
        q: "Bildirishnomalarni o'chira olamanmi?",
        a: "Ha, Sozlamalar bo'limidagi Afzalliklar yoki Xavfsizlik menyusi orqali push-bildirishnomalar va xabarlarni moslashtirishingiz yoki o'chirib qo'yishingiz mumkin.",
        category: 'general'
      },
      {
        q: 'Bir vaqtning o\'zida nechta ishga ariza topshirish mumkin?',
        a: "Siz bir vaqtning o'zida bir nechta mos vakansiyalarga ariza topshirishingiz mumkin. Biroq, arizalaringiz qabul qilingach, smena vaqtlari bir-biriga to'g'ri kelmasligini shaxsiy taqvimiz orqali nazorat qilishingiz tavsiya etiladi.",
        category: 'workers'
      },
      {
        q: 'Agar tasdiqlangan smenaga bora olmasam nima qilishim kerak?',
        a: "Kutilmagan vaziyat yuzaga kelsa, smena boshlanishidan kamida 3-4 soat oldin ilova orqali arizani bekor qiling va ish beruvchini chat orqali ogohlantiring. Sababsiz kelmaslik platformadagi reytingingiz pasayishiga olib kelishi mumkin.",
        category: 'workers'
      },
      {
        q: 'Talabalar uchun qanday qulay ish grafiki mavjud?',
        a: "Baito'da smenalar 4, 6 yoki 8 soatlik qilib taqsimlangan. Ertalabki, kunduzgi, kechki va dam olish kunlari smenalarini o'qishingizga xalaqit bermaydigan tarzda tanlashingiz mumkin.",
        category: 'workers'
      },
      {
        q: 'Kompaniya sifatida qanday yangi e\'lon joylashtirish mumkin?',
        a: "Ish beruvchi profiliga o'ting va 'E'lon joylash' tugmasini bosing. Ish nomi, vazifalar, smena sanasi va soati, xaritadagi manzil va maosh summasini kiriting. E'lon bir necha soniyada platformada faollashadi.",
        category: 'employers'
      },
      {
        q: 'Nomzodlarni qanday tanlayman va arizalarni qabul qilaman?',
        a: "Arizalar bo'limida har bir nomzodning profili, ta'limi, ko'nikmalari va boshqa ish beruvchilar qoldirgan reytingini ko'rib chiqishingiz, ular bilan chatda yozishishingiz va bir marta bosishda 'Qabul qilish'ingiz mumkin.",
        category: 'employers'
      },
      {
        q: 'Xodim smenaga kelmasa nima bo\'ladi?',
        a: "Agar xodim kelmasa, platforma sizga zudlik bilan boshqa bo'sh xodimlarni topish imkonini beradi yoki zaxiralangan mablag'ingiz hisobingizga to'liq qaytariladi. Kelmagan xodimga nisbatan tizim intizomiy choralar ko'radi.",
        category: 'employers'
      },
      {
        q: 'Ish haqi qachon va qanday to\'lanadi?',
        a: "Smena yakunlangach, ish beruvchi Baito tizimida 'Ishni yakunlash'ni tasdiqlaydi. Shundan so'ng mablag' darhol xodimning platformadagi hisobiga o'tkaziladi.",
        category: 'payments'
      },
      {
        q: 'Bank kartamga pulni qanday yechib olaman?',
        a: "'To'lovlar' > 'Mening kartalarim' bo'limida Uzcard yoki Humo kartangizni biriktiring. Shundan so'ng 'Yechib olish' tugmasi orqali istalgan vaqtda mablag'ingizni kartaga o'tkazib olishingiz mumkin.",
        category: 'payments'
      },
      {
        q: 'To\'lovlar xavfsizligi qanday ta\'minlanadi (Eskrou)?',
        a: "Ish beruvchi e'lon berganda smena to'lovi Baito tomonidan kafolatlanadi (eskrou). Ish muvaffaqiyatli bajarilmaguncha pul ushlab turiladi va ish yakunida xodimga to'liq to'lab beriladi.",
        category: 'payments'
      },
      {
        q: 'Soliqlar va o\'zini o\'zi band qilish tartibi qanday?',
        a: "O'zbekiston qonunchiligiga ko'ra, talabalar va frilanserlar o'zini o'zi band qilgan shaxs sifatida ro'yxatdan o'tib, daromad solig'idan (0%) imtiyozli foydalanishlari mumkin. Ilovada barcha rasmiy kvitansiyalar saqlanadi.",
        category: 'payments'
      },
      {
        q: 'Nizoli vaziyatlar yoki kechikishlarda kimga murojaat qilish kerak?',
        a: "Har qanday muammo yoki tushunmovchilik yuz berganda Sozlamalar > Qo'llab-quvvatlash chati orqali operatorlarimiz bilan bog'laning yoki +998 90 123 45 67 raqamiga qo'ng'iroq qiling.",
        category: 'security'
      },
      {
        q: 'Shaxsiy ma\'lumotlarim va parollarim qanchalik himoyalangan?',
        a: "Barcha ma'lumotlar shifrlangan protokollar (SSL/TLS) orqali himoyalanadi. Hech kimga, hatto ma'muriyatga ham SMS kodlar yoki parollarni bermang.",
        category: 'security'
      },
      {
        q: 'Platformada reyting tizimi qanday ishlaydi?',
        a: "Har bir smena yakunlangach, xodim va ish beruvchi bir-biriga 1 dan 5 yulduzgacha baho va sharh qoldiradi. Yuqori reyting yangi ishlarga tezroq qabul qilinishni va ko'proq maosh olishni ta'minlaydi.",
        category: 'general'
      }
    ]
  },

  ru: {
    title: "Часто задаваемые вопросы",
    subtitle: "Ответы на самые важные вопросы о работе платформы Baito, поиске смен, вакансиях и выплатах",
    searchPlaceholder: "Поиск по вопросам (например: оплата, бесплатно, заявка, профиль)...",
    allCategories: "Все",
    filterGeneral: "Общие",
    filterWorkers: "Соискателям",
    filterEmployers: "Работодателям",
    filterPayments: "Оплата и финансы",
    filterSecurity: "Безопасность",
    needHelpTitle: "Не нашли ответ на свой вопрос?",
    needHelpDesc: "Наша служба поддержки готова ответить на любые вопросы круглосуточно 24/7.",
    liveChatButton: "Чат поддержки",
    guideButton: "Руководство пользователя",
    noResultsFound: "Вопросы не найдены",
    noResultsDesc: "Попробуйте изменить поисковый запрос или сбросить фильтры.",
    clearSearch: "Сбросить поиск",
    entries: [
      {
        q: 'Что такое Baito?',
        a: "Baito — это современная платформа в Узбекистане для студентов и соискателей временной работы с гибким графиком и поденной оплатой, а также для работодателей, которым быстро нужны надежные сотрудники.",
        category: 'general'
      },
      {
        q: 'Как подать заявку на работу?',
        a: "Выберите подходящую вакансию из каталога или на карте и нажмите кнопку «Подать заявку». Статус рассмотрения отобразится в разделе «Заявки» и в уведомлениях.",
        category: 'workers'
      },
      {
        q: 'Сервис полностью бесплатный?',
        a: "Да, для студентов и соискателей регистрация, поиск вакансий, отклики и вывод заработанных денег полностью бесплатны. Никаких скрытых комиссий не взимается.",
        category: 'general'
      },
      {
        q: 'Как обновить профиль?',
        a: "Перейдите в раздел «Профиль» и нажмите кнопку «Редактировать». Там вы сможете изменить фото, данные об образовании, навыки и номер телефона в любое время.",
        category: 'general'
      },
      {
        q: 'Можно ли отключить уведомления?',
        a: "Да, в разделе Настройки через параметры уведомлений вы можете настроить или временно отключить push-уведомления.",
        category: 'general'
      },
      {
        q: 'На сколько вакансий можно откликаться одновременно?',
        a: "Вы можете откликаться сразу на несколько вакансий. Главное — следите за тем, чтобы подтвержденные смены не накладывались друг на друга по времени в вашем календаре.",
        category: 'workers'
      },
      {
        q: 'Что делать, если не получается выйти на подтвержденную смену?',
        a: "При возникновении непредвиденных обстоятельств отмените смену минимум за 3-4 часа в приложении и обязательно предупредите менеджера в чате. Неявка без предупреждения снижает рейтинг.",
        category: 'workers'
      },
      {
        q: 'Какой график доступен для студентов?',
        a: "На Baito доступны смены по 4, 6 и 8 часов. Вы можете выбирать утренние, дневные, вечерние смены или подработку в выходные дни без ущерба для учебы.",
        category: 'workers'
      },
      {
        q: 'Как работодателю разместить вакансию?',
        a: "Перейдите в кабинет работодателя и нажмите «Разместить вакансию». Укажите название, обязанности, даты и часы смены, точку на карте и ставку оплаты. Вакансия публикуется моментально.",
        category: 'employers'
      },
      {
        q: 'Как отбирать и подтверждать кандидатов?',
        a: "В разделе «Отклики» просматривайте анкеты кандидатов, опыт, навыки и отзывы от других компаний, общайтесь в чате и подтверждайте подходящих работников нажатием «Принять».",
        category: 'employers'
      },
      {
        q: 'Что происходит, если работник не вышел на смену?',
        a: "Если сотрудник не пришел, система предложит быструю замену из числа свободных работников или вернет зарезервированные средства в полном объеме на ваш счет.",
        category: 'employers'
      },
      {
        q: 'Когда и как выплачивается заработная плата?',
        a: "После окончания смены работодатель подтверждает выполнение работы кнопкой «Завершить работу». Деньги сразу поступают на баланс исполнителя в системе.",
        category: 'payments'
      },
      {
        q: 'Как вывести деньги на банковскую карту?',
        a: "Привяжите карту Uzcard или Humo в разделе «Оплата» > «Мои карты». После этого нажимайте «Вывести средства», и деньги поступят на карту за считанные секунды.",
        category: 'payments'
      },
      {
        q: 'Как обеспечивается безопасность расчетов (Эскроу)?',
        a: "При публикации смены оплата резервируется на защищенном эскроу-счете Baito. Средства выплачиваются работнику только после подтверждения выполнения смены работодателем.",
        category: 'payments'
      },
      {
        q: 'Как устроено налогообложение и самозанятость?',
        a: "По законам Республики Узбекистан можно оформить статус самозанятого и получать доходы со ставкой налога 0%. Все электронные чеки и квитанции формируются в приложении.",
        category: 'payments'
      },
      {
        q: 'Куда обращаться при спорах или задержках?',
        a: "При любых разногласиях или задержках откройте Настройки > Чат поддержки или позвоните на круглосуточную горячую линию по номеру +998 90 123 45 67.",
        category: 'security'
      },
      {
        q: 'Насколько защищены личные данные и пароли?',
        a: "Все данные передаются по зашифрованным протоколам SSL/TLS. Никогда и никому не сообщайте защитные SMS-коды от банка или Baito.",
        category: 'security'
      },
      {
        q: 'Как работает система рейтинга на платформе?',
        a: "После завершения каждой смены обе стороны оценивают друг друга от 1 до 5 звезд. Высокий рейтинг помогает работникам получать самые выгодные предложения и повышать ставку.",
        category: 'general'
      }
    ]
  },

  en: {
    title: "Frequently asked questions",
    subtitle: "Answers to the most important questions about Baito platform, shift work, posting jobs, and payments",
    searchPlaceholder: "Search questions (e.g. payment, free, apply, profile)...",
    allCategories: "All",
    filterGeneral: "General",
    filterWorkers: "Job Seekers",
    filterEmployers: "Employers",
    filterPayments: "Payments & Finance",
    filterSecurity: "Security",
    needHelpTitle: "Still have questions?",
    needHelpDesc: "Our dedicated support team is available 24/7 to assist you with any questions.",
    liveChatButton: "Live Support Chat",
    guideButton: "User Guide",
    noResultsFound: "No questions found",
    noResultsDesc: "Try a different search query or clear the active filter.",
    clearSearch: "Clear search",
    entries: [
      {
        q: 'What is Baito?',
        a: "Baito is a modern platform in Uzbekistan designed to help students and flexible job seekers find daily and shift work, while connecting businesses with verified, reliable workers quickly.",
        category: 'general'
      },
      {
        q: 'How do I apply for a job?',
        a: "Pick a job you like from the listings or interactive map and click the 'Apply' button. You can monitor the application status in your Applications tab and via notifications.",
        category: 'workers'
      },
      {
        q: 'Is the service completely free?',
        a: "Yes, using Baito, registering, creating a profile, and applying for shifts is completely free for students. There are no hidden fees or charges.",
        category: 'general'
      },
      {
        q: 'How do I update my profile?',
        a: "Open the Profile section and click 'Edit' to update your photo, education details, skills, and phone number whenever needed.",
        category: 'general'
      },
      {
        q: 'Can I turn notifications off?',
        a: "Yes. Open Settings > Preferences to customize or turn off push notifications.",
        category: 'general'
      },
      {
        q: 'How many jobs can I apply for at the same time?',
        a: "You can apply for multiple open shifts simultaneously. Just make sure confirmed shifts do not conflict with each other in your personal calendar.",
        category: 'workers'
      },
      {
        q: 'What should I do if I cannot attend a confirmed shift?',
        a: "If an unexpected event occurs, cancel the booking at least 3-4 hours beforehand in the app and inform the employer via chat. Unexcused absences lower your trust score.",
        category: 'workers'
      },
      {
        q: 'What work schedules are available for students?',
        a: "Shifts on Baito are scheduled in 4, 6, or 8-hour blocks. You can pick morning, afternoon, evening, or weekend shifts that fit around your university studies.",
        category: 'workers'
      },
      {
        q: 'How can an employer post a new job vacancy?',
        a: "Switch to your employer dashboard and click 'Post Job'. Enter the title, duties, shift hours, map coordinates, and compensation. Your listing goes live in seconds.",
        category: 'employers'
      },
      {
        q: 'How do I review and select applicants?',
        a: "In the 'Applications' tab, examine applicant profiles, skills, and past reviews from other employers, chat with them, and confirm candidates by clicking 'Accept'.",
        category: 'employers'
      },
      {
        q: 'What happens if a worker fails to show up for a shift?',
        a: "If a worker misses a shift, the system promptly helps you find an available replacement or provides a full refund of your escrow deposit.",
        category: 'employers'
      },
      {
        q: 'When and how are wages paid?',
        a: "Upon shift completion, the employer confirms the work with 'Finish Job'. Payout is released immediately to the worker's platform balance.",
        category: 'payments'
      },
      {
        q: 'How do I withdraw funds to my bank card?',
        a: "Link your Uzcard or Humo bank card under 'Payments' > 'My Cards'. Then click 'Withdraw' to transfer your earnings to your card in seconds.",
        category: 'payments'
      },
      {
        q: 'How is payment security guaranteed (Escrow)?',
        a: "When a shift is posted, payment is securely reserved in Baito escrow. Funds are held until completion is verified, guaranteeing full payout for honest work.",
        category: 'payments'
      },
      {
        q: 'How does self-employment and taxation work?',
        a: "Under Uzbekistan regulations, students can register as self-employed to benefit from an official 0% income tax rate. Receipts are stored in the app.",
        category: 'payments'
      },
      {
        q: 'Who should I contact in case of disputes or delays?',
        a: "For any issues or questions, reach our team via Settings > Support Chat or call our 24/7 hotline at +998 90 123 45 67.",
        category: 'security'
      },
      {
        q: 'How secure is my personal information and password?',
        a: "All data is protected using SSL/TLS encryption protocols. Never share your passwords or verification SMS codes with anyone.",
        category: 'security'
      },
      {
        q: 'How does the platform rating system work?',
        a: "After each completed shift, both parties exchange 1 to 5-star ratings and reviews. High ratings unlock more shifts and higher hourly wages.",
        category: 'general'
      }
    ]
  }
};
