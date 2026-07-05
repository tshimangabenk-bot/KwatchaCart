// In dev, requests go through the Vite proxy (relative URLs). In production,
// set VITE_API_BASE to the backend origin at build time.
const API_BASE = import.meta.env.VITE_API_BASE ?? '';

export interface Product {
  id: string;
  name: string;
  price: string;
  priceNgwee: number;
  description: string | null;
  photoUrl: string | null;
  available: boolean;
}

export interface Shop {
  id: string;
  name: string;
  slug: string;
}

export interface Order {
  id: string;
  number: number;
  status: 'pending' | 'paid' | 'failed' | 'cancelled';
  quantity: number;
  amount: string;
  amountNgwee: number;
  customerPhone: string;
  failureReason: string | null;
}

async function json<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  }
  return data as T;
}

export async function fetchShop(slug: string): Promise<{ shop: Shop; products: Product[] }> {
  return json(await fetch(`${API_BASE}/api/shops/${encodeURIComponent(slug)}`));
}

export async function checkout(input: {
  productId: string;
  phone: string;
  quantity: number;
}): Promise<{ order: Order; payment: { status: string; message: string } }> {
  const res = await fetch(`${API_BASE}/api/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return json(res);
}

export async function fetchOrder(id: string): Promise<{ order: Order }> {
  return json(await fetch(`${API_BASE}/api/orders/${encodeURIComponent(id)}`));
}
