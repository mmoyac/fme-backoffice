'use client';

import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Cache por URL: la promesa resuelve al data URL o null si no se pudo cargar.
const cache = new Map<string, Promise<string | null>>();

/** URL absoluta del logo: las rutas relativas (ej. /static/uploads/...) se resuelven contra la API. */
export function resolverUrlLogo(url: string): string {
  if (/^(https?:|data:)/i.test(url)) return url;
  return `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

/**
 * Descarga el logo y lo convierte a data URL. Así html2canvas no "contamina" el canvas
 * con una imagen de otro origen (toDataURL fallaría). Si falla, devuelve null.
 */
export function cargarLogoDataUrl(url: string): Promise<string | null> {
  const absoluta = resolverUrlLogo(url);
  if (absoluta.startsWith('data:')) return Promise.resolve(absoluta);
  let p = cache.get(absoluta);
  if (!p) {
    p = fetch(absoluta)
      .then(r => {
        if (!r.ok || !(r.headers.get('content-type') || '').startsWith('image/')) return null;
        return r.blob();
      })
      .then(blob => blob
        ? new Promise<string | null>(resolve => {
            const reader = new FileReader();
            reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
          })
        : null)
      .catch(() => null);
    cache.set(absoluta, p);
  }
  return p;
}

/** Hook: data URL del logo o null (mientras carga, sin logo o si falla). */
export function useLogoDataUrl(url?: string | null): string | null {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  useEffect(() => {
    let activo = true;
    setDataUrl(null);
    if (url) cargarLogoDataUrl(url).then(d => { if (activo) setDataUrl(d); });
    return () => { activo = false; };
  }, [url]);
  return dataUrl;
}
