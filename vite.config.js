import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    host: true,
    port: 5173,
    allowedHosts: true
  },
  preview: {
    host: true,
    allowedHosts: true
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        inscripciones: resolve(__dirname, 'inscripciones.html'),
        portfolio: resolve(__dirname, 'portfolio.html'),
        admin: resolve(__dirname, 'admin.html'),
      },
    },
  },
});
