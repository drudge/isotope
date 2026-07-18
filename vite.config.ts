import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('@radix-ui')) {
              return 'vendor-radix';
            }
            if (id.includes('recharts') || id.includes('d3-') || id.includes('react-smooth') || id.includes('victory-vendor')) {
              return 'vendor-charts';
            }
          }
        },
      },
    },
  },
  server: {
    // Honor the port assigned by the Claude Code preview harness (autoPort).
    port: process.env.PORT ? Number(process.env.PORT) : undefined,
    proxy: {
      '/api': {
        target: 'https://dns.penree.net',
        changeOrigin: true,
        secure: true,
      },
      // OIDC single sign-on: /sso/login starts the flow and /sso/callback
      // finishes it, setting a token cookie and redirecting back to "/".
      '/sso': {
        target: 'https://dns.penree.net',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
