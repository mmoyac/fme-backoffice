import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { headers } from 'next/headers'
import './globals.css'
import { AuthProvider } from '@/lib/AuthProvider'
import { TenantProvider } from '@/lib/TenantContext'

const inter = Inter({ subsets: ['latin'] })

export const viewport: Viewport = {
  themeColor: '#5ec8f2',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

async function getTenantName(): Promise<string> {
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
      return data.branding?.nombre_comercial || data.tenant?.nombre || 'EffiChain'
    }
  } catch {
    // fallback
  }
  return 'EffiChain'
}

export async function generateMetadata(): Promise<Metadata> {
  const tenantName = await getTenantName()
  return {
  title: tenantName,
  description: `Panel de administración ${tenantName} - gestión de ventas, inventario y operaciones.`,
  applicationName: tenantName,
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: tenantName,
    startupImage: [
      // iPhone SE / 5 (640x1136)
      { url: '/icons/splash-640x1136.png', media: '(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)' },
      // iPhone 8 / 7 / 6s (750x1334)
      { url: '/icons/splash-750x1334.png', media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)' },
      // iPhone 14 Pro Max / 13 Pro Max / 12 Pro Max (1284x2778)
      { url: '/icons/splash-1284x2778.png', media: '(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)' },
      // iPhone 14 / 13 / 12 (1170x2532)
      { url: '/icons/splash-1170x2532.png', media: '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)' },
      // iPad (1536x2048)
      { url: '/icons/splash-1536x2048.png', media: '(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)' },
    ],
  },
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-180x180.png', sizes: '180x180', type: 'image/png' },
      { url: '/icons/icon-167x167.png', sizes: '167x167', type: 'image/png' },
      { url: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
    ],
    other: [
      { rel: 'apple-touch-icon', url: '/icons/icon-180x180.png' },
    ],
  },
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const tenantName = await getTenantName()
  return (
    <html lang="es" className="dark">
      <head>
        {/* iOS PWA: pantalla completa y barra de estado */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content={tenantName} />
        {/* Icono para iOS (apple-touch-icon directo) */}
        <link rel="apple-touch-icon" href="/icons/icon-180x180.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icons/icon-167x167.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-180x180.png" />
        {/* Android / general */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="msapplication-TileColor" content="#0f172a" />
        <meta name="msapplication-TileImage" content="/icons/icon-144x144.png" />
      </head>
      <body className={inter.className}>
        <TenantProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </TenantProvider>
      </body>
    </html>
  )
}

