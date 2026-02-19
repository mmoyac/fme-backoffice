import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/AuthProvider'
import { TenantProvider } from '@/lib/TenantContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Backoffice - Multi-tenant',
  description: 'Panel de administración multi-tenant',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className="dark">
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

