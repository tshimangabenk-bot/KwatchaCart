import { Router } from 'express';
import { config } from '../config.js';
import { getOrderById, getOrderByRef } from '../services/orders.js';
import { settleOrder } from '../payments/settlement.js';

export const paymentsWebhookRouter = Router();

/**
 * Payment gateway callback. Real MoMo aggregators (MTN, PawaPay, Tumeny)
 * POST here when a customer approves/declines the PIN prompt. We normalise the
 * few common payload shapes, then run the shared settlement path.
 *
 * Auth: shared secret via `x-webhook-secret` header or `?secret=` query param.
 */
paymentsWebhookRouter.post('/payments', async (req, res) => {
  const provided = req.header('x-webhook-secret') ?? req.query.secret;
  if (provided !== config.payments.webhookSecret) {
    res.status(401).json({ error: 'invalid webhook secret' });
    return;
  }

  const parsed = normalizePayload(req.body);
  if (!parsed) {
    res.status(400).json({ error: 'could not parse payment payload' });
    return;
  }

  const order = getOrderByRef(parsed.reference) ?? getOrderById(parsed.reference);
  if (!order) {
    res.status(404).json({ error: `no order for reference ${parsed.reference}` });
    return;
  }

  await settleOrder(order.id, parsed.status, parsed.reason);
  res.json({ ok: true, orderId: order.id, status: parsed.status });
});

interface NormalizedPayment {
  reference: string;
  status: 'paid' | 'failed';
  reason?: string;
}

function normalizePayload(body: unknown): NormalizedPayment | null {
  const b = (body ?? {}) as Record<string, unknown>;

  // reference can arrive under several field names across providers.
  const reference =
    (b.reference as string) ||
    (b.referenceId as string) ||
    (b.depositId as string) ||
    (b.externalId as string) ||
    (b.orderId as string);
  if (!reference) return null;

  const rawStatus = String(b.status ?? '').toUpperCase();
  const success = ['PAID', 'SUCCESS', 'SUCCESSFUL', 'COMPLETED', 'ACCEPTED'].includes(rawStatus);
  const failed = ['FAILED', 'REJECTED', 'CANCELLED', 'TIMEOUT', 'EXPIRED', 'DECLINED'].includes(
    rawStatus,
  );
  if (!success && !failed) return null;

  return {
    reference,
    status: success ? 'paid' : 'failed',
    reason: (b.reason as string) || (b.failureReason as string) || undefined,
  };
}
