import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import fs from 'node:fs';
import path from 'node:path';
import { config, whatsappLive } from './config.js';
import { apiRouter } from './routes/api.js';
import { authRouter } from './routes/auth.js';
import { meRouter } from './routes/me.js';
import { paymentsWebhookRouter } from './routes/paymentsWebhook.js';
import { whatsappRouter } from './routes/whatsapp.js';

export function createApp(): Express {
  const app = express();
  // Trust the reverse proxy (Render/Fly/Nginx) so client IPs & rate limits work.
  app.set('trust proxy', 1);
  // Security headers. CSP is disabled to avoid blocking the bundled SPA assets;
  // enable and tune a policy if you serve the frontend separately.
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'kwatchacart',
      whatsapp: whatsappLive ? 'live' : 'console',
      paymentProvider: config.payments.provider,
    });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/me', meRouter);
  app.use('/api', apiRouter);
  app.use('/whatsapp', whatsappRouter);
  app.use('/webhooks', paymentsWebhookRouter);

  maybeServeWeb(app);

  return app;
}

/**
 * Optionally serve the built web SPA from the same Express process, so the
 * whole product deploys as a single service. Enabled when SERVE_WEB=true, or
 * SERVE_WEB=auto (default) and a built web/dist is present. API, WhatsApp and
 * webhook routes are excluded from the SPA history fallback.
 */
function maybeServeWeb(app: Express): void {
  if (config.serveWeb === 'false') return;
  const indexHtml = path.join(config.webDistPath, 'index.html');
  if (!fs.existsSync(indexHtml)) {
    if (config.serveWeb === 'true') {
      console.warn(`[web] SERVE_WEB=true but no build found at ${config.webDistPath}. Run "npm run build".`);
    }
    return;
  }

  app.use(express.static(config.webDistPath));
  app.get('*', (req, res, next) => {
    if (
      req.path.startsWith('/api') ||
      req.path.startsWith('/whatsapp') ||
      req.path.startsWith('/webhooks') ||
      req.path === '/health'
    ) {
      next();
      return;
    }
    res.sendFile(indexHtml);
  });
  console.log(`[web] serving SPA from ${config.webDistPath}`);
}
