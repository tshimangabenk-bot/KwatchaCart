import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchShop, type Product, type Shop } from '../api';
import { CheckoutSheet } from '../components/CheckoutSheet';
import { ProductImage } from '../components/ProductImage';

export function StorefrontPage() {
  const { slug } = useParams<{ slug: string }>();
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Product | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchShop(slug ?? '')
      .then((data) => {
        if (!active) return;
        setShop(data.shop);
        setProducts(data.products);
      })
      .catch((err) => active && setError(err instanceof Error ? err.message : 'Failed to load shop'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <Centered>
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-green-600" />
      </Centered>
    );
  }

  if (error || !shop) {
    return (
      <Centered>
        <p className="text-6xl">🏪</p>
        <h1 className="mt-4 text-2xl font-bold text-gray-800">Shop not found</h1>
        <p className="mt-2 text-gray-500">{error ?? 'This storefront link may be incorrect.'}</p>
      </Centered>
    );
  }

  return (
    <div className="mx-auto min-h-full max-w-md bg-white">
      <header className="bg-gradient-to-br from-green-600 to-emerald-700 px-5 pb-8 pt-10 text-white">
        <p className="text-sm font-semibold uppercase tracking-wider text-green-100">KwatchaCart shop</p>
        <h1 className="mt-1 text-4xl font-black leading-tight">{shop.name}</h1>
        <p className="mt-2 text-lg text-green-50">Tap an item, then pay with Mobile Money. That's it.</p>
      </header>

      {products.length === 0 ? (
        <div className="p-10 text-center text-gray-500">
          <p className="text-5xl">📦</p>
          <p className="mt-4 text-lg">This shop has no products yet.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 p-3">
          {products.map((product) => (
            <li key={product.id}>
              <button
                onClick={() => setSelected(product)}
                className="flex w-full flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white text-left shadow-sm transition active:scale-[0.98]"
              >
                <div className="aspect-square w-full overflow-hidden bg-gray-100">
                  <ProductImage product={product} />
                </div>
                <div className="p-3">
                  <p className="truncate text-lg font-bold text-gray-900">{product.name}</p>
                  <p className="mt-1 text-2xl font-black text-green-600">{product.price}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <footer className="p-6 text-center text-sm text-gray-400">
        Powered by <span className="font-semibold text-green-600">KwatchaCart</span> · MoMo made simple
      </footer>

      {selected && (
        <CheckoutSheet product={selected} shopName={shop.name} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center p-8 text-center">{children}</div>
  );
}
