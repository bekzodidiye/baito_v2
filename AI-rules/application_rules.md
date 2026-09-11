# Baito Application Rules

 Ushbu faylda ishchilarning arizalariga oid muhim qoidalar saqlanadi. Har qanday AI yoki dasturchi ushbu qoidalarni esda tutishi kerak:

## 1. Bir kunda maksimal ariza soni
- Ishchi (worker) bir kun uchun eng ko'pi bilan **2 ta ishga** ariza topshirishi mumkin.

## 2. Ariza tasdiqlanganda
- Agar ishchining bitta arizasi ish beruvchi tomonidan tasdiqlansa (hired), o'sha kunga tegishli bo'lgan **boshqa barcha kutilayotgan arizalari (applied) bekor qilinadi / o'chirib tashlanadi (yo'qoladi)**.
- Bu jarayon backenddagi `hire_applicant` funksiyasi ichida amalga oshiriladi (application.py). 

## 3. Tasdiqlangan ishi bor kunga ariza
- Ishchida qaysidir kun uchun allaqachon tasdiqlangan (hired/confirmed/in_progress) ishi bo'lsa, **o'sha kunga boshqa hech qanday yangi ariza topshira olmaydi**.
- Backend `apply_to_job` endpointida buni 400 xatolik bilan qaytaradi.

## Eslatma:
Date formatlari (masalan "11", "11~12", "11,12", yoki "2024-05-11") ham to'g'ri hisobga olinishi uchun `job_actions.py` ichidagi `get_job_dates_set` funksiyasi frontend'dagi `getJobDates` kabi mukammal ishlashi shart.
