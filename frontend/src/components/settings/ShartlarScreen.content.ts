/** The terms of service, in the three languages the app offers.
 *
 *  Holding it as data keeps the three languages parallel — a section cannot
 *  gain a paragraph in one language and not the others — and puts the whole
 *  text in one file for straightforward maintenance and internationalization.
 */

export interface TermsSection {
  heading: string;
  body: string;
  bulletPoints?: string[];
  note?: string;
}

export interface TermsContent {
  title: string;
  subtitle: string;
  lastUpdated: string;
  effectiveDate: string;
  statusAcceptedTitle: string;
  statusAcceptedSubtitle: string;
  statusAcceptedBadge: string;
  searchPlaceholder: string;
  clearSearch: string;
  noResults: string;
  noResultsDesc: string;
  resetSearch: string;
  allSections: string;
  quickNav: string;
  printDoc: string;
  relatedLinksTitle: string;
  privacyLink: string;
  faqLink: string;
  supportLink: string;
  sections: TermsSection[];
}

export const TERMS: Record<'uz' | 'ru' | 'en', TermsContent> = {
  uz: {
    title: 'Foydalanish shartlari',
    subtitle: "Baito platformasidan foydalanish bo'yicha rasmiy ommaviy oferta va shartnoma qoidalari",
    lastUpdated: 'Oxirgi yangilanish: 2026-yil 15-sentyabr',
    effectiveDate: 'Amal qilish muddati: Cheklanmagan (2026-yil uchun amalda)',
    statusAcceptedTitle: "Foydalanish shartlari qabul qilingan va amalda",
    statusAcceptedSubtitle: "Siz platformadan foydalanish orqali ushbu shartlarga to'liq rozilik bildirgansiz. Shartlar barcha foydalanuvchilar uchun majburiydir va o'zgartirib bo'lmaydi.",
    statusAcceptedBadge: 'Amalda • 2026-yil',
    searchPlaceholder: "Shartlar bo'yicha qidirish (masalan: to'lov, ish haqi, bekor qilish, jarima)...",
    clearSearch: 'Qidiruvni tozalash',
    noResults: 'Hech qanday band topilmadi',
    noResultsDesc: "Kiritilgan so'rov bo'yicha shartlar topilmadi. Qidiruv so'zini o'zgartirib ko'ring.",
    resetSearch: 'Qidiruvni bekor qilish',
    allSections: 'Barcha bandlar',
    quickNav: "Tezkor o'tish",
    printDoc: 'Chop etish / Saqlash',
    relatedLinksTitle: 'Foydali huquqiy havolalar',
    privacyLink: 'Maxfiylik siyosati',
    faqLink: "Ko'p beriladigan savollar",
    supportLink: "Qo'llab-quvvatlash chati",
    sections: [
      {
        heading: '1. Umumiy qoidalar',
        body: "Ushbu Foydalanish shartlari (\"Shartlar\") Baito elektron axborot platformasidan (\"Platforma\" yoki \"Ilova\") foydalanish tartibini, huquq va majburiyatlarni belgilovchi rasmiy ommaviy oferta hisoblanadi. Baito O'zbekiston Respublikasi qonunchiligiga muvofiq, ish qidiruvchilar (talabalar, frilanserlar, mutaxassislar) hamda ish beruvchilar (yuridik va jismoniy shaxslar) o'rtasida qisqa muddatli, smenali va bir martalik ishlarni tashkil etish, o'zaro aloqa va to'lovlarni amalga oshirish bo'yicha vositachilik xizmatlarini taqdim etadi. Platformada ro'yxatdan o'tish yoki undan foydalanish foydalanuvchi ushbu Shartlarni hech qanday istisnolarsiz to'liq qabul qilganini (aksept) bildiradi.",
        bulletPoints: [
          "Platforma O'zbekiston Respublikasi hududida faoliyat yuritadi va mamlakatning Fuqarolik kodeksi hamda Mehnat to'g'risidagi qonunchiligiga tayanadi.",
          "Ilovadan foydalanish shartlari Baito ma'muriyati va foydalanuvchi o'rtasidagi yuridik kuchga ega bitim hisoblanadi.",
          "Agar foydalanuvchi ushbu Shartlarning biron bir bandiga rozi bo'lmasa, platformadan foydalanishni darhol to'xtatishi shart.",
        ],
      },
      {
        heading: "2. Ro'yxatdan o'tish va hisob xavfsizligi",
        body: "Platformadan foydalanish uchun foydalanuvchi kamida 16 yoshga to'lgan bo'lishi va O'zbekiston Respublikasi qonunchiligiga muvofiq muomala layoqatiga ega bo'lishi lozim. Ro'yxatdan o'tish jarayonida foydalanuvchi haqiqiy va to'g'ri ma'lumotlarni (telefon raqami, F.I.Sh., shaxsni tasdiqlovchi hujjat ma'lumotlari) taqdim etishi shart. Har bir foydalanuvchi faqat bitta shaxsiy profilga ega bo'lishi mumkin. Bir kishi nomiga bir nechta profil ochish qat'iyan man etiladi.",
        bulletPoints: [
          "Hisob qaydnomasiga kirish kodi (SMS-kod yoki parol) maxfiy saqlanishi kerak; uni uchinchi shaxslarga berish taqiqlanadi.",
          "Foydalanuvchi o'z hisob qaydnomasi orqali amalga oshirilgan barcha harakatlar va buyurtmalar uchun shaxsan javobgardir.",
          "Hisobga ruxsatsiz kirish holatlari aniqlanganda, foydalanuvchi zudlik bilan Baito qo'llab-quvvatlash xizmatiga xabar berishi lozim.",
        ],
      },
      {
        heading: "3. Ish qidiruvchilarning huquq va majburiyatlari",
        body: "Ish qidiruvchi (xodim / ijrochi) e'londa belgilangan talablarga muvofiq o'z vaqtida belgilangan manzilga yetib kelishi, o'z zimmisiga olgan vazifalarni vijdonan, xavfsizlik texnikasi qoidalariga qat'iy rioya qilgan holda bajarishi hamda ish beruvchining mulkiga ehtiyotkorona munosabatda bo'lishi shart.",
        bulletPoints: [
          "Smenaga yetib kela olmaslik holati yuz berganda, ish boshlanishidan kamida 3 soat oldin ilova orqali arizani bekor qilish shart.",
          "Sababsiz ishga kelmaslik (No-Show) yoki ogohlantirmasdan kechikish foydalanuvchining ishonch reytingini pasaytiradi va profilni bloklashga sabab bo'ladi.",
          "Ish qidiruvchi smena muvaffaqiyatli yakunlangach, kelishilgan ish haqini to'liq va kechiktirilmasdan olish huquqiga ega.",
          "Ish joyida noqonuniy yoki xavfli sharoitlarga duch kelganda, ijrochi smenani to'xtatish va Baito arbitrajiga murojaat qilish huquqiga ega.",
        ],
      },
      {
        heading: "4. Ish beruvchilarning huquq va majburiyatlari",
        body: "Ish beruvchi (buyurtmachi) e'lon joylashtirishda ish tavsifi, talab qilinadigan ko'nikmalar, aniq ish vaqti, manzil va to'lov summasini to'g'ri va haqqoniy ko'rsatishi shart. Ish beruvchi xavfsiz mehnat sharoitlarini ta'minlash, xodimning sha'ni va qadr-qimmatini hurmat qilish hamda ish yakunlangach, bajarilgan ishni o'z vaqtida tasdiqlashi majburiydir.",
        bulletPoints: [
          "Ish beruvchi e'londa ko'rsatilmagan qo'shimcha yoki xavfli vazifalarni bajarishni talab qilishga haqli emas.",
          "Smena muvaffaqiyatli yakunlangach, ish beruvchi 24 soat ichida ishni tasdiqlashi va to'lovni rasmiylashtirishi shart.",
          "Qonunga zid bo'lgan, litsenziyasiz yoki xavfli faoliyat turlariga e'lon berish qat'iyan man etiladi.",
          "Ish beruvchi platformada faqat tekshirilgan va tasdiqlangan kompaniya yoki jismoniy shaxs sifatida ish olib boradi.",
        ],
      },
      {
        heading: "5. To'lovlar va moliyaviy hisob-kitoblar tartibi",
        body: "Baito platformasida ish haqi miqdori har bir e'londa aniq ko'rsatiladi va smena tasdiqlanganda tomonlar o'rtasida qat'iy kelishilgan hisoblanadi. Smena to'liq yakunlanib, ish beruvchi tomonidan ish qabul qilinganidan so'ng, to'lov belgilangan tartibda rasmiylashtiriladi va xodimga to'lab beriladi.",
        bulletPoints: [
          "Ish beruvchi smena muvaffaqiyatli yakunlangach, 24 soat ichida bajarilgan ishni tasdiqlashi va to'lovni kechiktirmasdan amalga oshirishi shart.",
          "Xodim o'ziga hisoblangan ish haqini o'zining bank kartalariga (Uzcard, Humo) qabul qiladi.",
          "To'lovlarni asossiz kechiktirish yoki kelishilgan summadan kam to'lash qat'iyan taqiqlanadi va ish beruvchi hisobining cheklanishiga olib keladi.",
          "Barcha hisob-fakturalar va to'lov kvitansiyalari tizimda rasmiy buxgalteriya hisobi uchun saqlanadi.",
        ],
        note: "Muhim: Ish beruvchi e'londa ko'rsatilgan va tasdiqlangan ish haqi miqdorini to'liq to'lashga majburdir. To'lov bo'yicha nizolar yuzaga kelsa, Baito arbitraji tomonidan adolatli hal qilinadi.",
      },
      {
        heading: "6. Smenalarni bekor qilish va reyting tizimi",
        body: "Har bir foydalanuvchi uchun platformada shaffof reyting va ishonch indeksi (0 dan 5.0 gacha) yuritiladi. Reyting har bir tugallangan smena, o'z vaqtida kelish, ish sifati va o'zaro sharhlar asosida avtomatik hisoblanadi.",
        bulletPoints: [
          "Smena boshlanishiga 3 soatdan ortiq vaqt qolganda bekor qilish bepul va jarimasiz amalga oshiriladi.",
          "Smena boshlanishiga 3 soatdan kam qolganda arizani asossiz bekor qilish reytingning 0.2 ballga pasayishiga olib keladi.",
          "Ishga umuman kelmaslik (No-Show) holatida reyting 0.5 ballga pasayadi va hisob 3 kunga vaqtincha muzlatiladi.",
          "Ish beruvchi tomonidan tasdiqlangan smena so'nggi 2 soat ichida asossiz bekor qilinsa, ijrochiga minimal kafolatlangan kompensatsiya (smena narxining 20% qismi) to'lanadi.",
          "Reytingi 3.5 balldan tushib ketgan foydalanuvchilar yangi smenalarga ariza topshirish imkoniyatidan vaqtincha mahrum qilinadi.",
        ],
      },
      {
        heading: "7. Taqiqlangan harakatlar va cheklovlar",
        body: "Platformada halol, xavfsiz va qonuniy muhitni ta'minlash maqsadida quyidagi harakatlar qat'iyan man etiladi:",
        bulletPoints: [
          "Soxta shaxsiy ma'lumotlardan foydalanish yoki boshqa shaxs nomidan hisob ochish.",
          "Platforma komissiyasidan qochish maqsadida foydalanuvchilarni to'g'ridan-to'g'ri (off-platform) kelishuvlarga undash.",
          "Noqonuniy moddalar, alkogol, tamaki, qurol yoki O'zbekiston qonunlariga zid boshqa tovarlar va xizmatlar bilan bog'liq e'lonlar joylashtirish.",
          "Foydalanuvchilarni haqorat qilish, kamsitish, tahdid qilish yoki noo'rin xabarlar yuborish.",
          "Platforma dasturiy ta'minotiga noqonuniy kirish, tahlil qilish (reverse engineering) yoki sun'iy botlardan foydalanish.",
        ],
        note: "Qoidalarni qasddan buzgan foydalanuvchilarning hisoblari oldindan ogohlantirishsiz butunlay bloklanadi va qayta tiklanmaydi.",
      },
      {
        heading: "8. Nizolarni hal qilish va Arbitraj",
        body: "Ish sifati, ish vaqti, haq to'lash yoki shartlarning buzilishi yuzasidan tomonlar o'rtasida nizo kelib chiqqan taqdirda, tomonlar Baito ilovasi orqali rasmiy Nizolar (Arbitraj) bo'limiga murojaat qilishlari mumkin.",
        bulletPoints: [
          "Nizo smena yakunlanganidan keyin 24 soat ichida ochilishi lozim.",
          "Baito arbitraj komissiyasi tomonlar taqdim etgan dalillarni (chat yozishmalari, fotosuratlar, geo-lokatsiya ma'lumotlari) xolisona o'rganadi.",
          "Arbitraj qarori 3 ish kuni ichida chiqariladi va to'lovlar bo'yicha yakuniy xulosa beriladi.",
          "Platforma doirasida hal etilmagan nizolar O'zbekiston Respublikasi qonunlariga binoan Toshkent shahridagi vakolatli sudlarda ko'rib chiqiladi.",
        ],
      },
      {
        heading: "9. Intellektual mulk va ma'lumotlar daxlsizligi",
        body: "Baito platformasiga oid barcha dasturiy ta'minot, dizayn, savdo belgilari, logotiplar va kontent platforma mualliflariga tegishli bo'lib, O'zbekiston Respublikasining intellektual mulk to'g'risidagi qonunlari bilan himoyalanadi.",
        bulletPoints: [
          "Platforma materiallaridan, kodidan yoki dizaynidan Baito ruxsatisiz nusxa ko'chirish va tijoriy maqsadda foydalanish qat'iyan taqiqlanadi.",
          "Foydalanuvchilarning shaxsiy ma'lumotlari platformaning Maxfiylik Siyosatiga muvofiq qat'iy shifrlangan holda saqlanadi va uchinchi shaxslarga sotilmaydi.",
        ],
      },
      {
        heading: "10. Javobgarlikni cheklash va kafolatlar",
        body: "Baito axborot-texnologik vositachi platforma sifatida tomonlarni o'zaro bog'laydi va mustaqil pudrat shartnomasining bevosita tomoni hisoblanmaydi. Platforma xodimlar va ish beruvchilar o'rtasida yuzaga keladigan mehnat munosabatlari uchun to'g'ridan-to'g'ri ish beruvchi sanalmaydi.",
        bulletPoints: [
          "Baito tomonlarning ish joyidagi xatti-harakati, mulkka yetkazilgan zarar yoki xodimning sog'lig'i uchun javobgar emas (mehnat xavfsizligi ish beruvchi javobgarligida).",
          "Platforma fors-major holatlari (tabiiy ofatlar, davlat organlari qarorlari, internet uzilishlari) paytida xizmatlarning vaqtincha to'xtab qolishi uchun javobgar emas.",
          "Baito platforma uzluksiz, xavfsiz va sifatli ishlashi uchun barcha texnik va tashkiliy choralarni ko'radi.",
        ],
      },
      {
        heading: "11. Shartlarning o'zgarishi va amal qilish muddati",
        body: "Ushbu Shartlar foydalanuvchi platformada ro'yxatdan o'tgan yoki undan foydalangan paytdan boshlab kuchga kiradi va hisob faol bo'lgan butun davr mobaynida amal qiladi. Baito ushbu Shartlarga istalgan vaqtda bir tomonlama o'zgartirish va qo'shimchalar kiritish huquqiga ega.",
        bulletPoints: [
          "Yangi tahrirdagi Shartlar platformada e'lon qilingan paytdan boshlab darhol kuchga kiradi.",
          "Muhim o'zgarishlar haqida foydalanuvchilarga ilova orqali bildirishnoma yuboriladi.",
          "O'zgartirishlar kiritilgandan so'ng platformadan foydalanishni davom ettirish yangi shartlarni qabul qilish deb hisoblanadi.",
        ],
      },
      {
        heading: "12. Bog'lanish va huquqiy ma'lumotlar",
        body: "Ushbu Foydalanish shartlari bo'yicha savollar, yuridik murojaatlar yoki takliflar bo'yicha Baito rasmiy bo'limiga quyidagi kanallar orqali murojaat qilishingiz mumkin:",
        bulletPoints: [
          "Elektron pochta: legal@baito.uz",
          "Qo'llab-quvvatlash xizmati: support@baito.uz",
          "Telegram rasmiy kanal: @baito_support",
          "Manzil: O'zbekiston Respublikasi, Toshkent shahri, Mirzo Ulug'bek tumani, IT Park majmuasi.",
        ],
      },
    ],
  },
  ru: {
    title: 'Условия использования',
    subtitle: 'Официальная публичная оферта и правила использования платформы Baito',
    lastUpdated: 'Последнее обновление: 15 сентября 2026 г.',
    effectiveDate: 'Срок действия: Бессрочно (Действует на 2026 год)',
    statusAcceptedTitle: 'Условия использования приняты и действуют',
    statusAcceptedSubtitle: 'Используя платформу, вы подтверждаете полное согласие с данными условиями. Условия обязательны для всех пользователей и не подлежат изменению в одностороннем порядке.',
    statusAcceptedBadge: 'Действует • 2026 г.',
    searchPlaceholder: 'Поиск по условиям (например: оплата, зарплата, отмена, штрафы)...',
    clearSearch: 'Очистить поиск',
    noResults: 'Пункты не найдены',
    noResultsDesc: 'По вашему запросу условий не найдено. Попробуйте изменить поисковые слова.',
    resetSearch: 'Сбросить поиск',
    allSections: 'Все разделы',
    quickNav: 'Быстрый переход',
    printDoc: 'Печать / Сохранить',
    relatedLinksTitle: 'Полезные юридические ссылки',
    privacyLink: 'Политика конфиденциальности',
    faqLink: 'Частые вопросы',
    supportLink: 'Чат поддержки',
    sections: [
      {
        heading: '1. Общие положения',
        body: 'Настоящие Условия использования («Условия») являются официальной публичной офертой, определяющей порядок использования электронной платформы Baito («Платформа» или «Приложение»), а также взаимные права и обязанности сторон. Платформа Baito действует в соответствии с законодательством Республики Узбекистан и выступает посредником между соискателями (студентами, фрилансерами, специалистами) и работодателями (юридическими и физическими лицами) для организации посменной, краткосрочной и проектной занятости, безопасного взаимодействия и расчётов. Регистрация или использование Платформы означает полное и безоговорочное принятие (акцепт) настоящих Условий.',
        bulletPoints: [
          'Платформа осуществляет деятельность на территории Республики Узбекистан в соответствии с Гражданским и Трудовым кодексами.',
          'Условия использования представляют собой юридически обязывающее соглашение между администрацией Baito и пользователем.',
          'Если пользователь не согласен с какими-либо положениями настоящих Условий, он обязан немедленно прекратить использование Платформы.',
        ],
      },
      {
        heading: '2. Регистрация и безопасность учётной записи',
        body: 'Для использования Платформы пользователь должен достигнуть возраста не менее 16 лет и обладать полной дееспособностью в соответствии с законодательством Республики Узбекистан. При регистрации пользователь обязуется предоставить достоверные персональные данные (номер телефона, Ф.И.О., паспортные данные/ID). Каждый пользователь вправе иметь только один личный профиль. Создание нескольких профилей на одно лицо строго запрещено.',
        bulletPoints: [
          'Код доступа (пароль или SMS-код) является конфиденциальным; передача его третьим лицам запрещена.',
          'Пользователь несёт личную ответственность за все действия и транзакции, совершённые через его учётную запись.',
          'При обнаружении несанкционированного доступа к аккаунту пользователь обязан немедленно уведомить службу поддержки Baito.',
        ],
      },
      {
        heading: '3. Права и обязанности соискателей',
        body: 'Соискатель (исполнитель) обязуется своевременно прибыть по указанному в заявке адресу, добросовестно выполнять согласованные обязанности, соблюдать правила техники безопасности и бережно относиться к имуществу работодателя.',
        bulletPoints: [
          'В случае невозможности выхода на смену соискатель обязан отменить заявку через приложение не менее чем за 3 часа до начала смены.',
          'Неявка на смену без уважительной причины (No-Show) или опоздание снижает рейтинг доверия пользователя и может привести к блокировке аккаунта.',
          'Соискатель имеет право на получение полной и своевременной оплаты труда сразу после подтверждения завершения работы.',
          'При обнаружении опасных или незаконных условий труда исполнитель вправе прекратить работу и обратиться в арбитраж Baito.',
        ],
      },
      {
        heading: '4. Права и обязанности работодателей',
        body: 'Работодатель (заказчик) при публикации вакансии обязан указывать точное описание задач, требуемые навыки, график, адрес и размер оплаты. Работодатель обязан обеспечить безопасные условия труда, уважать права сотрудников и своевременно подтверждать выполнение работ.',
        bulletPoints: [
          'Работодатель не вправе требовать выполнения опасных или не указанных в объявлении обязанностей.',
          'После успешного завершения смены работодатель обязан подтвердить работу в течение 24 часов и произвести расчёт.',
          'Публикация вакансий, связанных с незаконной или вводящей в заблуждение деятельностью, строго запрещена.',
          'Работодатель ведёт деятельность на Платформе исключительно в качестве верифицированной компании или физического лица.',
        ],
      },
      {
        heading: '5. Порядок оплаты и финансовых расчётов',
        body: 'Размер оплаты труда фиксируется в объявлении о вакансии и считается согласованным при подтверждении смены. После завершения смены и приёмки работы работодателем выплата оформляется в установленном порядке и начисляется исполнителю.',
        bulletPoints: [
          'Работодатель обязан подтвердить выполнение работ в течение 24 часов после окончания смены и произвести расчёт без задержек.',
          'Исполнитель получает заработанные средства на свои банковские карты (Uzcard, Humo).',
          'Необоснованная задержка выплат или выплата суммы меньше согласованной строго запрещена и ведёт к блокировке работодателя.',
          'Все официальные счета и квитанции об оплате фиксируются в системе.',
        ],
        note: 'Важно: Работодатель обязан полностью выплатить подтверждённую сумму оплаты труда. В случае споров по выплатам вопрос передаётся в арбитраж Baito.',
      },
      {
        heading: '6. Отмена смен и система рейтинга',
        body: 'На Платформе действует прозрачная система рейтинга и индекса надёжности (от 0 до 5.0). Рейтинг рассчитывается автоматически на основе выполненных смен, пунктуальности, качества работы и взаимных отзывов.',
        bulletPoints: [
          'Отмена смены более чем за 3 часа до начала производится бесплатно и без штрафов.',
          'Отмена менее чем за 3 часа без уважительной причины снижает рейтинг на 0.2 балла.',
          'Неявка на работу без предупреждения снижает рейтинг на 0.5 балла и влечёт заморозку профиля на 3 дня.',
          'При безосновательной отмене подтверждённой смены работодателем менее чем за 2 часа исполнителю выплачивается компенсация (20% стоимости смены).',
          'При падении рейтинга ниже 3.5 доступ к откликам на новые смены временно ограничивается.',
        ],
      },
      {
        heading: '7. Запрещённые действия и ограничения',
        body: 'В целях обеспечения безопасности и законности на Платформе строго запрещены следующие действия:',
        bulletPoints: [
          'Использование чужих или поддельных данных при регистрации и прохождении верификации.',
          'Призыв к прямым расчётам вне Платформы с целью уклонения от сервисного сбора.',
          'Размещение объявлений о запрещённых законом товарах, услугах или сомнительных схемах заработка.',
          'Оскорбления, угрозы, дискриминация или неправомерные сообщения в адрес других пользователей.',
          'Попытки взлома, декомпиляции Платформы или использование ботов для автоматической подачи заявок.',
        ],
        note: 'При систематических или грубых нарушениях аккаунты нарушителей блокируются навсегда без права восстановления.',
      },
      {
        heading: '8. Разрешение споров и арбитраж',
        body: 'В случае возникновения разногласий касательно качества работы, отработанного времени или выплат стороны вправе подать заявку в Арбитражную службу Baito через приложение.',
        bulletPoints: [
          'Спор может быть открыт в течение 24 часов с момента окончания смены.',
          'Арбитражная комиссия изучает переписку, геолокацию, чеки и фотоотчёты обеих сторон.',
          'Решение арбитража принимается в течение 3 рабочих дней с вынесением обязательного решения по расчётам.',
          'Неурегулированные споры подлежат рассмотрению в судебных органах города Ташкента согласно законодательству Республики Узбекистан.',
        ],
      },
      {
        heading: '9. Интеллектуальная собственность',
        body: 'Все программные решения, дизайн, фирменные наименования, товарные знаки и контент Baito являются интеллектуальной собственностью правообладателей и защищены законодательством Республики Узбекистан.',
        bulletPoints: [
          'Запрещается копирование, модификация и коммерческое использование материалов Платформы без официального согласия Baito.',
          'Обработка персональных данных осуществляется в строгом соответствии с Политикой конфиденциальности Платформы.',
        ],
      },
      {
        heading: '10. Ограничение ответственности и гарантии',
        body: 'Baito предоставляет информационную и технологическую платформу для взаимодействия пользователей и не является непосредственным работодателем или нанимателем по трудовым договорам сторон.',
        bulletPoints: [
          'Baito не несёт ответственности за действия сторон на рабочем месте, сохранность имущества и безопасность труда (ответственность несёт работодатель).',
          'Платформа не несёт ответственности за перебои в работе, вызванные форс-мажорными обстоятельствами или сбоями провайдеров связи.',
          'Baito предпринимает все разумные технические меры для обеспечения круглосуточной и безопасной работы сервиса.',
        ],
      },
      {
        heading: '11. Изменение условий и срок действия',
        body: 'Настоящие Условия вступают в силу с момента регистрации или начала использования Платформы и действуют бессрочно. Baito оставляет за собой право в одностороннем порядке вносить изменения в настоящие Условия.',
        bulletPoints: [
          'Изменения вступают в силу с момента их публикации в Приложении.',
          'О существенных изменениях пользователи уведомляются через push-сообщения или SMS.',
          'Продолжение использования Платформы после публикации обновлений означает согласие с новыми Условиями.',
        ],
      },
      {
        heading: '12. Контактная и правовая информация',
        body: 'По любым юридическим вопросам, предложениям или спорам пользователи могут обращаться в юридический отдел Baito по следующим каналам связи:',
        bulletPoints: [
          'Электронная почта: legal@baito.uz',
          'Служба поддержки: support@baito.uz',
          'Официальный Telegram-канал: @baito_support',
          'Адрес: Республика Узбекистан, г. Ташкент, Мирзо-Улугбекский район, комплекс IT Park.',
        ],
      },
    ],
  },
  en: {
    title: 'Terms of Service',
    subtitle: 'Official public offer and terms of use for the Baito platform',
    lastUpdated: 'Last updated: September 15, 2026',
    effectiveDate: 'Effective term: Indefinite (Valid for 2026)',
    statusAcceptedTitle: 'Terms of Service accepted and active',
    statusAcceptedSubtitle: 'By using the platform, you confirm full agreement with these terms. The terms are binding on all users and cannot be modified unilaterally.',
    statusAcceptedBadge: 'Active • 2026',
    searchPlaceholder: 'Search terms (e.g. payment, wages, cancellation, penalties)...',
    clearSearch: 'Clear search',
    noResults: 'No clauses found',
    noResultsDesc: 'No terms matched your query. Try different search keywords.',
    resetSearch: 'Reset search',
    allSections: 'All clauses',
    quickNav: 'Quick navigation',
    printDoc: 'Print / Save',
    relatedLinksTitle: 'Helpful legal links',
    privacyLink: 'Privacy Policy',
    faqLink: 'Frequently Asked Questions',
    supportLink: 'Support Chat',
    sections: [
      {
        heading: '1. General provisions',
        body: 'These Terms of Service ("Terms") constitute an official public offer governing the use of the Baito digital platform ("Platform" or "App"), establishing the mutual rights and obligations of the parties. Operating in compliance with the laws of the Republic of Uzbekistan, Baito acts as an intermediary connecting job seekers (students, freelancers, workers) and employers (businesses and individuals) for shift-based, short-term, and on-demand tasks, facilitating communication and transactions. Registering or using the Platform signifies your full and unreserved acceptance of these Terms.',
        bulletPoints: [
          'The Platform operates in the Republic of Uzbekistan pursuant to the Civil and Labor Codes.',
          'These Terms represent a legally binding agreement between Baito administration and the user.',
          'If a user does not agree with any provision of these Terms, they must immediately cease using the Platform.',
        ],
      },
      {
        heading: '2. Registration and account security',
        body: 'To use the Platform, a user must be at least 16 years old and possess full legal capacity under the laws of the Republic of Uzbekistan. During registration, users must provide truthful and accurate personal information (phone number, full name, identification documents). Each user is permitted only one active profile. Creating multiple accounts for one individual is strictly prohibited.',
        bulletPoints: [
          'Account credentials (passwords and SMS codes) are strictly confidential and must not be shared with third parties.',
          'Users are personally responsible for all actions and transactions initiated through their account.',
          'If unauthorized access to an account is detected, the user must notify Baito support immediately.',
        ],
      },
      {
        heading: '3. Rights and obligations of job seekers',
        body: 'Job seekers (workers/contractors) must arrive punctually at the scheduled location, fulfill assigned duties conscientiously in accordance with safety standards, and treat employer property with care.',
        bulletPoints: [
          'If unable to attend a shift, the worker must cancel the application via the app at least 3 hours prior to shift commencement.',
          'Unexcused absence (No-Show) or unannounced tardiness lowers the trust rating and may lead to account suspension.',
          'Workers have the right to receive full and timely payment upon completion of approved work.',
          'If hazardous or unlawful conditions are encountered, workers are entitled to stop work and contact Baito arbitration.',
        ],
      },
      {
        heading: '4. Rights and obligations of employers',
        body: 'Employers (clients) publishing job listings must provide accurate descriptions of duties, required skills, work hours, location, and payment. Employers are required to maintain a safe working environment, respect worker rights, and promptly confirm completed work.',
        bulletPoints: [
          'Employers may not demand hazardous tasks or duties outside the scope of the original job posting.',
          'Upon shift completion, employers must approve the work within 24 hours and process payment.',
          'Posting listings involving unlawful, deceptive, or unlicensed activities is strictly forbidden.',
          'Employers operate on the Platform solely as verified enterprises or accredited individuals.',
        ],
      },
      {
        heading: '5. Payment and financial settlement procedures',
        body: 'Wage amounts are explicitly stated in each job posting and agreed upon confirmation of the shift. Upon shift completion and employer acceptance of the work, payment is processed and disbursed to the worker according to established platform procedures.',
        bulletPoints: [
          'Employers must confirm completed work within 24 hours of shift conclusion and disburse payment without delay.',
          'Workers receive their earned wages to their personal bank cards (Uzcard, Humo).',
          'Unjustified payment delays or paying less than the agreed amount is strictly prohibited and results in employer suspension.',
          'All official invoices and payment receipts are recorded within the system.',
        ],
        note: 'Important: The employer is obligated to pay the confirmed wage amount in full. Payment disputes are resolved through Baito arbitration.',
      },
      {
        heading: '6. Shift cancellations and rating system',
        body: 'Baito maintains a transparent rating and reliability index (from 0 to 5.0) for every user. Ratings are calculated automatically based on completed shifts, punctuality, quality of work, and bilateral reviews.',
        bulletPoints: [
          'Cancelling a shift more than 3 hours before start time is free with zero penalties.',
          'Cancelling less than 3 hours before start time without valid cause reduces rating by 0.2 points.',
          'Unexcused failure to show up reduces rating by 0.5 points and triggers a 3-day account freeze.',
          'If an employer cancels a confirmed shift less than 2 hours before start, the worker receives a 20% guaranteed compensation.',
          'Users whose rating drops below 3.5 are temporarily restricted from applying to new shifts.',
        ],
      },
      {
        heading: '7. Prohibited activities and restrictions',
        body: 'To ensure safety and integrity across the Platform, the following actions are strictly prohibited:',
        bulletPoints: [
          'Submitting fraudulent information or registering under another person identity.',
          'Soliciting direct off-platform transactions to circumvent service fees.',
          'Advertising illegal goods, hazardous substances, or prohibited financial schemes.',
          'Harassment, abusive language, discrimination, or offensive communications.',
          'Attempting to breach security, reverse-engineer the application, or use automated bots.',
        ],
        note: 'Intentional violations result in immediate and permanent account termination without right of restoration.',
      },
      {
        heading: '8. Dispute resolution and arbitration',
        body: 'In the event of a dispute regarding job quality, hours worked, or payouts, either party may file a claim with Baito Arbitration via the application.',
        bulletPoints: [
          'Disputes must be opened within 24 hours of shift conclusion.',
          'The arbitration team evaluates chat history, GPS check-ins, and evidence submitted by both sides.',
          'Arbitration decisions are issued within 3 business days with a binding resolution regarding payments.',
          'Unresolved disputes are subject to the jurisdiction of competent courts in Tashkent, Republic of Uzbekistan.',
        ],
      },
      {
        heading: '9. Intellectual property',
        body: 'All software, UI designs, brand marks, logos, and materials related to Baito are the intellectual property of the platform owners and protected by copyright legislation.',
        bulletPoints: [
          'Copying, distributing, or commercially exploiting Platform assets without written authorization is prohibited.',
          'User personal data is handled securely in accordance with our Privacy Policy.',
        ],
      },
      {
        heading: '10. Limitation of liability and warranties',
        body: 'Baito provides an electronic matching platform and is not an employer or labor contractor under party agreements.',
        bulletPoints: [
          'Baito is not liable for on-site conduct, property damage, or workplace injuries (the employer bears workplace safety duties).',
          'The Platform is not liable for temporary service interruptions caused by force majeure or telecom carrier failures.',
          'Baito exercises all reasonable technological measures to ensure continuous, secure platform availability.',
        ],
      },
      {
        heading: '11. Amendments and duration',
        body: 'These Terms become effective upon user registration or access to the Platform and remain in force indefinitely while the account is active. Baito reserves the right to amend these Terms at any time.',
        bulletPoints: [
          'Revised Terms take effect immediately upon publication in the app.',
          'Significant changes are communicated via in-app notifications or SMS.',
          'Continued use of the Platform after amendments implies agreement to the updated Terms.',
        ],
      },
      {
        heading: '12. Contact and legal information',
        body: 'For legal inquiries, dispute notifications, or formal questions regarding these Terms, contact our legal team through the following channels:',
        bulletPoints: [
          'Email: legal@baito.uz',
          'Support desk: support@baito.uz',
          'Official Telegram support: @baito_support',
          'Address: Republic of Uzbekistan, Tashkent city, Mirzo Ulugbek district, IT Park complex.',
        ],
      },
    ],
  },
};
