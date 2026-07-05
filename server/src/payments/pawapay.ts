import { randomUUID } from 'node:crypto';
import { config } from '../config.js';
import { ngweeToKwacha } from '../lib/money.js';
import { detectOperator } from '../lib/phone.js';
import type { PaymentProvider, PaymentRequestInput, PaymentRequestResult } from './provider.js';

/**
 * PawaPay aggregator adapter (deposits / "collect" flow). PawaPay fronts MTN,
 * Airtel and Zamtel behind one API, which is ideal for the fragmented Zambian
 * MoMo landscape. Settlement arrives on our payment webhook.
 *
 * Set PAYMENT_PROVIDER=pawapay and PAWAPAY_TOKEN to enable.
 */
export class PawaPayProvider implements PaymentProvider {
  readonly name = 'pawapay';

  async requestPayment(input: PaymentRequestInput): Promise<PaymentRequestResult> {
    const { baseUrl, token } = config.payments.pawapay;
    const depositId = randomUUID();
    const correspondent = this.correspondentFor(input.customerPhone);

    const res = await fetch(`${baseUrl}/deposits`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        depositId,
        amount: String(ngweeToKwacha(input.amountNgwee)),
        currency: 'ZMW',
        correspondent,
        payer: { type: 'MSISDN', address: { value: input.customerPhone } },
        customerTimestamp: new Date().toISOString(),
        statementDescription: input.narration.slice(0, 22),
      }),
    });

    if (!res.ok) {
      throw new Error(`PawaPay deposit failed (${res.status}): ${await res.text()}`);
    }

    return {
      reference: depositId,
      status: 'pending',
      message: 'Collection request sent via PawaPay. Awaiting customer PIN.',
    };
  }

  private correspondentFor(phone: string): string {
    switch (detectOperator(phone)) {
      case 'mtn':
        return 'MTN_MOMO_ZMB';
      case 'airtel':
        return 'AIRTEL_OAPI_ZMB';
      case 'zamtel':
        return 'ZAMTEL_ZMB';
      default:
        return 'MTN_MOMO_ZMB';
    }
  }
}
