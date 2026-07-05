import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { resetDbForTests } from '../src/db/index.js';
import { createOrder, getOrderById } from '../src/services/orders.js';
import { createProduct } from '../src/services/products.js';
import { getOrCreateVendor } from '../src/services/vendors.js';

const app = createApp();

async function tick(ms = 20): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

beforeEach(() => {
  resetDbForTests();
});

describe('WhatsApp vendor onboarding', () => {
  it('creates a vendor and product from a text command', async () => {
    const res = await request(app)
      .post('/whatsapp/simulate')
      .send({ from: '260966123456', text: 'Add Product: Beans, K50' });

    expect(res.status).toBe(200);
    expect(res.body.reply).toContain('Beans');
    expect(res.body.reply).toContain('K50.00');
  });
});

describe('storefront + two-tap checkout (happy path)', () => {
  it('lists products and settles a payment via the mock provider', async () => {
    // Vendor adds a product over WhatsApp.
    await request(app)
      .post('/whatsapp/simulate')
      .send({ from: '260966123456', text: 'add Beans, K50', name: 'Mary Stall' });

    // Storefront exposes the shop by slug.
    const shopRes = await request(app).get('/api/shops/mary-stall');
    expect(shopRes.status).toBe(200);
    expect(shopRes.body.products).toHaveLength(1);
    const product = shopRes.body.products[0];
    expect(product.price).toBe('K50.00');

    // Customer checks out (even-ending phone => mock success).
    const checkoutRes = await request(app)
      .post('/api/checkout')
      .send({ productId: product.id, phone: '0966123456', quantity: 2 });
    expect(checkoutRes.status).toBe(201);
    expect(checkoutRes.body.order.amount).toBe('K100.00');
    const orderId = checkoutRes.body.order.id;

    // Mock provider auto-settles on the next tick (delay = 0s in tests).
    await tick();
    const statusRes = await request(app).get(`/api/orders/${orderId}`);
    expect(statusRes.body.order.status).toBe('paid');
  });

  it('marks the order failed for a declined PIN (odd-ending phone)', async () => {
    await request(app)
      .post('/whatsapp/simulate')
      .send({ from: '260966123456', text: 'add Rice, K30', name: 'Odd Shop' });
    const shopRes = await request(app).get('/api/shops/odd-shop');
    const product = shopRes.body.products[0];

    const checkoutRes = await request(app)
      .post('/api/checkout')
      .send({ productId: product.id, phone: '0977123457' });
    const orderId = checkoutRes.body.order.id;

    await tick();
    const statusRes = await request(app).get(`/api/orders/${orderId}`);
    expect(statusRes.body.order.status).toBe('failed');
  });

  it('rejects an invalid phone number', async () => {
    await request(app)
      .post('/whatsapp/simulate')
      .send({ from: '260966123456', text: 'add Salt, K5', name: 'Salt Shop' });
    const shopRes = await request(app).get('/api/shops/salt-shop');
    const product = shopRes.body.products[0];

    const res = await request(app)
      .post('/api/checkout')
      .send({ productId: product.id, phone: '123' });
    expect(res.status).toBe(400);
  });
});

describe('payment webhook', () => {
  it('settles a pending order and rejects a bad secret', async () => {
    const vendor = getOrCreateVendor('260966123456', 'Hook Shop');
    const product = createProduct({ vendorId: vendor.id, name: 'Sugar', priceNgwee: 4000 });
    const order = createOrder({
      vendorId: vendor.id,
      productId: product.id,
      customerPhone: '260966123456',
      quantity: 1,
      amountNgwee: 4000,
      provider: 'mtn',
    });

    // Wrong secret is rejected.
    const bad = await request(app)
      .post('/webhooks/payments')
      .set('x-webhook-secret', 'nope')
      .send({ reference: order.id, status: 'SUCCESSFUL' });
    expect(bad.status).toBe(401);

    // Correct secret settles the order.
    const ok = await request(app)
      .post('/webhooks/payments')
      .set('x-webhook-secret', 'test-secret')
      .send({ reference: order.id, status: 'SUCCESSFUL' });
    expect(ok.status).toBe(200);

    expect(getOrderById(order.id)?.status).toBe('paid');
  });
});
