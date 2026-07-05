import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Proxy API/webhook calls to the backend during local dev so the tiny catalog
// SPA can use same-origin relative URLs (keeps the production bundle simple).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
      '/whatsapp': 'http://localhost:4000',
      '/webhooks': 'http://localhost:4000',
      '/health': 'http://localhost:4000',
    },
  },
  build: {
    target: 'es2020',
  },
});
