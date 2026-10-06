/** The three reviews on the landing page, in all three languages.
 *
 *  Names stay as they are — a person's name is not translated. The role, the
 *  quote and the "when" are copy, and they were written into the component in
 *  Uzbek, so a Russian visitor read a Russian heading over three Uzbek reviews.
 */
export const TESTIMONIALS = {
  uz: [
    { name: 'Sardor Karimov', role: 'Kuryer (Chilonzor)',
      text: "Baito tufayli darsdan bo'sh vaqtimda kuniga 250,000 - 300,000 so'm topaman. Eng asosiysi smena tugashi bilan kartamga pul tushadi!",
      date: 'Kecha' },
    { name: 'Dilnoza Rahimova', role: "Menejer — 'Safia Bakery'",
      text: "Dam olish kunlari uchun tezkor 3 nafar ofitsiant kerak bo'ldi. Baito orqali 20 daqiqada tasdiqlangan va tajribali xodimlarni topdik.",
      date: '3 kun oldin' },
    { name: 'Javohir Toshmatov', role: 'Omborxona ishchisi (Sergeli)',
      text: "Xaritadan uyim yonidagi omborni topdim. Haftasiga 5 kun 8 soatdan ishlayman, oylik daromadim 7.5 mln so'mdan oshdi.",
      date: 'Bugun' },
  ],
  ru: [
    { name: 'Sardor Karimov', role: 'Курьер (Чиланзар)',
      text: 'Благодаря Baito в свободное от учёбы время я зарабатываю 250 000 – 300 000 сум в день. А главное — деньги приходят на карту сразу после смены!',
      date: 'Вчера' },
    { name: 'Dilnoza Rahimova', role: "Менеджер — «Safia Bakery»",
      text: 'На выходные срочно понадобились три официанта. Через Baito за 20 минут нашли проверенных и опытных сотрудников.',
      date: '3 дня назад' },
    { name: 'Javohir Toshmatov', role: 'Работник склада (Сергели)',
      text: 'Нашёл на карте склад рядом с домом. Работаю 5 дней в неделю по 8 часов, доход перевалил за 7,5 млн сум в месяц.',
      date: 'Сегодня' },
  ],
  en: [
    { name: 'Sardor Karimov', role: 'Courier (Chilonzor)',
      text: 'Thanks to Baito I earn 250,000–300,000 so‘m a day around my classes. Best of all, the money reaches my card the moment the shift ends.',
      date: 'Yesterday' },
    { name: 'Dilnoza Rahimova', role: "Manager — 'Safia Bakery'",
      text: 'We needed three waiters for the weekend at short notice. Through Baito we found verified, experienced staff in 20 minutes.',
      date: '3 days ago' },
    { name: 'Javohir Toshmatov', role: 'Warehouse worker (Sergeli)',
      text: 'I found a warehouse near my home on the map. I work five 8-hour days a week and my monthly income has passed 7.5 million so‘m.',
      date: 'Today' },
  ],
} as const;
