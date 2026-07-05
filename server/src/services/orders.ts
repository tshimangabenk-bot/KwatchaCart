import { getDb } from '../db/index.js';
import { uuid } from '../lib/ids.js';
import type { Order, OrderStatus } from '../types.js';

export interface NewOrderInput {
  vendorId: string;
  productId: string;
  customerPhone: string;
  quantity: number;
  amountNgwee: number;
  provider: string;
}

export function createOrder(input: NewOrderInput): Order {
  const now = new Date().toISOString();
  const order: Order = {
    id: uuid(),
    vendor_id: input.vendorId,
    product_id: input.productId,
    customer_phone: input.customerPhone,
    quantity: input.quantity,
    amount_ngwee: input.amountNgwee,
    status: 'pending',
    provider: input.provider,
    provider_ref: null,
    failure_reason: null,
    created_at: now,
    updated_at: now,
  };
  getDb()
    .prepare(
      `INSERT INTO orders
        (id, vendor_id, product_id, customer_phone, quantity, amount_ngwee, status, provider, provider_ref, failure_reason, created_at, updated_at)
       VALUES
        (@id, @vendor_id, @product_id, @customer_phone, @quantity, @amount_ngwee, @status, @provider, @provider_ref, @failure_reason, @created_at, @updated_at)`,
    )
    .run(order);
  return order;
}

export function getOrderById(id: string): Order | undefined {
  return getDb().prepare('SELECT * FROM orders WHERE id = ?').get(id) as Order | undefined;
}

export function getOrderByRef(providerRef: string): Order | undefined {
  return getDb().prepare('SELECT * FROM orders WHERE provider_ref = ?').get(providerRef) as
    | Order
    | undefined;
}

export function setOrderRef(id: string, providerRef: string): void {
  getDb()
    .prepare("UPDATE orders SET provider_ref = ?, updated_at = datetime('now') WHERE id = ?")
    .run(providerRef, id);
}

export function updateOrderStatus(id: string, status: OrderStatus, failureReason?: string): void {
  getDb()
    .prepare("UPDATE orders SET status = ?, failure_reason = ?, updated_at = datetime('now') WHERE id = ?")
    .run(status, failureReason ?? null, id);
}

export function listRecentOrders(vendorId: string, limit = 10): Order[] {
  return getDb()
    .prepare('SELECT * FROM orders WHERE vendor_id = ? ORDER BY created_at DESC LIMIT ?')
    .all(vendorId, limit) as Order[];
}

/**
 * Human-friendly order number derived from the SQLite rowid, so orders read as
 * "#1001", "#1002", ... rather than exposing UUIDs to customers.
 */
export function orderNumber(id: string): number {
  const row = getDb().prepare('SELECT rowid AS rid FROM orders WHERE id = ?').get(id) as
    | { rid: number }
    | undefined;
  return row ? 1000 + row.rid : 0;
}
