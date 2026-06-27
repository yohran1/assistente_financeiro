import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: { drop_console: true, drop_debugger: true },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('recharts')) return 'charts'
          if (id.includes('@supabase/supabase-js')) return 'supabase'
          if (id.includes('lucide-react') || id.includes('react-hot-toast')) return 'ui'
          if (
            id.includes('react') ||
            id.includes('react-dom') ||
            id.includes('react-router-dom') ||
            id.includes('react-hook-form') ||
            id.includes('zod')
          ) {
            return 'vendor'
          }
          return undefined
        },
      },
    },
    chunkSizeWarningLimit: 600,
    cssCodeSplit: true,
  },
  server: {
    port: 3000,
    watch: { ignored: ['**/.refact/**', '**/.git/**', '**/node_modules/**', '**/agents/**'] },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.js'],
    exclude: ['node_modules/**', 'dist/**', 'src/tests/e2e/**'],
  },
})
