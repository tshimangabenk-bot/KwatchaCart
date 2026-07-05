import { Router } from 'express';
import { z } from 'zod';
import { formatNgwee } from '../lib/money.js';
import { normalizeZambianPhone } from '../lib/phone.js';
import { createOrder, getOrderById, orderNumber } from '../services/orders.js';
import { getProductById, listProducts } from '../services/products.js';
import { getVendorBySlug } from '../services/vendors.js';
import { initiatePayment } from '../payments/index.js';
import type { Order, Product, Vendor } from '../types.js';

export const apiRouter = Router();

function serializeProduct(p: Product) {
  return {
    id: p.id,
    name: p.name,
    price: formatNgwee(p.price_ngwee),
    priceNgwee: p.price_ngwee,
    description: p.description,
    photoUrl: p.photo_url,
    available: p.available === 1,
  };
}

function serializeVendor(v: Vendor) {
  return { id: v.id, name: v.name, slug: v.slug };
}

function serializeOrder(o: Order) {
  return {
    id: o.id,
    number: orderNumber(o.id),
    status: o.status,
    quantity: o.quantity,
    amount: formatNgwee(o.amount_ngwee),
    amountNgwee: o.amount_ngwee,
    customerPhone: o.customer_phone,
    failureReason: o.failure_reason,
  };
}

/** Public storefront: vendor info + available products. */
apiRouter.get('/shops/:slug', (req, res) => {
  const vendor = getVendorBySlug(req.params.slug);
  if (!vendor) {
    res.status(404).json({ error: 'shop not found' });
    return;
  }
  const products = listProducts(vendor.id, true).map(serializeProduct);
  res.json({ shop: serializeVendor(vendor), products });
});

apiRouter.get('/products/:id', (req, res) => {
  const product = getProductById(req.params.id);
  if (!product || product.available !== 1) {
    res.status(404).json({ error: 'product not found' });
    return;
  }
  res.json({ product: serializeProduct(product) });
});

const checkoutSchema = z.object({
  productId: z.string().min(1),
  phone: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(99).default(1),
});

/** The "two-tap" checkout: create the order and trigger the MoMo PIN push. */
apiRouter.post('/checkout', async (req, res) => {
  const parsed = checkoutSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid request', details: parsed.error.flatten() });
    return;
  }

  const phone = normalizeZambianPhone(parsed.data.phone);
  if (!phone) {
    res.status(400).json({ error: 'Please enter a valid Zambian phone number, e.g. 0971234567.' });
    return;
  }

  const product = getProductById(parsed.data.productId);
  if (!product || product.available !== 1) {
    res.status(404).json({ error: 'product not available' });
    return;
  }

  const amountNgwee = product.price_ngwee * parsed.data.quantity;
  const order = createOrder({
    vendorId: product.vendor_id,
    productId: product.id,
    customerPhone: phone,
    quantity: parsed.data.quantity,
    amountNgwee,
    provider: '',
  });

  try {
    const result = await initiatePayment(order, product.name);
    res.status(201).json({
      order: serializeOrder({ ...order, provider_ref: result.reference }),
      payment: { status: result.status, message: result.message ?? 'PIN prompt sent to your phone.' },
    });
  } catch (err) {
    console.error('[checkout] payment initiation failed:', err);
    res.status(502).json({
      error: 'We could not reach the Mobile Money service. Please try again.',
      orderId: order.id,
    });
  }
});

/** Poll order status while the customer approves the PIN prompt. */
apiRouter.get('/orders/:id', (req, res) => {
  const order = getOrderById(req.params.id);
  if (!order) {
    res.status(404).json({ error: 'order not found' });
    return;
  }
  res.json({ order: serializeOrder(order) });
});
