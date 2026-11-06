/** The privacy policy, as data rather than JSX, in the three languages the app
 *  offers.
 *
 *  It used to be eleven sections of JSX written in Uzbek, so a reader who had
 *  chosen Russian was shown a policy they could not read and then asked to tick
 *  six boxes agreeing to it. Holding it as data keeps the three languages
 *  parallel — a section cannot gain a paragraph in one language and not the
 *  others — and puts the whole text in one file, which is where somebody
 *  reviewing the translation will want it.
 *
 *  The Uzbek text is the original and has not been altered. The Russian and
 *  English are translations of it, and the contact addresses below are repeated
 *  verbatim from the original in all three.
 */

export type PrivacyBlock =
  | { kind: 'h'; text: string }
  | { kind: 'p'; text: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'note'; lead?: string; text: string }
  | { kind: 'contacts'; items: { label: string; value: string; href?: string }[] };

export interface PrivacySection {
  title: string;
  blocks: PrivacyBlock[];
}

export interface PrivacyContent {
  screenTitle: string;
  readAllSections: string;
  read: string;
  unread: string;
  consentTitle: string;
  consentSubtitle: string;
  consentPreamble: string;
  consentChecks: string[];
  consentButton: string;
  successTitle: string;
  successBody: string;
  confirmedOn: string;
  backButton: string;
  sections: PrivacySection[];
}

const SUPPORT_EMAIL = 'info@baito.uz';
const SUPPORT_TELEGRAM = '@baito_support';
const TELEGRAM_HREF = 'https://t.me/baito_support';

const uz: PrivacyContent = {
  screenTitle: 'Maxfiylik Siyosati',
  readAllSections: "Barcha bo'limlarni o'qing",
  read: "O'qildi",
  unread: "O'qilmadi",
  consentTitle: 'Rozilik bildirish',
  consentSubtitle: "Barcha bo'limlarni o'qidingiz — endi rozilik bildiring",
  consentPreamble:
    "Men, quyidagi foydalanuvchi, Baito platformasining Maxfiylik Siyosatini to'liq o'qib chiqdim va quyidagilarni tasdiqlyman:",
  consentChecks: [
    "Ushbu Maxfiylik Siyosatini to'liq o'qib chiqdim va tushundim.",
    "Shaxsiy, kasbiy va moliyaviy ma'lumotlarimning yuqorida ko'rsatilgan maqsadlarda to'planishiga va qayta ishlanishiga roziman.",
    "Ma'lumotlarimning ish beruvchilarga va qonunda ko'rsatilgan organlarga berilishiga roziman.",
    "Roziligimni istalgan vaqt qaytarib olish huquqim borligini tushundim.",
    "18 yoshga to'lganligimni va O'zbekiston fuqarosi ekanligimni tasdiqlayman.",
    "Platforma foydalanish shartlari (Terms of Service) bilan tanishganligimni va ularga roziligimni bildiraman.",
  ],
  consentButton: 'Roziman va davom etaman',
  successTitle: 'Rozilik tasdiqlandi!',
  successBody:
    "Siz Baito maxfiylik siyosatini muvaffaqiyatli qabul qildingiz. Akkauntingiz to'liq faollashtirildi.",
  confirmedOn: 'Tasdiqlangan sana:',
  backButton: 'Orqaga qaytish',
  sections: [
    {
      title: "Kirish va umumiy ma'lumot",
      blocks: [
        { kind: 'p', text: "Baito platformasiga xush kelibsiz. Ushbu Maxfiylik Siyosati foydalanuvchilarning platformadan foydalanishi chog'ida to'planadigan shaxsiy ma'lumotlar bilan qanday munosabatda bo'lishimizni belgilaydi." },
        { kind: 'p', text: "Platformamizdan foydalanish orqali siz ushbu siyosatni to'liq o'qib chiqqaningizni va shartlariga rozilik bildirginingizni tasdiqlaysiz. Agar siz ushbu shartlarga rozi bo'lmasangiz, iltimos, platformadan foydalanmang." },
      ],
    },
    {
      title: "To'planadigan ma'lumotlar",
      blocks: [
        { kind: 'h', text: 'Shaxsiy identifikatsiya' },
        { kind: 'ul', items: ["To'liq ism va familiya", 'Tug’ilgan sana va yosh', 'Fuqarolik', "Pasport ma'lumotlari (seriya, raqam, amal qilish muddati)", 'Elektron pochta manzili', 'Telefon raqami', 'Yashash manzili'] },
        { kind: 'h', text: "Kasbiy ma'lumotlar" },
        { kind: 'ul', items: ["Ta'lim darajasi va o'quv yurtlari", "Ish tajribasi va ko'nikmalari", 'Sertifikatlar va diplomlar', "Ko'zlangan ish sohalari va pozitsiyalar", 'Ish vaqti imkoniyatlari'] },
        { kind: 'h', text: "Moliyaviy ma'lumotlar" },
        { kind: 'ul', items: ["Bank hisobi ma'lumotlari (ish haqi o'tkazish uchun)", "Ish haqi tarixi va to'lovlar"] },
        { kind: 'h', text: "Texnik ma'lumotlar" },
        { kind: 'ul', items: ['IP manzil va qurilma identifikatori', 'Brauzer turi va operatsion tizim', 'Platformadagi faoliyat logi', "Joylashuv ma'lumotlari (ruxsat berilganda)"] },
      ],
    },
    {
      title: "Ma'lumotlardan foydalanish maqsadlari",
      blocks: [
        { kind: 'p', text: "To'plangan ma'lumotlar quyidagi maqsadlarda ishlatiladi:" },
        { kind: 'ul', items: ['Platformada foydalanuvchi akkauntini yaratish va boshqarish', 'Ish beruvchilar bilan moslashtirish (matching)', 'Ish beruvchilarga nomzod profili taqdim etish', 'Ish shartnomalarini rasmiylashtirish va yuridik hujjatlar', "Ish haqi va to'lovlarni amalga oshirish", "Platforma xavfsizligini ta'minlash va firibgarlikning oldini olish", 'Platformani yaxshilash va foydalanuvchi tajribasini oshirish', 'Muhim xabarlar va yangilanishlar haqida bildirishnomalar yuborish'] },
      ],
    },
    {
      title: "Ma'lumotlarni uchinchi shaxslarga berish",
      blocks: [
        { kind: 'h', text: 'Ish beruvchilar' },
        { kind: 'p', text: "Siz murojaat qilgan ish beruvchilarga professional ma'lumotlaringiz taqdim etiladi. Bu xizmatning asosiy maqsadidir." },
        { kind: 'h', text: 'Davlat organlari' },
        { kind: 'p', text: "O'zbekiston qonunchiligida nazarda tutilgan hollarda (mehnat, soliq organlari) tegishli ma'lumotlar taqdim etilishi mumkin." },
        { kind: 'h', text: 'Texnik hamkorlar' },
        { kind: 'p', text: "Bulut xizmatlari, to'lov tizimlari kabi xizmat ko'rsatuvchilar cheklangan ma'lumotlarga ega bo'lishi mumkin." },
        { kind: 'note', lead: 'Kafolat:', text: "Biz ma'lumotlaringizni tijorat maqsadida sotmaymiz va reklamachilar bilan baham ko'rmaymiz." },
      ],
    },
    {
      title: "Ma'lumotlarni saqlash va xavfsizlik",
      blocks: [
        { kind: 'h', text: 'Saqlash muddati' },
        { kind: 'ul', items: ["Aktiv foydalanuvchi ma'lumotlari — akkaunt faol bo'lgan davr", 'Ish tarixi va shartnomalar — 5 yil', 'Moliyaviy hujjatlar — 7 yil (soliq qonunchiligiga muvofiq)', 'Texnik loglar — 12 oy'] },
        { kind: 'h', text: 'Xavfsizlik choralari' },
        { kind: 'ul', items: ["SSL/TLS shifrlash barcha ma'lumot uzatish jarayonlarida", "AES-256 shifrlash bilan ma'lumotlar bazasida saqlash", 'Ikki bosqichli autentifikatsiya (2FA) imkoniyati', 'Muntazam xavfsizlik auditi', "Ma'lumotlarga kirish faqat vakolatli xodimlarga cheklangan"] },
      ],
    },
    {
      title: 'Foydalanuvchi huquqlari',
      blocks: [
        { kind: 'ul', items: ["Ma'lumotlaringizga kirish va nusxa olish huquqi", "Noto'g'ri ma'lumotlarni tuzatishni talab qilish huquqi", 'Ma’lumotlaringizni o’chirish ("unutilish huquqi") — qonuniy majburiyatlar bo’lmagan holda', "Ma'lumotlarni qayta ishlashni cheklash huquqi", 'Reklama xabarlaridan voz kechish huquqi (har doim)', 'Shikoyat bilan nazorat organiga murojaat qilish huquqi'] },
        { kind: 'note', text: `Huquqlaringizdan foydalanish uchun: ${SUPPORT_EMAIL} — 30 kun ichida javob beramiz.` },
      ],
    },
    {
      title: 'Cookie va kuzatish texnologiyalari',
      blocks: [
        { kind: 'ul', items: ["Zaruriy cookie'lar — platformaning asosiy ishlashi uchun (o'chirib bo'lmaydi)", "Funksional cookie'lar — sizning sozlamalaringizni eslab qolish uchun", "Analitik cookie'lar — platformani yaxshilash uchun anonim statistika"] },
        { kind: 'p', text: "Brauzer sozlamalaringiz orqali cookie'larni boshqarishingiz mumkin. Zaruriy cookie'larni o'chirganda platforma to'liq ishlamasligi mumkin." },
      ],
    },
    {
      title: 'Voyaga yetmaganlar maxfiyligi',
      blocks: [
        { kind: 'p', text: "Baito xizmati faqat 18 yoshdan oshgan shaxslar uchun mo'ljallangan. Biz bilmagan holda voyaga yetmaganlarning ma'lumotlarini to'plasak, darhol o'chiramiz." },
      ],
    },
    {
      title: "Siyosatga o'zgartirishlar",
      blocks: [
        { kind: 'p', text: "Biz ushbu Maxfiylik Siyosatini vaqti-vaqti bilan yangilab turishimiz mumkin. Muhim o'zgarishlar bo'lganda sizga elektron pochta yoki platforma orqali kamida 30 kun oldin xabar beramiz. Yangilangan siyosat e'lon qilingan sanadan boshlab kuchga kiradi." },
        { kind: 'p', text: "Xabardorlik qilingandan so'ng platformadan foydalanishni davom ettirsangiz, yangi siyosatga rozilik bildirgan hisoblanasiz." },
      ],
    },
    {
      title: "Qo'llaniladigan qonunchilik",
      blocks: [
        { kind: 'ul', items: ['O’zbekiston Respublikasining "Shaxsiy ma’lumotlar to’g’risida"gi Qonuni (2019)', "O'zbekiston Respublikasining Mehnat Kodeksi", "O'zbekiston Respublikasining Fuqarolik Kodeksi"] },
        { kind: 'p', text: "Nizolar O'zbekiston Respublikasi sudlarida ko'rib chiqiladi." },
      ],
    },
    {
      title: 'Aloqa va shikoyatlar',
      blocks: [
        { kind: 'contacts', items: [
          { label: 'Elektron pochta:', value: SUPPORT_EMAIL, href: `mailto:${SUPPORT_EMAIL}` },
          { label: 'Telegram:', value: SUPPORT_TELEGRAM, href: TELEGRAM_HREF },
          { label: 'Javob vaqti:', value: 'ish kunlarida 24 soat ichida' },
        ] },
      ],
    },
  ],
};

const ru: PrivacyContent = {
  screenTitle: 'Политика конфиденциальности',
  readAllSections: 'Прочитайте все разделы',
  read: 'Прочитано',
  unread: 'Не прочитано',
  consentTitle: 'Дать согласие',
  consentSubtitle: 'Вы прочитали все разделы — теперь дайте согласие',
  consentPreamble:
    'Я, нижеподписавшийся пользователь, полностью прочитал Политику конфиденциальности платформы Baito и подтверждаю следующее:',
  consentChecks: [
    'Я полностью прочитал и понял настоящую Политику конфиденциальности.',
    'Я согласен на сбор и обработку моих личных, профессиональных и финансовых данных в указанных выше целях.',
    'Я согласен на передачу моих данных работодателям и органам, предусмотренным законом.',
    'Я понимаю, что имею право отозвать своё согласие в любое время.',
    'Я подтверждаю, что мне исполнилось 18 лет и что я являюсь гражданином Узбекистана.',
    'Я подтверждаю, что ознакомился с Условиями использования платформы (Terms of Service) и согласен с ними.',
  ],
  consentButton: 'Согласен и продолжаю',
  successTitle: 'Согласие подтверждено!',
  successBody:
    'Вы успешно приняли политику конфиденциальности Baito. Ваш аккаунт полностью активирован.',
  confirmedOn: 'Дата подтверждения:',
  backButton: 'Вернуться назад',
  sections: [
    {
      title: 'Введение и общая информация',
      blocks: [
        { kind: 'p', text: 'Добро пожаловать на платформу Baito. Настоящая Политика конфиденциальности определяет, как мы обращаемся с личными данными, которые собираются во время использования платформы.' },
        { kind: 'p', text: 'Пользуясь нашей платформой, вы подтверждаете, что полностью прочитали настоящую политику и согласны с её условиями. Если вы не согласны с этими условиями, пожалуйста, не пользуйтесь платформой.' },
      ],
    },
    {
      title: 'Собираемые данные',
      blocks: [
        { kind: 'h', text: 'Идентификационные данные' },
        { kind: 'ul', items: ['Имя и фамилия полностью', 'Дата рождения и возраст', 'Гражданство', 'Паспортные данные (серия, номер, срок действия)', 'Адрес электронной почты', 'Номер телефона', 'Адрес проживания'] },
        { kind: 'h', text: 'Профессиональные данные' },
        { kind: 'ul', items: ['Уровень образования и учебные заведения', 'Опыт работы и навыки', 'Сертификаты и дипломы', 'Желаемые сферы работы и должности', 'Доступное рабочее время'] },
        { kind: 'h', text: 'Финансовые данные' },
        { kind: 'ul', items: ['Банковские реквизиты (для перевода оплаты труда)', 'История оплаты труда и платежей'] },
        { kind: 'h', text: 'Технические данные' },
        { kind: 'ul', items: ['IP-адрес и идентификатор устройства', 'Тип браузера и операционная система', 'Журнал активности на платформе', 'Данные о местоположении (при наличии разрешения)'] },
      ],
    },
    {
      title: 'Цели использования данных',
      blocks: [
        { kind: 'p', text: 'Собранные данные используются в следующих целях:' },
        { kind: 'ul', items: ['Создание и ведение учётной записи на платформе', 'Подбор соответствия с работодателями (matching)', 'Предоставление профиля кандидата работодателям', 'Оформление трудовых договоров и юридических документов', 'Осуществление оплаты труда и платежей', 'Обеспечение безопасности платформы и предотвращение мошенничества', 'Улучшение платформы и пользовательского опыта', 'Отправка уведомлений о важных сообщениях и обновлениях'] },
      ],
    },
    {
      title: 'Передача данных третьим лицам',
      blocks: [
        { kind: 'h', text: 'Работодатели' },
        { kind: 'p', text: 'Работодателям, к которым вы обратились, предоставляются ваши профессиональные данные. Это основная цель сервиса.' },
        { kind: 'h', text: 'Государственные органы' },
        { kind: 'p', text: 'В случаях, предусмотренных законодательством Узбекистана (трудовые, налоговые органы), соответствующие данные могут быть предоставлены.' },
        { kind: 'h', text: 'Технические партнёры' },
        { kind: 'p', text: 'Поставщики услуг, такие как облачные сервисы и платёжные системы, могут иметь доступ к ограниченному набору данных.' },
        { kind: 'note', lead: 'Гарантия:', text: 'Мы не продаём ваши данные в коммерческих целях и не передаём их рекламодателям.' },
      ],
    },
    {
      title: 'Хранение данных и безопасность',
      blocks: [
        { kind: 'h', text: 'Срок хранения' },
        { kind: 'ul', items: ['Данные активного пользователя — весь период, пока аккаунт активен', 'История работ и договоры — 5 лет', 'Финансовые документы — 7 лет (согласно налоговому законодательству)', 'Технические логи — 12 месяцев'] },
        { kind: 'h', text: 'Меры безопасности' },
        { kind: 'ul', items: ['SSL/TLS-шифрование при любой передаче данных', 'Хранение в базе данных с шифрованием AES-256', 'Возможность двухфакторной аутентификации (2FA)', 'Регулярный аудит безопасности', 'Доступ к данным ограничен только уполномоченными сотрудниками'] },
      ],
    },
    {
      title: 'Права пользователя',
      blocks: [
        { kind: 'ul', items: ['Право на доступ к вашим данным и получение копии', 'Право требовать исправления неверных данных', 'Право на удаление данных («право быть забытым») — при отсутствии законных обязательств', 'Право на ограничение обработки данных', 'Право отказаться от рекламных сообщений (в любое время)', 'Право обратиться с жалобой в надзорный орган'] },
        { kind: 'note', text: `Чтобы воспользоваться своими правами: ${SUPPORT_EMAIL} — мы ответим в течение 30 дней.` },
      ],
    },
    {
      title: 'Cookie и технологии отслеживания',
      blocks: [
        { kind: 'ul', items: ['Необходимые cookie — для основной работы платформы (отключить нельзя)', 'Функциональные cookie — чтобы запоминать ваши настройки', 'Аналитические cookie — анонимная статистика для улучшения платформы'] },
        { kind: 'p', text: 'Вы можете управлять cookie в настройках браузера. При отключении необходимых cookie платформа может работать не полностью.' },
      ],
    },
    {
      title: 'Конфиденциальность несовершеннолетних',
      blocks: [
        { kind: 'p', text: 'Сервис Baito предназначен только для лиц старше 18 лет. Если мы по незнанию соберём данные несовершеннолетнего, мы удалим их незамедлительно.' },
      ],
    },
    {
      title: 'Изменения в политике',
      blocks: [
        { kind: 'p', text: 'Мы можем время от времени обновлять настоящую Политику конфиденциальности. О существенных изменениях мы сообщим вам по электронной почте или через платформу не менее чем за 30 дней. Обновлённая политика вступает в силу с даты публикации.' },
        { kind: 'p', text: 'Если после уведомления вы продолжите пользоваться платформой, считается, что вы согласились с новой политикой.' },
      ],
    },
    {
      title: 'Применимое законодательство',
      blocks: [
        { kind: 'ul', items: ['Закон Республики Узбекистан «О персональных данных» (2019)', 'Трудовой кодекс Республики Узбекистан', 'Гражданский кодекс Республики Узбекистан'] },
        { kind: 'p', text: 'Споры рассматриваются в судах Республики Узбекистан.' },
      ],
    },
    {
      title: 'Связь и жалобы',
      blocks: [
        { kind: 'contacts', items: [
          { label: 'Электронная почта:', value: SUPPORT_EMAIL, href: `mailto:${SUPPORT_EMAIL}` },
          { label: 'Telegram:', value: SUPPORT_TELEGRAM, href: TELEGRAM_HREF },
          { label: 'Время ответа:', value: 'в течение 24 часов в рабочие дни' },
        ] },
      ],
    },
  ],
};

const en: PrivacyContent = {
  screenTitle: 'Privacy Policy',
  readAllSections: 'Read every section',
  read: 'Read',
  unread: 'Not read',
  consentTitle: 'Give your consent',
  consentSubtitle: 'You have read every section — now give your consent',
  consentPreamble:
    'I, the undersigned user, have read the Baito platform’s Privacy Policy in full and confirm the following:',
  consentChecks: [
    'I have read and understood this Privacy Policy in full.',
    'I consent to my personal, professional and financial data being collected and processed for the purposes set out above.',
    'I consent to my data being given to employers and to the authorities named in law.',
    'I understand that I have the right to withdraw my consent at any time.',
    'I confirm that I am 18 or over and that I am a citizen of Uzbekistan.',
    'I confirm that I have read the platform’s Terms of Service and that I agree to them.',
  ],
  consentButton: 'I agree, continue',
  successTitle: 'Consent confirmed',
  successBody:
    'You have accepted Baito’s privacy policy. Your account is now fully active.',
  confirmedOn: 'Confirmed on:',
  backButton: 'Go back',
  sections: [
    {
      title: 'Introduction and general information',
      blocks: [
        { kind: 'p', text: 'Welcome to the Baito platform. This Privacy Policy sets out how we handle the personal data collected while you use the platform.' },
        { kind: 'p', text: 'By using our platform you confirm that you have read this policy in full and agree to its terms. If you do not agree to these terms, please do not use the platform.' },
      ],
    },
    {
      title: 'The data we collect',
      blocks: [
        { kind: 'h', text: 'Identifying information' },
        { kind: 'ul', items: ['Full name', 'Date of birth and age', 'Citizenship', 'Passport details (series, number, expiry)', 'Email address', 'Phone number', 'Home address'] },
        { kind: 'h', text: 'Professional information' },
        { kind: 'ul', items: ['Level of education and institutions attended', 'Work experience and skills', 'Certificates and diplomas', 'Fields and positions sought', 'Availability'] },
        { kind: 'h', text: 'Financial information' },
        { kind: 'ul', items: ['Bank account details (for paying wages)', 'Wage history and payments'] },
        { kind: 'h', text: 'Technical information' },
        { kind: 'ul', items: ['IP address and device identifier', 'Browser type and operating system', 'Activity log on the platform', 'Location data (where permission is given)'] },
      ],
    },
    {
      title: 'What we use the data for',
      blocks: [
        { kind: 'p', text: 'The data collected is used for the following purposes:' },
        { kind: 'ul', items: ['Creating and managing your account on the platform', 'Matching you with employers', 'Presenting your candidate profile to employers', 'Drawing up employment contracts and legal documents', 'Paying wages and processing payments', 'Keeping the platform secure and preventing fraud', 'Improving the platform and the user experience', 'Sending notifications about important messages and updates'] },
      ],
    },
    {
      title: 'Sharing data with third parties',
      blocks: [
        { kind: 'h', text: 'Employers' },
        { kind: 'p', text: 'Your professional information is given to the employers you apply to. This is the main purpose of the service.' },
        { kind: 'h', text: 'Government bodies' },
        { kind: 'p', text: 'Where the law of Uzbekistan provides for it (labour and tax authorities), the relevant data may be supplied.' },
        { kind: 'h', text: 'Technical partners' },
        { kind: 'p', text: 'Service providers such as cloud services and payment systems may have access to a limited set of data.' },
        { kind: 'note', lead: 'Our guarantee:', text: 'We do not sell your data commercially and we do not share it with advertisers.' },
      ],
    },
    {
      title: 'Data retention and security',
      blocks: [
        { kind: 'h', text: 'How long we keep it' },
        { kind: 'ul', items: ['Active user data — for as long as the account is active', 'Work history and contracts — 5 years', 'Financial documents — 7 years (as tax law requires)', 'Technical logs — 12 months'] },
        { kind: 'h', text: 'Security measures' },
        { kind: 'ul', items: ['SSL/TLS encryption on every data transfer', 'AES-256 encryption at rest in the database', 'Two-factor authentication (2FA) available', 'Regular security audits', 'Access to data restricted to authorised staff only'] },
      ],
    },
    {
      title: 'Your rights',
      blocks: [
        { kind: 'ul', items: ['The right to access your data and obtain a copy', 'The right to have inaccurate data corrected', 'The right to erasure (the "right to be forgotten") — where no legal obligation prevents it', 'The right to restrict processing', 'The right to opt out of marketing messages (at any time)', 'The right to complain to a supervisory authority'] },
        { kind: 'note', text: `To exercise your rights: ${SUPPORT_EMAIL} — we reply within 30 days.` },
      ],
    },
    {
      title: 'Cookies and tracking technologies',
      blocks: [
        { kind: 'ul', items: ['Essential cookies — for the platform to work at all (these cannot be turned off)', 'Functional cookies — to remember your settings', 'Analytics cookies — anonymous statistics used to improve the platform'] },
        { kind: 'p', text: 'You can manage cookies through your browser settings. If you turn off essential cookies, the platform may not work fully.' },
      ],
    },
    {
      title: 'Privacy of minors',
      blocks: [
        { kind: 'p', text: 'The Baito service is intended only for people aged 18 and over. If we collect a minor’s data without knowing, we delete it immediately.' },
      ],
    },
    {
      title: 'Changes to this policy',
      blocks: [
        { kind: 'p', text: 'We may update this Privacy Policy from time to time. Where a change is significant we will tell you by email or through the platform at least 30 days beforehand. The updated policy takes effect from the date it is published.' },
        { kind: 'p', text: 'If you carry on using the platform after being notified, you are taken to have agreed to the new policy.' },
      ],
    },
    {
      title: 'Applicable law',
      blocks: [
        { kind: 'ul', items: ['The Law of the Republic of Uzbekistan "On Personal Data" (2019)', 'The Labour Code of the Republic of Uzbekistan', 'The Civil Code of the Republic of Uzbekistan'] },
        { kind: 'p', text: 'Disputes are heard in the courts of the Republic of Uzbekistan.' },
      ],
    },
    {
      title: 'Contact and complaints',
      blocks: [
        { kind: 'contacts', items: [
          { label: 'Email:', value: SUPPORT_EMAIL, href: `mailto:${SUPPORT_EMAIL}` },
          { label: 'Telegram:', value: SUPPORT_TELEGRAM, href: TELEGRAM_HREF },
          { label: 'Response time:', value: 'within 24 hours on working days' },
        ] },
      ],
    },
  ],
};

export const PRIVACY: Record<'uz' | 'ru' | 'en', PrivacyContent> = { uz, ru, en };
