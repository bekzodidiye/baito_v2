/** The terms of service, in the three languages the app offers.
 *
 *  Like the privacy policy, this was written into the JSX in Uzbek, so a reader
 *  who had chosen Russian was shown terms they could not read. The Uzbek text is
 *  the original; the other two are translations of it.
 */
export interface TermsContent {
  title: string;
  lastUpdated: string;
  sections: { heading: string; body: string }[];
}

export const TERMS: Record<'uz' | 'ru' | 'en', TermsContent> = {
  uz: {
    title: 'Xizmat shartlari',
    lastUpdated: 'Oxirgi yangilanish: 15-Oktabr, 2023',
    sections: [
      { heading: '1. Umumiy qoidalar',
        body: "Ushbu xizmat ko'rsatish shartlari (\"Shartlar\") Baito ilovasidan (\"Ilova\") foydalanish tartibini belgilaydi. Ilovadan foydalanish orqali siz ushbu shartlarga rozi bo'lgan hisoblanasiz." },
      { heading: '2. Hisob va Xavfsizlik',
        body: "Foydalanuvchi ilovada ro'yxatdan o'tish paytida taqdim etgan ma'lumotlarning to'g'riligiga javobgardir. Shaxsiy hisob va parolni sir saqlash foydalanuvchining shaxsiy mas'uliyati hisoblanadi." },
      { heading: "3. Ma'lumotlar Maxfiyligi",
        body: "Biz sizning shaxsiy ma'lumotlaringizni himoya qilishga va faqat ishga joylashish jarayonlarini osonlashtirish uchun foydalanishga kafolat beramiz. Ma'lumotlaringiz uchinchi shaxslarga sotilmaydi." },
      { heading: '4. Javobgarlikni cheklash',
        body: "Baito faqat ish beruvchi va ish qidiruvchini bog'lovchi platforma bo'lib, tomonlar o'rtasidagi kelishuvlar, ish haqini to'lash yoki ish sharoitlari bo'yicha javobgarlikni o'z zimmasiga olmaydi." },
    ],
  },
  ru: {
    title: 'Условия обслуживания',
    lastUpdated: 'Последнее обновление: 15 октября 2023',
    sections: [
      { heading: '1. Общие положения',
        body: 'Настоящие условия обслуживания («Условия») определяют порядок использования приложения Baito («Приложение»). Пользуясь Приложением, вы считаетесь согласившимся с этими условиями.' },
      { heading: '2. Учётная запись и безопасность',
        body: 'Пользователь отвечает за достоверность данных, предоставленных при регистрации в приложении. Сохранение личной учётной записи и пароля в тайне является личной ответственностью пользователя.' },
      { heading: '3. Конфиденциальность данных',
        body: 'Мы гарантируем защиту ваших личных данных и их использование только для упрощения процессов трудоустройства. Ваши данные не продаются третьим лицам.' },
      { heading: '4. Ограничение ответственности',
        body: 'Baito — это лишь платформа, связывающая работодателя и соискателя; она не берёт на себя ответственность за договорённости между сторонами, выплату оплаты труда или условия работы.' },
    ],
  },
  en: {
    title: 'Terms of Service',
    lastUpdated: 'Last updated: 15 October 2023',
    sections: [
      { heading: '1. General provisions',
        body: 'These terms of service ("Terms") set out how the Baito application ("the App") may be used. By using the App you are taken to have agreed to these terms.' },
      { heading: '2. Your account and security',
        body: 'The user is responsible for the accuracy of the information given when registering in the app. Keeping the account and password secret is the user’s own responsibility.' },
      { heading: '3. Confidentiality of data',
        body: 'We undertake to protect your personal data and to use it only to make the hiring process easier. Your data is not sold to third parties.' },
      { heading: '4. Limitation of liability',
        body: 'Baito is only a platform connecting employers and job seekers; it takes no responsibility for agreements between the parties, for the payment of wages, or for working conditions.' },
    ],
  },
};
