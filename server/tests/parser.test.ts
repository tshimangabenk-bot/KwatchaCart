import { describe, expect, it } from 'vitest';
import { parseCommand } from '../src/whatsapp/parser.js';

describe('parseCommand', () => {
  it('greets / helps on empty or greeting text', () => {
    expect(parseCommand('').kind).toBe('help');
    expect(parseCommand('hi').kind).toBe('help');
    expect(parseCommand('START').kind).toBe('help');
  });

  it('parses the canonical "Add Product: Name, Kxx" format', () => {
    const cmd = parseCommand('Add Product: Beans, K50');
    expect(cmd).toEqual({ kind: 'addProduct', name: 'Beans', priceNgwee: 5000, description: null });
  });

  it('parses an optional description', () => {
    const cmd = parseCommand('add Beans, 50, Fresh red beans');
    expect(cmd).toEqual({
      kind: 'addProduct',
      name: 'Beans',
      priceNgwee: 5000,
      description: 'Fresh red beans',
    });
  });

  it('parses the loose "add Name Kxx" format', () => {
    const cmd = parseCommand('add Cooking Oil K120');
    expect(cmd).toEqual({
      kind: 'addProduct',
      name: 'Cooking Oil',
      priceNgwee: 12000,
      description: null,
    });
  });

  it('flags an add with no price as invalid', () => {
    expect(parseCommand('add Beans').kind).toBe('invalid');
  });

  it('parses remove/delete', () => {
    expect(parseCommand('remove Beans')).toEqual({ kind: 'removeProduct', name: 'Beans' });
    expect(parseCommand('delete product: Rice')).toEqual({ kind: 'removeProduct', name: 'Rice' });
  });

  it('parses list / catalog / orders keywords', () => {
    expect(parseCommand('list').kind).toBe('list');
    expect(parseCommand('products').kind).toBe('list');
    expect(parseCommand('catalog').kind).toBe('catalog');
    expect(parseCommand('orders').kind).toBe('orders');
  });

  it('parses rename', () => {
    expect(parseCommand('name: Mary Kamwala Stall')).toEqual({
      kind: 'setName',
      name: 'Mary Kamwala Stall',
    });
  });
});
