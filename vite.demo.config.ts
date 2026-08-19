import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Vite config for building the demo app only (used by Vercel deploy).
// Does NOT use lib mode — produces a normal web app bundle in demo/dist/.
export default defineConfig({
  plugins: [react()],
  root: 'demo',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@prosemirror-track-editor': resolve(__dirname, 'src/index.ts'),
    },
  },
});
