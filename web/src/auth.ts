// Vendor auth + dashboard API client with a tiny localStorage-backed session.
const API_BASE = import.meta.env.VITE_API_BASE ?? '';
const TOKEN_KEY = 'kc_token';

export interface VendorAccount {
  id: string;
  name: string;
  phone: string;
  slug: string;
  verified: boolean;
  catalogUrl: string;
}

export interface DashboardProduct {
  id: string;
  name: string;
  price: string;
  priceNgwee: number;
  description: string | null;
  photoUrl: string | null;
  available: boolean;
}

export interface DashboardOrder {
  id: string;
  number: number;
  status: 'pending' | 'paid' | 'failed' | 'cancelled';
  quantity: number;
  amount: string;
  customerPhone: string;
  createdAt: string;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}
export function isLoggedIn(): boolean {
  return !!getToken();
}

async function json<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  return data as T;
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ---- Auth ----------------------------------------------------------------
export async function signup(input: {
  shopName: string;
  phone: string;
  password: string;
}): Promise<{ token: string; vendor: VendorAccount; message: string }> {
  return json(
    await fetch(`${API_BASE}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }),
  );
}

export async function login(input: {
  phone: string;
  password: string;
}): Promise<{ token: string; vendor: VendorAccount }> {
  return json(
    await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }),
  );
}

export async function requestOtp(phone: string): Promise<{ message: string }> {
  return json(
    await fetch(`${API_BASE}/api/auth/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    }),
  );
}

export async function verifyOtp(
  phone: string,
  code: string,
): Promise<{ token: string; vendor: VendorAccount }> {
  return json(
    await fetch(`${API_BASE}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, code }),
    }),
  );
}

export async function fetchMe(): Promise<{ vendor: VendorAccount }> {
  return json(await fetch(`${API_BASE}/api/auth/me`, { headers: authHeaders() }));
}

// ---- Dashboard -----------------------------------------------------------
export async function fetchMyProducts(): Promise<{ products: DashboardProduct[] }> {
  return json(await fetch(`${API_BASE}/api/me/products`, { headers: authHeaders() }));
}

export async function addMyProduct(input: {
  name: string;
  price: string;
  description?: string;
}): Promise<{ product: DashboardProduct }> {
  return json(
    await fetch(`${API_BASE}/api/me/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(input),
    }),
  );
}

export async function toggleMyProduct(
  id: string,
  available: boolean,
): Promise<{ product: DashboardProduct }> {
  return json(
    await fetch(`${API_BASE}/api/me/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ available }),
    }),
  );
}

export async function deleteMyProduct(id: string): Promise<{ ok: boolean }> {
  return json(
    await fetch(`${API_BASE}/api/me/products/${id}`, { method: 'DELETE', headers: authHeaders() }),
  );
}

export async function fetchMyOrders(): Promise<{ orders: DashboardOrder[] }> {
  return json(await fetch(`${API_BASE}/api/me/orders`, { headers: authHeaders() }));
}
