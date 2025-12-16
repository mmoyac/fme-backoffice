
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getProductos, Producto } from '@/lib/api/productos';
import { getLocales, Local } from '@/lib/api/locales';
import { createOrden, DetalleOrdenCreate } from '@/lib/api/produccion';
import { getInventarios, Inventario } from '@/lib/api/inventario';

interface Row {
    id: number; // Temporary ID for UI key
    producto_id: string; // Use string for select value handling
    cantidad: string;
}

export default function NuevaOrdenPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [productos, setProductos] = useState<Producto[]>([]);
    const [locales, setLocales] = useState<Local[]>([]);
    const [inventarios, setInventarios] = useState<Inventario[]>([]);

    // Form State
    const [localId, setLocalId] = useState<string>('');
    const [fecha, setFecha] = useState<string>(new Date().toISOString().split('T')[0]);
    const [notas, setNotas] = useState('');
    const [rows, setRows] = useState<Row[]>([{ id: Date.now(), producto_id: '', cantidad: '' }]);

    useEffect(() => {
        loadCatalogs();
    }, []);

    // Recargar inventarios cuando cambia el local
    useEffect(() => {
        if (localId) {
            getInventarios().then(data => {
                // Filtrar solo los del local seleccionado si la API devuelve todos
                setInventarios(data.filter(inv => inv.local_id === Number(localId)));
            }).catch(console.error);
        }
    }, [localId]);

    async function loadCatalogs() {
        try {
            const [prodsData, localesData, invData] = await Promise.all([
                getProductos(),
                getLocales(),
                getInventarios() // Carga inicial
            ]);
            // Filter products that have recipes
            setProductos(prodsData.filter(p => p.tiene_receta));
            setLocales(localesData);
            if (localesData.length > 0) setLocalId(localesData[0].id.toString());
            setInventarios(invData);
        } catch (err) {
            console.error(err);
            alert('Error al cargar catálogos');
        }
    }

    const getStock = (prodId: string) => {
        if (!localId || !prodId) return 0;
        const inv = inventarios.find(i => i.producto_id === Number(prodId) && i.local_id === Number(localId));
        return inv ? inv.cantidad_stock : 0;
    };

    const addRow = () => {
        setRows([...rows, { id: Date.now(), producto_id: '', cantidad: '' }]);
    };

    const removeRow = (id: number) => {
        if (rows.length === 1) return;
        setRows(rows.filter(r => r.id !== id));
    };

    const updateRow = (id: number, field: keyof Row, value: string) => {
        setRows(rows.map(row =>
            row.id === id ? { ...row, [field]: value } : row
        ));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Validate
            const validRows = rows.filter(r => r.producto_id && r.cantidad);
            if (validRows.length === 0) {
                alert('Debe agregar al menos un producto');
                setLoading(false);
                return;
            }

            const detalles: DetalleOrdenCreate[] = validRows.map(r => {
                const prod = productos.find(p => p.id === Number(r.producto_id));
                return {
                    producto_id: Number(r.producto_id),
                    cantidad: Number(r.cantidad),
                    unidad_medida_id: prod ? prod.unidad_medida_id : 0 // Should exist
                };
            });

            await createOrden({
                local_id: Number(localId),
                fecha_programada: new Date(fecha).toISOString(),
                notas,
                detalles
            });

            router.push('/admin/produccion');
        } catch (err: any) {
            alert(err.message || 'Error al crear orden');
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-white mb-6">Nueva Orden de Producción</h1>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Header Info */}
                <div className="bg-slate-800 p-6 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Local de Producción</label>
                        <select
                            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                            value={localId}
                            onChange={(e) => setLocalId(e.target.value)}
                            required
                        >
                            <option value="">Seleccione Local...</option>
                            {locales.map(l => (
                                <option key={l.id} value={l.id}>{l.nombre}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Fecha Programada</label>
                        <input
                            type="date"
                            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                            value={fecha}
                            onChange={(e) => setFecha(e.target.value)}
                            required
                        />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-300 mb-2">Notas</label>
                        <textarea
                            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                            rows={2}
                            value={notas}
                            onChange={(e) => setNotas(e.target.value)}
                        />
                    </div>
                </div>

                {/* Detalles */}
                <div className="bg-slate-800 p-6 rounded-lg">
                    <h2 className="text-xl font-bold text-white mb-4">Productos a Elaborar</h2>
                    <div className="space-y-4">
                        {rows.map((row, index) => {
                            const stockActual = getStock(row.producto_id);
                            return (
                                <div key={row.id} className="flex gap-4 items-end">
                                    <div className="flex-1">
                                        <label className="block text-xs text-gray-400 mb-1">Producto</label>
                                        <select
                                            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                                            value={row.producto_id}
                                            onChange={(e) => updateRow(row.id, 'producto_id', e.target.value)}
                                            required
                                        >
                                            <option value="">Seleccione producto...</option>
                                            {productos.map(p => (
                                                <option key={p.id} value={p.id}>{p.nombre}</option>
                                            ))}
                                        </select>
                                        {row.producto_id && (
                                            <p className="text-xs text-amber-500 mt-1">
                                                Stock actual: {stockActual} un
                                            </p>
                                        )}
                                    </div>
                                    <div className="w-32">
                                        <label className="block text-xs text-gray-400 mb-1">Cantidad</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                                            value={row.cantidad}
                                            onChange={(e) => updateRow(row.id, 'cantidad', e.target.value)}
                                            placeholder="0.0"
                                            required
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeRow(row.id)}
                                        className="text-red-400 hover:text-red-300 p-2"
                                        disabled={rows.length === 1}
                                    >
                                        ✕
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                    <button
                        type="button"
                        onClick={addRow}
                        className="mt-4 text-primary hover:text-primary-dark font-medium text-sm"
                    >
                        + Agregar otro producto
                    </button>
                </div>

                <div className="flex justify-end gap-4">
                    <Link
                        href="/admin/produccion"
                        className="px-6 py-2 rounded-lg border border-slate-600 text-gray-300 hover:bg-slate-700"
                    >
                        Cancelar
                    </Link>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2 rounded-lg bg-primary hover:bg-primary-dark text-slate-900 font-bold disabled:opacity-50"
                    >
                        {loading ? 'Guardando...' : 'Crear Orden'}
                    </button>
                </div>
            </form>
        </div>
    );
}
