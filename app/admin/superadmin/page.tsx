'use client';

import { useState, useEffect } from 'react';
import { AuthService } from '@/lib/auth';

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

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-white">👑 Super Admin — Panel de Plataforma</h1>
                <p className="text-slate-400 mt-1">Gestión global de todos los tenants del sistema</p>
            </div>

            {/* Estadísticas globales */}
            {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
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
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-700">
                    <h2 className="text-lg font-semibold text-white">Tenants</h2>
                </div>
                <table className="w-full text-left text-slate-300 text-sm">
                    <thead className="bg-slate-900 text-slate-400 uppercase text-xs">
                        <tr>
                            <th className="px-6 py-3">Tenant</th>
                            <th className="px-6 py-3">Dominio</th>
                            <th className="px-6 py-3 text-center">Usuarios</th>
                            <th className="px-6 py-3 text-center">Productos</th>
                            <th className="px-6 py-3 text-center">Clientes</th>
                            <th className="px-6 py-3 text-center">Pedidos</th>
                            <th className="px-6 py-3 text-center">Estado</th>
                            <th className="px-6 py-3 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {tenants.map(t => (
                            <tr key={t.id} className="hover:bg-slate-700/40">
                                <td className="px-6 py-4">
                                    <div className="font-medium text-white">{t.nombre}</div>
                                    <div className="text-xs text-slate-500">{t.codigo}</div>
                                </td>
                                <td className="px-6 py-4 text-slate-400">{t.dominio_principal || '—'}</td>
                                <td className="px-6 py-4 text-center">{t.total_usuarios}</td>
                                <td className="px-6 py-4 text-center">{t.total_productos}</td>
                                <td className="px-6 py-4 text-center">{t.total_clientes}</td>
                                <td className="px-6 py-4 text-center">{t.total_pedidos}</td>
                                <td className="px-6 py-4 text-center">
                                    {t.activo
                                        ? <span className="text-green-400 font-medium">Activo</span>
                                        : <span className="text-red-400 font-medium">Inactivo</span>
                                    }
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex gap-2 justify-center">
                                        <button
                                            onClick={() => handleEnterTenant(t.id)}
                                            disabled={switching === t.id}
                                            className="bg-primary hover:bg-amber-600 disabled:opacity-50 text-slate-900 px-3 py-1 rounded text-xs font-semibold"
                                        >
                                            {switching === t.id ? '...' : 'Entrar'}
                                        </button>
                                        <button
                                            onClick={() => handleToggleActivo(t)}
                                            className={`px-3 py-1 rounded text-xs font-semibold ${t.activo ? 'bg-red-700 hover:bg-red-800 text-white' : 'bg-green-700 hover:bg-green-800 text-white'}`}
                                        >
                                            {t.activo ? 'Desactivar' : 'Activar'}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
