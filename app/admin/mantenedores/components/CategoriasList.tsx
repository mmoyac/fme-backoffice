"use client";

import { useState, useEffect } from "react";
import {
    getCategorias,
    createCategoria,
    updateCategoria,
    deleteCategoria,
    type CategoriaCreate,
    type CategoriaProducto
} from "@/lib/api/maestras";

interface Categoria extends CategoriaProducto { } // Adapt local interface or just use CategoriaProducto

export default function CategoriasList() {
    const [categorias, setCategorias] = useState<CategoriaProducto[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState<CategoriaCreate>({
        codigo: '',
        nombre: '',
        descripcion: '',
        puntos_fidelidad: 0,
        activo: true
    });

    useEffect(() => {
        fetchCategorias();
    }, []);

    const fetchCategorias = async () => {
        try {
            const data = await getCategorias();
            setCategorias(data);
        } catch (error) {
            console.error("Error cargando categorías:", error);
        } finally {
            setLoading(false);
        }
    };

    function openCreateModal() {
        setEditingId(null);
        setFormData({
            codigo: '',
            nombre: '',
            descripcion: '',
            puntos_fidelidad: 0,
            activo: true
        });
        setModalOpen(true);
    }

    function openEditModal(categoria: Categoria) {
        setEditingId(categoria.id);
        setFormData({
            codigo: categoria.codigo,
            nombre: categoria.nombre,
            descripcion: categoria.descripcion || '',
            puntos_fidelidad: categoria.puntos_fidelidad,
            activo: categoria.activo
        });
        setModalOpen(true);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        try {
            if (editingId) {
                await updateCategoria(editingId, formData);
            } else {
                await createCategoria(formData);
            }
            await fetchCategorias();
            setModalOpen(false);
        } catch (err: any) {
            alert(err.message || 'Error al guardar categoría');
        }
    }

    async function handleDelete(id: number, nombre: string) {
        if (!confirm(`¿Está seguro de eliminar la categoría "${nombre}"?`)) {
            return;
        }

        try {
            await deleteCategoria(id);
            await fetchCategorias();
        } catch (err: any) {
            alert(err.message || 'Error al eliminar categoría');
        }
    }

    if (loading) {
        return <div className="text-center py-4 text-gray-400">Cargando...</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <button
                    onClick={openCreateModal}
                    className="bg-primary hover:bg-primary-dark text-slate-900 px-4 py-2 rounded-lg font-semibold transition-colors"
                >
                    + Nueva Categoría
                </button>
            </div>

            {categorias.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                    No hay categorías registradas
                </div>
            ) : (
                <div className="overflow-x-auto bg-slate-700 rounded-lg">
                    <table className="min-w-full divide-y divide-slate-600">
                        <thead className="bg-slate-600">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Código</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Nombre</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Descripción</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Puntos</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">Estado</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-600">
                            {categorias.map((categoria) => (
                                <tr key={categoria.id} className="hover:bg-slate-600/50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-300">{categoria.codigo}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{categoria.nombre}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{categoria.descripcion || "-"}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{categoria.puntos_fidelidad}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${categoria.activo ? "bg-green-900 text-green-300" : "bg-gray-700 text-gray-400"}`}>
                                            {categoria.activo ? "Activo" : "Inactivo"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                                        <button
                                            onClick={() => openEditModal(categoria)}
                                            className="text-primary hover:text-primary-dark font-medium"
                                        >
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => handleDelete(categoria.id, categoria.nombre)}
                                            className="text-red-400 hover:text-red-300 font-medium"
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

            {/* Modal */}
            {modalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-slate-800 rounded-lg p-6 max-w-lg w-full shadow-xl border border-slate-700">
                        <h2 className="text-xl font-bold text-white mb-4">
                            {editingId ? 'Editar Categoría' : 'Nueva Categoría'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Código *</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                                    value={formData.codigo}
                                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Nombre *</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                                    value={formData.nombre}
                                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Descripción</label>
                                <textarea
                                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                                    rows={3}
                                    value={formData.descripcion}
                                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Puntos de Fidelidad</label>
                                <input
                                    type="number"
                                    min="0"
                                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                                    value={formData.puntos_fidelidad}
                                    onChange={(e) => setFormData({ ...formData, puntos_fidelidad: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="activo-categoria"
                                    className="w-4 h-4 text-primary bg-slate-700 border-slate-600 rounded focus:ring-primary focus:ring-2"
                                    checked={formData.activo}
                                    onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                                />
                                <label htmlFor="activo-categoria" className="text-sm font-medium text-gray-300 cursor-pointer">Activo</label>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="px-4 py-2 rounded text-gray-300 hover:bg-slate-700"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded bg-primary hover:bg-primary-dark text-slate-900 font-semibold"
                                >
                                    {editingId ? 'Actualizar' : 'Crear'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
