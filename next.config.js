/** @type {import('next').NextConfig} */
const nextConfig = {
  // Para producción Docker: standalone
  output: 'standalone',
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
}

module.exports = nextConfig
