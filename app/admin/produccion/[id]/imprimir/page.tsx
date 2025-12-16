
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getRequisitosOrden, RequisitoInsumo } from '@/lib/api/produccion';
import { getOrdenes, OrdenProduccion } from '@/lib/api/produccion';
import { getProductos } from '@/lib/api/productos';

export default function ImprimirOrdenPage() {
    const params = useParams();
    const id = Number(params.id);

    const [loading, setLoading] = useState(true);
    const [orden, setOrden] = useState<OrdenProduccion | null>(null);
    const [requisitos, setRequisitos] = useState<RequisitoInsumo[]>([]);
    const [productosMap, setProductosMap] = useState<Record<number, string>>({});
    const [error, setError] = useState<string>('');

    useEffect(() => {
        if (id) loadData();
    }, [id]);

    async function loadData() {
        try {
            // Fetch orden, requirements and products catalogue
            const [ordenes, reqs, productos] = await Promise.all([
                getOrdenes(),
                getRequisitosOrden(id),
                getProductos()
            ]);

            const found = ordenes.find(o => o.id === id);

            if (!found) throw new Error('Orden no encontrada');
            setOrden(found);
            setRequisitos(reqs);

            const pMap: Record<number, string> = {};
            productos.forEach(p => pMap[p.id] = p.nombre);
            setProductosMap(pMap);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }



    if (loading) return <div className="p-8 text-center">Cargando datos para impresión...</div>;
    if (error) return <div className="p-8 text-center text-red-600">Error: {error}</div>;
    if (!orden) return null;

    return (
        <div className="max-w-3xl mx-auto p-8 bg-white text-black print:p-0">
            {/* Header */}
            <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold uppercase">Hoja de Producción</h1>
                    <p className="text-sm mt-1">Orden #{orden.id}</p>
                    <p className="text-sm">Fecha Prog: {new Date(orden.fecha_programada).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                    <p className="font-bold text-lg">Masas Estación</p>
                    <p className="text-sm text-gray-600">Control de Producción</p>
                </div>
            </div>

            {/* Productos a Elaborar */}
            <div className="mb-8">
                <h2 className="text-lg font-bold bg-gray-200 p-2 mb-2 border border-gray-400">1. Plan de Producción</h2>
                <table className="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="border border-gray-300 p-2 text-left">Producto</th>
                            <th className="border border-gray-300 p-2 text-right">Cantidad Prog.</th>
                            <th className="border border-gray-300 p-2 text-right">Cantidad Real</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orden.detalles.map((det, idx) => (
                            <tr key={idx}>
                                <td className="border border-gray-300 p-2">
                                    {productosMap[det.producto_id] || `Producto #${det.producto_id}`}
                                </td>
                                <td className="border border-gray-300 p-2 text-right">{det.cantidad_programada}</td>
                                <td className="border border-gray-300 p-2 text-right w-32">
                                    {det.cantidad_producida !== undefined && det.cantidad_producida !== null
                                        ? det.cantidad_producida
                                        : ''}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Insumos Requeridos */}
            <div className="mb-8">
                <h2 className="text-lg font-bold bg-gray-200 p-2 mb-2 border border-gray-400">2. Requisición de Materias Primas</h2>
                <p className="text-xs mb-2 italic">Cantidades teóricas calculadas según receta estándar.</p>
                <table className="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="border border-gray-300 p-2 text-left">Insumo</th>
                            <th className="border border-gray-300 p-2 text-right">Cantidad Total</th>
                            <th className="border border-gray-300 p-2 text-right">Unidad</th>
                            <th className="border border-gray-300 p-2 text-right">Entregado (Check)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {requisitos.map((req, idx) => (
                            <tr key={idx}>
                                <td className="border border-gray-300 p-2">{req.nombre}</td>
                                <td className="border border-gray-300 p-2 text-right font-mono">{req.cantidad.toFixed(3)}</td>
                                <td className="border border-gray-300 p-2 text-right">{req.unidad}</td>
                                <td className="border border-gray-300 p-2 w-24"></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Notas y Firmas */}
            <div className="grid grid-cols-2 gap-8 mt-12">
                <div className="border border-gray-400 p-4 h-32">
                    <p className="text-sm font-bold mb-2">Notas de Producción / Mermas:</p>
                </div>
                <div className="flex flex-col justify-end">
                    <div className="border-t border-black pt-2 text-center">
                        <p className="text-sm">Firma Responsable de Turno</p>
                    </div>
                </div>
            </div>

            <div className="mt-8 text-center no-print">
                <button
                    onClick={() => window.print()}
                    className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700"
                >
                    Imprimir PDF
                </button>
            </div>

            <style jsx global>{`
                @media print {
                    .no-print { display: none; }
                    body { background: white; }
                }
            `}</style>
        </div>
    );
}
