import { getDb } from '../db/index.js';
import { uuid } from '../lib/ids.js';
import type { Product } from '../types.js';

export interface NewProductInput {
  vendorId: string;
  name: string;
  priceNgwee: number;
  description?: string | null;
  photoUrl?: string | null;
}

export function createProduct(input: NewProductInput): Product {
  const product: Product = {
    id: uuid(),
    vendor_id: input.vendorId,
    name: input.name.trim(),
    price_ngwee: input.priceNgwee,
    description: input.description?.trim() || null,
    photo_url: input.photoUrl || null,
    available: 1,
    created_at: new Date().toISOString(),
  };
  getDb()
    .prepare(
      `INSERT INTO products (id, vendor_id, name, price_ngwee, description, photo_url, available, created_at)
       VALUES (@id, @vendor_id, @name, @price_ngwee, @description, @photo_url, @available, @created_at)`,
    )
    .run(product);
  return product;
}

export function listProducts(vendorId: string, onlyAvailable = false): Product[] {
  const db = getDb();
  const sql = onlyAvailable
    ? 'SELECT * FROM products WHERE vendor_id = ? AND available = 1 ORDER BY created_at ASC'
    : 'SELECT * FROM products WHERE vendor_id = ? ORDER BY created_at ASC';
  return db.prepare(sql).all(vendorId) as Product[];
}

export function getProductById(id: string): Product | undefined {
  return getDb().prepare('SELECT * FROM products WHERE id = ?').get(id) as Product | undefined;
}

/** Find a vendor's product by (case-insensitive) name — used by the WhatsApp bot. */
export function findProductByName(vendorId: string, name: string): Product | undefined {
  return getDb()
    .prepare('SELECT * FROM products WHERE vendor_id = ? AND lower(name) = lower(?) LIMIT 1')
    .get(vendorId, name.trim()) as Product | undefined;
}

export function setProductAvailability(id: string, available: boolean): void {
  getDb().prepare('UPDATE products SET available = ? WHERE id = ?').run(available ? 1 : 0, id);
}

/** Returns true if a product was removed. */
export function removeProduct(vendorId: string, name: string): boolean {
  const product = findProductByName(vendorId, name);
  if (!product) return false;
  getDb().prepare('DELETE FROM products WHERE id = ?').run(product.id);
  return true;
}
