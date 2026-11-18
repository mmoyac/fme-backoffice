const pwa = require('@ducanh2912/next-pwa');

// Service worker (change improve-backoffice-responsive-performance, D4): cachea solo estáticos.
// La API (cualquier origen, ruta /api/) va SIEMPRE a la red: la caché por URL no distingue
// token ni tenant y podía devolver datos viejos o de otra sesión. Las ventas offline usan su
// propia cola en IndexedDB, no esta caché.
const withPWA = pwa.default({
  dest: 'public',
  cacheOnFrontEndNav: false,
  aggressiveFrontEndNavCaching: false,
  reloadOnOnline: true,
  swcMinify: true,
  disable: process.env.NODE_ENV === 'development',
  workboxOptions: {
    disableDevLogs: true,
    // Versión nueva: el SW nuevo toma el control apenas se instala y borra las cachés de
    // versiones anteriores. La pestaña se recarga sola desde components/SwUpdater.tsx.
    skipWaiting: true,
    clientsClaim: true,
    cleanupOutdatedCaches: true,
    runtimeCaching: [
      {
        urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
        handler: 'NetworkOnly',
        method: 'GET',
      },
      ...pwa.runtimeCaching,
    ],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Para producción Docker: standalone
  output: 'standalone',
  reactStrictMode: true,
  swcMinify: true,
  // El navegador debe revalidar siempre el service worker para detectar versiones nuevas.
  async headers() {
    return [
      {
        source: '/:file(sw\\.js|workbox-.*\\.js|swe-worker-.*\\.js)',
        headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }],
      },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
      },
      {
        protocol: 'http',
        hostname: '168.231.96.205',
        port: '8001',
      },
    ],
  },
}

module.exports = withPWA(nextConfig)
