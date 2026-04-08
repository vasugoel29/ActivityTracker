import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      devOptions: {
        enabled: true
      },
      manifest: {
        name: 'Personal Habit Tracker',
        short_name: 'Tracker',
        description: 'Offline-first habit and activity tracker',
        theme_color: '#0B0B0F',
        background_color: '#0B0B0F',
        display: 'standalone',
        icons: [
          {
            src: 'icon.png',
            sizes: '1024x1024',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
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
})
