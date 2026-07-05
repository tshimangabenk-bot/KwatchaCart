import { getDb } from '../db/index.js';
import { slugify, uuid } from '../lib/ids.js';
import type { Vendor } from '../types.js';

function uniqueSlug(base: string): string {
  const db = getDb();
  let slug = base;
  let n = 1;
  const check = db.prepare('SELECT 1 FROM vendors WHERE slug = ?');
  while (check.get(slug)) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

export function getVendorByPhone(phone: string): Vendor | undefined {
  return getDb().prepare('SELECT * FROM vendors WHERE phone = ?').get(phone) as Vendor | undefined;
}

export function getVendorBySlug(slug: string): Vendor | undefined {
  return getDb().prepare('SELECT * FROM vendors WHERE slug = ?').get(slug) as Vendor | undefined;
}

export function getVendorById(id: string): Vendor | undefined {
  return getDb().prepare('SELECT * FROM vendors WHERE id = ?').get(id) as Vendor | undefined;
}

/** Return the existing vendor for a phone, or create one on first contact. */
export function getOrCreateVendor(phone: string, name?: string): Vendor {
  const existing = getVendorByPhone(phone);
  if (existing) return existing;

  const displayName = (name && name.trim()) || `Shop ${phone.slice(-4)}`;
  const vendor: Vendor = {
    id: uuid(),
    name: displayName,
    phone,
    slug: uniqueSlug(slugify(displayName)),
    password_hash: null,
    verified: 0,
    created_at: new Date().toISOString(),
  };
  getDb()
    .prepare(
      'INSERT INTO vendors (id, name, phone, slug, password_hash, verified, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    )
    .run(
      vendor.id,
      vendor.name,
      vendor.phone,
      vendor.slug,
      vendor.password_hash,
      vendor.verified,
      vendor.created_at,
    );
  return vendor;
}

export function setVendorPassword(vendorId: string, passwordHash: string): void {
  getDb().prepare('UPDATE vendors SET password_hash = ? WHERE id = ?').run(passwordHash, vendorId);
}

export function markVendorVerified(vendorId: string): void {
  getDb().prepare('UPDATE vendors SET verified = 1 WHERE id = ?').run(vendorId);
}

export function renameVendor(vendorId: string, name: string): Vendor | undefined {
  const db = getDb();
  const trimmed = name.trim();
  if (!trimmed) return getVendorById(vendorId);
  const slug = uniqueSlug(slugify(trimmed));
  db.prepare('UPDATE vendors SET name = ?, slug = ? WHERE id = ?').run(trimmed, slug, vendorId);
  return getVendorById(vendorId);
}
