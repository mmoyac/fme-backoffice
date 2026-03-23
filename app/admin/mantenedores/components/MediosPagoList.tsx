"use client";

import { useState, useEffect } from "react";
import { getMediosPago, createMedioPago, updateMedioPago, type MedioPago } from "@/lib/api/maestras";

type FormData = Omit<MedioPago, "id">;

const emptyForm: FormData = {
    codigo: '',
    nombre: '',
    permite_cheque: false,
    es_contado: false,
    plazo_dias: 0,
    activo: true,
};

export default function MediosPagoList() {
    const [medios, setMedios] = useState<MedioPago[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState<FormData>(emptyForm);

    useEffect(() => {
        fetchMedios();
    }, []);

    async function fetchMedios() {
        try {
            const data = await getMediosPago();
            setMedios(data);
        } catch (err) {
            console.error("Error cargando medios de pago:", err);
        } finally {
            setLoading(false);
        }
    }

    function openCreateModal() {
        setEditingId(null);
        setFormData(emptyForm);
        setModalOpen(true);
    }

    function openEditModal(medio: MedioPago) {
        setEditingId(medio.id);
        setFormData({
            codigo: medio.codigo,
            nombre: medio.nombre,
            permite_cheque: medio.permite_cheque,
            es_contado: medio.es_contado,
            plazo_dias: medio.plazo_dias ?? 0,
            activo: medio.activo,
        });
        setModalOpen(true);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        try {
            if (editingId) {
                await updateMedioPago(editingId, formData);
            } else {
                await createMedioPago(formData);
            }
            await fetchMedios();
            setModalOpen(false);
        } catch (err: any) {
            alert(err.message || 'Error al guardar medio de pago');
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
                    + Nuevo Medio de Pago
                </button>
            </div>

            {medios.length === 0 ? (
                <div className="text-center py-8 text-gray-400">No hay medios de pago registrados</div>
            ) : (
                <div className="overflow-x-auto bg-slate-700 rounded-lg">
                    <table className="min-w-full divide-y divide-slate-600">
                        <thead className="bg-slate-600">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Código</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Nombre</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase">Al Contado</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase">Permite Cheque</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase">Plazo (días)</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase">Estado</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-600">
                            {medios.map((medio) => (
                                <tr key={medio.id} className="hover:bg-slate-600/50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-300">{medio.codigo}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{medio.nombre}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        {medio.es_contado ? (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-emerald-900 text-emerald-300">
                                                💵 Contado
                                            </span>
                                        ) : (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-slate-600 text-slate-400">
                                                Crédito
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${medio.permite_cheque ? "bg-blue-900 text-blue-300" : "bg-slate-600 text-slate-400"}`}>
                                            {medio.permite_cheque ? "Sí" : "No"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                                        {(medio.plazo_dias ?? 0) > 0 ? (
                                            <span className="bg-amber-900 text-amber-300 text-xs font-semibold px-2 py-0.5 rounded-full">
                                                {medio.plazo_dias}d
                                            </span>
                                        ) : (
                                            <span className="text-gray-500">—</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${medio.activo ? "bg-green-900 text-green-300" : "bg-gray-700 text-gray-400"}`}>
                                            {medio.activo ? "Activo" : "Inactivo"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                        <button
                                            onClick={() => openEditModal(medio)}
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

            {/* Modal */}
            {modalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                    <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md mx-4 shadow-xl border border-slate-700">
                        <h3 className="text-lg font-semibold text-white mb-4">
                            {editingId ? "Editar Medio de Pago" : "Nuevo Medio de Pago"}
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Código *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.codigo}
                                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                                    placeholder="Ej: EFECTIVO"
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
                                    placeholder="Ej: Efectivo"
                                    className="w-full bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 focus:ring-2 focus:ring-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Plazo de pago (días)
                                    <span className="text-slate-500 font-normal ml-1">— 0 = contado, &gt;0 = crédito diferido</span>
                                </label>
                                <input
                                    type="number"
                                    min={0}
                                    max={365}
                                    value={formData.plazo_dias}
                                    onChange={(e) => setFormData({ ...formData, plazo_dias: parseInt(e.target.value) || 0 })}
                                    className="w-full bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 focus:ring-2 focus:ring-primary"
                                />
                                {(formData.plazo_dias ?? 0) > 0 && (
                                    <p className="text-amber-400 text-xs mt-1">
                                        Este medio ocupa crédito del cliente. El pedido quedará impago hasta confirmar recibo en Cobranza.
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2 pt-1">
                                <label className="flex items-center space-x-2 text-gray-300 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.es_contado}
                                        onChange={(e) => setFormData({ ...formData, es_contado: e.target.checked })}
                                        className="w-4 h-4 text-emerald-500 bg-slate-700 border-slate-600 rounded focus:ring-emerald-500"
                                    />
                                    <span className="text-sm">💵 Es pago al contado <span className="text-slate-500">(aplica descuento contado en picking)</span></span>
                                </label>
                                <label className="flex items-center space-x-2 text-gray-300 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.permite_cheque}
                                        onChange={(e) => setFormData({ ...formData, permite_cheque: e.target.checked })}
                                        className="w-4 h-4 text-primary bg-slate-700 border-slate-600 rounded focus:ring-primary"
                                    />
                                    <span className="text-sm">Permite ingresar datos de cheque</span>
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
