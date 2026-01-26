/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
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
  // Exportar solo las páginas necesarias para el POS
  // Esto evita problemas con rutas dinámicas
  experimental: {
    // Deshabilitar optimizaciones que causan problemas con export
  },
}

module.exports = nextConfig
