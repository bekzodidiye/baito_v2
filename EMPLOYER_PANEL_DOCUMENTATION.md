# Baito Ish Beruvchi Paneli Xujjatlari (Employer Panel Documentation)

Bu hujjat Baito platformasidagi Ish Beruvchi Paneli (Employer Panel) arxitekturasi, funksional imkoniyatlari va ishlatilishi haqida to'liq ma'lumot beradi.

---

## 1. Umumiy Ko'rinish

Ish Beruvchi Paneli tadbirkorlar va vakansiya joylashtiruvchilar uchun mo'ljallangan maxsus boshqaruv markazi bo'lib, quyidagi asosiy bo'limlardan iborat:

- **Dashboard**: E'lonlar statistikasi, faol nomzodlar va tezkor amallar.
- **E'lonlar (Jobs)**: Barcha vakansiyalarni yaratish, tahrirlash va statuslarini boshqarish.
- **Nomzodlar (Applicants)**: Kelib tushgan ariza va rezyumelarni ko'rib chiqish, qabul qilish yoki rad etish.
- **Chatlar (Chats)**: Nomzodlar va ishchilar bilan real-vaqt rejimida muloqot qilish.
- **Moliyaviy Hisob (Payments & Escrow)**: Balansni to'ldirish, xavfsiz Escrow to'lov tizimini boshqarish.
- **Analitika va Hisobotlar**: Vakansiya va xarajatlar tahlili.

---

## 2. Asosiy Funksiyalar

### 2.1 E'lon Yaratish va Moderatsiya
- Yangi vakansiyalarni sarlavha, maosh (soatlik/kunlik), joylashuv va batafsil tavsif bilan joylashtirish.
- Auto-approve sozlamasiga ko'ra e'lonlar darhol xarita va qidiruvda paydo bo'ladi.

### 2.2 Escrow Xavfsiz To'lov Tizimi
- Ish beruvchi topshiriq topshirilganda mablag'ni Escrow tizimida muzlatib qo'yadi.
- Ish muvaffaqiyatli topshirilgach, to'lov ishchi balansiga o'tkaziladi.

### 2.3 Nizo va E'tirozlar (Disputes)
- Kelishmovchilik yuzaga kelganda admin aralashuvi orqali Escrow mablag'i adolatli taqsimlanadi.

---

## 3. Komponentlar Strukturasi

- `src/features/employer/EmployerPanel.tsx` — Asosiy konteynor
- `src/features/employer/EmployerDashboard.tsx` — Statistika va umumiy ko'rinish
- `src/features/employer/EmployerJobs.tsx` — Vakansiyalar ro'yxati va filtrlash
- `src/features/employer/EmployerApplicants.tsx` — Arizalar va nomzodlar boshqaruvi
- `src/features/employer/EmployerChats.tsx` — Suhbatlar
- `src/features/employer/EmployerAnalytics.tsx` — Analitika chartlari
