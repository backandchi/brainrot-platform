# 🧠 Brainrot Platform (Roblox Case-Opening, Farming & Mini-Games TMA)

Production-grade, high-concurrency **Roblox Brainrot Case-Opening & Multi-Game Platform** (inspired by `brainrotfarm.win`), fully compatible both as a standalone **Web Application** and a **Telegram Mini App (TMA)**.

---

## 🚀 Arxitektura va Texnologik Stack

Loyihamiz monorepo strukturasida tuzilgan:

* **Frontend (`apps/web`):** Next.js 15 (App Router) + React 19 + Tailwind CSS + GSAP animatsiyalari + Telegram Mini App SDK (`@twa-dev/sdk`) + `brainrotfarm.win` 1:1 original dizayni va 30 ta audio effektlari.
* **Backend API (`apps/api`):** NestJS + Prisma ORM + Redis + WebSockets (Socket.IO) + Provably Fair (SHA-256) + 7 ta o'yin (Cases, Rocket/Crash, Mines 5x5, Upgrader, Dice, Fuse, Case Battles).
* **Telegram Bot (`apps/bot`):** Python `aiogram 3.x` + Telegram Stars (`XTR`) to'lovlari + Adminga savdo xabarnomalari (5 daqiqalik VIP server taymeri va 1 soatlik anti-spam cooldown).
* **Ma'lumotlar bazasi (`packages/database`):** PostgreSQL 16 + Prisma Schema (Foydalanuvchilar, Brainrotlar, Keyslar, Ferma va Inventar).

---

## 📁 Monorepo Papkalar Strukturasi

```text
brainrot-platform/
├── apps/
│   ├── web/                 # Next.js 15 + TMA SDK + 1:1 original UI + Admin Panel (/admin)
│   ├── api/                 # NestJS Game Engine, Provably Fair, Trades, Payments
│   └── bot/                 # Python aiogram 3 Bot (Telegram Stars, Admin VIP Link Bot)
├── packages/
│   └── database/            # Prisma PostgreSQL Schema & Seed skriptlari
└── docker-compose.yml       # PostgreSQL 16 + Redis 7 + API + Web + Bot
```

---

## 🕹️ O'yin Mexanikalari va Algoritmlar

1. **📦 Keys Ochish (Case Opening):**
   * CS:GO uslubidagi aylanuvchi gorizontal lenta (50 ta slot, yutuq 38-slotda).
   * RTP foizlari (94% – 97%) va Provably Fair (Server seed, client seed, SHA-256).
2. **🚜 Ferma (Passive Farm Tycoon):**
   * Brainrot personajlarini slotlarga joylashtirish (Staking).
   * Har soatlik passiv tanga ishlab chiqarish (`yieldPerHour`) va bitta tugma bilan yig'ib olish (Harvest).
3. **🚀 Raketa (Crash / Rocket):**
   * Multiplikator (1.00x ...) yuqoriga o'sadi. Portlashdan oldin Cashout qilish.
4. **💣 Minalar (Mines 5x5):**
   * 25 ta katak, 1 dan 24 tagacha mina. Har bir ochilgan olmos bilan koeffitsiyent karralanadi.
5. **🎯 Upgrader (G'ildirak):**
   * Past narxdagi personajni qo'yib qimmatrog'iga urinish. Foizga qarab yutish burchagi shakllanadi.
6. **⚗️ Fuse (Qorishtirish):**
   * 3 tadan 5 tagacha personajni qo'shib bitta yuqori darajadagi yangi Brainrot yasash.
7. **🎒 Quick Sell All:**
   * Tushgan mayda personajlarni bitta tugma bilan zudlik bilan tangaga sotish.

---

## 🔁 Roblox Depozit va Chiqarish Tizimi (Admin orqali)

* **To'ldirish (Deposit):** O'yinchi o'z Roblox niki va 1 tadan 5 tagacha beradigan Brainrotlarini tanlaydi.
* **Adminga xabarnoma:** Telegram bot orqali adminga xabar tushadi. Admin VIP Server havolasini yuboradi.
* **⏳ 5 daqiqalik taymer:** O'yinchiga havola ochiladi va 5 daqiqa sanaladi. Agar 5 daqiqada kirmasa — havola yopiladi va status *"Adminga murojaat qiling"* holatiga o'tadi.
* **🛡️ 1 soatlik Cooldown:** Bekor qilingan yoki vaqti o'tgan so'rovlar bo'yicha spam qilishning oldini olish uchun qayta so'rov yuborish 1 soatga cheklanadi.

---

## 🛠️ O'rnatish va Ishga Tushirish

### 1. Docker orqali (Bitta buyruq bilan)
```bash
docker-compose up --build -d
```

### 2. Dasturiy ta'minotni sozlash (.env):
`.env.example` faylidan nusxa olib `.env` yarating va quyidagilarni kiriting:
```env
DATABASE_URL="postgresql://brainrot:brainrot_secret_pass@localhost:5432/brainrot_db"
TELEGRAM_BOT_TOKEN="BOTFATHER_TOKENI"
ADMIN_CHAT_ID="ADMIN_TELEGRAM_ID"
WEB_APP_URL="https://sizning-domen.uz"
```

### 3. Ma'lumotlar bazasini to'ldirish (Seed):
```bash
pnpm --filter @brainrot/database db:push
pnpm --filter @brainrot/database db:seed
```

---

## 👑 Admin Panel (/admin)

Admin panel orqali hech qanday kod yozmasdan:
1. Yangi Brainrot personajlarini qo'shish (Narxi, rasmi, ferma daromadi, **Tillarang/Gold, Qizil, Binafsha, Ko'k nur ranglari**);
2. Yangi Keyslar yaratish va RTP foizlarini belgilash;
3. Kelib tushgan Roblox so'rovlariga VIP server havolasi yuborish va yakunlash.
