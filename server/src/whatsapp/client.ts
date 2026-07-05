import { config, whatsappLive } from '../config.js';
import { getDb } from '../db/index.js';
import { uuid } from '../lib/ids.js';

/**
 * Send a WhatsApp text message. When a real Cloud API token is configured we
 * call the Meta Graph API; otherwise we run in "console mode": the message is
 * logged and persisted to the `outbox` table so the whole flow can be demoed
 * end-to-end without credentials.
 */
export async function sendWhatsAppMessage(toPhone: string, body: string): Promise<void> {
  const id = uuid();
  let delivered = false;

  if (whatsappLive) {
    try {
      const url = `https://graph.facebook.com/${config.whatsapp.apiVersion}/${config.whatsapp.phoneNumberId}/messages`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.whatsapp.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: toPhone,
          type: 'text',
          text: { preview_url: true, body },
        }),
      });
      if (!res.ok) {
        const detail = await res.text();
        console.error(`[whatsapp] send failed (${res.status}): ${detail}`);
      } else {
        delivered = true;
      }
    } catch (err) {
      console.error('[whatsapp] send error:', err);
    }
  } else {
    console.log(`\n[whatsapp:console] -> ${toPhone}\n${body}\n`);
    delivered = false;
  }

  getDb()
    .prepare('INSERT INTO outbox (id, to_phone, body, delivered) VALUES (?, ?, ?, ?)')
    .run(id, toPhone, body, delivered ? 1 : 0);
}
