import { parsePriceToNgwee } from '../lib/money.js';

export type Command =
  | { kind: 'help' }
  | { kind: 'list' }
  | { kind: 'catalog' }
  | { kind: 'orders' }
  | { kind: 'setName'; name: string }
  | { kind: 'addProduct'; name: string; priceNgwee: number; description: string | null }
  | { kind: 'removeProduct'; name: string }
  | { kind: 'unknown'; text: string }
  | { kind: 'invalid'; reason: string };

/**
 * Parse a vendor's free-text WhatsApp message into a structured command.
 * The grammar is intentionally forgiving so low-tech-literacy users succeed:
 *   add product: Beans, K50
 *   add Beans K50 Fresh red beans
 *   remove product: Beans   /   delete Beans
 *   list  |  products  |  stock
 *   catalog  |  link  |  share
 *   orders  |  sales
 *   name: Mary's Kamwala Stall
 *   help  |  hi  |  hello  |  start
 */
export function parseCommand(raw: string): Command {
  const text = (raw ?? '').trim();
  if (text === '') return { kind: 'help' };

  const lower = text.toLowerCase();

  if (/^(help|hi|hello|hey|start|menu|\?)$/.test(lower)) return { kind: 'help' };
  if (/^(list|products?|stock|inventory)$/.test(lower)) return { kind: 'list' };
  if (/^(catalog|catalogue|link|share|store|shop)$/.test(lower)) return { kind: 'catalog' };
  if (/^(orders?|sales)$/.test(lower)) return { kind: 'orders' };

  // name: My Shop   /   shop name: My Shop   /   rename My Shop
  const nameMatch = text.match(/^(?:shop\s*name|name|rename)\s*[:\-]?\s*(.+)$/i);
  if (nameMatch && nameMatch[1].trim()) {
    return { kind: 'setName', name: nameMatch[1].trim() };
  }

  // remove/delete [product] <name>
  const removeMatch = text.match(/^(?:remove|delete|rm)\s*(?:product)?\s*[:\-]?\s*(.+)$/i);
  if (removeMatch && removeMatch[1].trim()) {
    return { kind: 'removeProduct', name: removeMatch[1].trim() };
  }

  // add [product] <details>
  const addMatch = text.match(/^(?:add|new)\s*(?:product|item)?\s*[:\-]?\s*(.+)$/i);
  if (addMatch) {
    return parseAddProduct(addMatch[1].trim());
  }

  return { kind: 'unknown', text };
}

function parseAddProduct(details: string): Command {
  if (!details) {
    return { kind: 'invalid', reason: 'Tell me the product. Example: Add Product: Beans, K50' };
  }

  // Preferred format: comma-separated "Name, Price[, Description]".
  if (details.includes(',')) {
    const parts = details.split(',').map((p) => p.trim());
    const name = parts[0];
    const priceNgwee = parsePriceToNgwee(parts[1] ?? '');
    if (name && priceNgwee !== null) {
      const description = parts.slice(2).join(', ').trim() || null;
      return { kind: 'addProduct', name, priceNgwee, description };
    }
    // Comma present but not a clean "Name, Price" — fall through to token scan.
  }

  // Fallback format: "Name words K50 optional description" — find the price token.
  const tokens = details.replace(/,/g, ' ').split(/\s+/).filter(Boolean);
  const priceIndex = tokens.findIndex((t) => parsePriceToNgwee(t) !== null && /\d/.test(t));
  if (priceIndex === -1) {
    return {
      kind: 'invalid',
      reason: 'I need a price. Example: Add Product: Beans, K50',
    };
  }
  const name = tokens.slice(0, priceIndex).join(' ').trim();
  const priceNgwee = parsePriceToNgwee(tokens[priceIndex])!;
  const description = tokens.slice(priceIndex + 1).join(' ').trim() || null;
  if (!name) return { kind: 'invalid', reason: 'Missing product name.' };
  return { kind: 'addProduct', name, priceNgwee, description };
}
