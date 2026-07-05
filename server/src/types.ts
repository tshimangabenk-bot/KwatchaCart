export interface Vendor {
  id: string;
  name: string;
  /** WhatsApp phone number in E.164-ish digits, e.g. 260971234567 */
  phone: string;
  /** URL-friendly storefront handle, e.g. "mary-kamwala" */
  slug: string;
  created_at: string;
}

export interface Product {
  id: string;
  vendor_id: string;
  name: string;
  /** Price stored in ngwee (1 Kwacha = 100 ngwee) to avoid float errors. */
  price_ngwee: number;
  description: string | null;
  photo_url: string | null;
  available: number; // 0/1 boolean
  created_at: string;
}

export type OrderStatus = 'pending' | 'paid' | 'failed' | 'cancelled';

export interface Order {
  id: string;
  vendor_id: string;
  product_id: string;
  customer_phone: string;
  quantity: number;
  amount_ngwee: number;
  status: OrderStatus;
  provider: string;
  provider_ref: string | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
}

/** An outbound WhatsApp message we tried to send (stored for audit/console mode). */
export interface OutboxMessage {
  id: string;
  to_phone: string;
  body: string;
  delivered: number; // 0/1
  created_at: string;
}
