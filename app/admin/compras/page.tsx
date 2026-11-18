'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getCompras, Compra, deleteCompra, recibirCompra } from '@/lib/api/compras';
import { getProveedores, Proveedor } from '@/lib/api/compras';
import { getLocales, Local } from '@/lib/api/locales';
import DataList, { type Columna } from '@/components/ui/DataList';
import PageHeader from '@/components/ui/PageHeader';

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

    const estadoBadge = (estado: string) => (
        <span className={`px-2 py-1 rounded text-xs font-bold ${estado === 'RECIBIDA' ? 'bg-green-900 text-green-300' :
            estado === 'PENDIENTE' ? 'bg-yellow-900 text-yellow-300' :
                'bg-gray-700 text-gray-400'
            }`}>
            {estado}
        </span>
    );

    const acciones = (compra: Compra) => (
        <div className="flex flex-wrap gap-x-3 gap-y-1 md:justify-end" onClick={(e) => e.stopPropagation()}>
            <Link
                href={`/admin/compras/${compra.id}/detalle`}
                className="text-gray-300 hover:text-white font-medium text-sm transition-colors whitespace-nowrap"
                title="Ver Detalle"
            >
                👁️ Ver
            </Link>
            {compra.estado === 'PENDIENTE' && (
                <>
                    <button
                        onClick={() => handleRecibir(compra.id)}
                        className="text-blue-400 hover:text-blue-300 font-medium text-sm transition-colors whitespace-nowrap"
                        title="Recibir Mercadería"
                    >
                        📥 Recibir
                    </button>
                    <Link
                        href={`/admin/compras/${compra.id}`}
                        className="text-yellow-400 hover:text-yellow-300 font-medium text-sm transition-colors whitespace-nowrap"
                        title="Editar"
                    >
                        ✏️ Editar
                    </Link>
                    <button
                        onClick={() => handleDelete(compra.id)}
                        className="text-red-400 hover:text-red-300 font-medium text-sm transition-colors whitespace-nowrap"
                        title="Eliminar"
                    >
                        🗑️ Borrar
                    </button>
                </>
            )}
        </div>
    );

    const nombreProveedor = (c: Compra) => proveedores[c.proveedor_id] || `Prov #${c.proveedor_id}`;
    const nombreLocal = (c: Compra) => locales[c.local_id] || `Local #${c.local_id}`;
    const documento = (c: Compra) => `${c.tipo_documento_nombre || '-'} ${c.numero_documento || '-'}`;

    const columnas: Columna<Compra>[] = [
        { header: 'ID', className: 'w-[7%]', cell: (c) => <span className="text-gray-300">#{c.id}</span> },
        { header: 'Fecha', className: 'w-[10%]', cell: (c) => <span className="text-gray-300">{new Date(c.fecha_compra).toLocaleDateString()}</span> },
        { header: 'Proveedor', className: 'w-[18%]', cell: (c) => <span className="text-white font-medium" title={nombreProveedor(c)}>{nombreProveedor(c)}</span> },
        { header: 'Local', className: 'w-[11%]', cell: (c) => <span className="text-gray-300">{nombreLocal(c)}</span> },
        { header: 'Documento', className: 'w-[14%]', cell: (c) => <span className="text-gray-300" title={documento(c)}>{documento(c)}</span> },
        { header: 'Monto Total', className: 'w-[11%] text-right', sinTruncar: true, cell: (c) => <span className="text-white font-mono">${c.monto_total.toLocaleString('es-CL')}</span> },
        { header: 'Estado', className: 'w-[10%] text-center', sinTruncar: true, cell: (c) => estadoBadge(c.estado) },
        { header: 'Acciones', className: 'w-[19%] text-right', sinTruncar: true, cell: acciones },
    ];

    return (
        <div>
            <PageHeader
                title="Compras"
                actions={
                    <>
                        <Link
                            href="/admin/compras/proveedores"
                            className="bg-slate-700 hover:bg-slate-600 text-white font-semibold px-6 py-2 rounded-lg transition-colors text-center"
                        >
                            Proveedores
                        </Link>
                        <Link
                            href="/admin/compras/nuevo"
                            className="bg-primary hover:bg-primary-dark text-slate-900 font-semibold px-6 py-2 rounded-lg transition-colors text-center"
                        >
                            + Nueva Compra
                        </Link>
                    </>
                }
            />

            <DataList
                items={compras}
                getKey={(c) => c.id}
                columns={columnas}
                empty="No hay compras registradas."
                card={(c) => (
                    <div className="space-y-2">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="text-white font-medium break-words">{nombreProveedor(c)}</div>
                                <div className="text-xs text-gray-400">
                                    #{c.id} · {new Date(c.fecha_compra).toLocaleDateString()} · {nombreLocal(c)}
                                </div>
                                <div className="text-xs text-gray-400 break-words">{documento(c)}</div>
                            </div>
                            <div className="text-right shrink-0 space-y-1">
                                <div className="text-lg font-bold text-white font-mono">${c.monto_total.toLocaleString('es-CL')}</div>
                                {estadoBadge(c.estado)}
                            </div>
                        </div>
                        <div className="pt-2 border-t border-slate-700">{acciones(c)}</div>
                    </div>
                )}
            />
        </div>
    );
}
