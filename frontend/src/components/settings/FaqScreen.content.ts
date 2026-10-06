/** The questions the FAQ screen answers, in the three languages the app offers.
 *
 *  They lived inside the JSX in Uzbek, so a Russian reader got five Uzbek
 *  questions under a Russian heading. Kept beside the screen rather than in
 *  the shared table: this copy belongs to this page and nothing else.
 */
export interface FaqEntry {
  q: string;
  a: string;
}

export const FAQ_CONTENT: Record<'uz' | 'ru' | 'en', { title: string; entries: FaqEntry[] }> = {
  uz: {
    title: "Ko'p so'raladigan savollar",
    entries: [
      {
        q: 'Baito nima?',
        a: "Baito - talabalar uchun ish topish, karyera qurish va tajriba orttirish imkoniyatini taqdim etuvchi maxsus platformadir.",
      },
      {
        q: "Qanday qilib ishga topshirsam bo'ladi?",
        a: "Asosiy ekrandagi ishlar ro'yxatidan o'zingizga yoqqan ishni tanlab, 'Ariza topshirish' tugmasini bosishingiz kifoya.",
      },
      {
        q: 'Xizmat butunlay bepulmi?',
        a: 'Ha, Baito platformasidan foydalanish va ish qidirish talabalar uchun butunlay bepul.',
      },
      {
        q: 'Profilimni qanday yangilayman?',
        a: "Profil bo'limiga o'tib, 'Tahrirlash' tugmasini bosish orqali barcha shaxsiy ma'lumotlaringizni yangilashingiz mumkin.",
      },
      {
        q: "Bildirishnomalarni o'chira olamanmi?",
        a: "Ha, Sozlamalar > Afzalliklar bo'limiga kirib, bildirishnomalarni o'chirib qo'yishingiz mumkin.",
      },
    ],
  },
  ru: {
    title: 'Часто задаваемые вопросы',
    entries: [
      {
        q: 'Что такое Baito?',
        a: 'Baito — это платформа, которая помогает студентам находить работу, строить карьеру и набираться опыта.',
      },
      {
        q: 'Как подать заявку на работу?',
        a: 'Выберите подходящую вакансию из списка на главном экране и нажмите кнопку «Подать заявку».',
      },
      {
        q: 'Сервис полностью бесплатный?',
        a: 'Да, пользование платформой Baito и поиск работы для студентов полностью бесплатны.',
      },
      {
        q: 'Как обновить профиль?',
        a: 'Перейдите в раздел «Профиль» и нажмите «Редактировать» — там можно изменить все личные данные.',
      },
      {
        q: 'Можно ли отключить уведомления?',
        a: 'Да, откройте Настройки > Предпочтения и отключите уведомления.',
      },
    ],
  },
  en: {
    title: 'Frequently asked questions',
    entries: [
      {
        q: 'What is Baito?',
        a: 'Baito is a platform that helps students find work, build a career and gain experience.',
      },
      {
        q: 'How do I apply for a job?',
        a: 'Pick a job you like from the list on the home screen and press the "Apply" button.',
      },
      {
        q: 'Is the service completely free?',
        a: 'Yes — using Baito and searching for work is completely free for students.',
      },
      {
        q: 'How do I update my profile?',
        a: 'Open the Profile section and press "Edit" to change any of your personal details.',
      },
      {
        q: 'Can I turn notifications off?',
        a: 'Yes. Open Settings > Preferences and switch notifications off.',
      },
    ],
  },
};
