import { Router } from 'express';
import { config } from '../config.js';
import { handleVendorMessage } from '../whatsapp/handler.js';
import { sendWhatsAppMessage } from '../whatsapp/client.js';

export const whatsappRouter = Router();

/**
 * Meta Cloud API webhook verification handshake (GET).
 * Configure the same verify token in the Meta dashboard.
 */
whatsappRouter.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === config.whatsapp.verifyToken) {
    res.status(200).send(challenge);
    return;
  }
  res.sendStatus(403);
});

/**
 * Inbound messages (POST). We ack immediately (200) so Meta doesn't retry,
 * then process each text message and reply to the vendor.
 */
whatsappRouter.post('/webhook', (req, res) => {
  res.sendStatus(200);
  processWebhookPayload(req.body).catch((err) => {
    console.error('[whatsapp] webhook processing error:', err);
  });
});

/**
 * Local dev helper: simulate an inbound WhatsApp message without Meta.
 * POST /whatsapp/simulate { "from": "260971234567", "text": "Add Product: Beans, K50" }
 * Responds with the bot's reply so you can iterate quickly.
 */
whatsappRouter.post('/simulate', async (req, res) => {
  const from = String(req.body?.from ?? '').replace(/[^\d]/g, '');
  const text = String(req.body?.text ?? '');
  const name = req.body?.name ? String(req.body.name) : undefined;
  if (!from) {
    res.status(400).json({ error: 'from (phone) is required' });
    return;
  }
  const reply = await handleVendorMessage(from, text, name);
  await sendWhatsAppMessage(from, reply);
  res.json({ from, text, reply });
});

interface WhatsAppTextMessage {
  from: string;
  type: string;
  text?: { body: string };
}

async function processWebhookPayload(body: unknown): Promise<void> {
  const payload = body as {
    entry?: Array<{
      changes?: Array<{
        value?: {
          contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
          messages?: WhatsAppTextMessage[];
        };
      }>;
    }>;
  };

  const entries = payload?.entry ?? [];
  for (const entry of entries) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const messages = value?.messages ?? [];
      const profileName = value?.contacts?.[0]?.profile?.name;
      for (const message of messages) {
        if (message.type !== 'text' || !message.text?.body) continue;
        const reply = await handleVendorMessage(message.from, message.text.body, profileName);
        await sendWhatsAppMessage(message.from, reply);
      }
    }
  }
}
