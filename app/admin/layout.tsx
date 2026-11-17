'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import TenantSwitcher from '@/components/superadmin/TenantSwitcher';
import { useAuth } from '@/lib/AuthProvider';
import { AuthService } from '@/lib/auth';
import { fetchConTimeout } from '@/lib/net';
import { moduloDeRuta, tieneModulo, NOMBRES_MODULO } from '@/lib/modulos';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    // Superadmin y admin: acceso total sin restricción de ruta
    if (user.is_superadmin || user.role?.nombre?.toLowerCase() === 'admin') {
      setAuthorized(true);
      return;
    }

    // Para otros roles: verificar si la ruta actual está en su menú permitido
    const token = AuthService.getToken();
    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

    const aplicarMenu = (hrefs: string[]) => {
      if (!hrefs.length) {
        router.push('/login');
        return;
      }
      // Capacitación: visible para todo usuario autenticado (el filtro por módulo lo hace la API)
      const permitida = (pathname?.startsWith('/admin/capacitacion') ?? false) || hrefs.some((href) => pathname?.startsWith(href));
      if (permitida) {
        setAuthorized(true);
      } else {
        // Redirigir al primer ítem del menú permitido
        router.replace(hrefs[0]);
      }
    };

    // Si la API no responde (red/timeout/5xx) se usa el último menú válido en caché,
    // para no expulsar al usuario por una falla momentánea del servidor.
    const usarMenuEnCache = () => {
      const cache = AuthService.getCachedMenu();
      if (cache && cache.length) {
        console.warn('⚠️ Menú: API no disponible, usando menú en caché');
        aplicarMenu(cache);
      } else {
        router.push('/login');
      }
    };

    fetchConTimeout(`${API_URL}/api/auth/menu`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Forwarded-Host': hostname,
      },
    })
      .then(async (r) => {
        if (r.status === 401 || r.status === 403) {
          router.push('/login');
          return;
        }
        if (!r.ok) {
          usarMenuEnCache();
          return;
        }
        const items: { href: string }[] = await r.json();
        const hrefs = items.map((item) => item.href);
        if (hrefs.length) AuthService.setCachedMenu(hrefs);
        aplicarMenu(hrefs);
      })
      .catch(() => {
        usarMenuEnCache();
      });
  }, [user, loading, pathname, router]);

  const isAdmin = user?.is_superadmin || user?.role?.nombre?.toLowerCase() === 'admin';
  if (loading || (authorized === null && !isAdmin)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto"></div>
          <p className="mt-4 text-slate-400">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Ruta de un módulo que el tenant no contrató (p. ej. un admin que entra por URL directa).
  const moduloRuta = moduloDeRuta(pathname);
  const moduloBloqueado = moduloRuta && !tieneModulo(user, moduloRuta) ? moduloRuta : null;

  return (
    <div className="flex min-h-screen bg-slate-900">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(c => !c)}
      />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="flex-1 flex flex-col w-full relative">
        <TenantSwitcher />
        <TopBar onMenuClick={() => setSidebarOpen(true)} sidebarCollapsed={sidebarCollapsed} />

        <div className="p-4 md:p-8 pb-24 md:pb-32">
          {moduloBloqueado ? (
            <div className="max-w-lg mx-auto mt-16 bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
              <div className="text-4xl mb-3">🔒</div>
              <h2 className="text-xl font-semibold text-white">
                Tu plan no incluye el módulo {NOMBRES_MODULO[moduloBloqueado] ?? moduloBloqueado}
              </h2>
              <p className="text-slate-400 text-sm mt-2">
                Si necesitas esta funcionalidad, contacta a EffiChain para agregarla a tu plan.
              </p>
            </div>
          ) : (
            children
          )}
        </div>
      </main>

      {/* Barra inferior mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-slate-800 border-t border-slate-700">
        <button
          onClick={() => setSidebarOpen(true)}
          className="w-full flex flex-col items-center justify-center py-3 text-gray-400 hover:text-white active:bg-slate-700 transition-colors"
        >
          <span className="text-2xl leading-none">☰</span>
          <span className="text-xs mt-1">Menú</span>
        </button>
      </div>
    </div>
  );
}

