'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import TenantSwitcher from '@/components/superadmin/TenantSwitcher';
import { useAuth } from '@/lib/AuthProvider';
import { AuthService } from '@/lib/auth';

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
    fetch(`${API_URL}/api/auth/menu`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Forwarded-Host': hostname,
      },
    })
      .then((r) => r.ok ? r.json() : [])
      .then((items: { href: string }[]) => {
        if (!items.length) {
          router.push('/login');
          return;
        }
        const permitida = items.some((item) => pathname?.startsWith(item.href));
        if (permitida) {
          setAuthorized(true);
        } else {
          // Redirigir al primer ítem del menú permitido
          router.replace(items[0].href);
        }
      })
      .catch(() => {
        router.push('/login');
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
          {children}
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

