#!/usr/bin/env bash
#
# Automated Render deploy for KwatchaCart via the Render REST API.
#
# Prerequisites:
#   - A Render API key: Render dashboard -> Account Settings -> API Keys
#   - Export it before running:  export RENDER_API_KEY=rnd_xxx
#
# Usage:
#   ./scripts/deploy-render.sh
#
# What it does:
#   1. Looks up your Render owner id.
#   2. Creates a Dockerized web service from this GitHub repo (branch: main),
#      with a /health check, a 1 GB persistent disk at /data, auto-generated
#      secrets, and mock/console defaults so it comes up working immediately.
#   3. Prints the service URL. Render then builds & deploys automatically.
#
# Re-running: if a service named "kwatchacart" already exists this will error;
# either delete it in the dashboard or change SERVICE_NAME below.

set -euo pipefail

API="https://api.render.com/v1"
REPO="${RENDER_REPO:-https://github.com/tshimangabenk-bot/KwatchaCart}"
BRANCH="${RENDER_BRANCH:-main}"
SERVICE_NAME="${SERVICE_NAME:-kwatchacart}"
REGION="${RENDER_REGION:-oregon}"
# 'free' has no persistent disk (SQLite resets on redeploy). Paid plans
# (e.g. 'starter') support the /data disk but require billing on the account.
PLAN="${RENDER_PLAN:-free}"

if [[ -z "${RENDER_API_KEY:-}" ]]; then
  echo "ERROR: RENDER_API_KEY is not set. Export it and retry." >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "ERROR: this script needs 'jq'. Install it (e.g. apt-get install jq)." >&2
  exit 1
fi

auth=(-H "Authorization: Bearer ${RENDER_API_KEY}" -H "Content-Type: application/json" -H "Accept: application/json")

echo "==> Looking up Render owner..."
OWNER_ID="$(curl -fsS "${auth[@]}" "${API}/owners?limit=1" | jq -r '.[0].owner.id')"
if [[ -z "${OWNER_ID}" || "${OWNER_ID}" == "null" ]]; then
  echo "ERROR: could not resolve an owner id for this API key." >&2
  exit 1
fi
echo "    owner: ${OWNER_ID}"

echo "==> Creating web service '${SERVICE_NAME}' from ${REPO}@${BRANCH} (plan: ${PLAN})..."
# Only paid plans get a persistent disk; 'free' cannot mount one.
if [[ "$PLAN" == "free" ]]; then DISK='null'; else
  DISK='{ "name": "kwatchacart-data", "mountPath": "/data", "sizeGB": 1 }'
fi
PAYLOAD="$(jq -n \
  --arg name "$SERVICE_NAME" \
  --arg owner "$OWNER_ID" \
  --arg repo "$REPO" \
  --arg branch "$BRANCH" \
  --arg region "$REGION" \
  --arg plan "$PLAN" \
  --argjson disk "$DISK" \
  '{
     type: "web_service",
     name: $name,
     ownerId: $owner,
     repo: $repo,
     branch: $branch,
     autoDeploy: "yes",
     serviceDetails: ({
       runtime: "docker",
       region: $region,
       plan: $plan,
       healthCheckPath: "/health",
       envSpecificDetails: { dockerfilePath: "./Dockerfile" }
     } + (if $disk == null then {} else { disk: $disk } end)),
     envVars: [
       { key: "SERVE_WEB", value: "true" },
       { key: "DATABASE_PATH", value: "/data/kwatchacart.sqlite" },
       { key: "PAYMENT_PROVIDER", value: "mock" },
       { key: "WHATSAPP_VERIFY_TOKEN", value: "kwatchacart-verify" },
       { key: "AUTH_JWT_SECRET", generateValue: true },
       { key: "PAYMENT_WEBHOOK_SECRET", generateValue: true }
     ]
   }')"

RESPONSE="$(curl -fsS -X POST "${auth[@]}" "${API}/services" -d "${PAYLOAD}")"
SERVICE_ID="$(echo "$RESPONSE" | jq -r '.service.id // .id // empty')"
SERVICE_URL="$(echo "$RESPONSE" | jq -r '.service.serviceDetails.url // .serviceDetails.url // empty')"

if [[ -z "$SERVICE_ID" ]]; then
  echo "ERROR: service creation failed. Raw response:" >&2
  echo "$RESPONSE" >&2
  exit 1
fi

echo ""
echo "✅ Service created: ${SERVICE_ID}"
[[ -n "$SERVICE_URL" ]] && echo "   URL: ${SERVICE_URL}"
echo "   Render is now building & deploying. Track it at https://dashboard.render.com"
echo ""
echo "Next (to go fully live), add these in the Render dashboard -> Environment:"
echo "   WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID  (+ set Meta webhook to <url>/whatsapp/webhook)"
echo "   PAYMENT_PROVIDER=mtn|pawapay + provider keys (+ callback to <url>/webhooks/payments)"
