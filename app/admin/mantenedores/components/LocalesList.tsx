"use client";

import { useState, useEffect } from "react";
import { getLocales, createLocal, updateLocal, deleteLocal, type Local, type LocalCreate } from "@/lib/api/locales";

export default function LocalesList() {
    const [locales, setLocales] = useState<Local[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState<LocalCreate>({
        nombre: '',
        direccion: '',
        activo: true
    });

    useEffect(() => {
        loadLocales();
    }, []);

    async function loadLocales() {
        try {
            const data = await getLocales();
            setLocales(data);
        } catch (err) {
            console.error('Error al cargar locales:', err);
        } finally {
            setLoading(false);
        }
    }

    function openCreateModal() {
        setEditingId(null);
        setFormData({
            nombre: '',
            direccion: '',
            activo: true
        });
        setModalOpen(true);
    }

    function openEditModal(local: Local) {
        setEditingId(local.id);
        setFormData({
            nombre: local.nombre,
            direccion: local.direccion || '',
            activo: local.activo
        });
        setModalOpen(true);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        try {
            if (editingId) {
                await updateLocal(editingId, formData);
            } else {
                await createLocal(formData);
            }
            await loadLocales();
            setModalOpen(false);
        } catch (err: any) {
            alert(err.message || 'Error al guardar local');
        }
    }

    async function handleDelete(id: number, nombre: string) {
        if (!confirm(`¿Está seguro de eliminar el local "${nombre}"?`)) {
            return;
        }

        try {
            await deleteLocal(id);
            await loadLocales();
        } catch (err: any) {
            alert(err.message || 'No se puede eliminar este local porque está siendo utilizado');
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
                    + Nuevo Local
                </button>
            </div>

            {locales.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                    No hay locales registrados
                </div>
            ) : (
                <div className="overflow-x-auto bg-slate-700 rounded-lg">
                    <table className="min-w-full divide-y divide-slate-600">
                        <thead className="bg-slate-600">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Código</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Nombre</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Dirección</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase">Estado</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-600">
                            {locales.map((local) => (
                                <tr key={local.id} className="hover:bg-slate-600/50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-300">{local.codigo}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{local.nombre}</td>
                                    <td className="px-6 py-4 text-sm text-gray-300">{local.direccion || "-"}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${local.activo ? "bg-green-900 text-green-300" : "bg-gray-700 text-gray-400"}`}>
                                            {local.activo ? "Activo" : "Inactivo"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                                        <button
                                            onClick={() => openEditModal(local)}
                                            className="text-primary hover:text-primary-dark font-medium"
                                        >
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => handleDelete(local.id, local.nombre)}
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
                            {editingId ? 'Editar Local' : 'Nuevo Local'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Nombre *</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                                    placeholder="Ej: Estación Central"
                                    value={formData.nombre}
                                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Dirección</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                                    placeholder="Ej: Av. Libertador Bernardo O'Higgins 3322"
                                    value={formData.direccion}
                                    onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="activo-local"
                                    className="w-4 h-4 text-primary bg-slate-700 border-slate-600 rounded focus:ring-primary focus:ring-2"
                                    checked={formData.activo}
                                    onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                                />
                                <label htmlFor="activo-local" className="text-sm font-medium text-gray-300 cursor-pointer">Activo</label>
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
