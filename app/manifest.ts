import { MetadataRoute } from 'next'
import { headers } from 'next/headers'

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  let tenantName = 'EffiChain'
  let description = 'Panel de administración EffiChain - gestión de ventas, inventario y operaciones.'

  try {
    const headersList = headers()
    const host = headersList.get('host') || 'localhost'
    const hostname = host.split(':')[0]
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    const response = await fetch(`${apiUrl}/api/config/landing`, {
      headers: { 'X-Forwarded-Host': hostname },
      next: { revalidate: 3600 },
    })
    if (response.ok) {
      const data = await response.json()
      tenantName = data.branding?.nombre_comercial || data.tenant?.nombre || 'EffiChain'
      description = `Panel de administración ${tenantName} - gestión de ventas, inventario y operaciones.`
    }
  } catch {
    // fallback
  }

  return {
    name: tenantName,
    short_name: tenantName,
    description,
    start_url: '/admin/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#0f172a',
    theme_color: '#5ec8f2',
    lang: 'es-CL',
    categories: ['business', 'productivity'],
    icons: [
      { src: '/icons/icon-72x72.png', sizes: '72x72', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-128x128.png', sizes: '128x128', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-144x144.png', sizes: '144x144', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-167x167.png', sizes: '167x167', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-180x180.png', sizes: '180x180', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-256x256.png', sizes: '256x256', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-384x384.png', sizes: '384x384', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      {
        name: 'Pedidos',
        short_name: 'Pedidos',
        description: 'Ver pedidos recientes',
        url: '/admin/pedidos',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
      },
      {
        name: 'Dashboard',
        short_name: 'Dashboard',
        description: 'Ver estadísticas',
        url: '/admin/dashboard',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
      },
    ],
  }
}
