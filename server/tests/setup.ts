// Configure the environment BEFORE any app module (which reads config) loads.
// dotenv does not override already-set vars, so these win over any .env file.
process.env.DATABASE_PATH = ':memory:';
process.env.PAYMENT_PROVIDER = 'mock';
process.env.MOCK_PAYMENT_DELAY_SECONDS = '0';
process.env.PAYMENT_WEBHOOK_SECRET = 'test-secret';
process.env.WEB_BASE_URL = 'http://web.test';
process.env.PUBLIC_BASE_URL = 'http://api.test';
// Ensure WhatsApp runs in console mode (no outbound HTTP).
process.env.WHATSAPP_TOKEN = '';
process.env.WHATSAPP_PHONE_NUMBER_ID = '';
// Keep tests fast/deterministic — no throttling.
process.env.RATE_LIMIT_ENABLED = 'false';
