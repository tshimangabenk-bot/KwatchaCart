import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export interface TokenPayload {
  /** vendor id */
  sub: string;
  phone: string;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signToken(payload: TokenPayload): string {
  const options: jwt.SignOptions = {
    expiresIn: config.auth.tokenTtl as jwt.SignOptions['expiresIn'],
  };
  return jwt.sign(payload, config.auth.jwtSecret, options);
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, config.auth.jwtSecret);
    if (typeof decoded === 'string' || !decoded.sub) return null;
    return { sub: String(decoded.sub), phone: String((decoded as jwt.JwtPayload).phone ?? '') };
  } catch {
    return null;
  }
}

/** bcrypt is also handy for hashing short-lived OTP codes at rest. */
export async function hashCode(code: string): Promise<string> {
  return bcrypt.hash(code, 8);
}

export async function verifyCode(code: string, hash: string): Promise<boolean> {
  return bcrypt.compare(code, hash);
}
