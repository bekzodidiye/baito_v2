export const translateNotification = (
  text: string,
  lang: 'uz' | 'ru' | 'en'
): string => {
  if (lang === 'uz') return text;

  // Exact matches for titles
  const exactMatches: Record<string, { ru: string; en: string }> = {
    "Ariza qaytarib olindi": { ru: "Заявка отозвана", en: "Application withdrawn" },
    "Ariza rad etildi": { ru: "Заявка отклонена", en: "Application rejected" },
    "E'lon muddati tugadi": { ru: "Срок объявления истек", en: "Job posting expired" },
    "E'loningiz rad etildi": { ru: "Ваше объявление отклонено", en: "Your job ad was rejected" },
    "E'loningiz tasdiqlandi": { ru: "Ваше объявление одобрено", en: "Your job ad was approved" },
    "Hisob-faktura to'landi deb belgilandi": { ru: "Счет-фактура отмечен как оплаченный", en: "Invoice marked as paid" },
    "Ish beruvchi sharh qoldirdi": { ru: "Работодатель оставил отзыв", en: "Employer left a review" },
    "Ish boshlandi!": { ru: "Работа началась!", en: "Job started!" },
    "Ish boshlandi": { ru: "Работа началась", en: "Job started" },
    "Ish bo'yicha nizo ochildi": { ru: "Открыт спор по работе", en: "Dispute opened for job" },
    "Ish e'loni bekor qilindi": { ru: "Объявление отменено", en: "Job ad cancelled" },
    "Ish holati o'zgardi": { ru: "Статус работы изменен", en: "Job status changed" },
    "Ish kuni yakunlandi": { ru: "Рабочий день завершен", en: "Workday completed" },
    "Ish tayinlanishi o'zgardi": { ru: "Назначение изменено", en: "Job assignment changed" },
    "Ish yakunlandi": { ru: "Работа завершена", en: "Job completed" },
    // No longer emitted — the "worker asks to start" step was removed. The rows
    // it wrote are still in the database and still render, so it stays covered.
    "Ishchi ishni boshlashga tayyor": { ru: "Работник готов начать работу", en: "Worker is ready to start" },
    "Mablag' qaytarildi": { ru: "Средства возвращены", en: "Funds refunded" },
    "Mablag' yechildi": { ru: "Средства списаны", en: "Funds withdrawn" },
    "Murojaatingizga javob": { ru: "Ответ на ваш запрос", en: "Response to your request" },
    "Nizo hal qilindi": { ru: "Спор разрешен", en: "Dispute resolved" },
    "Nizo holati o'zgardi": { ru: "Статус спора изменен", en: "Dispute status changed" },
    "Sizni ishga qabul qilishdi!": { ru: "Вас приняли на работу!", en: "You were hired!" },
    "Sizni ishga tayinlashdi": { ru: "Вас назначили на работу", en: "You were assigned to a job" },
    "To'lov amalga oshirildi": { ru: "Оплата выполнена", en: "Payment processed" },
    "To'lov chiqarildi": { ru: "Выплата произведена", en: "Payment issued" },
    "To'lov tasdiqlandi": { ru: "Оплата подтверждена", en: "Payment confirmed" },
    "Verifikatsiya holati": { ru: "Статус верификации", en: "Verification status" },
    "Yangi ariza keldi": { ru: "Поступила новая заявка", en: "New application received" },
    "Yangi e'lon moderatsiyada": { ru: "Новое объявление на модерации", en: "New job ad under moderation" },
    "Yangi nizo kelib tushdi": { ru: "Поступил новый спор", en: "New dispute submitted" },
    "Yangi yordam so'rovi": { ru: "Новый запрос в поддержку", en: "New support request" },
    "Yechish so'rovi rad etildi": { ru: "Запрос на вывод отклонен", en: "Withdrawal request rejected" },
    "Yordam markaziga xabar": { ru: "Сообщение в службу поддержки", en: "Message to support" }
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

  // message=f"'{db_job.title}' e'loni tasdiqlash uchun kutilmoqda."
  match = text.match(/^'(.*)' e'loni tasdiqlash uchun kutilmoqda\.$/);
  if (match) {
    return lang === 'ru'
      ? `Объявление '${match[1]}' ожидает подтверждения.`
      : `Job ad '${match[1]}' is pending approval.`;
  }

  // message=f"'{job.title}' e'loningiz administrator tomonidan rad etildi. Sabab: {reason}"
  match = text.match(/^'(.*)' e'loningiz administrator tomonidan rad etildi\. Sabab: (.*)$/);
  if (match) {
    return lang === 'ru'
      ? `Ваше объявление '${match[1]}' отклонено администратором. Причина: ${match[2]}`
      : `Your job ad '${match[1]}' was rejected by administrator. Reason: ${match[2]}`;
  }

  // message=f"'{job.title}' e'loningiz administrator tomonidan rad etildi."
  match = text.match(/^'(.*)' e'loningiz administrator tomonidan rad etildi\.$/);
  if (match) {
    return lang === 'ru'
      ? `Ваше объявление '${match[1]}' отклонено администратором.`
      : `Your job ad '${match[1]}' was rejected by administrator.`;
  }

  // message=f"'{job.title}' e'loningiz administrator tomonidan tasdiqlandi va faol holatga o'tkazildi."
  match = text.match(/^'(.*)' e'loningiz administrator tomonidan tasdiqlandi va faol holatga o'tkazildi\.$/);
  if (match) {
    return lang === 'ru'
      ? `Ваше объявление '${match[1]}' одобрено администратором и переведено в активный статус.`
      : `Your job ad '${match[1]}' was approved by administrator and marked active.`;
  }

  // message=f"'{job.title}' e'loningiz administrator tomonidan tasdiqlandi va ishchilarga ko'rina boshladi."
  match = text.match(/^'(.*)' e'loningiz administrator tomonidan tasdiqlandi va ishchilarga ko'rina boshladi\.$/);
  if (match) {
    return lang === 'ru'
      ? `Ваше объявление '${match[1]}' одобрено администратором и стало видно работникам.`
      : `Your job ad '${match[1]}' was approved by administrator and is now visible to workers.`;
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

  // message=f"'{job.title}' ishi bo'yicha ishchi boshlashni so'radi. Tasdiqlang."
  // Removed from the backend along with the title above; the rows remain.
  match = text.match(/^'(.*)' ishi bo'yicha ishchi boshlashni so'radi\. Tasdiqlang\.$/);
  if (match) {
    return lang === 'ru'
      ? `Работник просит начать работу по '${match[1]}'. Подтвердите.`
      : `The worker asks to start job '${match[1]}'. Please confirm.`;
  }

  // message=f"'{job.title}' ishi bo'yicha qo'llab-quvvatlash javob berdi."
  match = text.match(/^'(.*)' bo'yicha qo'llab-quvvatlash javob berdi\.$/);
  if (match) {
    return lang === 'ru'
      ? `Поддержка ответила по '${match[1]}'.`
      : `Support replied about '${match[1]}'.`;
  }

  // message=f"'{job.title}' ishi bo'yicha muzlatilgan mablag' hisobingizga qaytarildi."
  match = text.match(/^'(.*)' ishi bo'yicha muzlatilgan mablag' hisobingizga qaytarildi\.$/);
  if (match) {
    return lang === 'ru'
      ? `Замороженные средства по работе '${match[1]}' возвращены на ваш счёт.`
      : `The funds held for job '${match[1]}' were returned to your account.`;
  }

  // The day-by-day completion pair. A five-day posting sends one of these per
  // day, so leaving them untranslated leaks Uzbek five times over.
  match = text.match(/^'(.*)' ishining (.*) kuni yakunlandi, shu kun uchun to'lov hisobingizga o'tkazildi\.$/);
  if (match) {
    return lang === 'ru'
      ? `День ${match[2]} работы '${match[1]}' завершён, оплата за этот день переведена на ваш счёт.`
      : `Day ${match[2]} of job '${match[1]}' is complete; payment for that day has been transferred to your account.`;
  }

  match = text.match(/^'(.*)' ishining (.*) kuni yakunlandi\. To'lov ish beruvchi tomonidan alohida amalga oshiriladi\.$/);
  if (match) {
    return lang === 'ru'
      ? `День ${match[2]} работы '${match[1]}' завершён. Оплата будет произведена работодателем отдельно.`
      : `Day ${match[2]} of job '${match[1]}' is complete. The employer will pay separately.`;
  }

  // message=f"'{job.title}' ishi bo'yicha to'lov hisobingizga o'tkazildi."
  // optionally + f" Ish beruvchi qo'shimcha {bonus} so'm bonus qo'shdi."
  match = text.match(/^'(.*)' ishi bo'yicha to'lov hisobingizga o'tkazildi\.(?: Ish beruvchi qo'shimcha (.+) so'm bonus qo'shdi\.)?$/);
  if (match) {
    const bonus = match[2];
    if (lang === 'ru') {
      return `Оплата за работу '${match[1]}' переведена на ваш счёт.`
        + (bonus ? ` Работодатель добавил бонус ${bonus} сум.` : '');
    }
    return `Payment for job '${match[1]}' has been transferred to your account.`
      + (bonus ? ` The employer added a ${bonus} UZS bonus.` : '');
  }

  // message=f"'{job.title}' ishi yakunlandi. To'lov ish beruvchi tomonidan alohida amalga oshiriladi."
  match = text.match(/^'(.*)' ishi yakunlandi\. To'lov ish beruvchi tomonidan alohida amalga oshiriladi\.$/);
  if (match) {
    return lang === 'ru'
      ? `Работа '${match[1]}' завершена. Оплата будет произведена работодателем отдельно.`
      : `Job '${match[1]}' is complete. The employer will pay separately.`;
  }

  // The two verification defaults from admin_users.py. An administrator can
  // override these in the settings, and free text they typed is theirs — the
  // fallback below returns it untouched rather than guessing.
  if (text === "Sizning shaxsingiz va hujjatlaringiz tasdiqlandi!") {
    return lang === 'ru'
      ? 'Ваша личность и документы подтверждены!'
      : 'Your identity and documents have been verified!';
  }
  if (text === "Hujjatlaringiz rad etildi, iltimos qaytadan to'g'ri hujjatlarni yuklang.") {
    return lang === 'ru'
      ? 'Ваши документы отклонены, пожалуйста, загрузите правильные документы заново.'
      : 'Your documents were rejected; please upload the correct documents again.';
  }

  // message=f"{amount} so'm balansingizga qaytarildi. Sabab: {reason}"
  match = text.match(/^(.+) so'm balansingizga qaytarildi\. Sabab: (.*)$/);
  if (match) {
    return lang === 'ru'
      ? `${match[1]} сум возвращено на ваш баланс. Причина: ${match[2]}`
      : `${match[1]} UZS returned to your balance. Reason: ${match[2]}`;
  }

  // message=f"{amount} so'm kartangizga o'tkazildi."
  match = text.match(/^(.+) so'm kartangizga o'tkazildi\.$/);
  if (match) {
    return lang === 'ru'
      ? `${match[1]} сум переведено на вашу карту.`
      : `${match[1]} UZS transferred to your card.`;
  }

  // message=f"{invoice} · {amount} so'm. Ish yakunlandi."
  match = text.match(/^(.+) · (.+) so'm\. Ish yakunlandi\.$/);
  if (match) {
    return lang === 'ru'
      ? `${match[1]} · ${match[2]} сум. Работа завершена.`
      : `${match[1]} · ${match[2]} UZS. Job completed.`;
  }

  // The payout pair, with and without a receipt attached.
  match = text.match(/^(.+) — (.+) · (.+) so'm\. Chek ilova qilingan\. Bank ko'chirmasi bilan solishtiring\.$/);
  if (match) {
    return lang === 'ru'
      ? `${match[1]} — ${match[2]} · ${match[3]} сум. Чек приложен. Сверьте с банковской выпиской.`
      : `${match[1]} — ${match[2]} · ${match[3]} UZS. Receipt attached. Reconcile against the bank statement.`;
  }

  match = text.match(/^(.+) — (.+) · (.+) so'm\. Chek ilova qilinmagan\. Bank ko'chirmasi bilan solishtiring\.$/);
  if (match) {
    return lang === 'ru'
      ? `${match[1]} — ${match[2]} · ${match[3]} сум. Чек не приложен. Сверьте с банковской выпиской.`
      : `${match[1]} — ${match[2]} · ${match[3]} UZS. No receipt attached. Reconcile against the bank statement.`;
  }

  match = text.match(/^'(.*)' e'loni muddati tugaganligi sababli bekor qilindi\.$/);
  if (match) {
    return lang === 'ru'
      ? `Объявление '${match[1]}' отменено в связи с истечением срока.`
      : `Job ad '${match[1]}' was cancelled due to expiration.`;
  }

  match = text.match(/^'(.*)' ishi bo'yicha ish beruvchi sizga (.+) yulduzli baho va sharh qoldirdi\.$/);
  if (match) {
    return lang === 'ru'
      ? `Работодатель поставил вам оценку ${match[2]} звезд и оставил отзыв по работе '${match[1]}'.`
      : `Employer gave you a ${match[2]}-star rating and left a review for job '${match[1]}'.`;
  }

  match = text.match(/^'(.*)' ishi bo'yicha nizo ish beruvchi foydasiga hal qilindi\.$/);
  if (match) {
    return lang === 'ru'
      ? `Спор по работе '${match[1]}' разрешен в пользу работодателя.`
      : `Dispute for job '${match[1]}' was resolved in favor of the employer.`;
  }

  match = text.match(/^'(.*)' ishi bo'yicha nizo ishchi foydasiga hal qilindi\.$/);
  if (match) {
    return lang === 'ru'
      ? `Спор по работе '${match[1]}' разрешен в пользу работника.`
      : `Dispute for job '${match[1]}' was resolved in favor of the worker.`;
  }

  match = text.match(/^'(.*)' ishi bo'yicha nizo ochildi va moderatorlar ko'rib chiqmoqda\.$/);
  if (match) {
    return lang === 'ru'
      ? `По работе '${match[1]}' открыт спор, модераторы рассматривают его.`
      : `A dispute has been opened for job '${match[1]}' and is being reviewed by moderators.`;
  }

  match = text.match(/^'(.*)' ishi bo'yicha nizo ochildi\. Sabab: (.*)$/);
  if (match) {
    return lang === 'ru'
      ? `По работе '${match[1]}' открыт спор. Причина: ${match[2]}`
      : `A dispute has been opened for job '${match[1]}'. Reason: ${match[2]}`;
  }

  match = text.match(/^'(.*)' ishi bo'yicha nizo sizning foydangizga hal qilindi va to'lov hisobingizga o'tkazildi\.$/);
  if (match) {
    return lang === 'ru'
      ? `Спор по работе '${match[1]}' разрешен в вашу пользу, оплата переведена на ваш счет.`
      : `Dispute for job '${match[1]}' was resolved in your favor and payment was credited to your account.`;
  }

  match = text.match(/^'(.*)' ishi bo'yicha nizo sizning foydangizga hal qilindi\.$/);
  if (match) {
    return lang === 'ru'
      ? `Спор по работе '${match[1]}' разрешен в вашу пользу.`
      : `Dispute for job '${match[1]}' was resolved in your favor.`;
  }

  match = text.match(/^'(.*)' ishi bo'yicha (.+) so'm to'lovingiz bank hisobingizga o'tkazildi\.$/);
  if (match) {
    return lang === 'ru'
      ? `Выплата в размере ${match[2]} сум по работе '${match[1]}' переведена на ваш банковский счет.`
      : `Payment of ${match[2]} UZS for job '${match[1]}' was transferred to your bank account.`;
  }

  match = text.match(/^Ishchi '(.*)' ishiga topshirgan arizasini qaytarib oldi\.$/);
  if (match) {
    return lang === 'ru'
      ? `Работник отозвал свою заявку на работу '${match[1]}'.`
      : `Worker withdrew their application for job '${match[1]}'.`;
  }

  match = text.match(/^Siz ishtirok etgan nizo bo'yicha qaror qabul qilindi: (.*)\.$/);
  if (match) {
    const rawStatus = match[1];
    const statusMap: Record<string, { ru: string; en: string }> = {
      'hal qilindi': { ru: 'разрешен', en: 'resolved' },
      'rad etildi': { ru: 'отклонен', en: 'rejected' },
      'resolved': { ru: 'разрешен', en: 'resolved' },
      'rejected': { ru: 'отклонен', en: 'rejected' },
      'closed': { ru: 'закрыт', en: 'closed' },
    };
    const s = statusMap[rawStatus] || { ru: rawStatus, en: rawStatus };
    return lang === 'ru'
      ? `Принято решение по спору с вашим участием: ${s.ru}.`
      : `A decision was reached on your dispute: ${s.en}.`;
  }

  match = text.match(/^Foydalanuvchi (.*) yordam so'radi: (.*)$/);
  if (match) {
    return lang === 'ru'
      ? `Пользователь ${match[1]} обратился в поддержку: ${match[2]}`
      : `User ${match[1]} requested support: ${match[2]}`;
  }

  // Fallback if not matched
  return text;
};
