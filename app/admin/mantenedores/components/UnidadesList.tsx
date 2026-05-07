"use client";

import { useState, useEffect } from "react";
import {
    getUnidades,
    createUnidad,
    updateUnidad,
    deleteUnidad,
    type UnidadCreate,
    type UnidadMedida
} from "@/lib/api/maestras";

interface UnidadForm {
    codigo: string;
    nombre: string;
    simbolo: string;
    tipo: string;
    factor_conversion: string;
    unidad_base_id: string;
    activo: boolean;
}

export default function UnidadesList() {
    const [unidades, setUnidades] = useState<UnidadMedida[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState<UnidadForm>({
        codigo: '',
        nombre: '',
        simbolo: '',
        tipo: 'CANTIDAD',
        factor_conversion: '',
        unidad_base_id: '',
        activo: true
    });

    useEffect(() => {
        fetchUnidades();
    }, []);

    const fetchUnidades = async () => {
        try {
            const data = await getUnidades();
            setUnidades(data);
        } catch (error) {
            console.error("Error cargando unidades:", error);
        } finally {
            setLoading(false);
        }
    };

    function openCreateModal() {
        setEditingId(null);
        setFormData({
            codigo: '',
            nombre: '',
            simbolo: '',
            tipo: 'CANTIDAD',
            factor_conversion: '',
            unidad_base_id: '',
            activo: true
        });
        setModalOpen(true);
    }

    function openEditModal(unidad: UnidadMedida) {
        setEditingId(unidad.id);
        setFormData({
            codigo: unidad.codigo,
            nombre: unidad.nombre,
            simbolo: unidad.simbolo,
            tipo: unidad.tipo || 'CANTIDAD',
            factor_conversion: unidad.factor_conversion?.toString() || '',
            unidad_base_id: unidad.unidad_base_id?.toString() || '',
            activo: unidad.activo
        });
        setModalOpen(true);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        try {
            const payload: UnidadCreate = {
                codigo: formData.codigo,
                nombre: formData.nombre,
                simbolo: formData.simbolo,
                tipo: formData.tipo,
                factor_conversion: formData.factor_conversion ? parseFloat(formData.factor_conversion) : null,
                unidad_base_id: formData.unidad_base_id ? parseInt(formData.unidad_base_id) : null,
                activo: formData.activo
            };

            if (editingId) {
                await updateUnidad(editingId, payload);
            } else {
                await createUnidad(payload);
            }

            await fetchUnidades();
            setModalOpen(false);
        } catch (err: any) {
            alert(err.message || 'Error al guardar unidad');
        }
    }

    async function handleDelete(id: number, nombre: string) {
        if (!confirm(`¿Está seguro de eliminar la unidad "${nombre}"?`)) {
            return;
        }

        try {
            await deleteUnidad(id);
            await fetchUnidades();
        } catch (err: any) {
            alert(err.message || 'Error al eliminar unidad');
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
                    + Nueva Unidad
                </button>
            </div>

            {unidades.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                    No hay unidades registradas
                </div>
            ) : (
                <div className="overflow-x-auto bg-slate-700 rounded-lg">
                    <table className="min-w-full divide-y divide-slate-600">
                        <thead className="bg-slate-600">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Código</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Nombre</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Símbolo</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Tipo</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase">Estado</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-600">
                            {unidades.map((unidad) => (
                                <tr key={unidad.id} className="hover:bg-slate-600/50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-400">{unidad.id}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-300">{unidad.codigo}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{unidad.nombre}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{unidad.simbolo}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{unidad.tipo || "-"}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${unidad.activo ? "bg-green-900 text-green-300" : "bg-gray-700 text-gray-400"}`}>
                                            {unidad.activo ? "Activo" : "Inactivo"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                                        <button
                                            onClick={() => openEditModal(unidad)}
                                            className="text-primary hover:text-primary-dark font-medium"
                                        >
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => handleDelete(unidad.id, unidad.nombre)}
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
                            {editingId ? 'Editar Unidad' : 'Nueva Unidad'}
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
                                <label className="block text-sm font-medium text-gray-300 mb-1">Símbolo *</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                                    value={formData.simbolo}
                                    onChange={(e) => setFormData({ ...formData, simbolo: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Tipo</label>
                                <select
                                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                                    value={formData.tipo}
                                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                                >
                                    <option value="CANTIDAD">Cantidad</option>
                                    <option value="PESO">Peso</option>
                                    <option value="VOLUMEN">Volumen</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Unidad Base (opcional)</label>
                                <select
                                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                                    value={formData.unidad_base_id}
                                    onChange={(e) => setFormData({ ...formData, unidad_base_id: e.target.value })}
                                >
                                    <option value="">Sin unidad base</option>
                                    {unidades.filter(u => u.id !== editingId).map(u => (
                                        <option key={u.id} value={u.id}>{u.nombre} ({u.simbolo})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Factor de Conversión (opcional)</label>
                                <input
                                    type="number"
                                    step="0.0001"
                                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                                    value={formData.factor_conversion}
                                    onChange={(e) => setFormData({ ...formData, factor_conversion: e.target.value })}
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
