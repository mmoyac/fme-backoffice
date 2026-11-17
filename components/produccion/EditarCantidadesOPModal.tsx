'use client';

// Editar cantidades programadas de una OP planificada (solo admin)
import { useState } from 'react';
import { editarCantidadesOrden, OrdenProduccion } from '@/lib/api/produccion';

export function EditarCantidadesOPModal({
    orden, productosMap, onCerrar, onGuardado,
}: {
    orden: OrdenProduccion;
    productosMap: Record<number, string>;
    onCerrar: () => void;
    onGuardado: () => void;
}) {
    const [cantidades, setCantidades] = useState<Record<number, string>>(
        Object.fromEntries(orden.detalles.map(d => [d.id, String(Number(d.cantidad_programada))]))
    );
    const [motivo, setMotivo] = useState('');
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');

    const guardar = async () => {
        const detalles = orden.detalles.map(d => ({ detalle_id: d.id, cantidad_programada: Number(cantidades[d.id]) }));
        if (detalles.some(d => !(d.cantidad_programada > 0))) {
            setError('Las cantidades deben ser mayores a 0');
            return;
        }
        try {
            setGuardando(true);
            setError('');
            await editarCantidadesOrden(orden.id, detalles, motivo);
            onGuardado();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 rounded-lg p-6 max-w-lg w-full shadow-xl border border-slate-700 space-y-4">
                <h2 className="text-xl font-bold text-white">Editar OP #{orden.id}</h2>
                <p className="text-sm text-gray-400">
                    Cambia cuánto se debe producir. Si la orden viene de un pedido, no puede ser menor a lo que el pedido necesita.
                </p>
                <div className="space-y-2">
                    {orden.detalles.map(d => (
                        <div key={d.id} className="flex items-center justify-between gap-3">
                            <span className="text-white text-sm">{productosMap[d.producto_id] || `Producto ${d.producto_id}`}</span>
                            <input
                                type="number" min={0} step="any"
                                value={cantidades[d.id]}
                                onChange={e => setCantidades(c => ({ ...c, [d.id]: e.target.value }))}
                                className="w-28 bg-slate-700 text-white rounded px-3 py-1.5 text-right"
                            />
                        </div>
                    ))}
                </div>
                <textarea
                    value={motivo} onChange={e => setMotivo(e.target.value)} rows={2}
                    placeholder="Motivo (opcional), ej: producir extra para stock"
                    className="w-full bg-slate-700 text-white rounded px-3 py-2 text-sm"
                />
                {error && <p className="text-sm text-red-400">{error}</p>}
                <div className="flex justify-end gap-2">
                    <button onClick={onCerrar} className="px-4 py-2 rounded bg-slate-600 text-white text-sm">Cancelar</button>
                    <button onClick={guardar} disabled={guardando}
                        className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold disabled:opacity-50">
                        {guardando ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                </div>
            </div>
        </div>
    );
}
