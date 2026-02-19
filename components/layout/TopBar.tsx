'use client';

import { useAuth } from '@/lib/AuthProvider';
import { useTenant } from '@/lib/TenantContext';

interface TopBarProps {
    onMenuClick: () => void;
}

export default function TopBar({ onMenuClick }: TopBarProps) {
    const { user, logout } = useAuth();
    const { config } = useTenant();

    return (
        <header className="bg-slate-800 border-b border-slate-700 h-16 flex items-center justify-between px-4 shrink-0">
            {/* Left: Mobile Menu & Brand */}
            <div className="flex items-center">
                <button
                    onClick={onMenuClick}
                    className="md:hidden p-2 text-slate-300 hover:bg-slate-700 rounded-lg mr-4"
                >
                    <span className="text-2xl">☰</span>
                </button>
                {/* Mostrar nombre del tenant actual */}
                <span className="md:hidden text-lg font-bold text-primary">
                    {config?.branding.nombre_comercial || config?.tenant.nombre || 'Backoffice'}
                </span>
            </div>

            {/* Right: User Info & Logout */}
            <div className="flex items-center space-x-4 ml-auto">
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
