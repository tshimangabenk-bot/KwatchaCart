import { hashPassword, signToken, verifyPassword } from '../lib/auth.js';
import { sendWhatsAppMessage } from '../whatsapp/client.js';
import { createOtp } from './otp.js';
import {
  getOrCreateVendor,
  getVendorByPhone,
  markVendorVerified,
  renameVendor,
  setVendorPassword,
} from './vendors.js';
import type { Vendor } from '../types.js';

export type SignupResult =
  | { ok: true; vendor: Vendor; token: string }
  | { ok: false; error: string };

export type LoginResult = { ok: true; vendor: Vendor; token: string } | { ok: false; error: string };

/**
 * Register a vendor for the web dashboard. If a vendor already exists for this
 * phone (e.g. auto-created when they first texted the bot), we attach a
 * password to that same account instead of creating a duplicate — so their
 * WhatsApp identity and web login are one and the same.
 */
export async function signup(input: {
  phone: string;
  password: string;
  shopName?: string;
}): Promise<SignupResult> {
  const existing = getVendorByPhone(input.phone);
  if (existing?.password_hash) {
    return { ok: false, error: 'An account with this phone number already exists. Please sign in.' };
  }

  const passwordHash = await hashPassword(input.password);
  let vendor = existing ?? getOrCreateVendor(input.phone, input.shopName);
  if (input.shopName && input.shopName.trim() && input.shopName.trim() !== vendor.name) {
    vendor = renameVendor(vendor.id, input.shopName) ?? vendor;
  }
  setVendorPassword(vendor.id, passwordHash);

  await sendVerificationCode(vendor);

  const fresh = getVendorByPhone(input.phone)!;
  return { ok: true, vendor: fresh, token: signToken({ sub: fresh.id, phone: fresh.phone }) };
}

export async function login(input: { phone: string; password: string }): Promise<LoginResult> {
  const vendor = getVendorByPhone(input.phone);
  if (!vendor || !vendor.password_hash) {
    return { ok: false, error: 'No account found for this phone number.' };
  }
  const valid = await verifyPassword(input.password, vendor.password_hash);
  if (!valid) return { ok: false, error: 'Incorrect phone number or password.' };
  return { ok: true, vendor, token: signToken({ sub: vendor.id, phone: vendor.phone }) };
}

/** Generate an OTP and deliver it to the vendor over WhatsApp. */
export async function sendVerificationCode(vendor: Vendor): Promise<void> {
  const code = await createOtp(vendor.phone);
  await sendWhatsAppMessage(
    vendor.phone,
    `🔐 Your KwatchaCart verification code is *${code}*.\nIt expires shortly. Do not share it with anyone.`,
  );
}

/** Mark a vendor verified after a correct OTP; returns a fresh token. */
export function completeVerification(vendor: Vendor): { vendor: Vendor; token: string } {
  markVendorVerified(vendor.id);
  const updated: Vendor = { ...vendor, verified: 1 };
  return { vendor: updated, token: signToken({ sub: updated.id, phone: updated.phone }) };
}
