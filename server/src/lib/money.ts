/**
 * Money helpers. Amounts are stored internally as integer *ngwee*
 * (1 Zambian Kwacha = 100 ngwee) so we never do arithmetic on floats.
 */

/** Parse a human price like "K50", "50", "K12.50", "ZMW 12,5" into ngwee. */
export function parsePriceToNgwee(input: string): number | null {
  if (!input) return null;
  const cleaned = input
    .toLowerCase()
    .replace(/zmw|kwacha|ngwee|k/g, '')
    .replace(/,/g, '.')
    .replace(/\s+/g, '')
    .trim();
  if (cleaned === '' || !/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const kwacha = Number.parseFloat(cleaned);
  if (Number.isNaN(kwacha) || kwacha < 0) return null;
  return Math.round(kwacha * 100);
}

/** Format ngwee as a display string, e.g. 5000 -> "K50.00". */
export function formatNgwee(ngwee: number): string {
  const kwacha = ngwee / 100;
  return `K${kwacha.toLocaleString('en-ZM', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Convert ngwee to a decimal Kwacha number (for provider APIs that want K). */
export function ngweeToKwacha(ngwee: number): number {
  return Math.round(ngwee) / 100;
}
