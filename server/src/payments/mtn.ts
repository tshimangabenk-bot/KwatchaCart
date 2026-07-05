import { randomUUID } from 'node:crypto';
import { config } from '../config.js';
import { ngweeToKwacha } from '../lib/money.js';
import type { PaymentProvider, PaymentRequestInput, PaymentRequestResult } from './provider.js';

/**
 * MTN MoMo Collections adapter (RequestToPay). Works against the MTN sandbox
 * at https://momodeveloper.mtn.com. Settlement is delivered to our payment
 * webhook; the X-Reference-Id we generate here is stored as the order ref.
 *
 * Set PAYMENT_PROVIDER=mtn and the MTN_MOMO_* env vars to enable.
 */
export class MtnMomoProvider implements PaymentProvider {
  readonly name = 'mtn';

  private async getAccessToken(): Promise<string> {
    const { baseUrl, subscriptionKey, apiUser, apiKey } = config.payments.mtn;
    const basic = Buffer.from(`${apiUser}:${apiKey}`).toString('base64');
    const res = await fetch(`${baseUrl}/collection/token/`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Ocp-Apim-Subscription-Key': subscriptionKey,
      },
    });
    if (!res.ok) {
      throw new Error(`MTN token request failed (${res.status}): ${await res.text()}`);
    }
    const data = (await res.json()) as { access_token: string };
    return data.access_token;
  }

  async requestPayment(input: PaymentRequestInput): Promise<PaymentRequestResult> {
    const { baseUrl, subscriptionKey, targetEnvironment } = config.payments.mtn;
    const referenceId = randomUUID();
    const token = await this.getAccessToken();

    // Tell MTN where to POST the result so our webhook settles the order.
    const callbackUrl = `${config.publicBaseUrl}/webhooks/payments?secret=${encodeURIComponent(
      config.payments.webhookSecret,
    )}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'X-Reference-Id': referenceId,
      'X-Target-Environment': targetEnvironment,
      'Ocp-Apim-Subscription-Key': subscriptionKey,
      'Content-Type': 'application/json',
    };
    // MTN only accepts a callback over HTTPS; skip it for local/dev http URLs
    // (fall back to polling / manual reconciliation in that case).
    if (config.publicBaseUrl.startsWith('https://')) {
      headers['X-Callback-Url'] = callbackUrl;
    }

    const res = await fetch(`${baseUrl}/collection/v1_0/requesttopay`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        amount: String(ngweeToKwacha(input.amountNgwee)),
        currency: targetEnvironment === 'sandbox' ? 'EUR' : 'ZMW',
        externalId: input.order.id,
        payer: { partyIdType: 'MSISDN', partyId: input.customerPhone },
        payerMessage: input.narration,
        payeeNote: input.narration,
      }),
    });

    if (res.status !== 202) {
      throw new Error(`MTN requesttopay failed (${res.status}): ${await res.text()}`);
    }

    return {
      reference: referenceId,
      status: 'pending',
      message: 'STK push sent via MTN MoMo. Awaiting customer PIN.',
    };
  }
}
