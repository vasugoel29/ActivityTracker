import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: '/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'generateSW',
      registerType: 'autoUpdate',
      injectRegister: 'inline',
      includeAssets: ['icon.png', 'manifest.json'],
      manifest: false, // Using manual manifest in public folder
      workbox: {
        globPatterns: mode === 'development' ? [] : ['**/*.{js,css,html,ico,png,svg}'],
      },
      devOptions: {
        enabled: true
      }
    }),
    {
      name: 'terminal-logger',
      configureServer(server) {
        server.middlewares.use('/api/log', (req, res) => {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
              try {
                const data = JSON.parse(body);
                console.log(`\x1b[36m[AI Worker]\x1b[0m ${data.message}`);
              } catch (e) {
                console.error('Failed to parse log body', e);
              }
              res.statusCode = 200;
              res.end();
            });
          } else {
            res.statusCode = 404;
            res.end();
          }
        });
      }
    }
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('framer-motion') || id.includes('lucide-react')) {
              return 'vendor-ui';
            }
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-core';
            }
            if (id.includes('date-fns') || id.includes('@supabase/supabase-js')) {
              return 'vendor-utils';
            }
            return 'vendor';
          }
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
}))
