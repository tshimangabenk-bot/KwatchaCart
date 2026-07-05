import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Load .env from the server package root regardless of the current CWD.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
// Also load a repo-root .env as a fallback (handy in monorepo dev).
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

function str(name: string, fallback: string): string {
  const value = process.env[name];
  return value === undefined || value === '' ? fallback : value;
}

function int(name: string, fallback: number): number {
  const value = process.env[name];
  if (value === undefined || value === '') return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export type PaymentProviderName = 'mock' | 'mtn' | 'pawapay';

export const config = {
  port: int('PORT', 4000),
  publicBaseUrl: str('PUBLIC_BASE_URL', 'http://localhost:4000'),
  // In dev the SPA runs on :5173. In a single-service deploy the backend serves
  // the SPA itself, so set WEB_BASE_URL to the public origin (see DEPLOY.md).
  webBaseUrl: str('WEB_BASE_URL', 'http://localhost:5173'),
  databasePath: str('DATABASE_PATH', path.resolve(__dirname, '..', 'data', 'kwatchacart.sqlite')),

  // Serve the built web app from Express. 'auto' = serve when web/dist exists.
  serveWeb: str('SERVE_WEB', 'auto'),
  webDistPath: str('WEB_DIST_PATH', path.resolve(__dirname, '..', '..', 'web', 'dist')),

  // Rate limiting (disabled in tests to keep them fast/deterministic).
  rateLimitEnabled: str('RATE_LIMIT_ENABLED', 'true') !== 'false',

  whatsapp: {
    token: str('WHATSAPP_TOKEN', ''),
    phoneNumberId: str('WHATSAPP_PHONE_NUMBER_ID', ''),
    verifyToken: str('WHATSAPP_VERIFY_TOKEN', 'kwatchacart-verify'),
    apiVersion: str('WHATSAPP_API_VERSION', 'v21.0'),
  },

  auth: {
    jwtSecret: str('AUTH_JWT_SECRET', 'dev-insecure-jwt-secret-change-me'),
    // Session lifetime for issued JWTs, e.g. "7d", "12h".
    tokenTtl: str('AUTH_TOKEN_TTL', '7d'),
    otpTtlMinutes: int('AUTH_OTP_TTL_MINUTES', 10),
  },

  payments: {
    provider: str('PAYMENT_PROVIDER', 'mock') as PaymentProviderName,
    webhookSecret: str('PAYMENT_WEBHOOK_SECRET', 'change-me-payment-secret'),
    mockDelaySeconds: int('MOCK_PAYMENT_DELAY_SECONDS', 5),
    mtn: {
      baseUrl: str('MTN_MOMO_BASE_URL', 'https://sandbox.momodeveloper.mtn.com'),
      subscriptionKey: str('MTN_MOMO_SUBSCRIPTION_KEY', ''),
      apiUser: str('MTN_MOMO_API_USER', ''),
      apiKey: str('MTN_MOMO_API_KEY', ''),
      targetEnvironment: str('MTN_MOMO_TARGET_ENVIRONMENT', 'sandbox'),
    },
    pawapay: {
      baseUrl: str('PAWAPAY_BASE_URL', 'https://api.sandbox.pawapay.io'),
      token: str('PAWAPAY_TOKEN', ''),
    },
  },
} as const;

/** True when a real WhatsApp Cloud API token is configured. */
export const whatsappLive = config.whatsapp.token !== '' && config.whatsapp.phoneNumberId !== '';
