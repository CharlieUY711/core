// apps/core-market/vite.config.ts
import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@modulos': path.resolve(__dirname, '../../Charlie/Modulos'),
      '@constructor': path.resolve(__dirname, '../Constructor/src'),

      // ── @core/carrito ────────────────────────────────────────────────
      // Apunta al package local. En CI/CD Vercel esto funciona igual
      // porque pnpm workspaces linkea el package antes del build.
      '@core/carrito': path.resolve(__dirname, '../../packages/core-carrito/src/index.ts'),

      // Alias que usa CarritoModule internamente para importar las APIs
      // de core-market en runtime sin crear una dependencia circular de tipos.
      '@core-market': path.resolve(__dirname, './src'),
    },
  },

  assetsInclude: ['**/*.svg', '**/*.csv'],

  build: {
    cssCodeSplit: false,
    sourcemap: false,
    minify: 'esbuild',
    cssMinify: true,
    assetsDir: 'assets',
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: undefined,
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },

  base: '/',

  server: {
    port: 5173,
    strictPort: true,
    hmr: { overlay: true },
    force: true,
  },

  css: {
    devSourcemap: false,
    postcss: undefined,
  },

  define: {
    'import.meta.env.DEV': JSON.stringify(process.env.NODE_ENV !== 'production'),
    'import.meta.env.PROD': JSON.stringify(process.env.NODE_ENV === 'production'),
  },
})
