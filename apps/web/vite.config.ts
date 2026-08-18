import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const apiTarget = loadEnv(mode, '.', '').API_PROXY_TARGET || 'http://localhost:3000';

  return {
    plugins: [sveltekit()],
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true
        }
      }
    },
    build: {
      // MapLibre is intentionally lazy-loaded as a dedicated chunk and remains large by design.
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('maplibre-gl')) {
              return 'maplibre';
            }

            if (id.includes('supercluster')) {
              return 'supercluster';
            }

            if (id.includes('protobufjs')) {
              return 'protobuf';
            }

            if (id.includes('node_modules')) {
              return 'vendor';
            }

            return undefined;
          }
        }
      }
    }
  };
});
