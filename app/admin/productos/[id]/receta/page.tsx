'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getProducto, getProductos, type Producto } from '@/lib/api/productos';
import { getRecetaProducto, createReceta, deleteReceta, recalcularCostos, crearIngredienteAPI, borrarIngredienteAPI, type Receta, type RecetaCreate } from '@/lib/api/recetas';
import { getUnidades, type UnidadMedida } from '@/lib/api/maestras';

export default function RecetaPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [producto, setProducto] = useState<Producto | null>(null);
    const [receta, setReceta] = useState<Receta | null>(null);
    const [unidades, setUnidades] = useState<UnidadMedida[]>([]);
    const [productos, setProductos] = useState<Producto[]>([]);

    // Formulario de nueva receta
    const [formData, setFormData] = useState<RecetaCreate>({
        nombre: '',
        rendimiento: 1,
        unidad_rendimiento_id: 1,
        notas: '',
        ingredientes: [],
    });

    // Nuevo ingrediente
    const [nuevoIngrediente, setNuevoIngrediente] = useState({
        producto_ingrediente_id: 0,
        cantidad: 1,
        unidad_medida_id: 1,
        orden: 0,
        notas: '',
    });

    // Estados para el autocompletado
    const [searchTerm, setSearchTerm] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [filteredProductos, setFilteredProductos] = useState<Producto[]>([]);

    useEffect(() => {
        loadData();
    }, [params.id]);

    async function loadData() {
        try {
            const [productoData, unidadesData, productosData] = await Promise.all([
                getProducto(Number(params.id)),
                getUnidades(),
                getProductos(),
            ]);

            setProducto(productoData);
            setUnidades(unidadesData.filter(u => u.activo));

            // Cargar productos disponibles para usar como ingredientes
            // Filtrar el producto actual para que no se pueda agregar a sí mismo
            const productosDisponibles = productosData.filter((p: Producto) => p.id !== Number(params.id));
            setProductos(productosDisponibles);
            console.log('Productos cargados:', productosDisponibles.length);

            // Intentar cargar receta existente
            try {
                const recetaData = await getRecetaProducto(Number(params.id));
                setReceta(recetaData);
            } catch (err: any) {
                if (err.message !== 'NOT_FOUND') {
                    console.error('Error cargando receta:', err);
                }
                // No hay receta, inicializar formulario
                setFormData({
                    nombre: `Receta de ${productoData.nombre}`,
                    rendimiento: 1,
                    unidad_rendimiento_id: productoData.unidad_medida_id,
                    notas: '',
                    ingredientes: [],
                });
            }
        } catch (err) {
            alert('Error al cargar datos');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    function handleSearchChange(value: string) {
        setSearchTerm(value);
        if (value.trim() === '') {
            setFilteredProductos([]);
            setShowDropdown(false);
            return;
        }

        const filtered = productos.filter(p =>
            p.nombre.toLowerCase().includes(value.toLowerCase()) ||
            p.sku.toLowerCase().includes(value.toLowerCase())
        );
        setFilteredProductos(filtered);
        setShowDropdown(true);
    }

    function selectProducto(producto: Producto) {
        // Heredar unidad de medida del producto seleccionado
        setNuevoIngrediente({
            ...nuevoIngrediente,
            producto_ingrediente_id: producto.id,
            unidad_medida_id: producto.unidad_medida_id,
        });
        setSearchTerm(producto.nombre);
        setShowDropdown(false);
    }

    function agregarIngrediente() {
        if (nuevoIngrediente.producto_ingrediente_id === 0) {
            alert('Selecciona un producto');
            return;
        }

        setFormData({
            ...formData,
            ingredientes: [
                ...formData.ingredientes,
                { ...nuevoIngrediente, orden: formData.ingredientes.length },
            ],
        });

        // Resetear formulario
        setNuevoIngrediente({
            producto_ingrediente_id: 0,
            cantidad: 1,
            unidad_medida_id: 1,
            orden: 0,
            notas: '',
        });
        setSearchTerm('');
    }

    function eliminarIngrediente(index: number) {
        setFormData({
            ...formData,
            ingredientes: formData.ingredientes.filter((_, i) => i !== index),
        });
    }

    async function agregarIngredienteARecetaExistente() {
        if (!receta || nuevoIngrediente.producto_ingrediente_id === 0) {
            alert('Selecciona un producto');
            return;
        }

        try {
            console.log('Receta actual:', receta);
            console.log('Ingredientes actuales:', receta.ingredientes.length);

            const resultado = await crearIngredienteAPI(receta.id!, {
                producto_ingrediente_id: nuevoIngrediente.producto_ingrediente_id,
                cantidad: nuevoIngrediente.cantidad,
                unidad_medida_id: nuevoIngrediente.unidad_medida_id,
                orden: receta.ingredientes.length,
                notas: nuevoIngrediente.notas || undefined,
            });

            console.log('Ingrediente agregado en backend:', resultado);

            // Resetear formulario
            setNuevoIngrediente({
                producto_ingrediente_id: 0,
                cantidad: 1,
                unidad_medida_id: 1,
                orden: 0,
                notas: '',
            });
            setSearchTerm('');

            // Recargar receta directamente
            const recetaActualizada = await getRecetaProducto(Number(params.id));
            console.log('Receta actualizada:', recetaActualizada);
            console.log('Ingredientes después:', recetaActualizada.ingredientes.length);
            setReceta(recetaActualizada);

            alert('Ingrediente agregado');
        } catch (err: any) {
            alert(err.message || 'Error al agregar ingrediente');
            console.error(err);
        }
    }

    async function eliminarIngredienteDeReceta(ingredienteId: number) {
        if (!confirm('¿Eliminar este ingrediente?')) return;

        try {
            await borrarIngredienteAPI(ingredienteId);

            // Recargar receta directamente
            const recetaActualizada = await getRecetaProducto(Number(params.id));
            setReceta(recetaActualizada);

            alert('Ingrediente eliminado');
        } catch (err: any) {
            alert(err.message || 'Error al eliminar ingrediente');
            console.error(err);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (formData.ingredientes.length === 0) {
            alert('Agrega al menos un ingrediente');
            return;
        }

        setSaving(true);
        try {
            console.log('Enviando receta:', formData);
            const nuevaReceta = await createReceta(Number(params.id), formData);
            setReceta(nuevaReceta);
            alert('Receta creada exitosamente');
            await loadData(); // Recargar para ver costos calculados
        } catch (err: any) {
            console.error('Error completo:', err);
            alert(err.message || 'Error al guardar receta');
        } finally {
            setSaving(false);
        }
    }

    async function handleEliminarReceta() {
        if (!receta || !confirm('¿Eliminar esta receta?')) return;

        try {
            await deleteReceta(receta.id!);
            setReceta(null);
            alert('Receta eliminada');
            await loadData();
        } catch (err) {
            alert('Error al eliminar receta');
            console.error(err);
        }
    }

    async function handleRecalcular() {
        if (!receta) return;

        try {
            const recetaActualizada = await recalcularCostos(receta.id!);
            setReceta(recetaActualizada);
            alert('Costos recalculados');
        } catch (err) {
            alert('Error al recalcular costos');
            console.error(err);
        }
    }

    function getProductoNombre(id: number): string {
        return productos.find(p => p.id === id)?.nombre || 'Desconocido';
    }

    function getUnidadSimbolo(id: number): string {
        return unidades.find(u => u.id === id)?.simbolo || '';
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-400">Cargando...</div>
            </div>
        );
    }

    if (!producto) {
        return (
            <div className="bg-red-900/20 border border-red-500 text-red-200 px-4 py-3 rounded">
                Producto no encontrado
            </div>
        );
    }

    return (
        <div className="max-w-6xl">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-white mb-2">
                    📋 Receta: {producto.nombre}
                </h1>
                <button
                    onClick={() => router.back()}
                    className="text-gray-400 hover:text-white"
                >
                    ← Volver a productos
                </button>
            </div>

            {receta ? (
                // Mostrar receta existente
                <div className="space-y-6">
                    <div className="bg-slate-800 rounded-lg p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-2xl font-semibold text-white">{receta.nombre}</h2>
                                <p className="text-gray-400 mt-1">
                                    Rendimiento: {receta.rendimiento} {getUnidadSimbolo(receta.unidad_rendimiento_id)}
                                </p>
                            </div>
                            <div className="space-x-2">
                                <button
                                    onClick={handleRecalcular}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                                >
                                    🔄 Recalcular Costos
                                </button>
                                <button
                                    onClick={handleEliminarReceta}
                                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
                                >
                                    🗑️ Eliminar Receta
                                </button>
                            </div>
                        </div>

                        {/* Costos */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className="bg-slate-700 rounded-lg p-4">
                                <div className="text-gray-400 text-sm">Costo Total</div>
                                <div className="text-2xl font-bold text-white">
                                    ${receta.costo_total_calculado ? Number(receta.costo_total_calculado).toFixed(2) : '0.00'}
                                </div>
                            </div>
                            <div className="bg-slate-700 rounded-lg p-4">
                                <div className="text-gray-400 text-sm">Costo Unitario</div>
                                <div className="text-2xl font-bold text-primary">
                                    ${receta.costo_unitario_calculado ? Number(receta.costo_unitario_calculado).toFixed(2) : '0.00'}
                                </div>
                                <div className="text-xs text-gray-500">
                                    por {getUnidadSimbolo(receta.unidad_rendimiento_id)}
                                </div>
                            </div>
                            <div className="bg-slate-700 rounded-lg p-4">
                                <div className="text-gray-400 text-sm">Ingredientes</div>
                                <div className="text-2xl font-bold text-white">
                                    {receta.ingredientes.length}
                                </div>
                            </div>
                        </div>

                        {/* Ingredientes */}
                        <div>
                            <h3 className="text-lg font-semibold text-white mb-3">Ingredientes</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-700">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-300">Producto</th>
                                            <th className="px-4 py-2 text-right text-sm font-semibold text-gray-300">Cantidad</th>
                                            <th className="px-4 py-2 text-right text-sm font-semibold text-gray-300">Costo Unit.</th>
                                            <th className="px-4 py-2 text-right text-sm font-semibold text-gray-300">Costo Total</th>
                                            <th className="px-4 py-2 text-right text-sm font-semibold text-gray-300">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700">
                                        {receta.ingredientes.map((ing) => (
                                            <tr key={ing.id}>
                                                <td className="px-4 py-3 text-sm text-white">
                                                    {getProductoNombre(ing.producto_ingrediente_id)}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-300 text-right">
                                                    {ing.cantidad} {getUnidadSimbolo(ing.unidad_medida_id)}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-300 text-right">
                                                    ${ing.costo_unitario_referencia ? Number(ing.costo_unitario_referencia).toFixed(2) : '0.00'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-white font-medium text-right">
                                                    ${ing.costo_total_calculado ? Number(ing.costo_total_calculado).toFixed(2) : '0.00'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-right">
                                                    <button
                                                        onClick={() => eliminarIngredienteDeReceta(ing.id!)}
                                                        className="text-red-400 hover:text-red-300"
                                                    >
                                                        Eliminar
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Agregar más ingredientes */}
                        <div className="mt-6 border-t border-slate-700 pt-6">
                            <h4 className="text-md font-semibold text-white mb-3">Agregar Ingrediente</h4>
                            <div className="bg-slate-700 rounded-lg p-4">
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                                    <div className="md:col-span-2 relative">
                                        <label className="block text-xs font-medium text-gray-400 mb-1">Producto</label>
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => handleSearchChange(e.target.value)}
                                            onFocus={() => searchTerm && setShowDropdown(true)}
                                            placeholder="Buscar producto..."
                                            className="w-full bg-slate-600 text-white px-3 py-2 rounded-lg text-sm"
                                        />
                                        {showDropdown && filteredProductos.length > 0 && (
                                            <div className="absolute z-10 w-full mt-1 bg-slate-600 border border-slate-500 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                                {filteredProductos.map(p => (
                                                    <button
                                                        key={p.id}
                                                        type="button"
                                                        onClick={() => selectProducto(p)}
                                                        className="w-full text-left px-3 py-2 hover:bg-slate-500 text-white text-sm border-b border-slate-700 last:border-b-0"
                                                    >
                                                        <div className="font-medium">{p.nombre}</div>
                                                        <div className="text-xs text-gray-400">SKU: {p.sku}</div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-400 mb-1">Cantidad</label>
                                        <input
                                            type="number"
                                            step="0.001"
                                            min="0.001"
                                            value={nuevoIngrediente.cantidad}
                                            onChange={(e) => setNuevoIngrediente({ ...nuevoIngrediente, cantidad: Number(e.target.value) })}
                                            className="w-full bg-slate-600 text-white px-3 py-2 rounded-lg text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-400 mb-1">Unidad</label>
                                        <input
                                            type="text"
                                            value={getUnidadSimbolo(nuevoIngrediente.unidad_medida_id)}
                                            disabled
                                            className="w-full bg-slate-600 text-white px-3 py-2 rounded-lg text-sm opacity-70 cursor-not-allowed"
                                        />
                                    </div>
                                    <div className="flex items-end">
                                        <button
                                            type="button"
                                            onClick={agregarIngredienteARecetaExistente}
                                            className="w-full bg-primary hover:bg-primary-dark text-slate-900 font-semibold px-4 py-2 rounded-lg"
                                        >
                                            + Agregar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {receta.notas && (
                            <div className="mt-4 p-4 bg-slate-700 rounded-lg">
                                <div className="text-sm font-medium text-gray-300 mb-1">Notas:</div>
                                <div className="text-sm text-gray-400">{receta.notas}</div>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                // Formulario para crear nueva receta
                <form onSubmit={handleSubmit} className="bg-slate-800 rounded-lg p-6 space-y-6">
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-4">Crear Nueva Receta</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Nombre de la Receta *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.nombre}
                                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                    className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-primary focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Rendimiento *
                                    </label>
                                    <input
                                        type="number"
                                        step="0.001"
                                        required
                                        min="0.001"
                                        value={formData.rendimiento}
                                        onChange={(e) => setFormData({ ...formData, rendimiento: Number(e.target.value) })}
                                        className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-primary focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Unidad
                                    </label>
                                    <select
                                        value={formData.unidad_rendimiento_id}
                                        onChange={(e) => setFormData({ ...formData, unidad_rendimiento_id: Number(e.target.value) })}
                                        className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-primary focus:outline-none"
                                    >
                                        {unidades.map(u => (
                                            <option key={u.id} value={u.id}>{u.simbolo}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Notas
                            </label>
                            <textarea
                                value={formData.notas}
                                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                                rows={2}
                                className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-primary focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Agregar Ingredientes */}
                    <div className="border-t border-slate-700 pt-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Ingredientes</h3>

                        <div className="bg-slate-700 rounded-lg p-4 mb-4">
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                                <div className="md:col-span-2 relative">
                                    <label className="block text-xs font-medium text-gray-400 mb-1">Producto</label>
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => handleSearchChange(e.target.value)}
                                        onFocus={() => searchTerm && setShowDropdown(true)}
                                        placeholder="Buscar producto..."
                                        className="w-full bg-slate-600 text-white px-3 py-2 rounded-lg text-sm"
                                    />
                                    {showDropdown && filteredProductos.length > 0 && (
                                        <div className="absolute z-10 w-full mt-1 bg-slate-600 border border-slate-500 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                            {filteredProductos.map(p => (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => selectProducto(p)}
                                                    className="w-full text-left px-3 py-2 hover:bg-slate-500 text-white text-sm border-b border-slate-700 last:border-b-0"
                                                >
                                                    <div className="font-medium">{p.nombre}</div>
                                                    <div className="text-xs text-gray-400">SKU: {p.sku}</div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {showDropdown && searchTerm && filteredProductos.length === 0 && (
                                        <div className="absolute z-10 w-full mt-1 bg-slate-600 border border-slate-500 rounded-lg shadow-lg px-3 py-2 text-gray-400 text-sm">
                                            No se encontraron productos
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">Cantidad</label>
                                    <input
                                        type="number"
                                        step="0.001"
                                        min="0.001"
                                        value={nuevoIngrediente.cantidad}
                                        onChange={(e) => setNuevoIngrediente({ ...nuevoIngrediente, cantidad: Number(e.target.value) })}
                                        className="w-full bg-slate-600 text-white px-3 py-2 rounded-lg text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">Unidad</label>
                                    <select
                                        value={nuevoIngrediente.unidad_medida_id}
                                        onChange={(e) => setNuevoIngrediente({ ...nuevoIngrediente, unidad_medida_id: Number(e.target.value) })}
                                        className="w-full bg-slate-600 text-white px-3 py-2 rounded-lg text-sm"
                                    >
                                        {unidades.map(u => (
                                            <option key={u.id} value={u.id}>{u.simbolo}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex items-end">
                                    <button
                                        type="button"
                                        onClick={agregarIngrediente}
                                        className="w-full bg-primary hover:bg-primary-dark text-slate-900 font-semibold px-4 py-2 rounded-lg"
                                    >
                                        + Agregar
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Lista de ingredientes */}
                        {formData.ingredientes.length > 0 && (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-700">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-300">Producto</th>
                                            <th className="px-4 py-2 text-right text-sm font-semibold text-gray-300">Cantidad</th>
                                            <th className="px-4 py-2 text-right text-sm font-semibold text-gray-300">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700">
                                        {formData.ingredientes.map((ing, index) => (
                                            <tr key={index}>
                                                <td className="px-4 py-3 text-sm text-white">
                                                    {getProductoNombre(ing.producto_ingrediente_id)}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-300 text-right">
                                                    {ing.cantidad} {getUnidadSimbolo(ing.unidad_medida_id)}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => eliminarIngrediente(index)}
                                                        className="text-red-400 hover:text-red-300"
                                                    >
                                                        Eliminar
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {formData.ingredientes.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                No hay ingredientes. Agrega al menos uno para crear la receta.
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="submit"
                            disabled={saving || formData.ingredientes.length === 0}
                            className="bg-primary hover:bg-primary-dark text-slate-900 font-semibold px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? 'Guardando...' : 'Crear Receta'}
                        </button>
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}
