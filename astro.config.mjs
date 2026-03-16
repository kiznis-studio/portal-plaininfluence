import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';
import sentry from '@sentry/astro';

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  site: 'https://plaininfluence.com',
  build: {
    inlineStylesheets: 'auto',
  },
  vite: {
    plugins: [tailwindcss()],
    build: { target: 'es2022' },
  },
  integrations: [
    sentry({
      dsn: '', // TODO: Configure Sentry DSN for PlainInfluence
      enabled: { client: false, server: true },
      sourceMapsUploadOptions: {
        enabled: false,
      },
    }),
  ],
});
