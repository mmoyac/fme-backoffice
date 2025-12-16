'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getProveedores, Proveedor, updateCompra, getCompra, DetalleCompra } from '@/lib/api/compras';
import { getLocales, Local } from '@/lib/api/locales';
import { getProductos, Producto } from '@/lib/api/productos';
import { getTiposDocumento, TipoDocumento } from '@/lib/api/maestras';

export default function EditarCompraPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const id = Number(params.id);

    const [proveedores, setProveedores] = useState<Proveedor[]>([]);
    const [locales, setLocales] = useState<Local[]>([]);
    const [productos, setProductos] = useState<Producto[]>([]);
    const [tiposDocumento, setTiposDocumento] = useState<TipoDocumento[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [proveedorId, setProveedorId] = useState<number>(0);
    const [localId, setLocalId] = useState<number>(0);
    const [fechaCompra, setFechaCompra] = useState('');
    const [tipoDocumentoId, setTipoDocumentoId] = useState<number>(0);
    const [numeroDocumento, setNumeroDocumento] = useState('');
    const [notas, setNotas] = useState('');
    const [detalles, setDetalles] = useState<DetalleCompra[]>([]);

    // Current line being added
    const [selectedProducto, setSelectedProducto] = useState<number>(0);
    const [cantidad, setCantidad] = useState('');
    const [precioUnitario, setPrecioUnitario] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            setLoading(true);
            await loadCatalogs();
            await loadCompra();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function loadCatalogs() {
        try {
            const [provs, locs, prods, tipos] = await Promise.all([
                getProveedores(),
                getLocales(),
                getProductos(),
                getTiposDocumento()
            ]);

            setProveedores(provs.filter(p => p.activo));
            setLocales(locs.filter(l => l.activo));
            setProductos(prods.filter(p => p.activo));
            setTiposDocumento(tipos.filter(t => t.activo));
        } catch (err) {
            console.error('Error cargando catálogos:', err);
            alert('Error al cargar datos maestros');
        }
    }

    async function loadCompra() {
        try {
            const data = await getCompra(id);
            if (data.estado === 'RECIBIDA') {
                alert('Esta compra ya fue recibida y no se puede editar.');
                router.push('/admin/compras');
                return;
            }

            setProveedorId(data.proveedor_id);
            setLocalId(data.local_id);
            // Handle date format safely
            const fecha = new Date(data.fecha_compra);
            setFechaCompra(fecha.toISOString().split('T')[0]);

            setTipoDocumentoId(data.tipo_documento_id);
            setNumeroDocumento(data.numero_documento || '');
            setNotas(data.notas || '');

            const detallesMapped: DetalleCompra[] = data.detalles.map(d => ({
                producto_id: d.producto_id,
                cantidad: Number(d.cantidad),
                precio_unitario: Number(d.precio_unitario)
            }));
            setDetalles(detallesMapped);

        } catch (err: any) {
            console.error(err);
            alert('Error al cargar la compra');
            router.push('/admin/compras');
        }
    }

    function agregarDetalle() {
        if (!selectedProducto || !cantidad || !precioUnitario) {
            alert('Complete todos los campos del detalle');
            return;
        }

        if (detalles.some(d => d.producto_id === selectedProducto)) {
            alert('Este producto ya está en la lista');
            return;
        }

        const nuevoDetalle: DetalleCompra = {
            producto_id: selectedProducto,
            cantidad: parseFloat(cantidad),
            precio_unitario: parseFloat(precioUnitario)
        };

        setDetalles([...detalles, nuevoDetalle]);

        setSelectedProducto(0);
        setCantidad('');
        setPrecioUnitario('');
    }

    function eliminarDetalle(index: number) {
        setDetalles(detalles.filter((_, i) => i !== index));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!proveedorId || !localId || !tipoDocumentoId) {
            alert('Seleccione proveedor, local y tipo de documento');
            return;
        }

        if (detalles.length === 0) {
            alert('Agregue al menos un producto');
            return;
        }

        try {
            setSubmitting(true);
            await updateCompra(id, {
                proveedor_id: proveedorId,
                local_id: localId,
                fecha_compra: fechaCompra,
                tipo_documento_id: tipoDocumentoId,
                numero_documento: numeroDocumento,
                notas: notas,
                detalles: detalles
            });
            alert('Compra actualizada exitosamente');
            router.push('/admin/compras');
        } catch (err: any) {
            alert(err.message || 'Error al actualizar compra');
        } finally {
            setSubmitting(false);
        }
    }

    const montoTotal = detalles.reduce((sum, d) => sum + (d.cantidad * d.precio_unitario), 0);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-400">Cargando...</div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl">
            <h1 className="text-3xl font-bold text-white mb-6">Editar Compra #{id}</h1>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Cabecera */}
                <div className="bg-slate-800 rounded-lg p-6">
                    <h2 className="text-xl font-bold text-white mb-4">Información General</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-300 mb-1">Proveedor *</label>
                            <select
                                required
                                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                                value={proveedorId}
                                onChange={(e) => setProveedorId(Number(e.target.value))}
                            >
                                <option value={0}>Seleccione...</option>
                                {proveedores.map(p => (
                                    <option key={p.id} value={p.id}>{p.nombre}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-300 mb-1">Local Destino *</label>
                            <select
                                required
                                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                                value={localId}
                                onChange={(e) => setLocalId(Number(e.target.value))}
                            >
                                <option value={0}>Seleccione...</option>
                                {locales.map(l => (
                                    <option key={l.id} value={l.id}>{l.nombre}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-300 mb-1">Fecha Compra</label>
                            <input
                                type="date"
                                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                                value={fechaCompra}
                                onChange={(e) => setFechaCompra(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-300 mb-1">Tipo Documento *</label>
                            <select
                                required
                                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                                value={tipoDocumentoId}
                                onChange={(e) => setTipoDocumentoId(Number(e.target.value))}
                            >
                                <option value={0}>Seleccione...</option>
                                {tiposDocumento.map(t => (
                                    <option key={t.id} value={t.id}>{t.nombre}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-300 mb-1">N° Documento</label>
                            <input
                                type="text"
                                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                                value={numeroDocumento}
                                onChange={(e) => setNumeroDocumento(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-300 mb-1">Notas</label>
                            <input
                                type="text"
                                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                                value={notas}
                                onChange={(e) => setNotas(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Agregar Productos */}
                <div className="bg-slate-800 rounded-lg p-6">
                    <h2 className="text-xl font-bold text-white mb-4">Agregar Productos</h2>
                    <div className="grid grid-cols-4 gap-4 items-end">
                        <div className="col-span-2">
                            <label className="block text-sm text-gray-300 mb-1">Producto</label>
                            <select
                                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                                value={selectedProducto}
                                onChange={(e) => setSelectedProducto(Number(e.target.value))}
                            >
                                <option value={0}>Seleccione...</option>
                                {productos.map(p => (
                                    <option key={p.id} value={p.id}>{p.nombre}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-300 mb-1">Cantidad</label>
                            <input
                                type="number"
                                step="0.01"
                                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                                value={cantidad}
                                onChange={(e) => setCantidad(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-300 mb-1">Precio Unit.</label>
                            <input
                                type="number"
                                step="0.01"
                                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                                value={precioUnitario}
                                onChange={(e) => setPrecioUnitario(e.target.value)}
                            />
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={agregarDetalle}
                        className="mt-4 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded"
                    >
                        + Agregar
                    </button>
                </div>

                {/* Lista de Productos */}
                {detalles.length > 0 && (
                    <div className="bg-slate-800 rounded-lg p-6">
                        <h2 className="text-xl font-bold text-white mb-4">Detalle de Compra</h2>
                        <table className="w-full">
                            <thead className="bg-slate-700">
                                <tr>
                                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-300">Producto</th>
                                    <th className="px-4 py-2 text-right text-sm font-semibold text-gray-300">Cantidad</th>
                                    <th className="px-4 py-2 text-right text-sm font-semibold text-gray-300">Precio Unit.</th>
                                    <th className="px-4 py-2 text-right text-sm font-semibold text-gray-300">Subtotal</th>
                                    <th className="px-4 py-2 text-center text-sm font-semibold text-gray-300">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {detalles.map((det, idx) => {
                                    const producto = productos.find(p => p.id === det.producto_id);
                                    const subtotal = det.cantidad * det.precio_unitario;
                                    return (
                                        <tr key={idx}>
                                            <td className="px-4 py-2 text-sm text-white">{producto?.nombre}</td>
                                            <td className="px-4 py-2 text-sm text-gray-300 text-right">{det.cantidad}</td>
                                            <td className="px-4 py-2 text-sm text-gray-300 text-right font-mono">
                                                ${det.precio_unitario.toLocaleString('es-CL')}
                                            </td>
                                            <td className="px-4 py-2 text-sm text-white text-right font-mono">
                                                ${subtotal.toLocaleString('es-CL')}
                                            </td>
                                            <td className="px-4 py-2 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => eliminarDetalle(idx)}
                                                    className="text-red-400 hover:text-red-300"
                                                >
                                                    🗑️
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr className="bg-slate-700">
                                    <td colSpan={3} className="px-4 py-3 text-right text-white font-bold">TOTAL:</td>
                                    <td className="px-4 py-3 text-right text-white font-bold font-mono text-lg">
                                        ${montoTotal.toLocaleString('es-CL')}
                                    </td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}

                {/* Botones */}
                <div className="flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-6 py-2 rounded text-gray-300 hover:bg-slate-700"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={submitting || detalles.length === 0}
                        className="px-6 py-2 rounded bg-primary hover:bg-primary-dark text-slate-900 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {submitting ? 'Guardando...' : 'Actualizar Compra'}
                    </button>
                </div>
            </form>
        </div>
    );
}
