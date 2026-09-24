export const translateNotification = (
  text: string,
  lang: 'uz' | 'ru' | 'en'
): string => {
  if (lang === 'uz') return text;

  // Exact matches for titles
  const exactMatches: Record<string, { ru: string; en: string }> = {
    "Ariza rad etildi": { ru: "Заявка отклонена", en: "Application rejected" },
    "Hisob-faktura to'landi deb belgilandi": { ru: "Счет-фактура отмечен как оплаченный", en: "Invoice marked as paid" },
    "Ish boshlandi!": { ru: "Работа началась!", en: "Job started!" },
    "Ish boshlandi": { ru: "Работа началась", en: "Job started" },
    "Ish e'loni bekor qilindi": { ru: "Объявление отменено", en: "Job ad cancelled" },
    "Ish holati o'zgardi": { ru: "Статус работы изменен", en: "Job status changed" },
    "Ish kuni yakunlandi": { ru: "Рабочий день завершен", en: "Workday completed" },
    "Ish tayinlanishi o'zgardi": { ru: "Назначение изменено", en: "Job assignment changed" },
    "Ish yakunlandi": { ru: "Работа завершена", en: "Job completed" },
    "Mablag' qaytarildi": { ru: "Средства возвращены", en: "Funds refunded" },
    "Mablag' yechildi": { ru: "Средства списаны", en: "Funds withdrawn" },
    "Murojaatingizga javob": { ru: "Ответ на ваш запрос", en: "Response to your request" },
    "Sizni ishga qabul qilishdi!": { ru: "Вас приняли на работу!", en: "You were hired!" },
    "Sizni ishga tayinlashdi": { ru: "Вас назначили на работу", en: "You were assigned to a job" },
    "To'lov chiqarildi": { ru: "Выплата произведена", en: "Payment issued" },
    "To'lov tasdiqlandi": { ru: "Оплата подтверждена", en: "Payment confirmed" },
    "Verifikatsiya holati": { ru: "Статус верификации", en: "Verification status" },
    "Yangi ariza keldi": { ru: "Поступила новая заявка", en: "New application received" },
    "Yechish so'rovi rad etildi": { ru: "Запрос на вывод отклонен", en: "Withdrawal request rejected" }
  };

  if (exactMatches[text]) {
    return exactMatches[text][lang];
  }

  // Regex matches for messages with dynamic variables
  
  // message=f"'{job.title}' e'loni administrator tomonidan bekor qilindi."
  let match = text.match(/^'(.*)' e'loni administrator tomonidan bekor qilindi\.$/);
  if (match) {
    return lang === 'ru' 
      ? `Объявление '${match[1]}' отменено администратором.`
      : `Job ad '${match[1]}' was cancelled by administrator.`;
  }

  // message=f"'{job.title}' e'loni ish beruvchi tomonidan bekor qilindi."
  match = text.match(/^'(.*)' e'loni ish beruvchi tomonidan bekor qilindi\.$/);
  if (match) {
    return lang === 'ru' 
      ? `Объявление '${match[1]}' отменено работодателем.`
      : `Job ad '${match[1]}' was cancelled by employer.`;
  }

  // message=f"'{job.title}' ishi bo'yicha arizangiz rad etildi."
  match = text.match(/^'(.*)' ishi bo'yicha arizangiz rad etildi\.$/);
  if (match) {
    return lang === 'ru' 
      ? `Ваша заявка на работу '${match[1]}' отклонена.`
      : `Your application for job '${match[1]}' was rejected.`;
  }

  // message=f"'{job.title}' ishi bo'yicha ishchi ishni boshladi."
  match = text.match(/^'(.*)' ishi bo'yicha ishchi ishni boshladi\.$/);
  if (match) {
    return lang === 'ru'
      ? `Работник приступил к работе по '${match[1]}'.`
      : `Worker started the job '${match[1]}'.`;
  }

  // message=f"'{job.title}' ishi bo'yicha tayinlov administrator tomonidan o'zgartirildi."
  match = text.match(/^'(.*)' ishi bo'yicha tayinlov administrator tomonidan o'zgartirildi\.$/);
  if (match) {
    return lang === 'ru'
      ? `Назначение по работе '${match[1]}' изменено администратором.`
      : `Job assignment for '${match[1]}' was changed by administrator.`;
  }

  // message=f"'{job.title}' ishi bo'yicha to'lov administrator tomonidan chiqarildi."
  match = text.match(/^'(.*)' ishi bo'yicha to'lov administrator tomonidan chiqarildi\.$/);
  if (match) {
    return lang === 'ru'
      ? `Выплата по работе '${match[1]}' произведена администратором.`
      : `Payment for job '${match[1]}' was issued by administrator.`;
  }

  // message=f"'{job.title}' ishiga administrator tomonidan tayinlandingiz."
  match = text.match(/^'(.*)' ishiga administrator tomonidan tayinlandingiz\.$/);
  if (match) {
    return lang === 'ru'
      ? `Вы назначены на работу '${match[1]}' администратором.`
      : `You were assigned to job '${match[1]}' by administrator.`;
  }

  // message=f"'{job.title}' ishiga qabul qilindingiz. Tafsilotlarni ko'ring."
  match = text.match(/^'(.*)' ishiga qabul qilindingiz\. Tafsilotlarni ko'ring\.$/);
  if (match) {
    return lang === 'ru'
      ? `Вы приняты на работу '${match[1]}'. Посмотрите подробности.`
      : `You were hired for job '${match[1]}'. See details.`;
  }

  // message=f"'{job.title}' ishi ishchi tomonidan yakunlandi. Iltimos, ishchiga baho va sharh qoldiring."
  match = text.match(/^'(.*)' ishi ishchi tomonidan yakunlandi\. Iltimos, ishchiga baho va sharh qoldiring\.$/);
  if (match) {
    return lang === 'ru'
      ? `Работа '${match[1]}' завершена работником. Пожалуйста, оставьте оценку и отзыв.`
      : `Job '${match[1]}' was completed by worker. Please leave a rating and review.`;
  }

  // message=f"'{job.title}' ishi qaytadan ochiq holatga o'tkazildi."
  match = text.match(/^'(.*)' ishi qaytadan ochiq holatga o'tkazildi\.$/);
  if (match) {
    return lang === 'ru'
      ? `Работа '${match[1]}' снова переведена в статус открытой.`
      : `Job '${match[1]}' was reopened.`;
  }

  // message=f"'{job.title}' ishi rasman boshlandi."
  match = text.match(/^'(.*)' ishi rasman boshlandi\.$/);
  if (match) {
    return lang === 'ru'
      ? `Работа '${match[1]}' официально началась.`
      : `Job '${match[1]}' officially started.`;
  }

  // message=f"Ishchi '{job.title}' ishiga ariza topshirdi."
  match = text.match(/^Ishchi '(.*)' ishiga ariza topshirdi\.$/);
  if (match) {
    return lang === 'ru'
      ? `Работник подал заявку на работу '${match[1]}'.`
      : `Worker applied to job '${match[1]}'.`;
  }

  // Fallback if not matched
  return text;
};
