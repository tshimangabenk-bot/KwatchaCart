import { getDb } from '../db/index.js';
import { config } from '../config.js';
import { hashCode, verifyCode } from '../lib/auth.js';

const MAX_ATTEMPTS = 5;

function generateCode(): string {
  // 6-digit numeric code, zero-padded.
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** Create (or replace) an OTP for a phone number and return the plaintext code. */
export async function createOtp(phone: string): Promise<string> {
  const code = generateCode();
  const codeHash = await hashCode(code);
  const expiresAt = new Date(Date.now() + config.auth.otpTtlMinutes * 60_000).toISOString();
  getDb()
    .prepare(
      `INSERT INTO otps (phone, code_hash, expires_at, attempts, created_at)
       VALUES (?, ?, ?, 0, datetime('now'))
       ON CONFLICT(phone) DO UPDATE SET code_hash = excluded.code_hash,
                                        expires_at = excluded.expires_at,
                                        attempts = 0,
                                        created_at = datetime('now')`,
    )
    .run(phone, codeHash, expiresAt);
  return code;
}

export type OtpResult = 'ok' | 'invalid' | 'expired' | 'too_many_attempts' | 'not_found';

/** Verify a submitted code; consumes the OTP on success. */
export async function checkOtp(phone: string, code: string): Promise<OtpResult> {
  const db = getDb();
  const row = db.prepare('SELECT * FROM otps WHERE phone = ?').get(phone) as
    | { phone: string; code_hash: string; expires_at: string; attempts: number }
    | undefined;
  if (!row) return 'not_found';

  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare('DELETE FROM otps WHERE phone = ?').run(phone);
    return 'expired';
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    db.prepare('DELETE FROM otps WHERE phone = ?').run(phone);
    return 'too_many_attempts';
  }

  const match = await verifyCode(code, row.code_hash);
  if (!match) {
    db.prepare('UPDATE otps SET attempts = attempts + 1 WHERE phone = ?').run(phone);
    return 'invalid';
  }

  db.prepare('DELETE FROM otps WHERE phone = ?').run(phone);
  return 'ok';
}

/** Is there a live (unexpired) OTP outstanding for this phone? */
export function hasPendingOtp(phone: string): boolean {
  const row = getDb().prepare('SELECT expires_at FROM otps WHERE phone = ?').get(phone) as
    | { expires_at: string }
    | undefined;
  return !!row && new Date(row.expires_at).getTime() >= Date.now();
}
