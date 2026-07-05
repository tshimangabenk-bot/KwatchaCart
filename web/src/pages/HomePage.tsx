import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function HomePage() {
  const navigate = useNavigate();
  const [slug, setSlug] = useState('');

  return (
    <div className="min-h-full bg-gradient-to-b from-green-50 to-white">
      <div className="mx-auto max-w-md px-6 py-14">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-green-700">
            <span className="text-3xl">🛒</span>
            <span className="text-2xl font-black tracking-tight">KwatchaCart</span>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="rounded-xl px-3 py-2 text-lg font-bold text-green-700 active:bg-green-100"
          >
            Sign in
          </button>
        </div>

        <h1 className="mt-8 text-4xl font-black leading-tight text-gray-900">
          Sell on WhatsApp.
          <br />
          Get paid with <span className="text-green-600">Mobile Money.</span>
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          Market vendors manage stock by texting a bot. Customers tap a link, tap a product, and pay
          with an MTN or Airtel MoMo PIN prompt. No apps, no logins, no fuss.
        </p>

        <button
          onClick={() => navigate('/signup')}
          className="mt-6 w-full rounded-2xl bg-green-600 py-4 text-2xl font-black text-white shadow-lg shadow-green-600/30 transition active:scale-[0.99] active:bg-green-700"
        >
          Open your shop — free
        </button>

        <div className="mt-8 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-400">Visit a shop</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const clean = slug.trim().toLowerCase();
              if (clean) navigate(`/s/${encodeURIComponent(clean)}`);
            }}
            className="mt-3 flex gap-2"
          >
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="shop handle, e.g. mary-stall"
              className="flex-1 rounded-2xl border-2 border-gray-200 p-3 text-lg focus:border-green-500 focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-2xl bg-green-600 px-5 text-lg font-bold text-white active:bg-green-700"
            >
              Go
            </button>
          </form>
        </div>

        <div className="mt-10 space-y-4">
          <Step emoji="💬" title="Vendor texts the bot">
            <code className="rounded bg-gray-100 px-2 py-0.5 text-sm">Add Product: Beans, K50</code>
          </Step>
          <Step emoji="🔗" title="Share the shop link">
            Customers open a lightning-fast, one-page catalogue.
          </Step>
          <Step emoji="📲" title="Two-tap MoMo checkout">
            Pick a product, enter a phone number, approve the PIN prompt.
          </Step>
          <Step emoji="✅" title="Instant confirmation">
            Both buyer and seller get a WhatsApp receipt automatically.
          </Step>
        </div>
      </div>
    </div>
  );
}

function Step({ emoji, title, children }: { emoji: string; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 rounded-2xl bg-white/70 p-4">
      <span className="text-3xl">{emoji}</span>
      <div>
        <p className="text-lg font-bold text-gray-900">{title}</p>
        <p className="text-gray-600">{children}</p>
      </div>
    </div>
  );
}
