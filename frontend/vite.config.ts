import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // The service worker answers navigations from the cached index.html, which is right for
        // client-side routes and wrong for everything the server owns. Without this list a click
        // on "sign in with Google" never leaves the browser: the worker serves the app shell for
        // /auth/google, React Router has no such route, and the page renders blank.
        navigateFallbackDenylist: [
          /^\/api\//,
          /^\/auth\//,
          /^\/user\//,
          /^\/signin-google/,
        ],
      },
      manifest: {
        name: 'Urnik - FERI Timetable',
        short_name: 'Urnik',
        description: 'Timetable viewer for FERI students',
        theme_color: '#1e3a5f',
        background_color: '#fcfcfc',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {'@': path.resolve(__dirname, './src')},
  },
  server: {
    host: true,
    // Dev server only — the production image serves static files through nginx and never runs
    // this. Hosts come from the environment so no domain is pinned in the repository.
    allowedHosts: (process.env.VITE_DEV_ALLOWED_HOSTS ?? '')
      .split(',')
      .map((h) => h.trim())
      .filter(Boolean),
  },
});
