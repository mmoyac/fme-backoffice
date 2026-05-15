"use client";

import { useState, useEffect } from "react";
import {
    getEstadosCheque,
    createEstadoCheque,
    updateEstadoCheque,
    type EstadoCheque,
} from "@/lib/api/maestras";

type FormData = Omit<EstadoCheque, "id">;

const emptyForm: FormData = {
    codigo: '',
    nombre: '',
    descripcion: '',
    es_final: false,
    activo: true,
};

export default function EstadosChequeList() {
    const [estados, setEstados] = useState<EstadoCheque[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState<FormData>(emptyForm);

    useEffect(() => {
        fetchEstados();
    }, []);

    async function fetchEstados() {
        try {
            const data = await getEstadosCheque();
            setEstados(data);
        } catch (err) {
            console.error("Error cargando estados de cheque:", err);
        } finally {
            setLoading(false);
        }
    }

    function openCreateModal() {
        setEditingId(null);
        setFormData(emptyForm);
        setModalOpen(true);
    }

    function openEditModal(estado: EstadoCheque) {
        setEditingId(estado.id);
        setFormData({
            codigo: estado.codigo,
            nombre: estado.nombre,
            descripcion: estado.descripcion ?? '',
            es_final: estado.es_final,
            activo: estado.activo,
        });
        setModalOpen(true);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        try {
            if (editingId) {
                await updateEstadoCheque(editingId, formData);
            } else {
                await createEstadoCheque(formData);
            }
            await fetchEstados();
            setModalOpen(false);
        } catch (err: any) {
            alert(err.message || 'Error al guardar estado de cheque');
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
                    + Nuevo Estado de Cheque
                </button>
            </div>

            {estados.length === 0 ? (
                <div className="text-center py-8 text-gray-400">No hay estados de cheque registrados</div>
            ) : (
                <div className="overflow-x-auto bg-slate-700 rounded-lg">
                    <table className="min-w-full divide-y divide-slate-600">
                        <thead className="bg-slate-600">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Código</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Nombre</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Descripción</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase">Estado Final</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase">Estado</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-600">
                            {estados.map((estado) => (
                                <tr key={estado.id} className="hover:bg-slate-600/50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-300">{estado.codigo}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{estado.nombre}</td>
                                    <td className="px-6 py-4 text-sm text-gray-400">{estado.descripcion || '—'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        {estado.es_final ? (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-900 text-purple-300">
                                                Final
                                            </span>
                                        ) : (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-slate-600 text-slate-400">
                                                Intermedio
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${estado.activo ? "bg-green-900 text-green-300" : "bg-gray-700 text-gray-400"}`}>
                                            {estado.activo ? "Activo" : "Inactivo"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                        <button
                                            onClick={() => openEditModal(estado)}
                                            className="text-primary hover:text-primary-dark font-medium"
                                        >
                                            Editar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {modalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                    <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md mx-4 shadow-xl border border-slate-700">
                        <h3 className="text-lg font-semibold text-white mb-4">
                            {editingId ? "Editar Estado de Cheque" : "Nuevo Estado de Cheque"}
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Código *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.codigo}
                                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                                    placeholder="Ej: PENDIENTE"
                                    className="w-full bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 focus:ring-2 focus:ring-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Nombre *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.nombre}
                                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                    placeholder="Ej: Pendiente de cobro"
                                    className="w-full bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 focus:ring-2 focus:ring-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Descripción</label>
                                <input
                                    type="text"
                                    value={formData.descripcion ?? ''}
                                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                                    placeholder="Descripción opcional"
                                    className="w-full bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 focus:ring-2 focus:ring-primary"
                                />
                            </div>
                            <div className="space-y-2 pt-1">
                                <label className="flex items-center space-x-2 text-gray-300 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.es_final}
                                        onChange={(e) => setFormData({ ...formData, es_final: e.target.checked })}
                                        className="w-4 h-4 text-purple-500 bg-slate-700 border-slate-600 rounded focus:ring-purple-500"
                                    />
                                    <span className="text-sm">Es estado final <span className="text-slate-500">(cobrado, rechazado, etc.)</span></span>
                                </label>
                                <label className="flex items-center space-x-2 text-gray-300 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.activo}
                                        onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                                        className="w-4 h-4 text-primary bg-slate-700 border-slate-600 rounded focus:ring-primary"
                                    />
                                    <span className="text-sm">Activo</span>
                                </label>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="submit"
                                    className="flex-1 bg-primary hover:bg-primary-dark text-slate-900 py-2 rounded-lg font-semibold transition-colors"
                                >
                                    {editingId ? "Guardar cambios" : "Crear"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-gray-300 py-2 rounded-lg font-semibold transition-colors"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
