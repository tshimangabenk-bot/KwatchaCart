import { describe, expect, it } from 'vitest';
import { detectOperator, normalizeZambianPhone } from '../src/lib/phone.js';

describe('normalizeZambianPhone', () => {
  it('normalises local 0-prefixed numbers', () => {
    expect(normalizeZambianPhone('0971234567')).toBe('260971234567');
  });

  it('normalises +260 and spaced numbers', () => {
    expect(normalizeZambianPhone('+260 97 123 4567')).toBe('260971234567');
    expect(normalizeZambianPhone('260971234567')).toBe('260971234567');
  });

  it('normalises bare 9-digit subscriber numbers', () => {
    expect(normalizeZambianPhone('971234567')).toBe('260971234567');
  });

  it('rejects invalid numbers', () => {
    expect(normalizeZambianPhone('12345')).toBeNull();
    expect(normalizeZambianPhone('')).toBeNull();
  });
});

describe('detectOperator', () => {
  it('detects MTN, Airtel and Zamtel prefixes', () => {
    expect(detectOperator('260961234567')).toBe('mtn');
    expect(detectOperator('260971234567')).toBe('airtel');
    expect(detectOperator('260951234567')).toBe('zamtel');
    expect(detectOperator('260991234567')).toBe('unknown');
  });
});
