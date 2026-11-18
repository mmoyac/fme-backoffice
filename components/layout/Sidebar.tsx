'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTenant } from '@/lib/TenantContext';
import { useMenu } from '@/lib/MenuContext';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Sidebar({ isOpen = true, onClose, collapsed = false, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const { config } = useTenant();
  // Menú compartido con el layout (MenuProvider): se carga una vez por sesión, no en cada navegación
  const { items: menuItems, estado } = useMenu();
  const loading = estado === 'cargando' && menuItems.length === 0;

  return (
    <div className={`
      fixed bottom-0 left-0 right-0 z-50 bg-slate-800 text-white rounded-t-2xl max-h-[85vh] flex flex-col transform transition-transform duration-300 ease-in-out
      md:relative md:shrink-0 md:bottom-auto md:left-auto md:right-auto md:translate-y-0 md:rounded-none md:max-h-none md:min-h-screen md:transition-all md:duration-300
      ${isOpen ? 'translate-y-0 shadow-2xl' : 'translate-y-full'}
      ${collapsed ? 'md:w-16' : 'md:w-64'}
    `}>
      {/* Drag handle — solo mobile */}
      <div className="md:hidden flex justify-center pt-3 pb-1">
        <div className="w-10 h-1 bg-slate-600 rounded-full" />
      </div>

      <div className="p-4 flex flex-col flex-1 min-h-0">
        {/* Header desktop */}
        <div className="mb-6 flex justify-between items-start">
          <div className={`${collapsed ? 'md:hidden' : ''}`}>
            <h1 className="text-2xl font-bold text-primary">
              {config?.branding.nombre_comercial || config?.tenant.nombre || 'Backoffice'}
            </h1>
            <p className="text-sm text-gray-400">Panel de Administración</p>
          </div>
          {/* Botón colapsar — solo desktop */}
          <button
            onClick={onToggleCollapse}
            className="hidden md:flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-white hover:bg-slate-700 transition-colors ml-auto"
            title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          >
            {collapsed ? '›' : '‹'}
          </button>
          {/* Botón cerrar — solo mobile */}
          <button
            onClick={onClose}
            className="md:hidden text-gray-400 hover:text-white p-1"
          >
            ✕
          </button>
        </div>

        <nav className="space-y-2 flex-1 min-h-0 overflow-y-auto md:overflow-visible pb-4">
          {loading ? (
            // Skeleton loader simple
            [1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-12 bg-slate-700/50 rounded-lg animate-pulse" />
            ))
          ) : (
            (() => {
              const exactMatch = menuItems.some(m => pathname === m.href);
              return menuItems.map((item) => {
              const isActive = pathname === item.href ||
                (!exactMatch && (pathname?.startsWith(item.href + '/') ?? false));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => onClose && onClose()}
                  title={collapsed ? item.nombre : undefined}
                  className={`flex items-center px-3 py-3 rounded-lg transition-colors ${
                    collapsed ? 'md:justify-center' : 'space-x-3 px-4'
                  } ${isActive
                    ? 'bg-primary text-slate-900 font-semibold'
                    : 'text-gray-300 hover:bg-slate-700'
                  }`}
                >
                  <span className="text-xl shrink-0">{item.icon}</span>
                  <span className={collapsed ? 'md:hidden' : ''}>{item.nombre}</span>
                </Link>
              );
            });
            })()
          )}
        </nav>

      </div>
    </div>
  );
}
