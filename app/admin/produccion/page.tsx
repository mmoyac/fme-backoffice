
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getOrdenes, finalizarOrden, deleteOrden, OrdenProduccion } from '@/lib/api/produccion';
import { getLocales, Local } from '@/lib/api/locales';
import { getProductos } from '@/lib/api/productos';

export default function ProduccionPage() {
    const [ordenes, setOrdenes] = useState<OrdenProduccion[]>([]);
    const [locales, setLocales] = useState<Record<number, string>>({});
    const [productosMap, setProductosMap] = useState<Record<number, string>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            setLoading(true);
            const [ordenesData, localesData, productosData] = await Promise.all([
                getOrdenes(),
                getLocales(),
                getProductos()
            ]);

            setOrdenes(ordenesData);

            // Map locales for easy lookup
            const localesMap: Record<number, string> = {};
            localesData.forEach(l => localesMap[l.id] = l.nombre);
            setLocales(localesMap);

            // Map productos
            const pMap: Record<number, string> = {};
            productosData.forEach(p => pMap[p.id] = p.nombre);
            setProductosMap(pMap);

            setError(null);
        } catch (err) {
            setError('Error al cargar datos');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    // Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedOrden, setSelectedOrden] = useState<OrdenProduccion | null>(null);
    const [ajustes, setAjustes] = useState<Record<number, string>>({}); // detalle_id -> cantidad_real
    const [notasCierre, setNotasCierre] = useState('');
    const [submitting, setSubmitting] = useState(false);

    async function handleDelete(id: number) {
        if (!confirm('¿Seguro que desea eliminar esta orden?')) return;
        try {
            await deleteOrden(id);
            // Optimistic update or reload
            setOrdenes(ordenes.filter(o => o.id !== id));
        } catch (err: any) {
            alert(err.message || 'Error al eliminar');
        }
    }

    function openFinalizarModal(orden: OrdenProduccion) {
        const initialAjustes: Record<number, string> = {};
        orden.detalles.forEach(d => {
            initialAjustes[d.id] = d.cantidad_programada.toString();
        });
        setAjustes(initialAjustes);
        setSelectedOrden(orden);
        setNotasCierre('');
        setModalOpen(true);
    }

    async function confirmFinalizar() {
        if (!selectedOrden) return;
        setSubmitting(true);
        try {
            // Construir payload
            const payload = {
                detalles_ajustes: Object.entries(ajustes).map(([detId, qty]) => ({
                    detalle_id: Number(detId),
                    cantidad_producida_real: Number(qty)
                })),
                insumos_ajustes: [], // Por ahora vacio, implementaremos UI de insumos luego si se pide
                notas_finalizacion: notasCierre
            };

            await finalizarOrden(selectedOrden.id, payload);
            await loadData();
            setModalOpen(false);
            alert('Orden finalizada con éxito');
        } catch (err: any) {
            alert(err.message || 'Error al finalizar orden');
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-400">Cargando producción...</div>
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
                <h1 className="text-3xl font-bold text-white">Producción</h1>
                <Link
                    href="/admin/produccion/nuevo"
                    className="bg-primary hover:bg-primary-dark text-slate-900 font-semibold px-6 py-2 rounded-lg transition-colors"
                >
                    + Nueva Orden
                </Link>
            </div>

            {ordenes.length === 0 ? (
                <div className="bg-slate-800 rounded-lg p-8 text-center text-gray-400">
                    No hay órdenes de producción activas.
                </div>
            ) : (
                <div className="bg-slate-800 rounded-lg overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">ID</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Local</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Fecha Prog.</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Estado</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Notas</th>
                                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-300">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {ordenes.map((orden) => (
                                <tr key={orden.id} className="hover:bg-slate-700/50">
                                    <td className="px-6 py-4 text-sm text-gray-300">#{orden.id}</td>
                                    <td className="px-6 py-4 text-sm text-white">{locales[orden.local_id] || orden.local_id}</td>
                                    <td className="px-6 py-4 text-sm text-gray-300">
                                        {new Date(orden.fecha_programada).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        <span
                                            className={`px-2 py-1 rounded text-xs font-bold ${orden.estado === 'FINALIZADA' ? 'bg-green-900 text-green-300' :
                                                orden.estado === 'PLANIFICADA' ? 'bg-blue-900 text-blue-300' :
                                                    'bg-gray-700 text-gray-300'
                                                }`}
                                        >
                                            {orden.estado}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-400 italic">
                                        {orden.notas || '-'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-right space-x-2 flex justify-end">
                                        <Link
                                            href={`/admin/produccion/${orden.id}/imprimir`}
                                            target="_blank"
                                            className="bg-slate-700 hover:bg-slate-600 text-gray-200 px-3 py-1 rounded text-xs flex items-center gap-1"
                                            title="Imprimir Hoja de Producción"
                                        >
                                            🖨️
                                        </Link>

                                        {orden.estado === 'PLANIFICADA' && (
                                            <>
                                                <button
                                                    onClick={() => openFinalizarModal(orden)}
                                                    className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded text-xs"
                                                >
                                                    ✓ Finalizar
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(orden.id)}
                                                    className="bg-red-900/40 hover:bg-red-900/60 text-red-400 border border-red-900 px-3 py-1 rounded text-xs"
                                                >
                                                    🗑️
                                                </button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal de Finalización */}
            {modalOpen && selectedOrden && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-slate-800 rounded-lg p-6 max-w-lg w-full shadow-xl border border-slate-700">
                        <h2 className="text-xl font-bold text-white mb-4">Finalizar Producción</h2>
                        <p className="text-sm text-gray-400 mb-4">
                            Confirme las cantidades reales producidas. El inventario de insumos se descontará proporcionalmente.
                        </p>

                        <div className="space-y-4 mb-6">
                            {selectedOrden.detalles.map(det => (
                                <div key={det.id} className="flex justify-between items-center bg-slate-700 p-3 rounded">
                                    <span className="text-white text-sm font-medium">
                                        {productosMap[det.producto_id] || `Prod #${det.producto_id}`}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-400">Prog: {det.cantidad_programada}</span>
                                        <label className="text-xs text-gray-300">Real:</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            className="w-24 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-right"
                                            value={ajustes[det.id] || ''}
                                            onChange={(e) => setAjustes({ ...ajustes, [det.id]: e.target.value })}
                                        />
                                    </div>
                                </div>
                            ))}

                            <div>
                                <label className="block text-sm text-gray-300 mb-1">Notas de Cierre / Mermas</label>
                                <textarea
                                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                                    rows={2}
                                    value={notasCierre}
                                    onChange={(e) => setNotasCierre(e.target.value)}
                                    placeholder="Ingrese observaciones..."
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setModalOpen(false)}
                                className="px-4 py-2 rounded text-gray-300 hover:bg-slate-700"
                                disabled={submitting}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmFinalizar}
                                disabled={submitting}
                                className="px-4 py-2 rounded bg-green-600 hover:bg-green-500 text-white font-bold"
                            >
                                {submitting ? 'Procesando...' : 'Confirmar y Finalizar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
