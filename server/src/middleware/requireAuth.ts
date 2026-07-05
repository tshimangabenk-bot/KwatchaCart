import type { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../lib/auth.js';
import { getVendorById } from '../services/vendors.js';
import type { Vendor } from '../types.js';

// Augment Express' Request so downstream handlers can read req.vendor.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      vendor?: Vendor;
    }
  }
}

/** Require a valid Bearer JWT; attaches the resolved vendor to req.vendor. */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.header('authorization') ?? '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  const payload = verifyToken(match[1]);
  if (!payload) {
    res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
    return;
  }

  const vendor = getVendorById(payload.sub);
  if (!vendor) {
    res.status(401).json({ error: 'Account no longer exists.' });
    return;
  }

  req.vendor = vendor;
  next();
}
