'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface TenantConfig {
  tenant: {
    id: number
    codigo: string
    nombre: string
    dominio_principal?: string
  }
  colores: {
    primario: string
    secundario: string
    acento: string
  }
  branding: {
    logo_url: string
    nombre_comercial: string
  }
  footer?: {
    email?: string
    telefono?: string
    direccion?: string
    redes_sociales?: any
  }
}

interface TenantContextType {
  config: TenantConfig | null
  loading: boolean
  error: string | null
}

const TenantContext = createContext<TenantContextType | undefined>(undefined)

export function TenantProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<TenantConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadTenantConfig() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        const currentHostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
        
        console.log('🔍 Backoffice - Cargando config desde:', `${apiUrl}/api/config/landing`)
        console.log('🌐 Backoffice - Dominio actual:', currentHostname)
        
        // Enviar el hostname actual al backend para detección de tenant
        const response = await fetch(`${apiUrl}/api/config/landing`, {
          headers: {
            'X-Forwarded-Host': currentHostname
          }
        })

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        console.log('✅ Backoffice - Configuración cargada:', data.tenant.nombre)
        
        setConfig(data)

        // Aplicar colores como variables CSS
        if (data.colores && typeof window !== 'undefined') {
          const root = document.documentElement
          root.style.setProperty('--color-primario', data.colores.primario)
          root.style.setProperty('--color-secundario', data.colores.secundario)
          root.style.setProperty('--color-acento', data.colores.acento || data.colores.primario)
          
          console.log('🎨 Colores aplicados:', data.colores)
        }
        
      } catch (err) {
        console.error('❌ Error cargando configuración tenant:', err)
        setError(err instanceof Error ? err.message : 'Error desconocido')
      } finally {
        setLoading(false)
      }
    }

    loadTenantConfig()
  }, [])

  return (
    <TenantContext.Provider value={{ config, loading, error }}>
      {children}
    </TenantContext.Provider>
  )
}

export function useTenant() {
  const context = useContext(TenantContext)
  if (context === undefined) {
    throw new Error('useTenant debe usarse dentro de TenantProvider')
  }
  return context
}
