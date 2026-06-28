import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';

export default defineConfig({
  plugins: [svelte(), cssInjectedByJsPlugin()],
  build: {
    outDir: 'dist-widget',
    emptyOutDir: true,
    sourcemap: true,
    cssCodeSplit: false,
    lib: {
      entry: 'src/lib/tracker/browser-entry.ts',
      name: 'MBTATracker',
      formats: ['iife'],
      fileName: () => 'mbta-tracker-widget.js'
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true
      }
    }
  }
});
