import { useEffect, useRef, useState } from 'react';
import { checkout, fetchOrder, type Order, type Product } from '../api';
import { ProductImage } from './ProductImage';

type Stage = 'form' | 'waiting' | 'paid' | 'failed';

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 45; // ~90s

export function CheckoutSheet({
  product,
  shopName,
  onClose,
}: {
  product: Product;
  shopName: string;
  onClose: () => void;
}) {
  const [stage, setStage] = useState<Stage>('form');
  const [phone, setPhone] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalNgwee = product.priceNgwee * quantity;
  const total = `K${(totalNgwee / 100).toFixed(2)}`;

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  function startPolling(orderId: string) {
    let polls = 0;
    pollRef.current = setInterval(async () => {
      polls += 1;
      try {
        const { order: latest } = await fetchOrder(orderId);
        setOrder(latest);
        if (latest.status === 'paid') {
          stopPolling();
          setStage('paid');
        } else if (latest.status === 'failed' || latest.status === 'cancelled') {
          stopPolling();
          setStage('failed');
        }
      } catch {
        /* transient network error; keep polling */
      }
      if (polls >= MAX_POLLS) {
        stopPolling();
        setStage('failed');
        setError('Timed out waiting for payment. Please try again.');
      }
    }, POLL_INTERVAL_MS);
  }

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  async function handlePay() {
    setError(null);
    if (phone.replace(/\D/g, '').length < 9) {
      setError('Enter your Mobile Money number, e.g. 0971234567');
      return;
    }
    setSubmitting(true);
    try {
      const { order: created } = await checkout({ productId: product.id, phone, quantity });
      setOrder(created);
      setStage('waiting');
      startPolling(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-100 p-4">
        <button
          onClick={onClose}
          aria-label="Back"
          className="flex h-11 w-11 items-center justify-center rounded-full text-2xl text-gray-500 active:bg-gray-100"
        >
          ←
        </button>
        <span className="truncate text-lg font-semibold text-gray-800">{shopName}</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Big product hero */}
        <div className="aspect-square w-full overflow-hidden bg-gray-100">
          <ProductImage product={product} />
        </div>
        <div className="p-5">
          <h1 className="text-3xl font-black text-gray-900">{product.name}</h1>
          {product.description && <p className="mt-1 text-lg text-gray-500">{product.description}</p>}
          <p className="mt-3 text-4xl font-black text-green-600">{product.price}</p>

          {stage === 'form' && (
            <div className="mt-6 space-y-6">
              {/* Quantity stepper with large tap targets */}
              <div>
                <label className="mb-2 block text-lg font-semibold text-gray-700">How many?</label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    aria-label="Decrease quantity"
                    className="h-16 w-16 rounded-2xl bg-gray-100 text-4xl font-bold text-gray-700 active:bg-gray-200"
                  >
                    −
                  </button>
                  <span className="w-12 text-center text-4xl font-black">{quantity}</span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                    aria-label="Increase quantity"
                    className="h-16 w-16 rounded-2xl bg-gray-100 text-4xl font-bold text-gray-700 active:bg-gray-200"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Phone input */}
              <div>
                <label htmlFor="phone" className="mb-2 block text-lg font-semibold text-gray-700">
                  Your Mobile Money number
                </label>
                <input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="097 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-2xl border-2 border-gray-200 p-4 text-2xl tracking-wide focus:border-green-500 focus:outline-none"
                />
              </div>

              {error && <p className="text-lg font-medium text-red-600">{error}</p>}
            </div>
          )}

          {stage === 'waiting' && <WaitingView total={total} phone={order?.customerPhone ?? phone} />}
          {stage === 'paid' && order && <PaidView order={order} shopName={shopName} />}
          {stage === 'failed' && (
            <FailedView
              message={error ?? order?.failureReason ?? 'Payment was not completed.'}
              onRetry={() => {
                setStage('form');
                setError(null);
              }}
            />
          )}
        </div>
      </div>

      {/* Sticky pay bar */}
      {stage === 'form' && (
        <div className="pb-safe border-t border-gray-100 p-4">
          <button
            onClick={handlePay}
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-green-600 py-5 text-2xl font-black text-white shadow-lg shadow-green-600/30 transition active:scale-[0.99] active:bg-green-700 disabled:opacity-60"
          >
            {submitting ? 'Sending…' : `Pay ${total} with Mobile Money`}
          </button>
        </div>
      )}
    </div>
  );
}

function WaitingView({ total, phone }: { total: string; phone: string }) {
  return (
    <div className="mt-8 flex flex-col items-center text-center">
      <div className="h-16 w-16 animate-spin rounded-full border-4 border-gray-200 border-t-green-600" />
      <h2 className="mt-6 text-2xl font-bold text-gray-900">Check your phone 📲</h2>
      <p className="mt-2 max-w-xs text-lg text-gray-500">
        We sent a prompt to <span className="font-semibold">{phone}</span>. Enter your Mobile Money
        PIN to pay <span className="font-semibold">{total}</span>.
      </p>
    </div>
  );
}

function PaidView({ order, shopName }: { order: Order; shopName: string }) {
  return (
    <div className="mt-8 flex flex-col items-center text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-5xl">
        ✅
      </div>
      <h2 className="mt-6 text-3xl font-black text-gray-900">Payment confirmed!</h2>
      <p className="mt-2 text-lg text-gray-500">
        Order <span className="font-semibold">#{order.number}</span> — {order.amount}
      </p>
      <p className="mt-4 max-w-xs text-lg text-gray-500">
        {shopName} has been notified on WhatsApp and will prepare your order. 🎉
      </p>
    </div>
  );
}

function FailedView({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mt-8 flex flex-col items-center text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-5xl">
        ❌
      </div>
      <h2 className="mt-6 text-2xl font-bold text-gray-900">Payment not completed</h2>
      <p className="mt-2 max-w-xs text-lg text-gray-500">{message}</p>
      <button
        onClick={onRetry}
        className="mt-6 rounded-2xl bg-green-600 px-8 py-4 text-xl font-bold text-white active:bg-green-700"
      >
        Try again
      </button>
    </div>
  );
}
