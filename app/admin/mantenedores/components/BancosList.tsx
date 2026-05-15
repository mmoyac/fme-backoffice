"use client";

import { useState, useEffect } from "react";
import { getBancos, createBanco, updateBanco, type Banco } from "@/lib/api/maestras";

type FormData = Omit<Banco, "id">;

const emptyForm: FormData = {
    codigo: '',
    nombre: '',
    nombre_corto: '',
    activo: true,
};

export default function BancosList() {
    const [bancos, setBancos] = useState<Banco[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState<FormData>(emptyForm);

    useEffect(() => { fetchBancos(); }, []);

    async function fetchBancos() {
        try {
            setBancos(await getBancos());
        } catch (err) {
            console.error("Error cargando bancos:", err);
        } finally {
            setLoading(false);
        }
    }

    function openCreateModal() {
        setEditingId(null);
        setFormData(emptyForm);
        setModalOpen(true);
    }

    function openEditModal(banco: Banco) {
        setEditingId(banco.id);
        setFormData({ codigo: banco.codigo, nombre: banco.nombre, nombre_corto: banco.nombre_corto ?? '', activo: banco.activo });
        setModalOpen(true);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        try {
            if (editingId) {
                await updateBanco(editingId, formData);
            } else {
                await createBanco(formData);
            }
            await fetchBancos();
            setModalOpen(false);
        } catch (err: any) {
            alert(err.message || 'Error al guardar banco');
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
                    + Nuevo Banco
                </button>
            </div>

            {bancos.length === 0 ? (
                <div className="text-center py-8 text-gray-400">No hay bancos registrados</div>
            ) : (
                <div className="overflow-x-auto bg-slate-700 rounded-lg">
                    <table className="min-w-full divide-y divide-slate-600">
                        <thead className="bg-slate-600">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Código</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Nombre</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Nombre corto</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase">Estado</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-600">
                            {bancos.map((banco) => (
                                <tr key={banco.id} className="hover:bg-slate-600/50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-300">{banco.codigo}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{banco.nombre}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{banco.nombre_corto || '—'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${banco.activo ? "bg-green-900 text-green-300" : "bg-gray-700 text-gray-400"}`}>
                                            {banco.activo ? "Activo" : "Inactivo"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                        <button onClick={() => openEditModal(banco)} className="text-primary hover:text-primary-dark font-medium">
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
                            {editingId ? "Editar Banco" : "Nuevo Banco"}
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Código *</label>
                                <input
                                    type="text"
                                    required
                                    maxLength={10}
                                    value={formData.codigo}
                                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                                    placeholder="Ej: 001"
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
                                    placeholder="Ej: Banco de Chile"
                                    className="w-full bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 focus:ring-2 focus:ring-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Nombre corto</label>
                                <input
                                    type="text"
                                    value={formData.nombre_corto ?? ''}
                                    onChange={(e) => setFormData({ ...formData, nombre_corto: e.target.value })}
                                    placeholder="Ej: BCI Chile"
                                    className="w-full bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 focus:ring-2 focus:ring-primary"
                                />
                            </div>
                            <div className="pt-1">
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
                                <button type="submit" className="flex-1 bg-primary hover:bg-primary-dark text-slate-900 py-2 rounded-lg font-semibold transition-colors">
                                    {editingId ? "Guardar cambios" : "Crear"}
                                </button>
                                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-gray-300 py-2 rounded-lg font-semibold transition-colors">
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
