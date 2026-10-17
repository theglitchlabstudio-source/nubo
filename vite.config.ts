import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves the app from /nubo/. Locally we serve from /.
export default defineConfig(({ command }) => ({
  resolve: { alias: { '@': new URL('./src', import.meta.url).pathname } },
  base: command === 'build' ? '/nubo/' : '/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'icons/*.svg'],
      manifest: {
        name: 'نوبو — نوبت‌دهی آنلاین',
        short_name: 'نوبو',
        description: 'سامانه نوبت‌دهی آنلاین برای کسب‌وکارهای محلی',
        lang: 'fa',
        dir: 'rtl',
        theme_color: '#ECEAE5',
        background_color: '#ECEAE5',
        display: 'standalone',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: 'index.html',
        globPatterns: ['**/*.{js,css,html,woff2,png,svg}'],
      },
    }),
  ],
}));
