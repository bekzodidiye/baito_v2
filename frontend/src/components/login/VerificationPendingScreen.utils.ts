export const getTranslations = (language: string) => {
  const t = {
    uz: {
      headerTitle: "Profilni to'ldirish",
      mainTitle: "Profil ma'lumotlarini yakunlash",
      subtitle: "Iltimos, barcha bosqichlarni diqqat bilan to'ldiring",
      verifying: "Tekshirilmoqda",
      moderationDesc: "Hujjatlaringiz moderatsiya navbatida. Odatda 1-24 soat davom etadi.",
      docCardTitle: "Hujjatlar kutilmoqda",
      docCardSub: "Shaxsingiz tasdiqlanishi kerak",
      pendingBadge: "Kutmoqda",
      emailCardTitle: "Email xabar yuboriladi",
      emailCardSub: "Natija haqida darhol xabar beramiz",
      btnDashboard: "Dashboard'ga o'tish",
      btnLater: "Keyinroq kirish",
      support: "Admin bilan bog'lanish",
      supportToast: "Tez orada operatorlarimiz bog'lanishadi."
    },
    ru: {
      headerTitle: "Заполнение профиля",
      mainTitle: "Завершение профиля",
      subtitle: "Пожалуйста, внимательно заполните все шаги",
      verifying: "Проверяется",
      moderationDesc: "Ваши документы находятся на модерации. Обычно это занимает от 1 до 24 часов.",
      docCardTitle: "Документы на рассмотрении",
      docCardSub: "Ваша личность должна быть подтверждена",
      pendingBadge: "Ожидание",
      emailCardTitle: "Уведомление по Email",
      emailCardSub: "Мы сообщим вам о результате мгновенно",
      btnDashboard: "Перейти в Панель",
      btnLater: "Войти позже",
      support: "Связаться с админом",
      supportToast: "Наши операторы свяжутся с вами в ближайшее время."
    },
    en: {
      headerTitle: "Fill Profile",
      mainTitle: "Finalize Profile Details",
      subtitle: "Please carefully complete all steps",
      verifying: "Verifying",
      moderationDesc: "Your documents are in the moderation queue. This usually takes 1-24 hours.",
      docCardTitle: "Documents Pending",
      docCardSub: "Your identity needs to be verified",
      pendingBadge: "Pending",
      emailCardTitle: "Email Notification",
      emailCardSub: "We will notify you immediately of the result",
      btnDashboard: "Go to Dashboard",
      btnLater: "Access Later",
      support: "Contact Support",
      supportToast: "Our operators will contact you shortly."
    }
  }[language] || {
    headerTitle: "Profilni to'ldirish",
    mainTitle: "Profil ma'lumotlarini yakunlash",
    subtitle: "Iltimos, barcha bosqichlarni diqqat bilan to'ldiring",
    verifying: "Tekshirilmoqda",
    moderationDesc: "Hujjatlaringiz moderatsiya navbatida. Odatda 1-24 soat davom etadi.",
    docCardTitle: "Hujjatlar kutilmoqda",
    docCardSub: "Shaxsingiz tasdiqlanishi kerak",
    pendingBadge: "Kutmoqda",
    emailCardTitle: "Email xabar yuboriladi",
    emailCardSub: "Natija haqida darhol xabar beramiz",
    btnDashboard: "Dashboard'ga o'tish",
    btnLater: "Keyinroq kirish",
    support: "Admin bilan bog'lanish",
    supportToast: "Tez orada operatorlarimiz bog'lanishadi."
  };

  const stepT = {
    uz: { step1: "PROFIL", step2: "HUJJATLAR", step3: "YAKUNLASH" },
    ru: { step1: "ПРОФИЛЬ", step2: "ДОКУМЕНТЫ", step3: "ЗАВЕРШЕНИЕ" },
    en: { step1: "PROFILE", step2: "DOCUMENTS", step3: "FINALIZE" }
  }[language] || { step1: "PROFIL", step2: "HUJJATLAR", step3: "YAKUNLASH" };

  return { t, stepT };
};
