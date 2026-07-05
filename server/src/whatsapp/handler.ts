import { config } from '../config.js';
import { formatNgwee } from '../lib/money.js';
import { createProduct, listProducts, removeProduct } from '../services/products.js';
import { listRecentOrders, orderNumber } from '../services/orders.js';
import { getOrCreateVendor, renameVendor } from '../services/vendors.js';
import type { Vendor } from '../types.js';
import { parseCommand } from './parser.js';

function catalogLink(vendor: Vendor): string {
  return `${config.webBaseUrl}/s/${vendor.slug}`;
}

function helpText(vendor: Vendor): string {
  return [
    `👋 Welcome to *KwatchaCart*, ${vendor.name}!`,
    '',
    'Manage your shop by texting me:',
    '• *Add Product: Beans, K50* — add an item',
    '• *List* — see your products',
    '• *Remove Beans* — delete an item',
    '• *Catalog* — get your shareable shop link',
    '• *Orders* — see recent sales',
    '• *Name: Mary Kamwala Stall* — rename your shop',
    '',
    `Your shop link: ${catalogLink(vendor)}`,
  ].join('\n');
}

/**
 * Handle one inbound vendor message. Pure-ish: it mutates the DB via services
 * and returns the reply text (the caller decides how to deliver it).
 */
export function handleVendorMessage(fromPhone: string, text: string, profileName?: string): string {
  const vendor = getOrCreateVendor(fromPhone, profileName);
  const command = parseCommand(text);

  switch (command.kind) {
    case 'help':
      return helpText(vendor);

    case 'setName': {
      const updated = renameVendor(vendor.id, command.name) ?? vendor;
      return `✅ Shop renamed to *${updated.name}*.\nYour new link: ${catalogLink(updated)}`;
    }

    case 'addProduct': {
      const product = createProduct({
        vendorId: vendor.id,
        name: command.name,
        priceNgwee: command.priceNgwee,
        description: command.description,
      });
      return [
        `✅ Added *${product.name}* — ${formatNgwee(product.price_ngwee)}.`,
        product.description ? `_${product.description}_` : null,
        '',
        `Share your shop: ${catalogLink(vendor)}`,
      ]
        .filter(Boolean)
        .join('\n');
    }

    case 'removeProduct': {
      const removed = removeProduct(vendor.id, command.name);
      return removed
        ? `🗑️ Removed *${command.name}* from your shop.`
        : `I couldn't find "*${command.name}*". Text *List* to see your products.`;
    }

    case 'list': {
      const products = listProducts(vendor.id);
      if (products.length === 0) {
        return 'Your shop is empty. Add one with:\n*Add Product: Beans, K50*';
      }
      const lines = products.map(
        (p, i) => `${i + 1}. *${p.name}* — ${formatNgwee(p.price_ngwee)}${p.available ? '' : ' (hidden)'}`,
      );
      return [`🛒 *${vendor.name}* — your products:`, ...lines, '', `Link: ${catalogLink(vendor)}`].join('\n');
    }

    case 'catalog':
      return `🔗 Share this link with customers:\n${catalogLink(vendor)}`;

    case 'orders': {
      const orders = listRecentOrders(vendor.id, 5);
      if (orders.length === 0) return 'No orders yet. Share your catalog link to start selling!';
      const lines = orders.map((o) => {
        const badge = o.status === 'paid' ? '✅' : o.status === 'pending' ? '⏳' : '❌';
        return `${badge} Order #${orderNumber(o.id)} — ${formatNgwee(o.amount_ngwee)} (${o.status})`;
      });
      return [`📒 Recent orders for *${vendor.name}*:`, ...lines].join('\n');
    }

    case 'invalid':
      return `⚠️ ${command.reason}`;

    case 'unknown':
    default:
      return [
        `I didn't understand "${text}".`,
        '',
        helpText(vendor),
      ].join('\n');
  }
}
