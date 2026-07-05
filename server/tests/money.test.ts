import { describe, expect, it } from 'vitest';
import { formatNgwee, ngweeToKwacha, parsePriceToNgwee } from '../src/lib/money.js';

describe('parsePriceToNgwee', () => {
  it('parses plain numbers', () => {
    expect(parsePriceToNgwee('50')).toBe(5000);
    expect(parsePriceToNgwee('12.50')).toBe(1250);
  });

  it('parses Kwacha-prefixed values', () => {
    expect(parsePriceToNgwee('K50')).toBe(5000);
    expect(parsePriceToNgwee('ZMW 12.99')).toBe(1299);
    expect(parsePriceToNgwee('k7')).toBe(700);
  });

  it('treats comma as a decimal separator', () => {
    expect(parsePriceToNgwee('12,5')).toBe(1250);
  });

  it('rejects garbage', () => {
    expect(parsePriceToNgwee('abc')).toBeNull();
    expect(parsePriceToNgwee('')).toBeNull();
    expect(parsePriceToNgwee('12.999')).toBeNull();
  });
});

describe('formatNgwee', () => {
  it('formats with two decimals and a K prefix', () => {
    expect(formatNgwee(5000)).toBe('K50.00');
    expect(formatNgwee(1299)).toBe('K12.99');
  });
});

describe('ngweeToKwacha', () => {
  it('converts back to a decimal Kwacha number', () => {
    expect(ngweeToKwacha(5000)).toBe(50);
    expect(ngweeToKwacha(1299)).toBe(12.99);
  });
});
