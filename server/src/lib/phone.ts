/**
 * Normalise Zambian phone numbers to E.164 digits (country code 260, no +).
 * Accepts inputs like "0971234567", "+260971234567", "260 97 123 4567".
 */
export function normalizeZambianPhone(input: string): string | null {
  if (!input) return null;
  let digits = input.replace(/[^\d]/g, '');
  if (digits === '') return null;

  // Local format starting with 0 (e.g. 0971234567) -> replace leading 0 with 260.
  if (digits.startsWith('0')) {
    digits = `260${digits.slice(1)}`;
  }
  // Bare 9-digit subscriber number (e.g. 971234567) -> prefix 260.
  if (digits.length === 9 && digits.startsWith('9')) {
    digits = `260${digits}`;
  }
  // Must now be a 12-digit Zambian number: 260 + 9 digits.
  if (!/^260\d{9}$/.test(digits)) return null;
  return digits;
}

/** Best-effort detection of the mobile-money operator from the prefix. */
export function detectOperator(phone: string): 'mtn' | 'airtel' | 'zamtel' | 'unknown' {
  const local = phone.replace(/^260/, '');
  // 96/76 = MTN, 97/77 = Airtel, 95/75 = Zamtel (common Zambian allocations).
  if (/^(96|76)/.test(local)) return 'mtn';
  if (/^(97|77)/.test(local)) return 'airtel';
  if (/^(95|75)/.test(local)) return 'zamtel';
  return 'unknown';
}
