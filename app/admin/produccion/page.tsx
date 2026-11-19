
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getOrdenes, finalizarOrden, deleteOrden, OrdenProduccion, UsuarioRef, esAdminProduccion } from '@/lib/api/produccion';
import { getLocales, Local } from '@/lib/api/locales';
import { getProductos } from '@/lib/api/productos';
import { useAuth } from '@/lib/AuthProvider';
import { EditarCantidadesOPModal } from '@/components/produccion/EditarCantidadesOPModal';
import { EtiquetasOrdenModal } from '@/components/produccion/EtiquetasOrdenModal';
import { tieneModulo } from '@/lib/modulos';
import DataList, { type Columna } from '@/components/ui/DataList';
import PageHeader from '@/components/ui/PageHeader';

const nombreUsuario = (u?: UsuarioRef | null) => (u ? (u.nombre_completo || u.email) : '-');

export default function ProduccionPage() {
    const { user } = useAuth();
    const esAdmin = esAdminProduccion(user);
    const [ordenes, setOrdenes] = useState<OrdenProduccion[]>([]);
    const [locales, setLocales] = useState<Record<number, string>>({});
    const [productosMap, setProductosMap] = useState<Record<number, string>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [ordenEditar, setOrdenEditar] = useState<OrdenProduccion | null>(null);
    const [ordenEtiquetas, setOrdenEtiquetas] = useState<OrdenProduccion | null>(null);
    const puedeEtiquetar = tieneModulo(user, 'etiquetado');

    // Filtros (client-side)
    const [filtroEstado, setFiltroEstado] = useState('');
    const [filtroLocal, setFiltroLocal] = useState('');
    const [filtroProducto, setFiltroProducto] = useState('');
    const [filtroDesde, setFiltroDesde] = useState('');
    const [filtroHasta, setFiltroHasta] = useState('');
    const [filtroEtiquetas, setFiltroEtiquetas] = useState(''); // '' | 'pendientes' | 'impresas'

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
    const [motivos, setMotivos] = useState<Record<number, string>>({}); // detalle_id -> motivo diferencia
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
        setMotivos({});
        setSelectedOrden(orden);
        setNotasCierre('');
        setModalOpen(true);
    }

    async function confirmFinalizar() {
        if (!selectedOrden) return;
        if (Object.values(ajustes).some(q => q === '' || Number(q) < 0 || isNaN(Number(q)))) {
            alert('Ingrese cantidades reales válidas (0 o mayor)');
            return;
        }
        setSubmitting(true);
        try {
            // Construir payload
            const payload = {
                detalles_ajustes: Object.entries(ajustes).map(([detId, qty]) => ({
                    detalle_id: Number(detId),
                    cantidad_producida_real: Number(qty),
                    motivo_diferencia: motivos[Number(detId)]?.trim() || undefined,
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

    const estadoBadge = (orden: OrdenProduccion) => (
        <span
            className={`px-2 py-1 rounded text-xs font-bold ${orden.estado === 'FINALIZADA' ? 'bg-green-900 text-green-300' :
                orden.estado === 'PLANIFICADA' ? 'bg-blue-900 text-blue-300' :
                    'bg-gray-700 text-gray-300'
                }`}
        >
            {orden.estado}
        </span>
    );

    const pedidoProducido = (orden: OrdenProduccion) => (
        <div className="text-sm text-gray-300 min-w-0">
            {orden.detalles.map(d => (
                <div key={d.id} className="break-words">
                    <span className="text-white">{productosMap[d.producto_id] || `Prod #${d.producto_id}`}</span>
                    {': '}{Number(d.cantidad_programada)}
                    {d.cantidad_producida != null && (
                        <>
                            {' → '}{Number(d.cantidad_producida)}
                            {d.diferencia != null && Number(d.diferencia) !== 0 && (
                                <span className={`ml-1 font-bold ${Number(d.diferencia) < 0 ? 'text-red-400' : 'text-green-400'}`}>
                                    ({Number(d.diferencia) > 0 ? '+' : ''}{Number(d.diferencia)})
                                </span>
                            )}
                        </>
                    )}
                    {d.motivo_diferencia && (
                        <div className="text-xs text-gray-400 italic">Motivo: {d.motivo_diferencia}</div>
                    )}
                </div>
            ))}
            <div className="text-xs text-gray-500 mt-1">
                Pidió: {nombreUsuario(orden.solicitado_por)}
                {orden.producido_por && <> · Produjo: {nombreUsuario(orden.producido_por)}</>}
            </div>
        </div>
    );

    const acciones = (orden: OrdenProduccion) => (
        <div className="flex flex-wrap gap-2 md:justify-end">
            <Link
                href={`/admin/produccion/${orden.id}/imprimir`}
                target="_blank"
                className="bg-slate-700 hover:bg-slate-600 text-gray-200 px-3 py-1 rounded text-xs flex items-center gap-1"
                title="Imprimir Hoja de Producción"
            >
                🖨️
            </Link>

            {orden.estado === 'FINALIZADA' && puedeEtiquetar && (
                <button
                    onClick={() => setOrdenEtiquetas(orden)}
                    className="bg-slate-700 hover:bg-slate-600 text-gray-200 px-3 py-1 rounded text-xs flex items-center gap-1"
                    title="Imprimir etiquetas nutricionales"
                >
                    🏷️
                </button>
            )}

            {orden.estado === 'PLANIFICADA' && (
                <>
                    <button
                        onClick={() => openFinalizarModal(orden)}
                        className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded text-xs"
                    >
                        ✓ Finalizar
                    </button>
                    {esAdmin && (
                        <button
                            onClick={() => setOrdenEditar(orden)}
                            className="bg-blue-700 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs"
                            title="Editar cantidades"
                        >
                            ✎ Editar
                        </button>
                    )}
                    {esAdmin && (
                        <button
                            onClick={() => handleDelete(orden.id)}
                            className="bg-red-900/40 hover:bg-red-900/60 text-red-400 border border-red-900 px-3 py-1 rounded text-xs"
                        >
                            🗑️
                        </button>
                    )}
                </>
            )}
        </div>
    );

    const textoProducto = filtroProducto.trim().toLowerCase();
    const ordenesFiltradas = ordenes.filter(o => {
        if (filtroEstado && o.estado !== filtroEstado) return false;
        if (filtroLocal && String(o.local_id) !== filtroLocal) return false;
        const fecha = (o.fecha_programada || '').slice(0, 10);
        if (filtroDesde && fecha < filtroDesde) return false;
        if (filtroHasta && fecha > filtroHasta) return false;
        if (filtroEtiquetas === 'pendientes' && !(o.estado === 'FINALIZADA' && !o.etiquetas_impresas_at)) return false;
        if (filtroEtiquetas === 'impresas' && !o.etiquetas_impresas_at) return false;
        if (textoProducto && !o.detalles.some(d =>
            (productosMap[d.producto_id] || '').toLowerCase().includes(textoProducto)
        )) return false;
        return true;
    });
    const hayFiltros = !!(filtroEstado || filtroLocal || filtroProducto || filtroDesde || filtroHasta || filtroEtiquetas);
    const limpiarFiltros = () => {
        setFiltroEstado(''); setFiltroLocal(''); setFiltroProducto(''); setFiltroDesde(''); setFiltroHasta(''); setFiltroEtiquetas('');
    };

    // Estado de etiquetas en OP finalizadas (control manual)
    const etiquetasBadge = (o: OrdenProduccion) => {
        if (!puedeEtiquetar || o.estado !== 'FINALIZADA') return null;
        if (o.etiquetas_impresas_at) {
            const por = o.etiquetas_impresas_por ? nombreUsuario(o.etiquetas_impresas_por) : '';
            return (
                <span className="block mt-1 text-[11px] text-green-400" title={`Impresas el ${new Date(o.etiquetas_impresas_at).toLocaleString('es-CL')}${por ? ` por ${por}` : ''}`}>
                    🏷️ Impresas {new Date(o.etiquetas_impresas_at).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' })}
                </span>
            );
        }
        return <span className="block mt-1 text-[11px] text-amber-400">🏷️ Etiquetas pendientes</span>;
    };
    const actualizarOrden = (actualizada: OrdenProduccion) =>
        setOrdenes(prev => prev.map(o => (o.id === actualizada.id ? actualizada : o)));
    const inputCls = 'w-full px-3 py-2 rounded bg-slate-800 border border-slate-600 text-white text-sm focus:outline-none focus:border-primary';

    const columnas: Columna<OrdenProduccion>[] = [
        { header: 'ID', className: 'w-[6%]', cell: (o) => <span className="text-gray-300">#{o.id}</span> },
        { header: 'Local', className: 'w-[11%]', cell: (o) => <span className="text-white">{locales[o.local_id] || o.local_id}</span> },
        { header: 'Fecha Prog.', className: 'w-[12%]', sinTruncar: true, cell: (o) => <span className="text-gray-300">{new Date(o.fecha_programada).toLocaleDateString()}</span> },
        { header: 'Estado', className: 'w-[12%]', sinTruncar: true, cell: (o) => <>{estadoBadge(o)}{etiquetasBadge(o)}</> },
        { header: 'Pedido / Producido', className: 'w-[28%]', sinTruncar: true, cell: pedidoProducido },
        { header: 'Notas', className: 'w-[15%]', cell: (o) => <span className="text-gray-400 italic" title={o.notas || undefined}>{o.notas || '-'}</span> },
        { header: 'Acciones', className: 'w-[16%] text-right', sinTruncar: true, cell: acciones },
    ];

    return (
        <div>
            <PageHeader
                title="Producción"
                actions={
                    <Link
                        href="/admin/produccion/ordenes-trabajo"
                        className="text-sm text-gray-400 hover:text-primary transition-colors"
                    >
                        ← Gestionar desde Órdenes de Trabajo
                    </Link>
                }
            />

            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 items-end ${puedeEtiquetar ? 'lg:grid-cols-7' : 'lg:grid-cols-6'}`}>
                <div>
                    <label className="block text-xs text-gray-400 mb-1">Estado</label>
                    <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className={inputCls}>
                        <option value="">Todos</option>
                        <option value="PLANIFICADA">Planificada</option>
                        <option value="FINALIZADA">Finalizada</option>
                        <option value="CANCELADA">Cancelada</option>
                    </select>
                </div>
                {puedeEtiquetar && (
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Etiquetas</label>
                        <select value={filtroEtiquetas} onChange={e => setFiltroEtiquetas(e.target.value)} className={inputCls}>
                            <option value="">Todas</option>
                            <option value="pendientes">Pendientes</option>
                            <option value="impresas">Impresas</option>
                        </select>
                    </div>
                )}
                <div>
                    <label className="block text-xs text-gray-400 mb-1">Local</label>
                    <select value={filtroLocal} onChange={e => setFiltroLocal(e.target.value)} className={inputCls}>
                        <option value="">Todos</option>
                        {Object.entries(locales)
                            .sort((a, b) => a[1].localeCompare(b[1]))
                            .map(([id, nombre]) => <option key={id} value={id}>{nombre}</option>)}
                    </select>
                </div>
                <div className="lg:col-span-2">
                    <label className="block text-xs text-gray-400 mb-1">Producto</label>
                    <input type="text" value={filtroProducto} onChange={e => setFiltroProducto(e.target.value)}
                        placeholder="Buscar producto..." className={inputCls} />
                </div>
                <div>
                    <label className="block text-xs text-gray-400 mb-1">Desde</label>
                    <input type="date" value={filtroDesde} onChange={e => setFiltroDesde(e.target.value)} className={inputCls} />
                </div>
                <div>
                    <label className="block text-xs text-gray-400 mb-1">Hasta</label>
                    <input type="date" value={filtroHasta} onChange={e => setFiltroHasta(e.target.value)} className={inputCls} />
                </div>
            </div>
            <div className="flex items-center justify-between mb-3 text-xs text-gray-400">
                <span>{ordenesFiltradas.length} de {ordenes.length} órdenes</span>
                {hayFiltros && (
                    <button onClick={limpiarFiltros} className="text-primary hover:underline">Limpiar filtros</button>
                )}
            </div>

            <DataList
                items={ordenesFiltradas}
                getKey={(o) => o.id}
                columns={columnas}
                empty={hayFiltros ? 'No hay órdenes que coincidan con los filtros.' : 'No hay órdenes de producción activas.'}
                card={(o) => (
                    <div className="space-y-2">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="text-white font-semibold">OP #{o.id} · <span className="font-normal">{locales[o.local_id] || o.local_id}</span></div>
                                <div className="text-xs text-gray-400">Programada {new Date(o.fecha_programada).toLocaleDateString()}</div>
                            </div>
                            <div className="shrink-0 text-right">{estadoBadge(o)}{etiquetasBadge(o)}</div>
                        </div>
                        {pedidoProducido(o)}
                        {o.notas && <div className="text-xs text-gray-400 italic break-words">{o.notas}</div>}
                        <div className="pt-2 border-t border-slate-700">{acciones(o)}</div>
                    </div>
                )}
            />

            {ordenEditar && (
                <EditarCantidadesOPModal
                    orden={ordenEditar}
                    productosMap={productosMap}
                    onCerrar={() => setOrdenEditar(null)}
                    onGuardado={() => { setOrdenEditar(null); loadData(); }}
                />
            )}

            {ordenEtiquetas && (
                <EtiquetasOrdenModal
                    orden={ordenEtiquetas}
                    productosMap={productosMap}
                    onCerrar={() => setOrdenEtiquetas(null)}
                    esAdmin={esAdmin}
                    onActualizada={actualizarOrden}
                />
            )}

            {/* Modal de Finalización */}
            {modalOpen && selectedOrden && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-slate-800 rounded-lg p-6 max-w-lg w-full shadow-xl border border-slate-700">
                        <h2 className="text-xl font-bold text-white mb-4">Finalizar Producción</h2>
                        <p className="text-sm text-gray-400 mb-4">
                            Confirme las cantidades reales producidas. El inventario de insumos se descontará proporcionalmente.
                        </p>
                        {selectedOrden.notas && (
                            <div className="mb-4 bg-amber-900/30 border border-amber-700 text-amber-100 rounded-lg px-3 py-2 text-sm">
                                <span className="font-semibold">📝 Instrucciones:</span> {selectedOrden.notas}
                            </div>
                        )}

                        <div className="space-y-4 mb-6">
                            {selectedOrden.detalles.map(det => {
                                const real = ajustes[det.id];
                                const dif = real !== '' && real != null && !isNaN(Number(real))
                                    ? Number(real) - Number(det.cantidad_programada)
                                    : null;
                                return (
                                    <div key={det.id} className="bg-slate-700 p-3 rounded space-y-2">
                                        <div className="flex flex-wrap justify-between items-center gap-2">
                                            <span className="text-white text-sm font-medium">
                                                {productosMap[det.producto_id] || `Prod #${det.producto_id}`}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-gray-400">Pedido: {Number(det.cantidad_programada)}</span>
                                                <label className="text-xs text-gray-300">Real:</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.1"
                                                    className="w-24 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-right"
                                                    value={real ?? ''}
                                                    onChange={(e) => setAjustes({ ...ajustes, [det.id]: e.target.value })}
                                                />
                                                {dif != null && dif !== 0 && (
                                                    <span className={`text-xs font-bold ${dif < 0 ? 'text-red-400' : 'text-green-400'}`}>
                                                        {dif > 0 ? '+' : ''}{Math.round(dif * 1000) / 1000}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {dif != null && dif !== 0 && (
                                            <input
                                                type="text"
                                                maxLength={500}
                                                className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-sm"
                                                placeholder="Motivo de la diferencia (opcional)"
                                                value={motivos[det.id] || ''}
                                                onChange={(e) => setMotivos({ ...motivos, [det.id]: e.target.value })}
                                            />
                                        )}
                                    </div>
                                );
                            })}

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
