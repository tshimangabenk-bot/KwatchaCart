import { createApp } from './app.js';
import { config, whatsappLive } from './config.js';
import { getDb } from './db/index.js';

// Touch the DB on boot so the schema is created eagerly and failures surface early.
getDb();

const app = createApp();

app.listen(config.port, () => {
  console.log(`\n🛒 KwatchaCart backend running on ${config.publicBaseUrl} (port ${config.port})`);
  console.log(`   WhatsApp mode : ${whatsappLive ? 'live (Cloud API)' : 'console (no token set)'}`);
  console.log(`   Payments      : ${config.payments.provider}`);
  console.log(`   Web view      : ${config.webBaseUrl}`);
  console.log('\n   Try it without WhatsApp:');
  console.log(
    `   curl -s -X POST ${config.publicBaseUrl}/whatsapp/simulate -H 'content-type: application/json' -d '{"from":"260966123456","text":"Add Product: Beans, K50"}'\n`,
  );
});
