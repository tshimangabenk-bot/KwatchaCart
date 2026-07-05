import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  addMyProduct,
  clearToken,
  deleteMyProduct,
  fetchMe,
  fetchMyOrders,
  fetchMyProducts,
  isLoggedIn,
  requestOtp,
  toggleMyProduct,
  type DashboardOrder,
  type DashboardProduct,
  type VendorAccount,
} from '../auth';

export function DashboardPage() {
  const navigate = useNavigate();
  const [vendor, setVendor] = useState<VendorAccount | null>(null);
  const [products, setProducts] = useState<DashboardProduct[]>([]);
  const [orders, setOrders] = useState<DashboardOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate('/login');
      return;
    }
    Promise.all([fetchMe(), fetchMyProducts(), fetchMyOrders()])
      .then(([me, prods, ords]) => {
        setVendor(me.vendor);
        setProducts(prods.products);
        setOrders(ords.orders);
      })
      .catch(() => {
        clearToken();
        navigate('/login');
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  async function refreshProducts() {
    const { products: p } = await fetchMyProducts();
    setProducts(p);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAdding(true);
    try {
      await addMyProduct({ name, price, description: description || undefined });
      setName('');
      setPrice('');
      setDescription('');
      await refreshProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add product.');
    } finally {
      setAdding(false);
    }
  }

  async function handleToggle(p: DashboardProduct) {
    await toggleMyProduct(p.id, !p.available);
    await refreshProducts();
  }

  async function handleDelete(p: DashboardProduct) {
    if (!confirm(`Remove ${p.name}?`)) return;
    await deleteMyProduct(p.id);
    await refreshProducts();
  }

  function logout() {
    clearToken();
    navigate('/login');
  }

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-green-600" />
      </div>
    );
  }
  if (!vendor) return null;

  return (
    <div className="min-h-full bg-gray-50">
      <header className="bg-gradient-to-br from-green-600 to-emerald-700 px-5 pb-6 pt-10 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-green-100">Dashboard</p>
            <h1 className="mt-1 text-3xl font-black">{vendor.name}</h1>
          </div>
          <button onClick={logout} className="rounded-xl bg-white/20 px-3 py-2 text-sm font-semibold">
            Log out
          </button>
        </div>
        <CatalogLink url={vendor.catalogUrl} />
      </header>

      <main className="mx-auto max-w-md space-y-6 p-4">
        {!vendor.verified && <VerifyBanner phone={vendor.phone} />}

        {/* Add product */}
        <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-gray-900">Add a product</h2>
          <form onSubmit={handleAdd} className="mt-4 space-y-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Product name (e.g. Beans)"
              className="w-full rounded-2xl border-2 border-gray-200 p-3 text-lg focus:border-green-500 focus:outline-none"
            />
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Price (e.g. K50)"
              inputMode="decimal"
              className="w-full rounded-2xl border-2 border-gray-200 p-3 text-lg focus:border-green-500 focus:outline-none"
            />
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description (optional)"
              className="w-full rounded-2xl border-2 border-gray-200 p-3 text-lg focus:border-green-500 focus:outline-none"
            />
            {error && <p className="font-medium text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={adding}
              className="w-full rounded-2xl bg-green-600 py-3 text-xl font-bold text-white active:bg-green-700 disabled:opacity-60"
            >
              {adding ? 'Adding…' : 'Add product'}
            </button>
          </form>
        </section>

        {/* Products */}
        <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-gray-900">Your products ({products.length})</h2>
          {products.length === 0 ? (
            <p className="mt-3 text-gray-500">No products yet. Add your first one above.</p>
          ) : (
            <ul className="mt-3 divide-y divide-gray-100">
              {products.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-3">
                  <div className="min-w-0">
                    <p className={`truncate text-lg font-bold ${p.available ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
                      {p.name}
                    </p>
                    <p className="text-green-600">{p.price}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => handleToggle(p)}
                      className="rounded-xl bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700"
                    >
                      {p.available ? 'Hide' : 'Show'}
                    </button>
                    <button
                      onClick={() => handleDelete(p)}
                      className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Orders */}
        <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-gray-900">Recent orders</h2>
          {orders.length === 0 ? (
            <p className="mt-3 text-gray-500">No orders yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-gray-100">
              {orders.map((o) => (
                <li key={o.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-bold text-gray-900">#{o.number}</p>
                    <p className="text-sm text-gray-500">{o.customerPhone}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{o.amount}</p>
                    <StatusPill status={o.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

function CatalogLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(url).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="mt-4 flex w-full items-center justify-between gap-2 rounded-2xl bg-white/15 p-3 text-left"
    >
      <span className="truncate text-sm text-green-50">{url}</span>
      <span className="shrink-0 rounded-lg bg-white/25 px-3 py-1 text-sm font-bold">
        {copied ? 'Copied!' : 'Copy link'}
      </span>
    </button>
  );
}

function VerifyBanner({ phone }: { phone: string }) {
  const [sent, setSent] = useState(false);
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <p className="font-bold text-amber-900">Verify your WhatsApp number</p>
      <p className="mt-1 text-sm text-amber-800">
        Confirm {phone} to secure your shop. Reply to the WhatsApp code, or resend it below.
      </p>
      <button
        onClick={() =>
          requestOtp(phone)
            .then(() => setSent(true))
            .catch(() => setSent(true))
        }
        className="mt-3 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-white"
      >
        {sent ? 'Code sent on WhatsApp' : 'Send verification code'}
      </button>
    </div>
  );
}

function StatusPill({ status }: { status: DashboardOrder['status'] }) {
  const map: Record<DashboardOrder['status'], string> = {
    paid: 'bg-green-100 text-green-700',
    pending: 'bg-amber-100 text-amber-700',
    failed: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${map[status]}`}>
      {status}
    </span>
  );
}
