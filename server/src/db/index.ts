import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS vendors (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL UNIQUE,
  slug        TEXT NOT NULL UNIQUE,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id          TEXT PRIMARY KEY,
  vendor_id   TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  price_ngwee INTEGER NOT NULL,
  description TEXT,
  photo_url   TEXT,
  available   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_products_vendor ON products(vendor_id);

CREATE TABLE IF NOT EXISTS orders (
  id             TEXT PRIMARY KEY,
  vendor_id      TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  product_id     TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  customer_phone TEXT NOT NULL,
  quantity       INTEGER NOT NULL DEFAULT 1,
  amount_ngwee   INTEGER NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending',
  provider       TEXT NOT NULL,
  provider_ref   TEXT,
  failure_reason TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_orders_vendor ON orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_orders_ref ON orders(provider_ref);

CREATE TABLE IF NOT EXISTS outbox (
  id         TEXT PRIMARY KEY,
  to_phone   TEXT NOT NULL,
  body       TEXT NOT NULL,
  delivered  INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

let instance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (instance) return instance;

  const dbPath = config.databasePath;
  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }

  instance = new Database(dbPath);
  instance.pragma('journal_mode = WAL');
  instance.pragma('foreign_keys = ON');
  instance.exec(SCHEMA);
  return instance;
}

/** Test helper: close and reset the singleton so a fresh DB can be opened. */
export function resetDbForTests(): void {
  if (instance) {
    instance.close();
    instance = null;
  }
}
