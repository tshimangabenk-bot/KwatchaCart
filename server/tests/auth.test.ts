import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { getDb, resetDbForTests } from '../src/db/index.js';

const app = createApp();

/** Pull the latest OTP code we "sent" to a phone out of the console outbox. */
function latestOtpCode(phone: string): string | null {
  const row = getDb()
    .prepare('SELECT body FROM outbox WHERE to_phone = ? ORDER BY created_at DESC, rowid DESC LIMIT 1')
    .get(phone) as { body: string } | undefined;
  const match = row?.body.match(/\b(\d{6})\b/);
  return match ? match[1] : null;
}

beforeEach(() => {
  resetDbForTests();
});

describe('vendor signup', () => {
  it('creates an account, sends an OTP, and issues a token', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ shopName: 'Mary Kamwala Stall', phone: '0966123456', password: 'secret123' });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.vendor.slug).toBe('mary-kamwala-stall');
    expect(res.body.vendor.verified).toBe(false);
    expect(latestOtpCode('260966123456')).toMatch(/^\d{6}$/);
  });

  it('rejects a duplicate signup and a weak password', async () => {
    await request(app)
      .post('/api/auth/signup')
      .send({ shopName: 'Dup', phone: '0966123456', password: 'secret123' });

    const dup = await request(app)
      .post('/api/auth/signup')
      .send({ shopName: 'Dup2', phone: '0966123456', password: 'secret123' });
    expect(dup.status).toBe(409);

    const weak = await request(app)
      .post('/api/auth/signup')
      .send({ shopName: 'X', phone: '0977000000', password: '123' });
    expect(weak.status).toBe(400);
  });
});

describe('OTP verification', () => {
  it('verifies the account with the emailed WhatsApp code', async () => {
    await request(app)
      .post('/api/auth/signup')
      .send({ shopName: 'Verify Shop', phone: '0966123456', password: 'secret123' });
    const code = latestOtpCode('260966123456')!;

    const bad = await request(app)
      .post('/api/auth/verify-otp')
      .send({ phone: '0966123456', code: '000000' });
    expect(bad.status).toBe(400);

    const ok = await request(app)
      .post('/api/auth/verify-otp')
      .send({ phone: '0966123456', code });
    expect(ok.status).toBe(200);
    expect(ok.body.vendor.verified).toBe(true);
  });

  it('verifies via a WhatsApp reply to the bot', async () => {
    await request(app)
      .post('/api/auth/signup')
      .send({ shopName: 'Bot Verify', phone: '0966123456', password: 'secret123' });
    const code = latestOtpCode('260966123456')!;

    const reply = await request(app)
      .post('/whatsapp/simulate')
      .send({ from: '260966123456', text: code });
    expect(reply.body.reply).toContain('verified');
  });
});

describe('login + protected dashboard', () => {
  it('logs in and manages products with the token', async () => {
    await request(app)
      .post('/api/auth/signup')
      .send({ shopName: 'Login Shop', phone: '0966123456', password: 'secret123' });

    const wrong = await request(app)
      .post('/api/auth/login')
      .send({ phone: '0966123456', password: 'nope' });
    expect(wrong.status).toBe(401);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ phone: '0966123456', password: 'secret123' });
    expect(login.status).toBe(200);
    const token = login.body.token as string;

    // Unauthenticated access is blocked.
    const noAuth = await request(app).get('/api/me/products');
    expect(noAuth.status).toBe(401);

    // Add a product with the token.
    const add = await request(app)
      .post('/api/me/products')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Beans', price: 'K50' });
    expect(add.status).toBe(201);
    expect(add.body.product.price).toBe('K50.00');

    const list = await request(app)
      .get('/api/me/products')
      .set('Authorization', `Bearer ${token}`);
    expect(list.body.products).toHaveLength(1);

    // The product shows up on the public storefront too.
    const shop = await request(app).get('/api/shops/login-shop');
    expect(shop.body.products).toHaveLength(1);
  });
});
