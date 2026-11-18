'use client';

import { useState, useEffect } from 'react';
import { AuthService } from '@/lib/auth';
import DataList from '@/components/ui/DataList';
import ModulosTenantModal from '@/components/superadmin/ModulosTenantModal';

interface TenantStats {
    id: number;
    codigo: string;
    nombre: string;
    dominio_principal: string | null;
    activo: boolean;
    correlativo_pedido: number;
    total_usuarios: number;
    total_productos: number;
    total_clientes: number;
    total_pedidos: number;
}

interface PlatformStats {

    total_tenants: number;
    tenants_activos: number;
    total_usuarios: number;
    total_pedidos: number;
    total_clientes: number;
}

export default function SuperAdminPage() {
    const [tenants, setTenants] = useState<TenantStats[]>([]);
    const [stats, setStats] = useState<PlatformStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [switching, setSwitching] = useState<number | null>(null);
    const [modulosDe, setModulosDe] = useState<TenantStats | null>(null);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    const getSuperadminHeaders = () => ({
        'Authorization': `Bearer ${AuthService.getSuperadminToken()}`,
        'Content-Type': 'application/json',
    });

    useEffect(() => {
        const init = async () => {
            try {
                const user = await AuthService.getCurrentUser();
                if (!user.is_superadmin) {
                    window.location.href = '/admin/dashboard';
                    return;
                }
            } catch {
                window.location.href = '/login';
                return;
            }
            fetchAll();
        };
        init();
    }, []);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [tenantsRes, statsRes] = await Promise.all([
                fetch(`${API_URL}/api/superadmin/tenants`, { headers: getSuperadminHeaders() }),
                fetch(`${API_URL}/api/superadmin/stats`, { headers: getSuperadminHeaders() }),
            ]);
            if (tenantsRes.ok) setTenants(await tenantsRes.json());
            if (statsRes.ok) setStats(await statsRes.json());
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const handleEnterTenant = async (tenantId: number) => {
        setSwitching(tenantId);
        try {
            await AuthService.switchTenant(tenantId);
            window.location.href = '/admin/dashboard';
        } catch (e) {
            console.error('Error al cambiar de tenant:', e);
            alert('Error al cambiar de tenant');
            setSwitching(null);
        }
    };

    const handleToggleActivo = async (tenant: TenantStats) => {
        const accion = tenant.activo ? 'desactivar' : 'activar';
        if (!confirm(`¿${accion.charAt(0).toUpperCase() + accion.slice(1)} el tenant "${tenant.nombre}"?`)) return;
        try {
            const res = await fetch(`${API_URL}/api/superadmin/tenants/${tenant.id}/toggle-activo`, {
                method: 'PUT',
                headers: getSuperadminHeaders(),
            });
            if (res.ok) fetchAll();
            else alert('Error al cambiar estado');
        } catch { alert('Error de red'); }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-slate-400">Cargando panel de plataforma...</p>
            </div>
        );
    }

    const estadoTenant = (t: TenantStats) =>
        t.activo
            ? <span className="text-green-400 font-medium">Activo</span>
            : <span className="text-red-400 font-medium">Inactivo</span>;

    const accionesTenant = (t: TenantStats) => (
        <div className="flex flex-wrap gap-2">
            <button
                onClick={() => handleEnterTenant(t.id)}
                disabled={switching === t.id}
                className="bg-primary hover:bg-amber-600 disabled:opacity-50 text-slate-900 px-3 py-1 rounded text-xs font-semibold"
            >
                {switching === t.id ? '...' : 'Entrar'}
            </button>
            <button
                onClick={() => setModulosDe(t)}
                className="bg-slate-600 hover:bg-slate-500 text-white px-3 py-1 rounded text-xs font-semibold"
            >
                Módulos
            </button>
            <button
                onClick={() => handleToggleActivo(t)}
                className={`px-3 py-1 rounded text-xs font-semibold ${t.activo ? 'bg-red-700 hover:bg-red-800 text-white' : 'bg-green-700 hover:bg-green-800 text-white'}`}
            >
                {t.activo ? 'Desactivar' : 'Activar'}
            </button>
        </div>
    );

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white break-words">👑 Super Admin — Panel de Plataforma</h1>
                <p className="text-slate-400 mt-1">Gestión global de todos los tenants del sistema</p>
            </div>

            {/* Estadísticas globales */}
            {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
                    {[
                        { label: 'Tenants Total', value: stats.total_tenants },
                        { label: 'Tenants Activos', value: stats.tenants_activos },
                        { label: 'Usuarios', value: stats.total_usuarios },
                        { label: 'Pedidos', value: stats.total_pedidos },
                        { label: 'Clientes', value: stats.total_clientes },
                    ].map(s => (
                        <div key={s.label} className="bg-slate-800 rounded-xl p-4 text-center border border-slate-700">
                            <div className="text-2xl font-bold text-primary">{s.value.toLocaleString()}</div>
                            <div className="text-xs text-slate-400 mt-1">{s.label}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Lista de tenants */}
            <div>
                <h2 className="text-lg font-semibold text-white mb-3">Tenants</h2>
                <DataList
                    items={tenants}
                    getKey={(t) => t.id}
                    columns={[
                        {
                            header: 'Tenant',
                            className: 'w-[20%]',
                            cell: (t) => (
                                <>
                                    <div className="font-medium text-white truncate" title={t.nombre}>{t.nombre}</div>
                                    <div className="text-xs text-slate-500">{t.codigo}</div>
                                </>
                            ),
                        },
                        { header: 'Dominio', className: 'w-[18%]', cell: (t) => <span className="text-slate-400" title={t.dominio_principal || undefined}>{t.dominio_principal || '—'}</span> },
                        { header: 'Usuarios', className: 'w-[8%] text-center', sinTruncar: true, cell: (t) => t.total_usuarios },
                        { header: 'Productos', className: 'w-[9%] text-center', sinTruncar: true, cell: (t) => t.total_productos },
                        { header: 'Clientes', className: 'w-[8%] text-center', sinTruncar: true, cell: (t) => t.total_clientes },
                        { header: 'Pedidos', className: 'w-[8%] text-center', sinTruncar: true, cell: (t) => t.total_pedidos },
                        { header: 'Estado', className: 'w-[8%] text-center', sinTruncar: true, cell: estadoTenant },
                        { header: 'Acciones', className: 'w-[21%] text-center', sinTruncar: true, cell: (t) => <div className="flex justify-center">{accionesTenant(t)}</div> },
                    ]}
                    card={(t) => (
                        <div className="space-y-2 text-slate-300 text-sm">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="font-medium text-white break-words">{t.nombre}</div>
                                    <div className="text-xs text-slate-500">{t.codigo}</div>
                                    <div className="text-xs text-slate-400 break-all">{t.dominio_principal || '—'}</div>
                                </div>
                                <div className="shrink-0">{estadoTenant(t)}</div>
                            </div>
                            <div className="grid grid-cols-4 gap-2 text-center">
                                <div><div className="text-white font-semibold">{t.total_usuarios}</div><div className="text-[11px] text-slate-400">Usuarios</div></div>
                                <div><div className="text-white font-semibold">{t.total_productos}</div><div className="text-[11px] text-slate-400">Productos</div></div>
                                <div><div className="text-white font-semibold">{t.total_clientes}</div><div className="text-[11px] text-slate-400">Clientes</div></div>
                                <div><div className="text-white font-semibold">{t.total_pedidos}</div><div className="text-[11px] text-slate-400">Pedidos</div></div>
                            </div>
                            <div className="pt-2 border-t border-slate-700">{accionesTenant(t)}</div>
                        </div>
                    )}
                />
            </div>

            {modulosDe && (
                <ModulosTenantModal tenant={modulosDe} onClose={() => setModulosDe(null)} />
            )}
        </div>
    );
}
