import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: '/prank-shop/',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    host: true,
    port: 3000,
  },
});
