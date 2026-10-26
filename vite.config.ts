import {previewSocketPlugin, previewSocketsDisabled} from './server/vite-preview';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  const disableSockets = previewSocketsDisabled();
  return {
    plugins: [react(), tailwindcss(), previewSocketPlugin(disableSockets)],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // Hosted previews may not forward WebSocket upgrades.
      hmr: !disableSockets,
      ws: disableSockets ? false as const : undefined,
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: disableSockets ? null : {},
    },
  };
});
