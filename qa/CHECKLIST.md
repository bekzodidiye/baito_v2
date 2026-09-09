# Tasdiqlash cheklisti — pul va qaytarib bo'lmaydigan amallar

**Sana:** 2026-09-05 · **Bosqich:** round 4 · **Muhit:** bir martalik QA stack (`qa3-*`)

Bu ro'yxat bitta savolga javob beradi: **foydalanuvchi bir marta bosganda nima
qaytarib bo'lmaydigan tarzda sodir bo'ladi va undan oldin so'raladimi?**

Har bir qator brauzerda **bosib** o'lchangan — kodni o'qib emas. O'lchov usuli:
bosishdan keyin serverga holat o'zgartiruvchi so'rov ketdimi, va bosish bilan
so'rov orasida `confirm()` yoki modal bo'ldimi.

---

## 1. Tasdiq so'ramaydigan amallar — TUZATISH KERAK

| # | Amal | Kim | Nima bo'ladi | Takror | Holat |
|---|---|---|---|---|---|
| 1.1 | **Qabul qilish** (nomzodni yollash) | ish beruvchi | **Pul escrow'ga muzlatiladi** | 3/3 | ❌ so'ramaydi |
| 1.2 | **Ban** (ro'yxatdagi tugma) | admin | Foydalanuvchi platformadan uziladi | 3/3 | ❌ so'ramaydi |
| 1.3 | **Barcha qurilmalardan chiqish** | ishchi | Barcha qurilmadagi seanslar tugaydi | 3/3 | ❌ so'ramaydi |
| 1.4 | **Arizani topshirish** | ishchi | Ishchi smenaga majburiyat oladi | 3/3 | ❌ so'ramaydi |

**Dalil — 1.1 (eng jiddiy):** uch marta bosildi, har safar balansdan pul ketdi:

```
balans 4 150 000 → 3 750 000   (400 000 muzlatildi)
balans 3 750 000 → 3 550 000   (200 000)
balans 3 550 000 → 3 350 000   (200 000)
```

Uchala safar ham `askedFirst: false` — na dialog, na modal.

**1.2 bo'yicha muhim nuqta:** `BanUserModal.tsx` **allaqachon mavjud va
ishlatiladi** — foydalanuvchi tafsiloti oynasida (`UserDetailModal.tsx:211`)
ban to'g'ri so'raydi. Ro'yxatdagi tezkor tugma uni chetlab o'tadi. Ya'ni
yechim yozilgan, faqat bitta kirish nuqtasi undan foydalanmaydi.

**Batafsil:** `qa/findings/BUG-024-committing-actions-do-not-ask.md`

---

## 2. Yolg'on muvaffaqiyat — TUZATISH KERAK

| # | Amal | Nima deydi | Nima qiladi | Takror |
|---|---|---|---|---|
| 2.1 | **Asosiy qilish** (karta) | "Asosiy karta qilib belgilandi" | **Hech narsa** — so'rov ketmaydi | 3/3 |

```json
{ "toasts": ["Asosiy karta qilib belgilandi"], "requests": [] }
```

Karta holati oldin va keyin bir xil. Handler'ning butun tanasi — toast chiqarish.

Bu 3-bosqichdagi **BUG-017** (pul yechish "Muvaffaqiyatli" deb yozib, hech
narsa qilmagan) va **BUG-018** (support chat o'ziga javob yozgan) bilan bir xil
turdagi nuqson: **interfeys qilmagan ishini qilgan deb aytadi.**

**Batafsil:** `qa/findings/BUG-025-make-default-card-reports-success.md`

---

## 3. To'g'ri ishlaydi — qayta ochilmasin

Bular tekshirildi va **muammo topilmadi**. Keyingi tekshiruvchi vaqt sarflamasin:

| Amal | Xatti-harakat |
|---|---|
| Yechishni **tasdiqlash** (admin) | `prompt()` summa va ishchi nomini ko'rsatib sabab so'raydi |
| Yechishni **rad etish** (admin) | xuddi shunday |
| **Kartani o'chirish** (ishchi) | tasdiqlash modali ochiladi |
| E'lon / kategoriya / hudud **o'chirish** (admin) | `confirm()` nomini aytib so'raydi |
| **Barchasini tasdiqlash** (ish beruvchi) | `confirm()` |
| Kunlik ariza chegarasi | server `400` + **xabar ekranda ko'rsatiladi**: "Bir kunda ko'pi bilan 2 ta ishga ariza topshirishingiz mumkin!" |
| **To'lovni tasdiqlash** (yangi, PR #26) | chek majburiy, keyin "Haqiqatan tasdiqlaysizmi?" |
| **Hisob-faktura yuborish** (yangi) | SMTP yoki bank rekvizitlari bo'lmasa **hech narsa yozmasdan** rad etadi |
| **Escrow — Ishchiga chiqarish** (admin) | `prompt()` ishchi ID sini so'raydi |
| **Escrow — Qaytarish** (admin) | `prompt()` summani va ish nomini ko'rsatib sabab so'raydi: "200 000 so'm — «QA tasdiq sinovi 8»" |

Ya'ni loyihada "qaytarib bo'lmaydigan amaldan oldin so'rash" **namunasi
allaqachon bor** — 1-bo'limdagi to'rtta joyda u qo'llanilmagan.

---

## 4. Tekshirilmagan — ochiq qoldi

QA.md §2.8 talabi: qamramagan narsa nomma-nom aytilishi kerak.

| Nima | Nega |
|---|---|
| **Ishni yakunlash** (ish beruvchi, escrow chiqaradi) | "JARAYONDA" yorlig'i ochildi, lekin yakunlash tugmasi topilmadi — ehtimol ish kartasini ochish kerak |
| **Balans qo'shish** (admin, pul) | Foydalanuvchi tafsiloti oynasi ochildi, "Moliya" yorlig'iga o'tilmadi — tugma topilmadi |
| **Rol o'zgartirish** (admin) | Tekshirilmadi |
| **Ommaviy xabarnoma** (admin) | Tekshirilmadi |
| **Parolni o'zgartirish** (ishchi) | Tekshirilmadi |
| **E'lonni o'chirish** (ish beruvchi) | Ro'yxatda tugma ko'rinmadi |

Bu ro'yxat "muammo yo'q" degani **emas** — "o'lchanmagan" degani.

---

## 5. O'lchov usuli

Har bir amal uchun:

1. Toza brauzer konteksti, bir marta kirish
2. Ekranga o'tish, kerak bo'lsa tugmani ko'rinishga surish
3. `elementFromPoint` bilan tugma rostdan bosiladigan ekanini tekshirish —
   aks holda "topilmadi" degan yolg'on natija chiqadi
4. Bosish, 2–3 soniya kuzatish
5. Yozib olish: holat o'zgartiruvchi so'rovlar, `confirm`/`prompt` dialoglar,
   yangi modallar, va kerak bo'lganda **bazadagi haqiqiy o'zgarish**

Skriptlar: `frontend/qa-*.mjs` (bu bosqich uchun vaqtinchalik, repo'ga
kiritilmagan).

### O'lchovda yo'l qo'yilgan xatolar — va nega bu muhim

Bu bosqichda **to'rtta yolg'on natija** chiqdi va har biri tekshirilganda
yo'qoldi. Ular hisobotga kirmadi:

| Yolg'on natija | Haqiqiy sabab |
|---|---|
| "Ariza tasdiqsiz o'tdi, lekin baza bo'sh" | Login **429** — o'zimning ko'p urinishim rate limiter'ga urilgan edi |
| "Muvaffaqiyat xabari ko'rsatildi" | Matn ish talablaridan (`...muvaffaqiyatli topshirish`), toast emas |
| "Balans ko'rsatilmayapti" | CSS `uppercase` — regex kichik harf qidirgan |
| "Barcha qurilmalardan chiqish bosilmaydi" | Tugma sahifaning 2551-pikselida, skroll yetmagan |

QA.md §2.6 aynan shuning uchun "gumonni nuqson deb yozma" deydi.

---

## 6. Tavsiya qilingan tartib

1. **1.1 Qabul qilish** — pul harakat qiladi, xato bosish qimmatga tushadi
2. **1.2 Ban** — yechim allaqachon yozilgan, faqat ulash kerak
3. **2.1 Asosiy qilish** — yolg'on muvaffaqiyat, ishonchni yemiradi
4. **1.3 Barcha qurilmalardan chiqish** — bir qatorlik `confirm()`
5. **1.4 Arizani topshirish** — mahsulot qarori; siz aytganingiz uchun ro'yxatda
6. **4-bo'lim** — o'lchanmaganlarni o'lchash
