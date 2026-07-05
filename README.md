# 🛒 KwatchaCart

**Zero-friction micro-ecommerce for Zambian market vendors — sell on WhatsApp, get paid with Mobile Money.**

KwatchaCart lets a small market vendor in Lusaka (e.g. Kamwala) list products, take
orders, and trigger MTN / Airtel **Mobile Money (MoMo)** PIN prompts entirely through a
**WhatsApp conversation** plus a **one-page, hyper-simplified mobile web view** — no apps,
no logins, no passwords.

It is built around two hard realities of doing business in Lusaka:

1. **Low tech literacy** → the vendor experience is *just WhatsApp text*, and the customer
   experience is a lightning-fast, icon-heavy, two-tap page.
2. **Fragmented mobile-money payments** → a pluggable payment layer speaks to MTN MoMo,
   PawaPay (multi-operator aggregator) or a built-in simulator behind one interface.

```
[Customer on WhatsApp] <--> [WhatsApp Cloud API] <--> [Backend: Node/Express/TS]
                                                              |
[Ultra-simple Web View] <-------------------------------------+--> [MoMo Gateway]
   (React + Vite + Tailwind)                                       (MTN / PawaPay / Mock)
```

---

## ✨ Features

### Phase 1 — WhatsApp automated bot (no dashboards)
Vendors manage everything by texting the bot. The parser is intentionally forgiving:

| Text the bot…                         | Result                                   |
| ------------------------------------- | ---------------------------------------- |
| `Add Product: Beans, K50`             | Adds a product (also `add Beans K50`)    |
| `add Beans, K50, Fresh red beans`     | Adds a product with a description        |
| `List` / `products`                   | Lists the vendor's products              |
| `Remove Beans` / `delete Beans`       | Removes a product                        |
| `Catalog` / `link`                    | Returns the shareable storefront link    |
| `Orders`                              | Shows recent orders and their status     |
| `Name: Mary Kamwala Stall`            | Renames the shop (updates the link slug) |
| `Help` / `hi` / `start`               | Shows the command guide                  |

A vendor is created automatically on first contact — there is no sign-up step.

### Phase 2 — The "two-tap" micro web view
When a customer opens the catalog link they get a stripped-down, mobile-first page:
large text, massive buttons, big product tiles, and **no cart / no login / no passwords**.

Flow: **tap a product → enter phone number → tap the giant green "Pay with Mobile Money"
button**. The bundle is tiny so it loads fast on weak MTN/Airtel edge networks.

### Vendor accounts — sign up / sign in, verified over WhatsApp
Vendors get a proper web dashboard secured by an account, with verification that
fits the WhatsApp-first theme:

- **Sign up** with shop name + WhatsApp number + password (`POST /api/auth/signup`).
  If a vendor already exists (auto-created when they first texted the bot), the
  password is attached to that *same* account — one identity across WhatsApp & web.
- **Verify** the phone with a 6-digit **OTP delivered over WhatsApp**. Enter it on
  the web page *or* just reply to the WhatsApp message with the code — the bot
  verifies you (`POST /api/auth/verify-otp`).
- **Sign in** with phone + password (`POST /api/auth/login`) → a JWT session.
- **Dashboard** (JWT-protected `/api/me/*`): add / hide / delete products, copy the
  shareable catalog link, and view recent orders.

Passwords are hashed with **bcrypt**; sessions are **JWTs**; OTP codes are hashed at
rest, expire (default 10 min) and are rate-limited.

### Phase 3 — Seamless MoMo integration
Hitting **Pay** creates an order and triggers an **STK / USSD PIN push** on the customer's
phone via the configured provider. When the customer enters their PIN, the gateway calls
our **webhook**, the order is settled, and the bot fires WhatsApp confirmations to **both**
the customer and the vendor: *"Payment Confirmed! Order #1024 is ready."*

The web page polls the order status and shows a success / failure screen automatically.

---

## 🧱 Tech stack

| Layer      | Tech                                                             |
| ---------- | --------------------------------------------------------------- |
| Backend    | Node.js, Express, TypeScript, better-sqlite3, Zod               |
| Frontend   | React, Vite, Tailwind CSS v4, React Router                      |
| Messaging  | WhatsApp Cloud API (Meta) — with a console/simulator fallback   |
| Payments   | MTN MoMo Collections · PawaPay · in-process Mock (default)      |
| Auth       | bcrypt password hashing · JWT sessions · WhatsApp OTP verify    |
| Tests      | Vitest + Supertest                                              |

Amounts are stored as integer **ngwee** (1 Kwacha = 100 ngwee) to avoid float errors.

---

## 📁 Repository layout

```
kwatchacart/
├─ server/                  # Express + TypeScript backend
│  └─ src/
│     ├─ app.ts             # Express app (wired routers)
│     ├─ index.ts           # server entrypoint
│     ├─ config.ts          # env-driven config
│     ├─ db/                # SQLite schema + connection
│     ├─ lib/               # money, phone, id, auth (bcrypt/JWT) helpers
│     ├─ middleware/        # requireAuth (Bearer JWT guard)
│     ├─ services/          # vendors / products / orders / auth / otp
│     ├─ whatsapp/          # client, parser, command handler (+ OTP reply)
│     ├─ payments/          # provider interface, mock/mtn/pawapay, settlement
│     └─ routes/            # /api, /api/auth, /api/me, /whatsapp, /webhooks
├─ web/                     # React + Vite + Tailwind customer + vendor UI
│  └─ src/
│     ├─ api.ts             # public storefront API client
│     ├─ auth.ts            # auth + dashboard API client (token session)
│     ├─ pages/             # Home, Storefront, Login, Signup, Dashboard
│     └─ components/        # CheckoutSheet, ProductImage, AuthShell
└─ package.json             # npm workspaces root
```

---

## 🚀 Getting started

Requires **Node.js ≥ 20**.

```bash
# 1. Install everything (root + both workspaces)
npm install

# 2. (optional) configure the backend — sensible dev defaults work out of the box
cp .env.example server/.env

# 3. Run backend + frontend together
npm run dev
# backend  -> http://localhost:4000
# web view -> http://localhost:5173
```

Run them individually with `npm run dev:server` / `npm run dev:web`.

### Try it without any credentials
Out of the box, WhatsApp runs in **console mode** (outbound messages are logged & stored)
and payments use the **mock provider** (auto-settles after a short delay). You can drive the
whole flow from the terminal:

```bash
# Vendor "texts" the bot to open a shop and add a product
curl -s -X POST localhost:4000/whatsapp/simulate \
  -H 'content-type: application/json' \
  -d '{"from":"260966123456","name":"Mary Kamwala Stall","text":"Add Product: Beans, K50"}'

# Now open the storefront in the browser:
#   http://localhost:5173/s/mary-kamwala-stall
# tap Beans, enter 0966123456, and pay — the mock provider confirms automatically.
```

> Mock behaviour: customer numbers ending in an **even** digit succeed; **odd** digits
> simulate a declined PIN, so you can exercise the failure path.

---

## ⚙️ Configuration

All configuration is via environment variables (see [`.env.example`](./.env.example)).
Key ones:

| Variable                 | Purpose                                                        |
| ------------------------ | -------------------------------------------------------------- |
| `PORT`                   | Backend port (default `4000`)                                  |
| `WEB_BASE_URL`           | Base URL used to build catalog links sent over WhatsApp        |
| `DATABASE_PATH`          | SQLite file path (use `:memory:` for ephemeral)                |
| `WHATSAPP_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` | Enable live WhatsApp Cloud API sending     |
| `WHATSAPP_VERIFY_TOKEN`  | Webhook verification token (match it in the Meta dashboard)    |
| `PAYMENT_PROVIDER`       | `mock` (default) · `mtn` · `pawapay`                           |
| `PAYMENT_WEBHOOK_SECRET` | Shared secret for authenticating inbound payment webhooks      |

### Going live
- **WhatsApp:** set `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_NUMBER_ID`, then point the Meta
  webhook at `POST /whatsapp/webhook` (verification handled by `GET /whatsapp/webhook`).
- **Payments:** set `PAYMENT_PROVIDER=mtn` (+ `MTN_MOMO_*`) or `pawapay` (+ `PAWAPAY_TOKEN`),
  and configure the gateway callback to `POST /webhooks/payments` with the shared secret.

---

## 🌐 HTTP API

| Method & path                 | Description                                               |
| ----------------------------- | --------------------------------------------------------- |
| `GET  /health`                | Service status + active WhatsApp/payment modes            |
| `POST /api/auth/signup`       | Register a vendor (`{shopName,phone,password}`) + send OTP |
| `POST /api/auth/login`        | Sign in (`{phone,password}`) → `{token,vendor}`           |
| `POST /api/auth/request-otp`  | (Re)send a WhatsApp verification code (`{phone}`)         |
| `POST /api/auth/verify-otp`   | Verify the code (`{phone,code}`) → marks account verified |
| `GET  /api/auth/me`           | Current vendor (Bearer token)                             |
| `GET  /api/me/products`       | 🔒 List the vendor's products                             |
| `POST /api/me/products`       | 🔒 Add a product (`{name,price,description?}`)            |
| `PATCH /api/me/products/:id`  | 🔒 Show/hide a product (`{available}`)                    |
| `DELETE /api/me/products/:id` | 🔒 Remove a product                                       |
| `GET  /api/me/orders`         | 🔒 Recent orders for the vendor                           |
| `GET  /api/shops/:slug`       | Public storefront: shop info + available products         |
| `GET  /api/products/:id`      | Single product                                            |
| `POST /api/checkout`          | Create order + trigger MoMo PIN push (`{productId,phone,quantity}`) |
| `GET  /api/orders/:id`        | Poll an order's status                                    |
| `GET/POST /whatsapp/webhook`  | WhatsApp Cloud API verification / inbound messages        |
| `POST /whatsapp/simulate`     | Dev-only: simulate an inbound vendor message              |
| `POST /webhooks/payments`     | Payment gateway settlement callback (secret-protected)    |

🔒 = requires `Authorization: Bearer <jwt>`.

---

## 🧪 Tests

```bash
npm test            # runs the server test suite (Vitest + Supertest)
```

Covers the money/phone/parser helpers plus an end-to-end flow: WhatsApp onboarding →
storefront → two-tap checkout → mock settlement → payment webhook (happy + failure paths).

---

## 📄 License

MIT
