'use client';

import { useState, useEffect } from 'react';
import { getTiposProveedor, createTipoProveedor, updateTipoProveedor, deleteTipoProveedor, TipoProveedor, TipoProveedorCreate } from '@/lib/api/compras';

export default function TiposProveedorList() {
    const [tipos, setTipos] = useState<TipoProveedor[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState<TipoProveedorCreate>({
        codigo: '',
        nombre: '',
        descripcion: '',
        activo: true
    });

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            setLoading(true);
            const data = await getTiposProveedor();
            setTipos(data);
            setError(null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    function openCreateModal() {
        setEditingId(null);
        setFormData({
            codigo: '',
            nombre: '',
            descripcion: '',
            activo: true
        });
        setModalOpen(true);
    }

    function openEditModal(tipo: TipoProveedor) {
        setEditingId(tipo.id);
        setFormData({
            codigo: tipo.codigo,
            nombre: tipo.nombre,
            descripcion: tipo.descripcion || '',
            activo: tipo.activo
        });
        setModalOpen(true);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        try {
            if (editingId) {
                await updateTipoProveedor(editingId, formData);
            } else {
                await createTipoProveedor(formData);
            }
            await loadData();
            setModalOpen(false);
        } catch (err: any) {
            alert(err.message);
        }
    }

    async function handleDelete(id: number) {
        if (!confirm('¿Estás seguro de eliminar este tipo de proveedor?')) return;
        try {
            await deleteTipoProveedor(id);
            await loadData();
        } catch (err: any) {
            alert(err.message);
        }
    }

    if (loading) {
        return <div className="text-gray-400">Cargando tipos de proveedor...</div>;
    }

    if (error) {
        return <div className="text-red-500">Error: {error}</div>;
    }

    return (
        <div>
            <div className="mb-4 flex justify-between items-center">
                <div>
                    <p className="text-sm text-gray-400">
                        Total: {tipos.length} tipos de proveedor
                    </p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="bg-primary hover:bg-primary-dark text-slate-900 font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                    + Nuevo Tipo
                </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="min-w-full bg-slate-700/50 rounded-lg overflow-hidden">
                    <thead className="bg-slate-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                ID
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                Nombre
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                Descripción
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                                Acciones
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-600">
                        {tipos.map((tipo) => (
                            <tr key={tipo.id} className="hover:bg-slate-600/30">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                    {tipo.id}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-white">{tipo.nombre}</div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-300">
                                    {tipo.descripcion || '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                        onClick={() => openEditModal(tipo)}
                                        className="text-primary hover:text-primary-dark mr-3"
                                    >
                                        Editar
                                    </button>
                                    <button
                                        onClick={() => handleDelete(tipo.id)}
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

            {/* Modal */}
            {modalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-slate-800 rounded-lg shadow-xl max-w-md w-full mx-4">
                        <div className="px-6 py-4 border-b border-slate-700">
                            <h3 className="text-lg font-semibold text-white">
                                {editingId ? 'Editar Tipo de Proveedor' : 'Nuevo Tipo de Proveedor'}
                            </h3>
                        </div>


                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Código *
                                </label>
                                <input
                                    type="text"
                                    value={formData.codigo}
                                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Nombre *
                                </label>
                                <input
                                    type="text"
                                    value={formData.nombre}
                                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Descripción
                                </label>
                                <textarea
                                    value={formData.descripcion}
                                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                                    rows={3}
                                />
                            </div>

                            <div className="flex justify-end space-x-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-primary hover:bg-primary-dark text-slate-900 font-semibold rounded-lg transition-colors"
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
