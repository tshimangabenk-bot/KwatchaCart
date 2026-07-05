import type { Order } from '../types.js';

export interface PaymentRequestInput {
  order: Order;
  /** Customer MSISDN in E.164 digits (e.g. 260971234567). */
  customerPhone: string;
  amountNgwee: number;
  /** Short human description shown in some MoMo prompts. */
  narration: string;
}

export interface PaymentRequestResult {
  /** Provider-side reference we store on the order to reconcile webhooks. */
  reference: string;
  /** Immediate status; almost always 'pending' for STK/USSD push flows. */
  status: 'pending' | 'paid' | 'failed';
  message?: string;
}

/**
 * A Mobile Money provider adapter. Implementations trigger an STK / USSD PIN
 * push on the customer's phone and later confirm the result via webhook.
 */
export interface PaymentProvider {
  readonly name: string;
  requestPayment(input: PaymentRequestInput): Promise<PaymentRequestResult>;
}
