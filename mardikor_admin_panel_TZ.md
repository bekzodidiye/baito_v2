# 🛠️ Baito — Super Admin Panel
## Texnik Vazifa (TZ) · Senior Daraja · v2.0
### ⚡ Haqiqiy kod bazasiga asoslangan — bekzodidiye/baito_v2

---

## 📋 Loyiha Konteksti

| Parametr | Qiymat |
|---|---|
| Loyiha nomi | Baito Admin Panel |
| Repo | github.com/bekzodidiye/baito_v2 |
| Stack | React + Vite + TypeScript (frontend) · Express + Drizzle ORM (backend) |
| DB jadvallar | `users` · `jobs` · `applications` · `chats` · `messages` · `transactions` |
| Mavjud admin API | `/api/admin/stats` · `/api/admin/users` · `/api/admin/jobs` · `/api/admin/transactions` |
| Auth | Header-based mock (`x-user-role`) → JWT ga o'tkazilishi kerak |
| Mavjud panellar | `src/features/employer/` — 6 ta komponent · `src/features/worker/` (tahminiy) |

---

## 🎯 Maqsad va Muammo

**Hozirgi holat:** `server.ts` da minimal admin endpointlar bor, lekin frontend admin paneli yo'q yoki juda kam funksiyali.

**Kerakli natija:** Mavjud `server.ts` API lari va DB schemasi asosida, employer/worker panellari bilan bir xil loyiha strukturasida (`src/features/admin/`) to'liq admin panel qurish.

---

## 🗂️ Loyiha Ichidagi Joylashuv

### Yangi fayllar qayerga yozilishi kerak:

```
src/
├── features/
│   ├── employer/          ← MAVJUD (tegmaslik)
│   │   ├── EmployerPanel.tsx
│   │   ├── EmployerDashboard.tsx
│   │   ├── EmployerJobs.tsx
│   │   ├── EmployerApplicants.tsx
│   │   ├── EmployerChats.tsx
│   │   └── EmployerAnalytics.tsx
│   ├── worker/            ← MAVJUD (tegmaslik)
│   └── admin/             ← YANGI — bu yerga yozish
│       ├── AdminPanel.tsx          (asosiy layout + sidebar)
│       ├── AdminDashboard.tsx      (statistika)
│       ├── AdminUsers.tsx          (users jadvali)
│       ├── AdminUserDetail.tsx     (user batafsil)
│       ├── AdminJobs.tsx           (jobs boshqaruvi)
│       ├── AdminTransactions.tsx   (tranzaksiyalar)
│       ├── AdminSettings.tsx       (tizim sozlamalari)
│       └── hooks/
│           ├── useAdminStats.ts
│           ├── useAdminUsers.ts
│           ├── useAdminJobs.ts
│           └── useAdminTransactions.ts
├── components/            ← Mavjud componentlarni REUSE qilish
│   ├── DataTable/         (agar bor bo'lsa, o'sha ishlatish)
│   ├── StatusBadge/
│   └── ...
```

> ⚠️ **QOIDA (AGENTS.md dan):** Har bir fayl 200 qatordan oshmasligi kerak. Logikani `hooks/` ga, JSX ni component ga ajrat.

---

## 🗄️ Ma'lumotlar Modeli (Haqiqiy DB Schema)

Admin panel faqat **shu maydonlar** bilan ishlaydi:

### `users` jadvali
```typescript
{
  id: string (UUID),
  name: string,
  phone: string,
  role: 'worker' | 'employer' | 'admin',
  companyName?: string,       // faqat employer uchun
  avatarUrl?: string,
  balance: string,            // raqamli string ('150000')
  isBanned: boolean,          // admin tomonidan boshqariladi
  createdAt: timestamp
}
```

### `jobs` jadvali
```typescript
{
  id: string (UUID),
  employerId: string,         // users.id ga reference
  hiredWorkerId?: string,     // yollangandan keyin to'ldiriladi
  title: string,
  company: string,
  salary: string,             // '150000' (so'm)
  location: string,
  durationLabel: string,      // '1 kun', '3 kun' va h.k.
  description: string,
  status: 'open' | 'in_progress' | 'completed',
  createdAt: timestamp
}
```

### `applications` jadvali
```typescript
{
  id: string (UUID),
  jobId: string,
  workerId: string,
  status: 'applied' | 'hired' | 'rejected' | 'completed',
  appliedDate: timestamp
}
```

### `transactions` jadvali
```typescript
{
  id: string (UUID),
  jobId: string,
  employerId: string,
  workerId: string,
  amount: string,             // ishchi olgan summa
  platformFee?: string,       // 10% komissiya (amount * 0.10)
  type: 'deposit' | 'release',
  status: 'held' | 'completed',
  createdAt: timestamp
}
```

---

## 🔌 Mavjud Admin API Endpointlar

> Bu endpointlar `server.ts` da allaqachon yozilgan — qayta yozmaslik kerak!

### GET `/api/admin/stats`
```typescript
// Javob:
{
  totalUsers: number,
  workersCount: number,
  employersCount: number,
  totalJobs: number,
  openJobsCount: number,
  activeJobsCount: number,
  completedJobsCount: number,
  totalApplications: number,
  totalTransactions: number,
  totalRevenue: number,       // platformFee yig'indisi (so'm)
  totalEscrowHeld: number     // hozir held holatdagi pul
}
```

### GET `/api/admin/users`
```typescript
// Javob: User[] massiv (barcha maydonlar)
// Eslatma: balance string keladi → parseFloat() qilish kerak
```

### POST `/api/admin/users/:id/balance`
```typescript
// Body: { amount: number }  // qo'shiladi (manfiy bo'lishi mumkin)
// Javob: { success: true, balance: number }
```

### PATCH `/api/admin/users/:id/role`
```typescript
// Body: { role: 'worker' | 'employer' | 'admin' }
```

### PATCH `/api/admin/users/:id/ban`
```typescript
// Body: { isBanned: boolean }
// Javob: { success: true }
```

### GET `/api/admin/jobs`
```typescript
// Javob: Job[] massiv
```

### PATCH `/api/admin/jobs/:id/status`
```typescript
// Body: { status: 'open' | 'in_progress' | 'completed' }
```

### DELETE `/api/admin/jobs/:id`
```typescript
// Applications ham o'chiriladi (cascade)
// Javob: { success: true }
```

### GET `/api/admin/transactions`
```typescript
// Javob: Transaction[] massiv
```

### GET `/api/admin/settings`
```typescript
// Javob:
{
  platformFeePercent: number,   // default: 10
  minHourlyRate: number,        // default: 15000
  maintenanceMode: boolean,
  autoApproveJobs: boolean
}
// ⚠️ Hozir in-memory — server restart qilganda reset bo'ladi
```

### POST `/api/admin/settings`
```typescript
// Body: Qisman yoki to'liq settings obyekti
// Javob: { success: true, settings: Settings }
```

### POST `/api/admin/broadcast`
```typescript
// Body: { title: string, message: string, targetRole?: 'worker' | 'employer' | 'all' }
// ⚠️ Hozir faqat console.log — real push/SMS integratsiya keyinchalik
```

---

## 📊 Sahifalar va Komponentlar

### 1. AdminPanel.tsx — Asosiy Layout

**Vazifa:** Sidebar + header + `<Outlet>` wrapper. 200 qator qoidasi uchun routing logikasini bu yerda saqlash.

```
┌────────────────────────────────────────────────┐
│  🔷 BAITO ADMIN          [Admin nomi]  [Chiqish]│
├──────────────┬─────────────────────────────────┤
│  🏠 Dashboard │                                 │
│  👥 Foydalanuvchilar      ASOSIY KONTENT        │
│  📢 E'lonlar  │           (React Router Outlet) │
│  💰 Moliya    │                                 │
│  ⚙️ Sozlamalar│                                 │
└──────────────┴─────────────────────────────────┘
```

**Routing:**
```typescript
// App.tsx yoki router.tsx ga qo'shiladi:
/admin                → AdminDashboard
/admin/users          → AdminUsers
/admin/users/:id      → AdminUserDetail
/admin/jobs           → AdminJobs
/admin/transactions   → AdminTransactions
/admin/settings       → AdminSettings
```

**Sidebar badge lar:**
- "Foydalanuvchilar" — banned userlar soni (qizil)
- "E'lonlar" — `open` statusdagi e'lonlar soni

---

### 2. AdminDashboard.tsx

**API:** `GET /api/admin/stats`

**Hook:** `useAdminStats.ts` — TanStack Query bilan, 30 soniyada auto-refresh

**Layout:**

```
┌────────────────────────────────────────────────────────┐
│  KPI KARTOCHKALAR (2 qator, 3 ustun)                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐               │
│  │ Jami     │ │ Ishchilar│ │Ish ber.  │               │
│  │ Userlar  │ │          │ │          │               │
│  │   124    │ │    89    │ │    35    │               │
│  └──────────┘ └──────────┘ └──────────┘               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐               │
│  │ Ochiq    │ │Jarayonda │ │Platforma │               │
│  │ E'lonlar │ │  ishlar  │ │ daromadi │               │
│  │    12    │ │    7     │ │ 450,000  │               │
│  └──────────┘ └──────────┘ └──────────┘               │
├────────────────────────────────────────────────────────┤
│  ESCROW HOLATI                                         │
│  Hozir muzlatilgan: 2,300,000 so'm                     │
│  (X ta ish jarayonda)                                  │
└────────────────────────────────────────────────────────┘
```

**Komponent bo'linishi (200 qator qoidasi):**
- `AdminDashboard.tsx` — faqat layout, kartochkalarni chizadi
- `hooks/useAdminStats.ts` — API call va data transformation
- `StatsCard.tsx` — qayta ishlatiladigan KPI karta komponenti (`components/` ga)

---

### 3. AdminUsers.tsx

**API:** `GET /api/admin/users`

**Hook:** `useAdminUsers.ts`

**Jadval ustunlari (haqiqiy DB maydonlariga mos):**

| Ustun | DB Maydon | Izoh |
|---|---|---|
| ID | `id` | Qisqartirilgan (ilk 8 belgi) |
| Ism | `name` | |
| Telefon | `phone` | |
| Rol | `role` | Badge: worker/employer/admin |
| Kompaniya | `companyName` | Faqat employer uchun |
| Balans | `balance` | `parseFloat()` + so'm formati |
| Holat | `isBanned` | 🟢 Faol / 🔴 Bloklangan |
| Ro'yxat sanasi | `createdAt` | |
| Amallar | — | Ko'rish · Ban/Unban · Rol |

**Filtrlar:**
- Rol bo'yicha: `Hammasi | Worker | Employer | Admin`
- Holat: `Hammasi | Faol | Bloklangan`
- Qidiruv: ism yoki telefon bo'yicha (client-side, chunki barcha userlar bitta so'rovda keladi)

**Amallar (inline):**
- **Ban/Unban** — `PATCH /api/admin/users/:id/ban` → confirm modal bilan
- **Rol o'zgartirish** — `PATCH /api/admin/users/:id/role` → select dropdown
- **Balans to'ldirish** — `POST /api/admin/users/:id/balance` → input modal

**Komponent bo'linishi:**
- `AdminUsers.tsx` — jadval layout + filtr (max 200 qator)
- `hooks/useAdminUsers.ts` — fetch + mutatsiyalar
- `UserActionModal.tsx` — ban/role/balance modal (`components/admin/` ga)

---

### 4. AdminUserDetail.tsx

**Route:** `/admin/users/:id`

**API:** Mavjud endpointlardan foydalanib user ma'lumotini olish:
- `GET /api/admin/users` → filtrlash (id bo'yicha)
- `GET /api/admin/jobs` → `employerId === id` → bu userning e'lonlari
- `GET /api/admin/transactions` → `workerId === id || employerId === id`

> ⚠️ **Eslatma:** Alohida `GET /api/admin/users/:id` endpoint yo'q hozir. Backend ga qo'shish yoki client-side filtrlash — ikkinchisi oddiyroq, ishlatish mumkin.

**Layout — Tab tizimi:**

```
┌────────────────────────────────────────────────┐
│  [Avatar] Otabek (Worker)    [Ban] [Rol o'zg.] │
│  📞 +998991234567  |  Balans: 0 so'm            │
│  Holat: 🟢 Faol  |  Ro'yxat: 15.07.2024        │
├────────────────────────────────────────────────┤
│  [Asosiy] [E'lonlar/Arizalar] [Tranzaksiyalar] │
├────────────────────────────────────────────────┤
│  TAB KONTENTI                                   │
└────────────────────────────────────────────────┘
```

**Tab 1 — Asosiy:**
- Hamma `users` maydonlari ko'rsatiladi
- Balance ustida `+Balans qo'shish` tugmasi

**Tab 2 — E'lonlar / Arizalar:**
- `role === 'employer'` bo'lsa → bu userning e'lonlari (`employerId` bo'yicha filter)
- `role === 'worker'` bo'lsa → bu userning arizalari (`workerId` bo'yicha)

**Tab 3 — Tranzaksiyalar:**
- `employerId === id || workerId === id` bo'lgan tranzaksiyalar
- Har bir qatorda: type (deposit/release), amount, platformFee, status, sana

---

### 5. AdminJobs.tsx

**API:** `GET /api/admin/jobs`

**Jadval ustunlari:**

| Ustun | DB Maydon | Izoh |
|---|---|---|
| Sarlavha | `title` | |
| Kompaniya | `company` | |
| Manzil | `location` | |
| Narx | `salary` | so'm formatida |
| Davomiylik | `durationLabel` | |
| Holat | `status` | open/in_progress/completed badge |
| Joylashtirilgan | `createdAt` | |
| Amallar | — | Status o'zg. · O'chirish |

**Filtrlar (client-side):**
- Status: `Hammasi | Ochiq | Jarayonda | Yakunlangan`
- Qidiruv: title yoki company bo'yicha

**Amallar:**
- **Status o'zgartirish** — `PATCH /api/admin/jobs/:id/status`
  - `open` → `in_progress` yoki to'g'ridan `completed`
  - ⚠️ `in_progress` dan `open` ga qaytarish — confirm kerak (escrow pul borligi sababli)
- **O'chirish** — `DELETE /api/admin/jobs/:id`
  - Faqat `open` holatdagi e'lonlar o'chirilishi kerak
  - `in_progress` ni o'chirishdan oldin ogohlantirish: "Bu e'lon jarayonda, escrow pul bor!"

---

### 6. AdminTransactions.tsx

**API:** `GET /api/admin/transactions`

**Jadval ustunlari:**

| Ustun | DB Maydon | Izoh |
|---|---|---|
| ID | `id` | Qisqa |
| Tur | `type` | deposit/release badge |
| Summa | `amount` | so'm formatida |
| Platforma to'lovi | `platformFee` | faqat `release` da bo'ladi |
| Holat | `status` | held/completed badge |
| Job ID | `jobId` | → Admin Jobs ga havola |
| Sana | `createdAt` | |

**Filtrlar:**
- Tur: `Hammasi | Deposit (pul muzlatish) | Release (pul chiqarish)`
- Holat: `Hammasi | Held (muzlatilgan) | Yakunlangan`

**Jami ko'rsatkichlar (jadval ustida):**
```
Jami oborot: X so'm  |  Muzlatilgan: Y so'm  |  Platforma daromadi: Z so'm
```

---

### 7. AdminSettings.tsx

**API:** `GET /api/admin/settings` + `POST /api/admin/settings`

**Layout:**

```
┌──────────────────────────────────────────────┐
│ MOLIYAVIY SOZLAMALAR                         │
│  Platforma komissiyasi:  [10] %              │
│  Minimal narx:           [15000] so'm        │
│                                              │
│ MODERATSIYA                                  │
│  E'lonlarni avtotasdiqlash:  [✓ Yoqilgan]   │
│  Texnik ishlar rejimi:       [ O'chirilgan]  │
│                                              │
│                        [ 💾 Saqlash ]        │
└──────────────────────────────────────────────┘
```

**⚠️ Muhim eslatma (settings sahifasida ko'rsatilsin):**
> "Hozirgi versiyada sozlamalar server xotirasida saqlanadi. Server qayta ishga tushirilganda default qiymatlarga qaytadi."

**Broadcast qismi:**
```
┌──────────────────────────────────────────────┐
│ 📣 XABAR YUBORISH                            │
│  Kimga: [○ Hammasi] [○ Worker] [○ Employer]  │
│  Sarlavha: [_____________________________]   │
│  Matn:     [_____________________________]   │
│             [_____________________________]  │
│                        [ 📤 Yuborish ]       │
│  ⚠️ Hozirda console.log da ko'rinadi         │
└──────────────────────────────────────────────┘
```

---

## 🎨 UI/UX Ko'rsatmalar

### Mavjud dizayn tokenlarni ishlatish

> ⚠️ **AGENTS.md qoidasi:** Mavjud CSS class va style tokenlarni o'zgartirmaslik. Faqat `src/features/admin/` ichida yangi stil qo'shish.

Admin panel uchun mavjud Tailwind classlar:
- Layout: `flex`, `grid`, `w-full`, `h-screen`
- Rang: mavjud loyiha tokenlaridan foydalanish (global CSS ni tekshirib ko'rish)
- Jadval: mavjud `components/` da table component borligini tekshirish, bor bo'lsa reuse

### Holat badge lari (StatusBadge component)

```typescript
// src/components/StatusBadge.tsx (agar yo'q bo'lsa yaratish)
type Status = 'open' | 'in_progress' | 'completed' | 
              'applied' | 'hired' | 'rejected' |
              'held' | 'active' | 'banned';

// Rang mapping:
open        → bg-blue-100   text-blue-700
in_progress → bg-yellow-100 text-yellow-700
completed   → bg-green-100  text-green-700
held        → bg-orange-100 text-orange-700
banned      → bg-red-100    text-red-700
```

### Raqam formatlash (utils)

```typescript
// src/utils/format.ts (bor bo'lsa reuse, yo'q bo'lsa yaratish)
export const formatMoney = (amount: string | number): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('uz-UZ').format(num) + ' so\'m';
};

export const formatDate = (date: string | Date): string => {
  return new Date(date).toLocaleDateString('uz-UZ', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
};
```

---

## 🔒 Autentifikatsiya

**Hozirgi holat:** Mock auth (`x-user-role` header)

**Admin panel uchun zarur minimum:**

```typescript
// src/features/admin/AdminGuard.tsx
// server.ts ga qo'shilgan: PATCH /api/admin/users/:id/role
// 'admin' roliga ega user yaratish:
// POST /api/admin/users/:id/role → { role: 'admin' }

// Tekshirish: /api/me → { role: 'admin' } bo'lsa o'tkazish
// Boshqa rol → redirect to '/'
```

**Kelgusida:** JWT + `role: 'admin'` claim tekshiruvi

---

## 🚀 Amalga Oshirish Ketma-ketligi

**AGENTS.md qoidasiga ko'ra har bir qadamda:**
1. Folder strukturasini tekshir
2. Mavjud o'xshash komponentlarni qidir
3. 200 qator qoidasiga rioya qil

### Qadam 1 — Asosiy skelet (birinchi ishlaydigan holat)
- [ ] `src/features/admin/AdminPanel.tsx` — sidebar + layout
- [ ] `src/features/admin/AdminDashboard.tsx` + `useAdminStats.ts`
- [ ] Router ga `/admin/*` qo'shish
- [ ] `src/features/admin/AdminGuard.tsx` — minimal auth tekshiruv

### Qadam 2 — Foydalanuvchilar boshqaruvi
- [ ] `src/features/admin/AdminUsers.tsx` + `useAdminUsers.ts`
- [ ] `src/features/admin/AdminUserDetail.tsx`
- [ ] `UserActionModal.tsx` — ban, rol, balans

### Qadam 3 — E'lonlar va moliya
- [ ] `src/features/admin/AdminJobs.tsx` + `useAdminJobs.ts`
- [ ] `src/features/admin/AdminTransactions.tsx` + `useAdminTransactions.ts`

### Qadam 4 — Sozlamalar
- [ ] `src/features/admin/AdminSettings.tsx`
- [ ] Broadcast forma

---

## ⚙️ Backend — Qo'shimcha Endpoint (Tavsiya)

Hozirgi `server.ts` da **yo'q** lekin kerak bo'ladigan endpoint:

```typescript
// User batafsil ma'lumot (applications + jobs bilan)
GET /api/admin/users/:id/detail
// Javob:
{
  user: User,
  jobs: Job[],          // employer bo'lsa
  applications: Application[], // worker bo'lsa
  transactions: Transaction[]
}
```

Bu endpointni qo'shish frontend kodni soddalashtirada. Yoki client-side filtrlash ham ishlaydi (ma'lumotlar kichik bo'lganda).

---

## 📌 AI uchun Qat'iy Ko'rsatmalar

> Bu bo'limni o'qib, quyidagi qoidalarga **so'zsiz** amal qilish kerak

**1. MAVJUD KODGA TEGMASLIK:**
- `src/features/employer/` — bu papkaga hech narsa qo'shmaslik, o'zgartirmaslik
- `server.ts` mavjud endpointlarni o'zgartirmaslik — faqat yangi qo'shish mumkin
- `global.css` yoki asosiy theme fayllariga tegmaslik

**2. 200 QATOR QOIDASI (AGENTS.md):**
- Har bir `.tsx`/`.ts` fayl 200 qatordan oshmasin
- Logikani `hooks/` ga, JSX ni komponentga, yordamchi funksiyalarni `utils.ts` ga ajrat

**3. KOMPONENTLARNI REUSE QILISH:**
- Avval `src/components/` ni tekshir
- `StatusBadge`, `DataTable`, `Modal`, `Button` kabi umumiy komponentlar borligini aniqla
- Bor bo'lsa — ishlatish, yo'q bo'lsa — `src/components/` ga yaratish (admin uchun ham, boshqa panellar uchun ham ishlatiladigan tarzda)

**4. API ENDPOINTLARINI TO'G'RI ISHLATISH:**
- `balance` maydoni `string` keladi → `parseFloat()` qilmasdan ishlatma
- `isBanned` boolean, lekin DB dan 0/1 kelishi mumkin → `!!user.isBanned` bilan tekshir
- `GET /api/admin/users` — BARCHA userlar (paginatsiya yo'q hozir) — katta ro'yxatda client-side virtualizatsiya qo'shish tavsiya etiladi

**5. HOLAT BOSHQARUVI:**
- TanStack Query ishlatilsin (loyihada bor bo'lsa) — `invalidateQueries` bilan mutatsiyalardan keyin refresh
- Agar TanStack Query yo'q bo'lsa — `useEffect` + `useState` bilan oddiy fetch

**6. XATO BOSHQARUVI:**
- Har bir API chaqiruvda `try/catch`
- Xato holat: toast xabari + console.error
- Loading holat: skeleton yoki spinner

**7. TASDIQLASH DIALOGLARI:**
- Ban amali → "Foydalanuvchini bloklamoqchimisiz?" confirm
- O'chirish amali → "E'lonni o'chirishni tasdiqlang" confirm
- Rol o'zgartirish → confirm

**8. ESCROW OGOHLANTIRISHLAR:**
- `in_progress` statusdagi e'lonni o'chirishda: "Bu e'lon jarayonda! Escrow pul bor. O'chirishdan oldin to'lovni hal qiling."
- `status: 'held'` tranzaksiyalari — ular hali ishchiga o'tmagan pullar

---

*TZ versiya 2.0 | Bekzod Idiyev loyihasi | Baito platformasi | github.com/bekzodidiye/baito_v2*