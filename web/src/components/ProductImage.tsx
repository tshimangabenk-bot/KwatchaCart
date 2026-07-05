import type { Product } from '../api';

const PALETTE = [
  'from-emerald-400 to-green-600',
  'from-amber-400 to-orange-600',
  'from-sky-400 to-blue-600',
  'from-rose-400 to-pink-600',
  'from-violet-400 to-purple-600',
  'from-teal-400 to-cyan-600',
];

function pickGradient(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

/**
 * Product visual: uses the vendor's photo if present, otherwise a bold
 * gradient tile with the product's initials — big, colourful and instantly
 * recognisable even for low-literacy shoppers.
 */
export function ProductImage({ product, className = '' }: { product: Product; className?: string }) {
  if (product.photoUrl) {
    return (
      <img
        src={product.photoUrl}
        alt={product.name}
        className={`h-full w-full object-cover ${className}`}
        loading="lazy"
      />
    );
  }

  const initials = product.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <div
      className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${pickGradient(
        product.name,
      )} ${className}`}
    >
      <span className="text-5xl font-black text-white/90 drop-shadow-sm">{initials}</span>
    </div>
  );
}
