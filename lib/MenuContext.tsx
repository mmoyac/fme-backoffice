'use client';

/**
 * Menú del usuario, cargado una vez por sesión y compartido por el layout (autorización de rutas)
 * y el Sidebar (change OpenSpec improve-backoffice-responsive-performance, D2).
 * Antes cada navegación pedía /api/auth/menu hasta 3 veces.
 */
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import { AuthService, MenuItemCache } from '@/lib/auth';
import { fetchConTimeout } from '@/lib/net';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export type MenuItem = MenuItemCache;

/** cargando: aún sin respuesta · ok: menú disponible · sin-sesion: 401/403 o sin menú ni caché */
export type EstadoMenu = 'cargando' | 'ok' | 'sin-sesion';

interface MenuContextType {
  items: MenuItem[];
  hrefs: string[];
  estado: EstadoMenu;
}

const MenuContext = createContext<MenuContextType>({ items: [], hrefs: [], estado: 'cargando' });

export function useMenu() {
  return useContext(MenuContext);
}

export function MenuProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [estado, setEstado] = useState<EstadoMenu>('cargando');
  // Una carga por usuario y tenant (el cambio de tenant del superadmin recarga la página igual)
  const clave = user ? `${user.id}:${user.tenant_id ?? ''}` : null;

  useEffect(() => {
    if (!clave) return;
    let cancelado = false;
    setEstado('cargando');

    // Si la API no responde (red/timeout/5xx) se usa el último menú válido en caché,
    // para no expulsar al usuario por una falla momentánea del servidor.
    const usarCache = () => {
      const cache = AuthService.getCachedMenu();
      if (cache && cache.length) {
        console.warn('⚠️ Menú: API no disponible, usando menú en caché');
        setItems(cache);
        setEstado('ok');
      } else {
        setEstado('sin-sesion');
      }
    };

    fetchConTimeout(`${API_URL}/api/auth/menu`, {
      headers: {
        Authorization: `Bearer ${AuthService.getToken()}`,
        'X-Forwarded-Host': window.location.hostname,
      },
    })
      .then(async (r) => {
        if (cancelado) return;
        if (r.status === 401 || r.status === 403) {
          setEstado('sin-sesion');
          return;
        }
        if (!r.ok) {
          usarCache();
          return;
        }
        const data: MenuItem[] = await r.json();
        if (cancelado) return;
        const limpios = data.map(({ nombre, href, icon }) => ({ nombre, href, icon }));
        if (limpios.length) AuthService.setCachedMenu(limpios);
        setItems(limpios);
        setEstado(limpios.length ? 'ok' : 'sin-sesion');
      })
      .catch(() => {
        if (!cancelado) usarCache();
      });

    return () => {
      cancelado = true;
    };
  }, [clave]);

  const value = useMemo(
    () => ({ items, hrefs: items.map((m) => m.href), estado }),
    [items, estado],
  );

  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>;
}
