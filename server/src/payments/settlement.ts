import { formatNgwee } from '../lib/money.js';
import { getOrderById, orderNumber, updateOrderStatus } from '../services/orders.js';
import { getProductById } from '../services/products.js';
import { getVendorById } from '../services/vendors.js';
import type { OrderStatus } from '../types.js';
import { sendWhatsAppMessage } from '../whatsapp/client.js';

/**
 * Finalise an order after a payment result arrives (from a real gateway webhook
 * or the mock simulator). Updates the order and notifies both the customer and
 * the vendor over WhatsApp. Idempotent: settling an already-settled order is a
 * no-op so duplicate webhook deliveries are safe.
 */
export async function settleOrder(
  orderId: string,
  status: Extract<OrderStatus, 'paid' | 'failed'>,
  reason?: string,
): Promise<void> {
  const order = getOrderById(orderId);
  if (!order) {
    console.warn(`[settlement] unknown order ${orderId}`);
    return;
  }
  if (order.status !== 'pending') {
    // Already settled — ignore duplicate callbacks.
    return;
  }

  updateOrderStatus(order.id, status, reason);

  const product = getProductById(order.product_id);
  const vendor = getVendorById(order.vendor_id);
  const number = orderNumber(order.id);
  const amount = formatNgwee(order.amount_ngwee);
  const itemName = product?.name ?? 'your order';

  if (status === 'paid') {
    await sendWhatsAppMessage(
      order.customer_phone,
      `✅ *Payment confirmed!*\nOrder #${number}: ${order.quantity} x ${itemName} — ${amount}.\nThank you! ${vendor?.name ?? 'The vendor'} will prepare your order.`,
    );
    if (vendor) {
      await sendWhatsAppMessage(
        vendor.phone,
        `💰 *New paid order #${number}*\n${order.quantity} x ${itemName} — ${amount}\nCustomer: ${order.customer_phone}\nGet it ready! 📦`,
      );
    }
  } else {
    await sendWhatsAppMessage(
      order.customer_phone,
      `❌ Payment for order #${number} (${amount}) did not go through${reason ? `: ${reason}` : '.'}\nPlease try again.`,
    );
  }
}
