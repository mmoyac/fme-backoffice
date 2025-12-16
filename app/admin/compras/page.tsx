'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getCompras, Compra, deleteCompra, recibirCompra } from '@/lib/api/compras';
import { getProveedores, Proveedor } from '@/lib/api/compras';
import { getLocales, Local } from '@/lib/api/locales';

export default function ComprasPage() {
    const [compras, setCompras] = useState<Compra[]>([]);
    const [proveedores, setProveedores] = useState<Record<number, string>>({});
    const [locales, setLocales] = useState<Record<number, string>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            setLoading(true);
            const [comprasData, proveedoresData, localesData] = await Promise.all([
                getCompras(),
                getProveedores(),
                getLocales()
            ]);

            setCompras(comprasData);

            const provMap: Record<number, string> = {};
            proveedoresData.forEach(p => provMap[p.id] = p.nombre);
            setProveedores(provMap);

            const locMap: Record<number, string> = {};
            localesData.forEach(l => locMap[l.id] = l.nombre);
            setLocales(locMap);

            setError(null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    const handleRecibir = async (id: number) => {
        if (!confirm('¿Confirma la recepción de la mercadería? Esto sumará el stock de los productos.')) return;
        try {
            await recibirCompra(id);
            // Recargar datos para asegurar consistencia o actualizar estado localmente
            setCompras(prev => prev.map(c => c.id === id ? { ...c, estado: 'RECIBIDA' } : c));
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('¿Seguro que desea eliminar esta compra?')) return;
        try {
            await deleteCompra(id);
            setCompras(prev => prev.filter(c => c.id !== id));
        } catch (err: any) {
            alert(err.message);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-400">Cargando compras...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-900/20 border border-red-500 text-red-200 px-4 py-3 rounded">
                {error}
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-white">Compras</h1>
                <div className="flex gap-3">
                    <Link
                        href="/admin/compras/proveedores"
                        className="bg-slate-700 hover:bg-slate-600 text-white font-semibold px-6 py-2 rounded-lg transition-colors"
                    >
                        Proveedores
                    </Link>
                    <Link
                        href="/admin/compras/nuevo"
                        className="bg-primary hover:bg-primary-dark text-slate-900 font-semibold px-6 py-2 rounded-lg transition-colors"
                    >
                        + Nueva Compra
                    </Link>
                </div>
            </div>

            {compras.length === 0 ? (
                <div className="bg-slate-800 rounded-lg p-8 text-center text-gray-400">
                    No hay compras registradas.
                </div>
            ) : (
                <div className="bg-slate-800 rounded-lg overflow-hidden overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">ID</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Fecha</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Proveedor</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Local</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Documento</th>
                                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-300">Monto Total</th>
                                <th className="px-6 py-3 text-center text-sm font-semibold text-gray-300">Estado</th>
                                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-300">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {compras.map((compra) => (
                                <tr key={compra.id} className="hover:bg-slate-700/50">
                                    <td className="px-6 py-4 text-sm text-gray-300">#{compra.id}</td>
                                    <td className="px-6 py-4 text-sm text-gray-300">
                                        {new Date(compra.fecha_compra).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-white font-medium">
                                        {proveedores[compra.proveedor_id] || `Prov #${compra.proveedor_id}`}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-300">
                                        {locales[compra.local_id] || `Local #${compra.local_id}`}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-300">
                                        {compra.tipo_documento_nombre || '-'} {compra.numero_documento || '-'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-white text-right font-mono">
                                        ${compra.monto_total.toLocaleString('es-CL')}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${compra.estado === 'RECIBIDA' ? 'bg-green-900 text-green-300' :
                                            compra.estado === 'PENDIENTE' ? 'bg-yellow-900 text-yellow-300' :
                                                'bg-gray-700 text-gray-400'
                                            }`}>
                                            {compra.estado}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right space-x-3">
                                        {compra.estado === 'PENDIENTE' && (
                                            <>
                                                <button
                                                    onClick={() => handleRecibir(compra.id)}
                                                    className="text-blue-400 hover:text-blue-300 font-medium text-sm transition-colors"
                                                    title="Recibir Mercadería"
                                                >
                                                    📥 Recibir
                                                </button>
                                                <Link
                                                    href={`/admin/compras/${compra.id}`}
                                                    className="text-yellow-400 hover:text-yellow-300 font-medium text-sm transition-colors"
                                                    title="Editar"
                                                >
                                                    ✏️ Editar
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(compra.id)}
                                                    className="text-red-400 hover:text-red-300 font-medium text-sm transition-colors"
                                                    title="Eliminar"
                                                >
                                                    🗑️ Borrar
                                                </button>
                                            </>
                                        )}
                                        {compra.estado === 'RECIBIDA' && (
                                            <span className="text-green-500 text-xs text-opacity-70">Procesada</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
