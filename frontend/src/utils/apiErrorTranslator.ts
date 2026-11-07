/** What the server said, in the language the reader chose.
 *
 *  Every `HTTPException` the backend raises carries an Uzbek `detail`, and
 *  `apiClient` puts it on the error it throws. Showing that detail is what
 *  makes a failure actionable — "that email is already registered" rather than
 *  "an error occurred" — but shown raw it hands Uzbek to a Russian reader.
 *
 *  `backend/tests/test_error_details_are_known.py` walks the backend source
 *  and fails when a detail appears that this file does not cover.
 *
 *  Translation contract:
 *  - Unknown details fall back gracefully to the original server string.
 *  - Localized messages preserve actionable guidance for the user.
 */

/** Provider-side and internal strings. They do not reach a person in normal
 *  use, and translating them would only make a support conversation harder. */
const PASSTHROUGH = new Set([
  'Amount mismatch',
  'Card not found',
  'Idempotency key already used',
  'Invalid signature',
  'Order not found',
  'Payment provider not configured',
  'Unknown status',
]);

const EXACT: Record<string, { ru: string; en: string }> = {
  'Admin huquqi talab etiladi': { ru: 'Требуются права администратора', en: 'Administrator rights are required' },
  'Ariza topilmadi': { ru: 'Заявка не найдена', en: 'Application not found' },
  'Avval Telegram kanalini kiriting va hisobotni yoqing': { ru: 'Сначала укажите Telegram-канал и включите отчёты', en: 'First set the Telegram channel and turn reports on' },
  'Avval to\'lovni tasdiqlang': { ru: 'Сначала подтвердите оплату', en: 'Confirm the payment first' },
  'Balans manfiy bo\'lib qolmasligi kerak': { ru: 'Баланс не может стать отрицательным', en: 'The balance cannot go negative' },
  'Balansda yetarli mablag\' mavjud emas': { ru: 'На балансе недостаточно средств', en: 'There are not enough funds on the balance' },
  'Bank rekvizitlari kiritilmagan. To\'lovlar bo\'limidan kiriting.': { ru: 'Банковские реквизиты не указаны. Укажите их в разделе «Платежи».', en: 'No bank details on file. Add them in the Payments section.' },
  'Bekor qilingan ish bo\'yicha nizo ochib bo\'lmaydi': { ru: 'Нельзя открыть спор по отменённой работе', en: 'A dispute cannot be opened on a cancelled job' },
  'Bekor qilingan ishni yakunlab bo\'lmaydi': { ru: 'Отменённую работу нельзя завершить', en: 'A cancelled job cannot be completed' },
  'Bildirishnoma topilmadi': { ru: 'Уведомление не найдено', en: 'Notification not found' },
  'Bir kunda ko\'pi bilan 2 ta ishga ariza topshirishingiz mumkin!': { ru: 'В день можно подать заявку не более чем на 2 работы!', en: 'You can apply to at most 2 jobs per day!' },
  'Boshlangan ishni bekor qilib bo\'lmaydi, avval uni yakunlang': { ru: 'Начатую работу нельзя отменить — сначала завершите её', en: 'A started job cannot be cancelled; complete it first' },
  'Bu arizani boshqarish huquqingiz yo\'q': { ru: 'У вас нет прав управлять этой заявкой', en: 'You do not have permission to manage this application' },
  'Bu arizani qaytarib olish huquqingiz yo\'q': { ru: 'У вас нет прав отозвать эту заявку', en: 'You do not have permission to withdraw this application' },
  'Bu arizani yollab bo\'lmaydi': { ru: 'По этой заявке нельзя нанять', en: 'This application cannot be hired' },
  'Bu e\'lon endi ariza qabul qilmaydi': { ru: 'Это объявление больше не принимает заявки', en: 'This posting no longer accepts applications' },
  'Bu e\'lon sizga tegishli emas': { ru: 'Это объявление вам не принадлежит', en: 'This posting is not yours' },
  'Bu e\'lon yopilgan': { ru: 'Это объявление закрыто', en: 'This posting is closed' },
  'Bu e\'lonni o\'chirish huquqingiz yo\'q': { ru: 'У вас нет прав удалить это объявление', en: 'You do not have permission to delete this posting' },
  'Bu e\'lonni tahrirlash huquqingiz yo\'q': { ru: 'У вас нет прав редактировать это объявление', en: 'You do not have permission to edit this posting' },
  'Bu xabarni o\'chirish huquqingiz yo\'q': { ru: 'У вас нет прав удалить это сообщение', en: 'You do not have permission to delete this message' },
  'Bu email allaqachon ro\'yxatdan o\'tgan': { ru: 'Этот email уже зарегистрирован', en: 'That email is already registered' },
  'Bu faylni ko\'rish huquqingiz yo\'q': { ru: 'У вас нет прав просматривать этот файл', en: 'You do not have permission to view this file' },
  'Bu foydalanuvchi ishchi emas': { ru: 'Этот пользователь не работник', en: 'This user is not a worker' },
  'Bu hisob-faktura bo\'yicha to\'lov allaqachon qayd etilgan': { ru: 'Оплата по этому счёту уже зафиксирована', en: 'Payment for this invoice has already been recorded' },
  'Bu ish allaqachon bekor qilingan': { ru: 'Эта работа уже отменена', en: 'This job is already cancelled' },
  'Bu ish allaqachon yakunlangan': { ru: 'Эта работа уже завершена', en: 'This job is already completed' },
  'Bu ish bo\'yicha o\'rinlar to\'lgan': { ru: 'По этой работе места заняты', en: 'The places on this job are taken' },
  'Bu ish kuni topilmadi': { ru: 'Этот рабочий день не найден', en: 'That workday was not found' },
  'Bu ish uchun hisob-faktura yuborilmagan': { ru: 'По этой работе счёт не выставлялся', en: 'No invoice was issued for this job' },
  'Bu ish uchun to\'lov allaqachon tasdiqlangan': { ru: 'Оплата по этой работе уже подтверждена', en: 'Payment for this job is already confirmed' },
  'Bu ish uchun to\'lov topilmadi': { ru: 'Оплата по этой работе не найдена', en: 'No payment found for this job' },
  'Bu ishchi ushbu ish uchun yollanmagan — to\'lov chiqarib bo\'lmaydi': { ru: 'Этот работник не нанят на эту работу — выплату произвести нельзя', en: 'This worker was not hired for this job, so the payment cannot be released' },
  'Bu ishga hali hech kim yollanmagan': { ru: 'На эту работу ещё никто не нанят', en: 'Nobody has been hired for this job yet' },
  'Bu ishga ishchi yollanmagan': { ru: 'На эту работу работник не нанят', en: 'No worker is hired for this job' },
  'Bu kun allaqachon yakunlangan': { ru: 'Этот день уже завершён', en: 'That day is already complete' },
  'Bu kun bekor qilingan': { ru: 'Этот день отменён', en: 'That day was cancelled' },
  'Bu ma\'lumotni ko\'rish huquqingiz yo\'q': { ru: 'У вас нет прав просматривать эти данные', en: 'You do not have permission to view this' },
  'Bu raqam allaqachon ro\'yxatdan o\'tgan': { ru: 'Этот номер уже зарегистрирован', en: 'That number is already registered' },
  'Bu suhbatga kirish huquqingiz yo\'q': { ru: 'У вас нет доступа к этому чату', en: 'You do not have access to this conversation' },
  'E\'londagi maosh tizim qabul qila oladigan chegaradan tashqarida, yollashdan oldin uni to\'g\'rilang': { ru: 'Зарплата в объявлении вне допустимого диапазона — исправьте её перед наймом', en: 'The wage on the posting is outside the range the system accepts; correct it before hiring' },
  'Faqat ish beruvchi ishni tasdiqlay oladi': { ru: 'Подтвердить работу может только работодатель', en: 'Only the employer can confirm the job' },
  'Faqat ish beruvchi ishni yakunlay oladi': { ru: 'Завершить работу может только работодатель', en: 'Only the employer can complete the job' },
  'Faqat ish beruvchi sharh qoldira oladi': { ru: 'Оставить отзыв может только работодатель', en: 'Only the employer can leave a review' },
  'Faqat ish beruvchi yoki tayinlangan ishchi ishni yakunlay oladi': { ru: 'Завершить работу может только работодатель или назначенный работник', en: 'Only the employer or the assigned worker can complete the job' },
  'Faqat ishchilar ariza topshira oladi': { ru: 'Подавать заявки могут только работники', en: 'Only workers can apply' },
  'Faqat ko\'rib chiqilayotgan (kutilayotgan) arizani qaytarib olish mumkin': { ru: 'Отозвать можно только ожидающую заявку', en: 'Only a pending application can be withdrawn' },
  'Faqat o\'z suhbatingizni ocha olasiz': { ru: 'Открыть можно только свой чат', en: 'You can only open your own conversation' },
  'Faqat rasm (JPG, PNG, WEBP, GIF) yoki PDF fayllar yuklash mumkin': { ru: 'Загружать можно только изображения (JPG, PNG, WEBP, GIF) или PDF', en: 'Only images (JPG, PNG, WEBP, GIF) or PDF files can be uploaded' },
  'Faqat ushbu ishning ish beruvchisi yoki tayinlangan ishchisi nizo ochishi mumkin': { ru: 'Открыть спор может только работодатель или назначенный работник этой работы', en: 'Only the employer or assigned worker of this job can open a dispute' },
  'Fayl bo\'sh': { ru: 'Файл пуст', en: 'The file is empty' },
  'Fayl hajmi 15 MB dan oshmasligi kerak': { ru: 'Размер файла не должен превышать 15 МБ', en: 'The file must not be larger than 15 MB' },
  'Fayl haqiqiy PDF emas': { ru: 'Файл не является настоящим PDF', en: 'The file is not a real PDF' },
  'Fayl haqiqiy rasm emas yoki buzilgan': { ru: 'Файл не является изображением или повреждён', en: 'The file is not an image, or it is damaged' },
  'Fayl tanlanmagan': { ru: 'Файл не выбран', en: 'No file selected' },
  'Fayl topilmadi': { ru: 'Файл не найден', en: 'File not found' },
  'Faylni yuklashda xatolik yuz berdi': { ru: 'Не удалось загрузить файл', en: 'The file could not be uploaded' },
  'Foydalanuvchi topilmadi': { ru: 'Пользователь не найден', en: 'User not found' },
  'Hisob-faktura allaqachon yuborilgan': { ru: 'Счёт уже выставлен', en: 'The invoice has already been issued' },
  'Hisobingiz bloklangan': { ru: 'Ваш аккаунт заблокирован', en: 'Your account is blocked' },
  'Hisobingiz cheklangan, mablag\' yechish mumkin emas': { ru: 'Ваш аккаунт ограничен, вывод средств недоступен', en: 'Your account is restricted; withdrawals are not available' },
  'Hisobotni yuborib bo\'lmadi. Kanal nomi va bot sozlamalarini tekshiring.': { ru: 'Не удалось отправить отчёт. Проверьте название канала и настройки бота.', en: 'The report could not be sent. Check the channel name and the bot settings.' },
  'Holatni faqat administrator o\'zgartiradi': { ru: 'Статус меняет только администратор', en: 'Only an administrator can change the status' },
  'Hudud topilmadi': { ru: 'Регион не найден', en: 'Region not found' },
  'Hujjatlaringiz hali tasdiqlanmagan. Tasdiqlangach davom etishingiz mumkin.': { ru: 'Ваши документы ещё не подтверждены. Продолжить можно после подтверждения.', en: 'Your documents are not verified yet. You can continue once they are.' },
  'Iltimos, ariza topshirishdan oldin profilingizni to\'liq to\'ldiring': { ru: 'Пожалуйста, заполните профиль полностью перед подачей заявки', en: 'Please complete your profile before applying' },
  'Iltimos, ish yaratishdan oldin profilingizni to\'liq to\'ldiring': { ru: 'Пожалуйста, заполните профиль полностью перед созданием работы', en: 'Please complete your profile before posting a job' },
  'Iltimos, ism va familiyangizni to\'liq kiriting': { ru: 'Пожалуйста, укажите имя и фамилию полностью', en: 'Please enter your full first and last name' },
  'Ish beruvchi huquqi talab etiladi': { ru: 'Требуются права работодателя', en: 'Employer rights are required' },
  'Ish beruvchi topilmadi': { ru: 'Работодатель не найден', en: 'Employer not found' },
  'Ish e\'loni topilmadi': { ru: 'Объявление о работе не найдено', en: 'Job posting not found' },
  'Ish topilmadi': { ru: 'Работа не найдена', en: 'Job not found' },
  'Ishda tayinlangan ishchi yo\'q, nizo ochish mumkin emas': { ru: 'На работу не назначен работник, открыть спор невозможно', en: 'No worker is assigned to this job; a dispute cannot be opened' },
  'Ishchi bu kun uchun allaqachon tasdiqlangan ishga ega': { ru: 'У работника на этот день уже есть подтверждённая работа', en: 'The worker already has a confirmed job that day' },
  'Ishchi ko\'rsatilmagan': { ru: 'Работник не указан', en: 'No worker specified' },
  'Ishchi topilmadi': { ru: 'Работник не найден', en: 'Worker not found' },
  'Ishni yakunlash uchun avval uni boshlash kerak': { ru: 'Чтобы завершить работу, сначала начните её', en: 'To complete the job, start it first' },
  'Joriy parol xato': { ru: 'Текущий пароль неверен', en: 'The current password is wrong' },
  'Kategoriya nomi kiritilmagan': { ru: 'Название категории не указано', en: 'No category name given' },
  'Kategoriya topilmadi': { ru: 'Категория не найдена', en: 'Category not found' },
  'Ko\'p noto\'g\'ri urinishlar. Iltimos, yangi kod so\'rang': { ru: 'Слишком много неверных попыток. Запросите новый код.', en: 'Too many wrong attempts. Please request a new code.' },
  'Komissiya foizi noto\'g\'ri': { ru: 'Неверный процент комиссии', en: 'The commission percentage is wrong' },
  'Korxona hali to\'lovni qayd etmagan': { ru: 'Компания ещё не зафиксировала оплату', en: 'The company has not recorded the payment yet' },
  'Korxona pochtasi yo\'q. Elektron pochtani qo\'lda kiriting.': { ru: 'У компании нет почты. Укажите адрес вручную.', en: 'The company has no email on file. Enter an address manually.' },
  'Kunni yakunlash uchun avval ishni boshlash kerak': { ru: 'Чтобы завершить день, сначала начните работу', en: 'To close the day, start the job first' },
  'Murojaat topilmadi': { ru: 'Обращение не найдено', en: 'Request not found' },
  'Muzlatilgan mablag\' topilmadi': { ru: 'Замороженные средства не найдены', en: 'No held funds found' },
  'Nizo holatidagi ishni bekor qilib bo\'lmaydi, avval nizoni hal qiling': { ru: 'Нельзя отменить работу со спором — сначала разрешите спор', en: 'A job in dispute cannot be cancelled; resolve the dispute first' },
  'Nizo topilmadi': { ru: 'Спор не найден', en: 'Dispute not found' },
  'Noma\'lum holat': { ru: 'Неизвестный статус', en: 'Unknown status' },
  'Noma\'lum rol': { ru: 'Неизвестная роль', en: 'Unknown role' },
  'O\'z admin huquqingizni olib tashlay olmaysiz': { ru: 'Вы не можете снять с себя права администратора', en: 'You cannot remove your own administrator rights' },
  'O\'zgartirish uchun maydon berilmadi': { ru: 'Не указано ни одного поля для изменения', en: 'No field was given to change' },
  'O\'zingiz bilan suhbat ochib bo\'lmaydi': { ru: 'Нельзя открыть чат с самим собой', en: 'You cannot open a conversation with yourself' },
  'O\'zingizni bloklay olmaysiz': { ru: 'Вы не можете заблокировать самого себя', en: 'You cannot block yourself' },
  'Pochta yuborilmadi. Server javob bermadi yoki rad etdi.': { ru: 'Письмо не отправлено. Сервер не ответил или отклонил его.', en: 'The email was not sent. The server did not answer, or refused it.' },
  'Promokod topilmadi': { ru: 'Промокод не найден', en: 'Promo code not found' },
  'Qabul qiluvchi pochtasi noto\'g\'ri': { ru: 'Неверный адрес получателя', en: 'The recipient\'s email address is wrong' },
  'Rasm ishlovchisi mavjud emas': { ru: 'Обработчик изображений недоступен', en: 'The image processor is unavailable' },
  'Rasmni qayta ishlashda xatolik': { ru: 'Ошибка при обработке изображения', en: 'The image could not be processed' },
  'Sessiya bekor qilingan': { ru: 'Сессия отменена', en: 'The session was cancelled' },
  'Sessiya muddati tugagan yoki yaroqsiz': { ru: 'Срок сессии истёк или она недействительна', en: 'The session has expired, or is not valid' },
  'Sessiya muddati tugagan, qayta kiring': { ru: 'Срок сессии истёк, войдите снова', en: 'The session has expired; sign in again' },
  'Sessiya topilmadi': { ru: 'Сессия не найдена', en: 'Session not found' },
  'Sessiya yaroqsiz': { ru: 'Сессия недействительна', en: 'The session is not valid' },
  'Sessiya yaroqsiz, qayta kiring': { ru: 'Сессия недействительна, войдите снова', en: 'The session is not valid; sign in again' },
  'Sharh qoldirish uchun ariza topilmadi': { ru: 'Заявка для отзыва не найдена', en: 'No application found to review' },
  'Siz bu ishga yollanmagansiz': { ru: 'Вы не наняты на эту работу', en: 'You are not hired for this job' },
  'Siz bu kun uchun allaqachon tasdiqlangan ishga egasiz!': { ru: 'У вас на этот день уже есть подтверждённая работа!', en: 'You already have a confirmed job that day!' },
  'Suhbat ishtirokchisi aniqlanmadi': { ru: 'Собеседник не определён', en: 'The other participant could not be identified' },
  'Suhbat topilmadi': { ru: 'Чат не найден', en: 'Conversation not found' },
  'Summa noldan farqli bo\'lishi kerak': { ru: 'Сумма должна отличаться от нуля', en: 'The amount must not be zero' },
  'Tasdiqlash kodi topilmadi yoki muddati o\'tgan': { ru: 'Код подтверждения не найден или истёк', en: 'The verification code was not found, or has expired' },
  'Tasdiqlash kodi xato': { ru: 'Неверный код подтверждения', en: 'Wrong verification code' },
  'Tasdiqlash kodi yaroqsiz, yangi kod so\'rang': { ru: 'Код подтверждения недействителен, запросите новый', en: 'The verification code is not valid; request a new one' },
  'Telefon raqam formati noto\'g\'ri': { ru: 'Неверный формат номера телефона', en: 'The phone number format is wrong' },
  'Telefon raqam tasdiqlanmagan. Iltimos, SMS kodni qaytadan kiriting.': { ru: 'Номер телефона не подтверждён. Введите код из SMS ещё раз.', en: 'The phone number is not verified. Enter the SMS code again.' },
  'Telefon raqam yoki parol xato': { ru: 'Неверный номер телефона или пароль', en: 'Wrong phone number or password' },
  'Tizimda kamida bitta administrator qolishi kerak': { ru: 'В системе должен остаться хотя бы один администратор', en: 'At least one administrator must remain' },
  'Tizimga kiring': { ru: 'Войдите в систему', en: 'Sign in' },
  'To\'lov allaqachon qayd etilgan': { ru: 'Оплата уже зафиксирована', en: 'The payment has already been recorded' },
  'To\'lov allaqachon tasdiqlangan': { ru: 'Оплата уже подтверждена', en: 'The payment is already confirmed' },
  'To\'lov tizimi havola qaytarmadi': { ru: 'Платёжная система не вернула ссылку', en: 'The payment provider returned no link' },
  'To\'lov tizimi hozircha ulanmagan. Iltimos, keyinroq urinib ko\'ring.': { ru: 'Платёжная система пока не подключена. Попробуйте позже.', en: 'The payment provider is not connected yet. Please try later.' },
  'To\'lov tizimiga ulanib bo\'lmadi': { ru: 'Не удалось подключиться к платёжной системе', en: 'The payment provider could not be reached' },
  'To\'lov usuli mavjud emas': { ru: 'Способ оплаты недоступен', en: 'That payment method is unavailable' },
  'To\'lovni faqat yakunlangan ish uchun tasdiqlash mumkin': { ru: 'Подтвердить оплату можно только за завершённую работу', en: 'Payment can only be confirmed for a completed job' },
  'Tranzaksiya egasi topilmadi': { ru: 'Владелец транзакции не найден', en: 'Transaction owner not found' },
  'Tranzaksiyani amalga oshirishda xatolik': { ru: 'Ошибка при проведении транзакции', en: 'The transaction could not be carried out' },
  'Ushbu ish bo\'yicha faol nizo allaqachon ko\'rib chiqilmoqda': { ru: 'Активный спор по этой работе уже рассматривается', en: 'An active dispute for this job is already under review' },
  'Ushbu ish uchun muzlatilgan mablag\' topilmadi': { ru: 'Замороженные средства по этой работе не найдены', en: 'No held funds were found for this job' },
  'Xabar topilmadi': { ru: 'Сообщение не найдено', en: 'Message not found' },
  'Yakunlangan ishni bekor qilib bo\'lmaydi': { ru: 'Завершённую работу нельзя отменить', en: 'Finished work cannot be cancelled' },
  'Yakunlangan e\'lonni tahrirlab bo\'lmaydi': { ru: 'Завершённое объявление нельзя редактировать', en: 'A completed posting cannot be edited' },
  'Yakunlash uchun yollangan ishchi yo\'q': { ru: 'Нет нанятого работника, чтобы завершить', en: 'There is no hired worker to complete' },
  'Yangi parol eskisidan farq qilishi kerak': { ru: 'Новый пароль должен отличаться от старого', en: 'The new password must differ from the old one' },
  'Yechish so\'rovi topilmadi': { ru: 'Запрос на вывод не найден', en: 'Withdrawal request not found' },
  'Yollangan ishchini rad etib bo\'lmaydi, avval ishni bekor qiling': { ru: 'Нанятого работника нельзя отклонить — сначала отмените работу', en: 'A hired worker cannot be rejected; cancel the job first' },
};

/** The details the server builds with a value in them. The `{}` stands where
 *  the backend interpolates — a count, a status, a list. */
const TEMPLATED: { re: RegExp; ru: string; en: string }[] = [
  { re: /^Bu\ ishning\ (.+?)\ kuni\ hali\ yakunlanmagan\.\ Holatni\ shu\ yerdan\ o'zgartirish\ ishchiga\ hech\ narsa\ hisoblamaydi\.\ Ishni\ kunlar\ bo'yicha\ yakunlang\ yoki\ bekor\ qiling\.$/, ru: 'У этой работы ещё не завершено дней: $1. Смена статуса отсюда ничего работнику не начислит. Завершите работу по дням или отмените её.', en: '$1 day(s) of this job are not finished. Changing the status here credits the worker nothing. Finish it day by day, or cancel it.' },
  { re: /^(.+?)\ hali\ kelmadi\ —\ o'sha\ kuni\ yakunlang$/, ru: '$1 ещё не наступил — завершите его в тот день', en: '$1 has not arrived yet — close it on the day' },
  { re: /^Bu\ ish\ bo'yicha\ barcha\ (.+?)\ ta\ o'rin\ to'lgan$/, ru: 'По этой работе заняты все $1 мест', en: 'All $1 places on this job are taken' },
  { re: /^Bu\ so'rov\ allaqachon\ ko'rib\ chiqilgan\ \(holat:\ (.+?)\)$/, ru: 'Этот запрос уже рассмотрен (статус: $1)', en: 'This request has already been handled (status: $1)' },
  { re: /^Ko'pi\ bilan\ (.+?)\ ta\ karta\ qo'shish\ mumkin$/, ru: 'Можно добавить не более $1 карт', en: 'At most $1 cards can be added' },
  { re: /^Noma'lum\ holat\.\ Ruxsat\ etilgan:\ (.+?)$/, ru: 'Неизвестный статус. Допустимые: $1', en: 'Unknown status. Allowed: $1' },
  { re: /^Ushbu\ kategoriyada\ (.+?)\ ta\ faol\ ish\ e'loni\ mavjud,\ uni\ o'chirib\ bo'lmaydi$/, ru: 'В этой категории есть $1 активных объявлений, её нельзя удалить', en: 'There are $1 active job postings in this category, it cannot be deleted' },
];

export const translateApiError = (
  detail: string,
  lang: 'uz' | 'ru' | 'en',
): string => {
  const text = (detail ?? '').trim();
  if (!text || lang === 'uz' || PASSTHROUGH.has(text)) return text;

  const exact = EXACT[text];
  if (exact) return exact[lang];

  for (const { re, ru, en } of TEMPLATED) {
    const m = text.match(re);
    if (m) {
      const filled = lang === 'ru' ? ru : en;
      return filled.replace(/\$(\d)/g, (_, i) => m[Number(i)] ?? '');
    }
  }

  // Something the backend raised that this file has not been told about, or a
  // message from a layer below it. Handing it back unchanged is better than
  // replacing it with a shrug: it is still the only description of what failed.
  return text;
};
