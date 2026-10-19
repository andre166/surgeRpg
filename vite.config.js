import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { areaToolServer } from './scripts/areaToolServer.js';

export default defineConfig({
  // areaToolServer: dev-only endpoints of the area tool (tools/areas.html)
  plugins: [react(), areaToolServer(fileURLToPath(new URL('.', import.meta.url)))],
  base: './',
  server: { port: 8000, strictPort: true },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'chrome120',
    sourcemap: false,
  },
  test: {
    environment: 'node',
    include: ['src/tests/**/*.test.js'],
  },
});
