# 🎨 Baito Frontend — Web Application

Baito platformasining asosiy veb-foydalanuvchi interfeysi (Desktop & Responsive Web).

---

## 🛠️ Texnologiyalar (Tech Stack)

- **Freymvork:** [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Yig'uvchi (Bundler):** [Vite](https://vitejs.dev/)
- **Stillar:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Ikonkalar:** [Lucide React](https://lucide.dev/)
- **Davlat boshqaruvi (State Management):** [Zustand](https://zustand-demo.pmnd.rs/)
- **Xaritalar:** [Leaflet](https://leafletjs.com/) + React-Leaflet + OpenStreetMap
- **Testlash:** [Vitest](https://vitest.dev/) + React Testing Library

---

## 📁 Arxitektura tuzilishi (Folder Structure)

```text
frontend/src/
├── api/             # API mijoz, Axios so'rovlar va interceptorlar
├── components/      # Umumiy UI komponentlar (modal, menyu, xarita, xabarlar)
├── constants/       # Ilova konstantalari (perklar, hududlar, toifalar)
├── context/         # React kontekst provayderlari
├── features/        # Asosiy modullar (admin, ish beruvchi, ishchi, to'lovlar)
├── hooks/           # Maxsus React hooklar
├── store/           # Zustand global state (auth, til, notifikatsiyalar)
├── translations/    # Ko'p tilli tarjimalar (uz, ru, en)
├── utils/           # Yordamchi util funksiyalar (sana, pul, xato tarjimalari)
└── types.ts         # Global TypeScript interfeyslari va turlari
```

---

## 🚀 Ishga tushirish (Getting Started)

```bash
# Bog'liqliklarni o'rnatish:
npm install

# Rivojlantirish serverini ishga tushirish:
npm run dev

# Unit va integratsion testlarni yurgizish:
npm test

# Ishlab chiqarish buildini yaratish:
npm run build
```
