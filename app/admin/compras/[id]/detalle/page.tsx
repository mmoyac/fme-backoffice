'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCompra, Compra, getProveedores, Proveedor } from '@/lib/api/compras';
import { getLocales, Local } from '@/lib/api/locales';
import { getProductos, Producto } from '@/lib/api/productos';
import { getTiposDocumento, TipoDocumento } from '@/lib/api/maestras';

export default function DetalleCompraPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const id = Number(params.id);

    const [compra, setCompra] = useState<Compra | null>(null);
    const [proveedores, setProveedores] = useState<Record<number, string>>({});
    const [locales, setLocales] = useState<Record<number, string>>({});
    const [productos, setProductos] = useState<Record<number, Producto>>({});
    const [tiposDocumento, setTiposDocumento] = useState<Record<number, string>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            setLoading(true);
            const [compraData, provs, locs, prods, tipos] = await Promise.all([
                getCompra(id),
                getProveedores(),
                getLocales(),
                getProductos(),
                getTiposDocumento(),
            ]);

            setCompra(compraData);

            const provMap: Record<number, string> = {};
            provs.forEach((p: Proveedor) => (provMap[p.id] = p.nombre));
            setProveedores(provMap);

            const locMap: Record<number, string> = {};
            locs.forEach((l: Local) => (locMap[l.id] = l.nombre));
            setLocales(locMap);

            const prodMap: Record<number, Producto> = {};
            prods.forEach((p: Producto) => (prodMap[p.id] = p));
            setProductos(prodMap);

            const tipoMap: Record<number, string> = {};
            tipos.forEach((t: TipoDocumento) => (tipoMap[t.id] = t.nombre));
            setTiposDocumento(tipoMap);

            setError(null);
        } catch (err: any) {
            setError(err.message || 'Error al cargar la compra');
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-400">Cargando...</div>
            </div>
        );
    }

    if (error || !compra) {
        return (
            <div className="max-w-5xl">
                <div className="bg-red-900/20 border border-red-500 text-red-200 px-4 py-3 rounded mb-4">
                    {error || 'Compra no encontrada'}
                </div>
                <button
                    onClick={() => router.push('/admin/compras')}
                    className="px-6 py-2 rounded text-gray-300 hover:bg-slate-700"
                >
                    ← Volver
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-5xl">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-white">Compra #{compra.id}</h1>
                <span
                    className={`px-3 py-1 rounded text-xs font-bold ${compra.estado === 'RECIBIDA'
                        ? 'bg-green-900 text-green-300'
                        : compra.estado === 'PENDIENTE'
                            ? 'bg-yellow-900 text-yellow-300'
                            : 'bg-gray-700 text-gray-400'
                        }`}
                >
                    {compra.estado}
                </span>
            </div>

            {/* Cabecera */}
            <div className="bg-slate-800 rounded-lg p-6 mb-6">
                <h2 className="text-xl font-bold text-white mb-4">Información General</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="block text-gray-400">Proveedor</span>
                        <span className="text-white">
                            {proveedores[compra.proveedor_id] || `Prov #${compra.proveedor_id}`}
                        </span>
                    </div>
                    <div>
                        <span className="block text-gray-400">Local Destino</span>
                        <span className="text-white">
                            {locales[compra.local_id] || `Local #${compra.local_id}`}
                        </span>
                    </div>
                    <div>
                        <span className="block text-gray-400">Fecha Compra</span>
                        <span className="text-white">
                            {new Date(compra.fecha_compra).toLocaleDateString('es-CL')}
                        </span>
                    </div>
                    <div>
                        <span className="block text-gray-400">Documento</span>
                        <span className="text-white">
                            {(tiposDocumento[compra.tipo_documento_id] || '-')}{' '}
                            {compra.numero_documento || ''}
                        </span>
                    </div>
                    {compra.notas && (
                        <div className="col-span-2">
                            <span className="block text-gray-400">Notas</span>
                            <span className="text-white">{compra.notas}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Detalle */}
            <div className="bg-slate-800 rounded-lg p-6 mb-6">
                <h2 className="text-xl font-bold text-white mb-4">Detalle de Compra</h2>
                <table className="w-full">
                    <thead className="bg-slate-700">
                        <tr>
                            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-300">Producto</th>
                            <th className="px-4 py-2 text-right text-sm font-semibold text-gray-300">Cantidad</th>
                            <th className="px-4 py-2 text-right text-sm font-semibold text-gray-300">Precio Unit.</th>
                            <th className="px-4 py-2 text-right text-sm font-semibold text-gray-300">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {compra.detalles.map((det, idx) => {
                            const producto = productos[det.producto_id];
                            const cantidad = Number(det.cantidad);
                            const precio = Number(det.precio_unitario);
                            const subtotal = cantidad * precio;
                            return (
                                <tr key={idx}>
                                    <td className="px-4 py-2 text-sm text-white">
                                        {producto?.nombre || det.producto_nombre || `Producto #${det.producto_id}`}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-gray-300 text-right">
                                        {cantidad} {producto?.unidad_compra_descripcion || ''}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-gray-300 text-right font-mono">
                                        ${precio.toLocaleString('es-CL')}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-white text-right font-mono">
                                        ${subtotal.toLocaleString('es-CL')}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot>
                        <tr className="bg-slate-700">
                            <td colSpan={3} className="px-4 py-3 text-right text-white font-bold">TOTAL:</td>
                            <td className="px-4 py-3 text-right text-white font-bold font-mono text-lg">
                                ${Number(compra.monto_total).toLocaleString('es-CL')}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <div className="flex justify-end">
                <button
                    onClick={() => router.push('/admin/compras')}
                    className="px-6 py-2 rounded text-gray-300 hover:bg-slate-700"
                >
                    ← Volver
                </button>
            </div>
        </div>
    );
}
