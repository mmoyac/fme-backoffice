'use client';

// Impresión de etiquetas nutricionales de una OP finalizada (fecha de elaboración + lote OP-<id>)
import { useEffect, useMemo, useRef, useState } from 'react';
import { setEtiquetasImpresas, type OrdenProduccion } from '@/lib/api/produccion';
import { getEtiquetaCompleta, type EtiquetaCompleta } from '@/lib/api/etiquetas';
import EtiquetaNutricional, {
    CONFIGS_ETIQUETA, esFormatoEmpresa, problemaSellos, type LoteEtiqueta, type TamanoEtiqueta,
} from '@/components/etiquetas/EtiquetaNutricional';
import { generarPdfEtiquetas, descargarPdf, imprimirPdf } from '@/lib/etiquetas/pdf';

interface FilaEtiqueta {
    detalleId: number;
    productoId: number;
    nombre: string;
    producida: number;
    etiqueta: EtiquetaCompleta | null; // null = sin información nutricional
}

/** Copias sugeridas: una por envase si hay porciones por envase; si no, una por unidad producida. */
export function copiasSugeridas(producida: number, porcionesPorEnvase?: number | null): number {
    if (!(producida > 0)) return 0;
    if (porcionesPorEnvase && porcionesPorEnvase > 0) return Math.ceil(producida / porcionesPorEnvase);
    return Math.ceil(producida);
}

function formatearFecha(iso?: string): string {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
        .replace(/-/g, '/');
}

export function EtiquetasOrdenModal({
    orden, productosMap, onCerrar, esAdmin = false, onActualizada,
}: {
    orden: OrdenProduccion;
    productosMap: Record<number, string>;
    onCerrar: () => void;
    esAdmin?: boolean;
    /** Se llama cuando cambia la marca de etiquetas impresas. */
    onActualizada?: (orden: OrdenProduccion) => void;
}) {
    // Control manual de impresión (change add-control-etiquetas-op)
    const [impresas, setImpresas] = useState({
        at: orden.etiquetas_impresas_at ?? null,
        por: orden.etiquetas_impresas_por ?? null,
    });
    const [marcando, setMarcando] = useState(false);
    const [generado, setGenerado] = useState(false);
    const [desbordes, setDesbordes] = useState<Record<number, boolean>>({});
    const marcarDesborde = (detalleId: number) => (d: boolean) =>
        setDesbordes(prev => (prev[detalleId] === d ? prev : { ...prev, [detalleId]: d }));

    const cambiarMarca = async (marcar: boolean) => {
        if (!marcar && !confirm('¿Desmarcar las etiquetas de esta orden como impresas?')) return;
        try {
            setMarcando(true);
            setError('');
            const actualizada = await setEtiquetasImpresas(orden.id, marcar);
            setImpresas({ at: actualizada.etiquetas_impresas_at ?? null, por: actualizada.etiquetas_impresas_por ?? null });
            onActualizada?.(actualizada);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Error al actualizar las etiquetas');
        } finally {
            setMarcando(false);
        }
    };
    const fechaHora = (iso: string) => new Date(iso).toLocaleString('es-CL', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

    const [filas, setFilas] = useState<FilaEtiqueta[]>([]);
    const [copias, setCopias] = useState<Record<number, string>>({});
    const [tamano, setTamano] = useState<TamanoEtiqueta>('62x100');
    const [cargando, setCargando] = useState(true);
    const [generando, setGenerando] = useState(false);
    const [error, setError] = useState('');
    const nodosRef = useRef<Record<number, HTMLDivElement | null>>({});

    const lote: LoteEtiqueta = useMemo(() => ({
        fecha: formatearFecha(orden.fecha_finalizacion),
        codigo: `OP-${orden.id}`,
    }), [orden]);

    useEffect(() => {
        let activo = true;
        (async () => {
            const resultados = await Promise.allSettled(
                orden.detalles.map(d => getEtiquetaCompleta(d.producto_id))
            );
            if (!activo) return;
            const nuevas: FilaEtiqueta[] = orden.detalles.map((d, i) => {
                const r = resultados[i];
                const etiqueta = r.status === 'fulfilled' && r.value.informacion_nutricional ? r.value : null;
                return {
                    detalleId: d.id,
                    productoId: d.producto_id,
                    nombre: productosMap[d.producto_id] || (r.status === 'fulfilled' ? r.value.producto_nombre : `Producto ${d.producto_id}`),
                    producida: Number(d.cantidad_producida ?? 0),
                    etiqueta,
                };
            });
            setFilas(nuevas);
            setCopias(Object.fromEntries(nuevas.map(f => [
                f.detalleId,
                f.etiqueta ? String(copiasSugeridas(f.producida, f.etiqueta.informacion_nutricional?.porciones_por_envase)) : '0',
            ])));
            setCargando(false);
        })();
        return () => { activo = false; };
    }, [orden, productosMap]);

    const copiasDe = (f: FilaEtiqueta) => (f.etiqueta ? Math.max(0, Math.floor(Number(copias[f.detalleId]) || 0)) : 0);
    const seleccionadas = filas.filter(f => copiasDe(f) > 0);
    const totalPaginas = seleccionadas.reduce((s, f) => s + copiasDe(f), 0);
    // Sellos que no alcanzan su tamaño legal en el formato elegido: no se permite imprimir
    const bloqueadoPorSellos = seleccionadas.some(f => !!problemaSellos(tamano, f.etiqueta?.sellos?.length ?? 0));

    const generar = async () => {
        const items = seleccionadas
            .map(f => ({ nodo: nodosRef.current[f.detalleId], copias: copiasDe(f) }))
            .filter((it): it is { nodo: HTMLDivElement; copias: number } => !!it.nodo);
        return generarPdfEtiquetas(items, tamano);
    };

    const ejecutar = async (accion: 'descargar' | 'imprimir') => {
        if (bloqueadoPorSellos) return;
        try {
            setGenerando(true);
            setError('');
            const pdf = await generar();
            if (!pdf) return;
            if (accion === 'descargar') descargarPdf(pdf, `etiquetas_OP-${orden.id}_${tamano}.pdf`);
            else imprimirPdf(pdf);
            setGenerado(true);
        } catch (e) {
            console.error('Error generando etiquetas:', e);
            setError('Error al generar el PDF de etiquetas');
        } finally {
            setGenerando(false);
        }
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                <div className="bg-slate-800 rounded-lg p-6 max-w-2xl w-full shadow-xl border border-slate-700 max-h-[90vh] overflow-auto">
                    <h2 className="text-xl font-bold text-white mb-1">🏷️ Etiquetas OP #{orden.id}</h2>
                    <p className="text-sm text-gray-400 mb-4">
                        Fecha de elaboración / Lote: <span className="text-gray-200">{lote.fecha} / Lote {lote.codigo}</span>
                    </p>

                    {impresas.at && (
                        <div className="mb-4 px-3 py-2 rounded border border-amber-700 bg-amber-900/30 text-amber-200 text-sm">
                            ⚠️ Las etiquetas de esta orden ya se marcaron como impresas el {fechaHora(impresas.at)}
                            {impresas.por && <> por {impresas.por.nombre_completo || impresas.por.email}</>}.
                            Si las vuelves a imprimir, revisa que no queden duplicadas.
                        </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 mb-4">
                        <label className="text-sm text-gray-300">Formato:</label>
                        <select
                            value={tamano}
                            onChange={e => setTamano(e.target.value as TamanoEtiqueta)}
                            className="bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 text-sm"
                        >
                            {Object.entries(CONFIGS_ETIQUETA).map(([key, val]) => (
                                <option key={key} value={key}>{val.nombre}</option>
                            ))}
                        </select>
                    </div>

                    {cargando ? (
                        <p className="text-gray-400 py-6 text-center">Cargando etiquetas...</p>
                    ) : (
                        <table className="w-full text-sm mb-4">
                            <thead>
                                <tr className="text-gray-400 border-b border-slate-700">
                                    <th className="text-left py-2">Producto</th>
                                    <th className="text-right py-2">Producida</th>
                                    <th className="text-right py-2 w-28">Copias</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filas.map(f => (
                                    <tr key={f.detalleId} className={`border-b border-slate-700/50 ${f.etiqueta ? 'text-gray-200' : 'text-gray-500'}`}>
                                        <td className="py-2">
                                            {f.nombre}
                                            {!f.etiqueta && (
                                                <span className="block text-xs text-amber-400">sin información nutricional</span>
                                            )}
                                            {f.etiqueta && copiasDe(f) > 0 && problemaSellos(tamano, f.etiqueta.sellos?.length ?? 0) && (
                                                <span className="block text-xs text-red-400">⛔ {problemaSellos(tamano, f.etiqueta.sellos?.length ?? 0)}</span>
                                            )}
                                            {esFormatoEmpresa(tamano) && desbordes[f.detalleId] && copiasDe(f) > 0 && !problemaSellos(tamano, f.etiqueta?.sellos?.length ?? 0) && (
                                                <span className="block text-xs text-amber-400">texto demasiado largo para este formato: parte no cabe</span>
                                            )}
                                        </td>
                                        <td className="py-2 text-right">{f.producida}</td>
                                        <td className="py-2 text-right">
                                            <input
                                                type="number"
                                                min={0}
                                                step={1}
                                                disabled={!f.etiqueta}
                                                value={copias[f.detalleId] ?? '0'}
                                                onChange={e => setCopias(c => ({ ...c, [f.detalleId]: e.target.value }))}
                                                className="w-20 bg-slate-700 text-white px-2 py-1 rounded border border-slate-600 text-right disabled:opacity-40"
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

                    {/* Confirmación manual: generar el PDF no marca la orden */}
                    <div className="mb-4 px-3 py-3 rounded border border-slate-600 bg-slate-900/40 flex flex-wrap items-center justify-between gap-2">
                        {impresas.at ? (
                            <>
                                <span className="text-sm text-green-300">✅ Etiquetas marcadas como impresas</span>
                                {esAdmin && (
                                    <button
                                        onClick={() => cambiarMarca(false)}
                                        disabled={marcando}
                                        className="text-xs text-gray-400 hover:text-red-400 underline disabled:opacity-50"
                                    >
                                        Desmarcar
                                    </button>
                                )}
                            </>
                        ) : (
                            <>
                                <span className="text-sm text-gray-300">
                                    {generado
                                        ? '¿Las etiquetas salieron bien? Confírmalo para dar la orden por etiquetada.'
                                        : 'Después de imprimir y revisar las etiquetas, márcalas como impresas.'}
                                </span>
                                <button
                                    onClick={() => cambiarMarca(true)}
                                    disabled={marcando}
                                    className={`px-3 py-1.5 rounded text-sm text-white disabled:opacity-50 ${generado ? 'bg-amber-600 hover:bg-amber-500' : 'bg-slate-600 hover:bg-slate-500'}`}
                                >
                                    {marcando ? '⏳ Guardando...' : '✓ Marcar como impresas'}
                                </button>
                            </>
                        )}
                    </div>

                    {bloqueadoPorSellos && (
                        <p className="text-red-400 text-sm mb-3">
                            No se puede imprimir: hay productos cuyos sellos &quot;ALTO EN&quot; no alcanzan su tamaño legal en este formato. Elige 75 × 62 mm.
                        </p>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm text-gray-400">Total: {totalPaginas} etiqueta{totalPaginas === 1 ? '' : 's'}</span>
                        <div className="flex gap-2">
                            <button
                                onClick={onCerrar}
                                className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded text-sm"
                            >
                                Cerrar
                            </button>
                            <button
                                onClick={() => ejecutar('descargar')}
                                disabled={generando || cargando || totalPaginas === 0 || bloqueadoPorSellos}
                                className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
                            >
                                {generando ? '⏳ Generando...' : '📥 Descargar PDF'}
                            </button>
                            <button
                                onClick={() => ejecutar('imprimir')}
                                disabled={generando || cargando || totalPaginas === 0 || bloqueadoPorSellos}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
                            >
                                {generando ? '⏳ Generando...' : '🖨️ Imprimir'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Render oculto a tamaño real para la generación del PDF */}
            <div style={{ position: 'fixed', left: '-10000px', top: 0, zIndex: -1, pointerEvents: 'none' }}>
                {seleccionadas.map(f => (
                    <EtiquetaNutricional
                        key={f.detalleId}
                        ref={el => { nodosRef.current[f.detalleId] = el; }}
                        etiqueta={f.etiqueta!}
                        tamano={tamano}
                        lote={lote}
                        onDesborde={marcarDesborde(f.detalleId)}
                    />
                ))}
            </div>
        </>
    );
}
