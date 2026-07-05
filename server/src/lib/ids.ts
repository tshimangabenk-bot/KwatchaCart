import { randomUUID } from 'node:crypto';

export function uuid(): string {
  return randomUUID();
}

/** Short, URL/reference-safe id (lowercase base36), e.g. for payment refs. */
export function shortId(length = 10): string {
  let out = '';
  while (out.length < length) {
    out += Math.random().toString(36).slice(2);
  }
  return out.slice(0, length);
}

/** Turn a display name into a URL-friendly slug. */
export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'shop';
}
