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
│     ├─ lib/               # money, phone, id helpers
│     ├─ services/          # vendors / products / orders data access
│     ├─ whatsapp/          # client, parser, command handler
│     ├─ payments/          # provider interface, mock/mtn/pawapay, settlement
│     └─ routes/            # /api, /whatsapp, /webhooks
├─ web/                     # React + Vite + Tailwind customer web view
│  └─ src/
│     ├─ api.ts             # typed API client
│     ├─ pages/             # HomePage, StorefrontPage
│     └─ components/        # CheckoutSheet, ProductImage
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
| `GET  /api/shops/:slug`       | Public storefront: shop info + available products         |
| `GET  /api/products/:id`      | Single product                                            |
| `POST /api/checkout`          | Create order + trigger MoMo PIN push (`{productId,phone,quantity}`) |
| `GET  /api/orders/:id`        | Poll an order's status                                    |
| `GET/POST /whatsapp/webhook`  | WhatsApp Cloud API verification / inbound messages        |
| `POST /whatsapp/simulate`     | Dev-only: simulate an inbound vendor message              |
| `POST /webhooks/payments`     | Payment gateway settlement callback (secret-protected)    |

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
