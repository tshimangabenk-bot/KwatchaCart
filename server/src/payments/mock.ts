import { config } from '../config.js';
import { shortId } from '../lib/ids.js';
import type { PaymentProvider, PaymentRequestInput, PaymentRequestResult } from './provider.js';
import { settleOrder } from './settlement.js';

/**
 * In-process Mobile Money simulator. Perfect for demos and tests: it "sends"
 * an STK push, then after a short delay fires the same settlement path a real
 * gateway webhook would trigger. Numbers ending in an odd digit simulate a
 * declined/timed-out PIN so you can exercise the failure branch too.
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock';

  async requestPayment(input: PaymentRequestInput): Promise<PaymentRequestResult> {
    const reference = `MOCK-${shortId(12).toUpperCase()}`;
    const willSucceed = !/[13579]$/.test(input.customerPhone);
    const delayMs = Math.max(0, config.payments.mockDelaySeconds) * 1000;

    setTimeout(() => {
      if (willSucceed) {
        void settleOrder(input.order.id, 'paid');
      } else {
        void settleOrder(input.order.id, 'failed', 'Customer did not approve the PIN prompt');
      }
    }, delayMs);

    return {
      reference,
      status: 'pending',
      message: `STK push sent (simulated). Auto-settling in ~${config.payments.mockDelaySeconds}s.`,
    };
  }
}
