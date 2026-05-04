import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'build',
  },
  server: {
    proxy: {
      '/api/add-game': {
        target: 'http://127.0.0.1:5001/bgpeen-1fc16/us-central1/addGameImmediate',
        changeOrigin: true,
        rewrite: (path) => path.replace('/api/add-game', ''),
        configure: (proxy) => {
          proxy.on('error', (_err, _req, res) => {
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Functions emulator not running' }));
          });
        },
      },
      '/api/record-view': {
        target: 'http://127.0.0.1:5001/bgpeen-1fc16/us-central1/recordGameView',
        changeOrigin: true,
        rewrite: (path) => path.replace('/api/record-view', ''),
      },
    },
  },
});
