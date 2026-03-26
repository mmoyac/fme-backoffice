'use client';

import { useAuth } from '@/lib/AuthProvider';
import { useTenant } from '@/lib/TenantContext';
import NotificationBell from '@/components/notifications/NotificationBell';

interface TopBarProps {
    onMenuClick: () => void;
    sidebarCollapsed?: boolean;
}

export default function TopBar({ onMenuClick, sidebarCollapsed }: TopBarProps) {
    const { user, logout } = useAuth();
    const { config } = useTenant();

    return (
        <header className="bg-slate-800 border-b border-slate-700 h-16 flex items-center justify-between px-4 shrink-0">
            {/* Left: Brand (mobile) */}
            <div className="flex items-center gap-3">
                <span className="md:hidden text-lg font-bold text-primary">
                    {config?.branding.nombre_comercial || config?.tenant.nombre || 'Backoffice'}
                </span>
                {/* Indicador de sidebar colapsado en desktop */}
                {sidebarCollapsed && (
                    <span className="hidden md:block text-sm text-gray-400">☰ Menú colapsado</span>
                )}
            </div>

            {/* Right: User Info & Logout */}
            <div className="flex items-center space-x-4 ml-auto">
                <NotificationBell />
                {user && (
                    <div className="hidden md:flex flex-col items-end mr-2">
                        <span className="text-sm text-white font-medium">{user.nombre_completo}</span>
                        <div className="flex items-center space-x-2">
                            <span className="text-xs text-slate-400">{user.email}</span>
                            {user.role && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-700 text-amber-500 border border-slate-600 uppercase tracking-wider">
                                    {user.role.nombre}
                                </span>
                            )}
                        </div>
                    </div>
                )}

                <button
                    onClick={logout}
                    className="flex items-center space-x-2 px-3 py-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Cerrar Sesión"
                >
                    <span className="text-xl">🚪</span>
                    <span className="hidden md:inline text-sm">Salir</span>
                </button>
            </div>
        </header>
    );
}
