import { Router } from 'express';
import { z } from 'zod';
import { formatNgwee, parsePriceToNgwee } from '../lib/money.js';
import { requireAuth, requireVerified } from '../middleware/requireAuth.js';
import {
  createProduct,
  getProductById,
  listProducts,
  removeProduct,
  setProductAvailability,
} from '../services/products.js';
import { listRecentOrders, orderNumber } from '../services/orders.js';
import type { Order, Product } from '../types.js';

export const meRouter = Router();

// Every route here requires a valid session.
meRouter.use(requireAuth);

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

function serializeOrder(o: Order) {
  return {
    id: o.id,
    number: orderNumber(o.id),
    status: o.status,
    quantity: o.quantity,
    amount: formatNgwee(o.amount_ngwee),
    customerPhone: o.customer_phone,
    createdAt: o.created_at,
  };
}

meRouter.get('/products', (req, res) => {
  res.json({ products: listProducts(req.vendor!.id).map(serializeProduct) });
});

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  price: z.union([z.string(), z.number()]),
  description: z.string().trim().max(280).optional(),
});

meRouter.post('/products', requireVerified, (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Product name and price are required.' });
    return;
  }
  const priceNgwee = parsePriceToNgwee(String(parsed.data.price));
  if (priceNgwee === null) {
    res.status(400).json({ error: 'Enter a valid price, e.g. K50 or 50.' });
    return;
  }
  const product = createProduct({
    vendorId: req.vendor!.id,
    name: parsed.data.name,
    priceNgwee,
    description: parsed.data.description ?? null,
  });
  res.status(201).json({ product: serializeProduct(product) });
});

const availabilitySchema = z.object({ available: z.boolean() });

meRouter.patch('/products/:id', (req, res) => {
  const product = getProductById(req.params.id);
  if (!product || product.vendor_id !== req.vendor!.id) {
    res.status(404).json({ error: 'Product not found.' });
    return;
  }
  const parsed = availabilitySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'available (boolean) is required.' });
    return;
  }
  setProductAvailability(product.id, parsed.data.available);
  res.json({ product: serializeProduct({ ...product, available: parsed.data.available ? 1 : 0 }) });
});

meRouter.delete('/products/:id', (req, res) => {
  const product = getProductById(req.params.id);
  if (!product || product.vendor_id !== req.vendor!.id) {
    res.status(404).json({ error: 'Product not found.' });
    return;
  }
  removeProduct(req.vendor!.id, product.name);
  res.json({ ok: true });
});

meRouter.get('/orders', (req, res) => {
  res.json({ orders: listRecentOrders(req.vendor!.id, 25).map(serializeOrder) });
});
