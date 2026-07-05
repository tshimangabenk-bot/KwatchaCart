# 🚀 Deploying KwatchaCart

KwatchaCart ships as a **single service**: the Node/Express backend also serves
the built React web app, so you deploy **one container / one process**. This
guide covers going live and wiring up WhatsApp + Mobile Money.

---

## 0. What you need before going live

| Requirement | Why | Where to get it |
| --- | --- | --- |
| A host | Run the container | Render, Railway, Fly.io, a VPS, etc. |
| Public HTTPS URL | WhatsApp & MoMo webhooks require HTTPS | Provided by the host |
| WhatsApp Cloud API access | Send/receive WhatsApp messages | [Meta for Developers](https://developers.facebook.com/) → WhatsApp |
| A MoMo provider | Charge customers | [MTN MoMo](https://momodeveloper.mtn.com) or [PawaPay](https://docs.pawapay.io) |
| Strong secrets | Sessions & webhook auth | Generate random strings |

Until you have WhatsApp/MoMo credentials, the app still runs end-to-end using
**console mode** (messages logged) and the **mock** payment provider — great for
a public demo.

---

## 1. Configure environment

Copy `.env.example` and set real values. The must-set variables for production:

```bash
NODE_ENV=production
PORT=4000
SERVE_WEB=true

# Public origin of your deployed app (the SPA is served here too):
PUBLIC_BASE_URL=https://your-app.example.com
WEB_BASE_URL=https://your-app.example.com

# Persistent SQLite location (mount a volume/disk here):
DATABASE_PATH=/data/kwatchacart.sqlite

# Secrets — generate long random values:
AUTH_JWT_SECRET=<32+ random chars>
PAYMENT_WEBHOOK_SECRET=<random>

# Payments: start with mock, switch to mtn/pawapay when ready:
PAYMENT_PROVIDER=mock
```

> **Important:** `PUBLIC_BASE_URL` / `WEB_BASE_URL` should be the **same public
> URL** in a single-service deploy — that's what the shareable catalog links use.

---

## 2. Deploy

### Option A — Docker (works anywhere)

```bash
# Build the image
docker build -t kwatchacart .

# Run it (persist the DB in a named volume, pass your env file)
docker run -d --name kwatchacart -p 4000:4000 \
  --env-file .env \
  -v kwatchacart-data:/data \
  kwatchacart
```

Or with Compose:

```bash
docker compose up --build -d
# open http://localhost:4000
```

### Option B — Render (blueprint included) ⭐ recommended

The repo ships a [`render.yaml`](./render.yaml) blueprint. It auto-generates the
secrets (`AUTH_JWT_SECRET`, `PAYMENT_WEBHOOK_SECRET`) and derives the public URL
from Render's injected `RENDER_EXTERNAL_URL`, so the app comes up running in
**console + mock mode with no manual env setup**.

**Step by step:**

1. **Get the code on a branch Render can see.** Merge PR #1 into `main` (the
   one-click button uses the default branch), *or* keep the feature branch and
   select it in step 3.
2. Go to the [Render dashboard](https://dashboard.render.com) → **New → Blueprint**
   (or click the **Deploy to Render** button in the README).
3. Connect this GitHub repo. Render detects `render.yaml`. Pick the branch, then
   **Apply**.
4. Render builds the Docker image, mounts a 1 GB disk at `/data` for the SQLite
   database, and starts the service with a `/health` check. First build takes a
   few minutes.
5. Open the assigned URL (e.g. `https://kwatchacart.onrender.com`). You should
   see the KwatchaCart landing page. `GET /health` returns `{"status":"ok",...}`.

That's a fully working demo. To go live for real, continue to §3 (WhatsApp) and
§4 (Mobile Money) below and add those env vars in the Render dashboard.

> **Plan note:** persistent disks require a paid instance type (the blueprint
> uses `starter`). On the **free** plan, remove the `disk:` block and set
> `plan: free` — the SQLite DB will then reset on each redeploy (fine for a
> throwaway demo, not for real data).
>
> **Custom domain:** add `PUBLIC_BASE_URL` and `WEB_BASE_URL` env vars set to
> your domain; otherwise the Render URL is used automatically.

### Option B2 — Render via API (scripted, no dashboard clicking)

If you'd rather deploy from a terminal (or have an agent do it), use the included
script — it creates the service through Render's API:

```bash
export RENDER_API_KEY=rnd_xxx   # Render → Account Settings → API Keys
./scripts/deploy-render.sh      # needs curl + jq
```

It creates a Dockerized web service from `main` with a `/health` check, a 1 GB
disk at `/data`, auto-generated secrets, and mock/console defaults, then prints
the service URL. (To have the Cursor Cloud Agent run this for you, add
`RENDER_API_KEY` in the Cursor Dashboard → Cloud Agents → Secrets, then start a
new agent run — secrets are injected into new runs only.)

### Option C — Railway / Fly.io / VPS

Any Docker host works. Point it at the `Dockerfile`, expose port `4000`, set the
env vars above, and attach a persistent volume at `/data`. On a bare VPS you can
also run it without Docker:

```bash
npm ci
npm run build
NODE_ENV=production SERVE_WEB=true node server/dist/index.js
# put Nginx/Caddy in front for HTTPS
```

Health check endpoint for load balancers: `GET /health`.

---

## 3. Connect WhatsApp (Cloud API)

1. Create a Meta app with the **WhatsApp** product and get a **permanent access
   token** and your **Phone Number ID**.
2. Set on the host:
   ```
   WHATSAPP_TOKEN=<permanent token>
   WHATSAPP_PHONE_NUMBER_ID=<phone number id>
   WHATSAPP_VERIFY_TOKEN=<any string you choose>
   ```
3. In the Meta dashboard → WhatsApp → Configuration → **Webhook**:
   - Callback URL: `https://your-app.example.com/whatsapp/webhook`
   - Verify token: the same `WHATSAPP_VERIFY_TOKEN`
   - Subscribe to the **messages** field.
4. Meta calls `GET /whatsapp/webhook` to verify (handled automatically), then
   delivers inbound messages to `POST /whatsapp/webhook`.

Now vendors manage their shop by texting your WhatsApp number, and OTP codes /
order confirmations are sent for real.

---

## 4. Connect Mobile Money

### MTN MoMo (Collections)
```
PAYMENT_PROVIDER=mtn
MTN_MOMO_BASE_URL=https://sandbox.momodeveloper.mtn.com   # or production URL
MTN_MOMO_SUBSCRIPTION_KEY=...
MTN_MOMO_API_USER=...
MTN_MOMO_API_KEY=...
MTN_MOMO_TARGET_ENVIRONMENT=sandbox
```

### PawaPay (multi-operator aggregator)
```
PAYMENT_PROVIDER=pawapay
PAWAPAY_BASE_URL=https://api.sandbox.pawapay.io           # or production URL
PAWAPAY_TOKEN=...
```

Then configure the provider's **callback / webhook** to:

```
POST https://your-app.example.com/webhooks/payments?secret=<PAYMENT_WEBHOOK_SECRET>
```

(or send the secret as the `x-webhook-secret` header). On a successful PIN entry
the provider calls this endpoint, the order is settled, and both customer and
vendor receive a WhatsApp confirmation.

---

## 5. Verify the live deployment

```bash
# 1. Health
curl https://your-app.example.com/health

# 2. Open the web app and create a shop
open https://your-app.example.com          # → "Open your shop"

# 3. Add a product (or text the bot), then visit the storefront
open https://your-app.example.com/s/<your-shop-slug>
```

Do a real end-to-end purchase with a small amount to confirm the STK push and
webhook settlement work in production.

---

## Production checklist

- [ ] `PUBLIC_BASE_URL` / `WEB_BASE_URL` set to the real HTTPS URL
- [ ] Strong `AUTH_JWT_SECRET` and `PAYMENT_WEBHOOK_SECRET`
- [ ] Persistent volume mounted at `DATABASE_PATH` (don't lose your data)
- [ ] WhatsApp webhook verified and subscribed to `messages`
- [ ] MoMo provider configured and its callback pointed at `/webhooks/payments`
- [ ] Tested one real order end-to-end
