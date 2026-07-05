import cors from 'cors';
import express, { type Express } from 'express';
import { config, whatsappLive } from './config.js';
import { apiRouter } from './routes/api.js';
import { paymentsWebhookRouter } from './routes/paymentsWebhook.js';
import { whatsappRouter } from './routes/whatsapp.js';

export function createApp(): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'kwatchacart',
      whatsapp: whatsappLive ? 'live' : 'console',
      paymentProvider: config.payments.provider,
    });
  });

  app.use('/api', apiRouter);
  app.use('/whatsapp', whatsappRouter);
  app.use('/webhooks', paymentsWebhookRouter);

  return app;
}
