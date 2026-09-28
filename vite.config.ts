import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],

  // ── Electron build settings ────────────────────────────────
  base: './', // Required for Electron: use relative paths in built HTML

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // Consistent chunk naming
        manualChunks: undefined,
      },
    },
  },

  server: {
    port: 5173,
    strictPort: true, // Fail if port is taken (Electron dev uses fixed port)
  },
});
