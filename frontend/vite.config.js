import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Backend runs on :4000; dev server proxies API + socket to it.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
      '/uploads': 'http://localhost:4000',
      '/socket.io': { target: 'http://localhost:4000', ws: true },
    },
  },
});