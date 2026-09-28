/** The guide's prose, in the three languages the app offers.
 *
 *  It lived inside the JSX in Uzbek, so the screen answered in Uzbek under a
 *  Russian heading. Kept beside the screen rather than in the shared table:
 *  it is three paragraphs of copy that belong to this page and nothing else.
 */
export const QOLLANMA = {
  uz: {
    title: "Qo'llanma",
    welcomeTitle: "Baito'ga xush kelibsiz!",
    welcomeBody:
      "Bu qisqacha qo'llanma orqali ilovadan qanday qilib to'g'ri foydalanishni bilib olishingiz mumkin.",
    step1Title: "1. Profilingizni to'ldiring",
    step1Body:
      "Ish beruvchilar e'tiborini jalb qilish uchun shaxsiy ma'lumotlaringiz, ta'lim, ko'nikmalar va tajribalaringizni aniq ko'rsating.",
    step2Title: '2. Ish qidiring',
    step2Body:
      "Qidiruv oynasidan yoki maxsus filtrlardan foydalanib o'zingizga qulay grafikdagi va yo'nalishdagi ishlarni toping.",
    step3Title: '3. Ariza topshiring',
    step3Body:
      "Mos keladigan ishni topgach \"Ariza topshirish\" tugmasini bosing va ish beruvchi javobini kuting. Natijalar xabarlar bo'limiga keladi.",
  },
  ru: {
    title: 'Руководство',
    welcomeTitle: 'Добро пожаловать в Baito!',
    welcomeBody:
      'Это краткое руководство поможет вам разобраться, как правильно пользоваться приложением.',
    step1Title: '1. Заполните профиль',
    step1Body:
      'Чтобы привлечь внимание работодателей, укажите личные данные, образование, навыки и опыт работы как можно точнее.',
    step2Title: '2. Ищите работу',
    step2Body:
      'Через строку поиска или фильтры найдите работу с удобным для вас графиком и в подходящем направлении.',
    step3Title: '3. Подайте заявку',
    step3Body:
      'Найдя подходящую работу, нажмите «Подать заявку» и дождитесь ответа работодателя. Результат придёт в раздел сообщений.',
  },
  en: {
    title: 'Guide',
    welcomeTitle: 'Welcome to Baito!',
    welcomeBody:
      'This short guide walks you through how to use the app.',
    step1Title: '1. Fill in your profile',
    step1Body:
      'To catch an employer’s eye, set out your personal details, education, skills and experience clearly.',
    step2Title: '2. Look for work',
    step2Body:
      'Use the search box or the filters to find shifts on a schedule and in a field that suit you.',
    step3Title: '3. Apply',
    step3Body:
      'Once you find a shift that fits, press “Apply” and wait for the employer to reply. The answer arrives in your messages.',
  },
} as const;
