'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import TenantSwitcher from '@/components/superadmin/TenantSwitcher';
import { useAuth } from '@/lib/AuthProvider';
import { MenuProvider, useMenu } from '@/lib/MenuContext';
import { moduloDeRuta, tieneModulo, NOMBRES_MODULO } from '@/lib/modulos';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <MenuProvider>
      <AdminShell>{children}</AdminShell>
    </MenuProvider>
  );
}

function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const { hrefs, estado: estadoMenu } = useMenu();
  const esAdmin = !!(user?.is_superadmin || user?.role?.nombre?.toLowerCase() === 'admin');

  // Autorización de ruta con el menú ya cargado (MenuProvider): navegar no vuelve a pedirlo.
  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    // Superadmin y admin: acceso total sin restricción de ruta
    if (esAdmin) {
      setAuthorized(true);
      return;
    }

    if (estadoMenu === 'cargando') return;
    if (estadoMenu === 'sin-sesion' || !hrefs.length) {
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
  }, [user, loading, esAdmin, estadoMenu, hrefs, pathname, router]);

  if (loading || (authorized === null && !esAdmin)) {
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

      <main className="flex-1 min-w-0 flex flex-col relative">
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

