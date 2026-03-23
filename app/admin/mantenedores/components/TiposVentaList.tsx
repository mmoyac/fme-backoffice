"use client";

import { useState, useEffect } from "react";
import {
    getTiposVenta,
    createTipoVenta,
    updateTipoVenta,
    deleteTipoVenta,
    type TipoVentaCreate,
    type TipoVenta,
} from "@/lib/api/maestras";

export default function TiposVentaList() {
    const [tipos, setTipos] = useState<TipoVenta[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState<TipoVentaCreate>({
        nombre: "",
        descripcion: "",
        activo: true,
    });

    useEffect(() => {
        fetchTipos();
    }, []);

    const fetchTipos = async () => {
        try {
            const data = await getTiposVenta();
            setTipos(data);
        } catch (error) {
            console.error("Error cargando tipos de venta:", error);
        } finally {
            setLoading(false);
        }
    };

    function openCreateModal() {
        setEditingId(null);
        setFormData({ nombre: "", descripcion: "", activo: true });
        setModalOpen(true);
    }

    function openEditModal(tipo: TipoVenta) {
        setEditingId(tipo.id);
        setFormData({
            nombre: tipo.nombre,
            descripcion: tipo.descripcion || "",
            activo: tipo.activo,
        });
        setModalOpen(true);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        try {
            if (editingId) {
                await updateTipoVenta(editingId, formData);
            } else {
                await createTipoVenta(formData);
            }
            await fetchTipos();
            setModalOpen(false);
        } catch (err: any) {
            alert(err.message || "Error al guardar tipo de venta");
        }
    }

    async function handleDelete(id: number, nombre: string) {
        if (!confirm(`¿Está seguro de eliminar el tipo de venta "${nombre}"?\nSi está asignado a alguna categoría, la operación fallará.`)) return;
        try {
            await deleteTipoVenta(id);
            await fetchTipos();
        } catch (err: any) {
            alert(err.message || "Error al eliminar tipo de venta");
        }
    }

    if (loading) return <div className="text-center py-4 text-gray-400">Cargando...</div>;

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <button
                    onClick={openCreateModal}
                    className="bg-primary hover:bg-primary-dark text-slate-900 px-4 py-2 rounded-lg font-semibold transition-colors"
                >
                    + Nuevo Tipo de Venta
                </button>
            </div>

            {tipos.length === 0 ? (
                <div className="text-center py-8 text-gray-400">No hay tipos de venta registrados</div>
            ) : (
                <div className="overflow-x-auto bg-slate-700 rounded-lg">
                    <table className="min-w-full divide-y divide-slate-600">
                        <thead className="bg-slate-600">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Nombre</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Descripción</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase">Estado</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-600">
                            {tipos.map((tipo) => (
                                <tr key={tipo.id} className="hover:bg-slate-600/50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{tipo.nombre}</td>
                                    <td className="px-6 py-4 text-sm text-gray-300">{tipo.descripcion || "—"}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${tipo.activo ? "bg-green-900 text-green-300" : "bg-gray-700 text-gray-400"}`}>
                                            {tipo.activo ? "Activo" : "Inactivo"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                                        <button
                                            onClick={() => openEditModal(tipo)}
                                            className="text-primary hover:text-primary-dark font-medium"
                                        >
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => handleDelete(tipo.id, tipo.nombre)}
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

            {modalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-slate-800 rounded-lg p-6 max-w-lg w-full shadow-xl border border-slate-700">
                        <h2 className="text-xl font-bold text-white mb-4">
                            {editingId ? "Editar Tipo de Venta" : "Nuevo Tipo de Venta"}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
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
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="activo"
                                    className="mr-2"
                                    checked={formData.activo}
                                    onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                                />
                                <label htmlFor="activo" className="text-sm font-medium text-gray-300">Activo</label>
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
                                    {editingId ? "Actualizar" : "Crear"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
