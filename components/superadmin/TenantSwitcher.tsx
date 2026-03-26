'use client';

import { useEffect, useState } from 'react';
import { AuthService, TenantContext } from '@/lib/auth';

export default function TenantSwitcher() {
    const [ctx, setCtx] = useState<TenantContext | null>(null);
    const [isSuperadmin, setIsSuperadmin] = useState(false);

    useEffect(() => {
        const checkSuperadmin = async () => {
            try {
                const user = await AuthService.getCurrentUser();
                if (user.is_superadmin) {
                    setIsSuperadmin(true);
                    setCtx(AuthService.getTenantContext());
                }
            } catch {}
        };
        checkSuperadmin();
    }, []);

    if (!isSuperadmin) return null;

    const handleExit = async () => {
        await AuthService.exitTenant();
        window.location.href = '/admin/superadmin';
    };

    return (
        <div className={`flex items-center justify-between px-4 py-2 text-sm font-medium ${ctx ? 'bg-amber-500 text-slate-900' : 'bg-violet-700 text-white'}`}>
            <div className="flex items-center gap-2">
                <span className="text-base">👑</span>
                {ctx ? (
                    <span>
                        Super Admin — operando en: <strong>{ctx.tenant_nombre}</strong>
                    </span>
                ) : (
                    <span>Super Admin — modo plataforma (sin tenant activo)</span>
                )}
            </div>
            <div className="flex items-center gap-3">
                {ctx ? (
                    <button
                        onClick={handleExit}
                        className="bg-slate-900/20 hover:bg-slate-900/40 px-3 py-1 rounded text-xs font-semibold transition-colors"
                    >
                        Salir del tenant
                    </button>
                ) : (
                    <a
                        href="/admin/superadmin"
                        className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded text-xs font-semibold transition-colors"
                    >
                        Panel de plataforma
                    </a>
                )}
            </div>
        </div>
    );
}
