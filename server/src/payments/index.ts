import { config } from '../config.js';
import { formatNgwee } from '../lib/money.js';
import { setOrderRef } from '../services/orders.js';
import type { Order } from '../types.js';
import { MockPaymentProvider } from './mock.js';
import { MtnMomoProvider } from './mtn.js';
import { PawaPayProvider } from './pawapay.js';
import type { PaymentProvider, PaymentRequestResult } from './provider.js';

let cached: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  if (cached) return cached;
  switch (config.payments.provider) {
    case 'mtn':
      cached = new MtnMomoProvider();
      break;
    case 'pawapay':
      cached = new PawaPayProvider();
      break;
    case 'mock':
    default:
      cached = new MockPaymentProvider();
      break;
  }
  return cached;
}

/**
 * Kick off a Mobile Money charge for an order: triggers the STK/USSD PIN push
 * and records the provider reference on the order for later reconciliation.
 */
export async function initiatePayment(order: Order, productName: string): Promise<PaymentRequestResult> {
  const provider = getPaymentProvider();
  const result = await provider.requestPayment({
    order,
    customerPhone: order.customer_phone,
    amountNgwee: order.amount_ngwee,
    narration: `${productName} (${formatNgwee(order.amount_ngwee)})`,
  });
  setOrderRef(order.id, result.reference);
  return result;
}
