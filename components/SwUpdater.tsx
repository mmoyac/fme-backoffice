'use client'

import { useEffect } from 'react'

// Mantiene el backoffice al día después de cada deploy, sin que el usuario tenga que
// borrar caché a mano:
// 1. Cuando un service worker nuevo toma el control (skipWaiting + clientsClaim en
//    next.config.js), recarga la pestaña una vez para usar la versión nueva.
// 2. Pide al navegador buscar un sw.js nuevo al volver a la pestaña y cada 30 min,
//    para pestañas que quedan abiertas todo el día.
// 3. Si falla la carga de un chunk JS (archivo borrado por el deploy), recarga una vez.

const RELOAD_KEY = 'sw-updater-last-reload'
const RELOAD_GUARD_MS = 10_000
const UPDATE_INTERVAL_MS = 30 * 60 * 1000

function reloadOnce() {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0)
    if (Date.now() - last < RELOAD_GUARD_MS) return // evita bucles de recarga
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
  } catch {
    // sin sessionStorage: recargar igual
  }
  window.location.reload()
}

const CHUNK_ERROR_RE =
  /ChunkLoadError|Loading chunk [\w-]+ failed|Loading CSS chunk|Failed to fetch dynamically imported module|Importing a module script failed/i

function isChunkError(value: unknown): boolean {
  if (!value) return false
  if (typeof value === 'string') return CHUNK_ERROR_RE.test(value)
  const err = value as { name?: string; message?: string }
  return err.name === 'ChunkLoadError' || CHUNK_ERROR_RE.test(err.message || '')
}

export default function SwUpdater() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      if (isChunkError(e.error) || isChunkError(e.message)) reloadOnce()
    }
    const onRejection = (e: PromiseRejectionEvent) => {
      if (isChunkError(e.reason)) reloadOnce()
    }
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)

    if (!('serviceWorker' in navigator)) {
      return () => {
        window.removeEventListener('error', onError)
        window.removeEventListener('unhandledrejection', onRejection)
      }
    }

    const sw = navigator.serviceWorker
    // Si no había SW controlando, es la primera instalación: no hace falta recargar.
    const hadController = !!sw.controller
    const onControllerChange = () => {
      if (hadController) reloadOnce()
    }
    sw.addEventListener('controllerchange', onControllerChange)

    const checkForUpdate = () => {
      sw.getRegistration()
        .then((reg) => reg?.update())
        .catch(() => {})
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') checkForUpdate()
    }
    document.addEventListener('visibilitychange', onVisible)
    const interval = window.setInterval(checkForUpdate, UPDATE_INTERVAL_MS)

    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
      sw.removeEventListener('controllerchange', onControllerChange)
      document.removeEventListener('visibilitychange', onVisible)
      window.clearInterval(interval)
    }
  }, [])

  return null
}
