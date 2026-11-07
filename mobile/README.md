# 📱 Baito Mobile Application

Baito platformasi uchun optimallashtirilgan mobil veb va PWA interfeysi.

---

## 🛠️ Texnologiyalar (Tech Stack)

- **Freymvork:** [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build tool:** [Vite](https://vitejs.dev/)
- **Stillar:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Ikonkalar:** [Lucide React](https://lucide.dev/)
- **Davlat boshqaruvi (State):** Zustand
- **Xaritalar:** Leaflet / OpenStreetMap

---

## 🚀 Ishga tushirish (Local Setup)

```bash
# 1. Monorepo ildiz papkasidan:
npm run dev:mobile

# 2. Yoki mobile papkasidan to'g'ridan-to'g'ri:
cd mobile
npm install
npm run dev
```

Lokal server odatda quyidagi manzilda ishga tushadi:
`http://localhost:5174` (yoki tarmoqda `http://0.0.0.0:5174`)

---

## 📱 Xususiyatlari (Features)

- Sensorli ekranlar uchun moslashtirilgan qulay navigatsiya (Touch-first mobile UX);
- Ish qidirish, xaritada ko'rish va filtrlash;
- Ishchi va ish beruvchi profillarini to'liq boshqarish;
- Ko'p tilli qo'llab-quvvatlash (`uz`, `ru`, `en`).
