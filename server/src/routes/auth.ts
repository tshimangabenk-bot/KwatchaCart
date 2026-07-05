import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config.js';
import { normalizeZambianPhone } from '../lib/phone.js';
import { completeVerification, login, sendVerificationCode, signup } from '../services/auth.js';
import { checkOtp } from '../services/otp.js';
import { getVendorByPhone } from '../services/vendors.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { authLimiter } from '../middleware/rateLimit.js';
import type { Vendor } from '../types.js';

export const authRouter = Router();

// Throttle all auth endpoints (signup/login/OTP) against abuse.
authRouter.use(authLimiter);

export function serializeVendorAccount(v: Vendor) {
  return {
    id: v.id,
    name: v.name,
    phone: v.phone,
    slug: v.slug,
    verified: v.verified === 1,
    catalogUrl: `${config.webBaseUrl}/s/${v.slug}`,
  };
}

const signupSchema = z.object({
  shopName: z.string().trim().min(1).max(80).optional(),
  phone: z.string().min(1),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
});

authRouter.post('/signup', async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid request.' });
    return;
  }
  const phone = normalizeZambianPhone(parsed.data.phone);
  if (!phone) {
    res.status(400).json({ error: 'Enter a valid Zambian WhatsApp number, e.g. 0971234567.' });
    return;
  }

  const result = await signup({ phone, password: parsed.data.password, shopName: parsed.data.shopName });
  if (!result.ok) {
    res.status(409).json({ error: result.error });
    return;
  }
  res.status(201).json({
    token: result.token,
    vendor: serializeVendorAccount(result.vendor),
    message: 'Account created. We sent a verification code to your WhatsApp.',
  });
});

const loginSchema = z.object({ phone: z.string().min(1), password: z.string().min(1) });

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Phone and password are required.' });
    return;
  }
  const phone = normalizeZambianPhone(parsed.data.phone);
  if (!phone) {
    res.status(400).json({ error: 'Enter a valid Zambian phone number.' });
    return;
  }
  const result = await login({ phone, password: parsed.data.password });
  if (!result.ok) {
    res.status(401).json({ error: result.error });
    return;
  }
  res.json({ token: result.token, vendor: serializeVendorAccount(result.vendor) });
});

const phoneSchema = z.object({ phone: z.string().min(1) });

/** (Re)send a WhatsApp OTP for a phone that has an account. */
authRouter.post('/request-otp', async (req, res) => {
  const parsed = phoneSchema.safeParse(req.body);
  const phone = parsed.success ? normalizeZambianPhone(parsed.data.phone) : null;
  if (!phone) {
    res.status(400).json({ error: 'Enter a valid Zambian phone number.' });
    return;
  }
  const vendor = getVendorByPhone(phone);
  // Always respond 200 to avoid leaking which numbers are registered.
  if (vendor) await sendVerificationCode(vendor);
  res.json({ message: 'If that number has an account, a code has been sent on WhatsApp.' });
});

const verifySchema = z.object({ phone: z.string().min(1), code: z.string().min(4).max(8) });

authRouter.post('/verify-otp', async (req, res) => {
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Phone and code are required.' });
    return;
  }
  const phone = normalizeZambianPhone(parsed.data.phone);
  if (!phone) {
    res.status(400).json({ error: 'Enter a valid Zambian phone number.' });
    return;
  }
  const vendor = getVendorByPhone(phone);
  if (!vendor) {
    res.status(404).json({ error: 'No account found for this number.' });
    return;
  }

  const result = await checkOtp(phone, parsed.data.code.trim());
  if (result !== 'ok') {
    const messages: Record<typeof result, string> = {
      invalid: 'That code is incorrect.',
      expired: 'That code has expired. Request a new one.',
      too_many_attempts: 'Too many attempts. Request a new code.',
      not_found: 'No pending code. Request a new one.',
    };
    res.status(400).json({ error: messages[result] });
    return;
  }

  const { vendor: verified, token } = completeVerification(vendor);
  res.json({ token, vendor: serializeVendorAccount(verified), message: 'Number verified!' });
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ vendor: serializeVendorAccount(req.vendor!) });
});
