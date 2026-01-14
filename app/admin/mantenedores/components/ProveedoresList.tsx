'use client';

import { useState, useEffect } from 'react';
import { getProveedores, createProveedor, updateProveedor, deleteProveedor, getTiposProveedor, Proveedor, ProveedorCreate, TipoProveedor } from '@/lib/api/compras';

export default function ProveedoresList() {
    const [proveedores, setProveedores] = useState<Proveedor[]>([]);
    const [tiposProveedor, setTiposProveedor] = useState<TipoProveedor[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState<ProveedorCreate>({
        nombre: '',
        rut: '',
        contacto: '',
        email: '',
        telefono: '',
        direccion: '',
        activo: true
    });

    useEffect(() => {
        loadData();
        loadTiposProveedor();
    }, []);

    async function loadData() {
        try {
            setLoading(true);
            const data = await getProveedores();
            setProveedores(data);
            setError(null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function loadTiposProveedor() {
        try {
            const data = await getTiposProveedor();
            setTiposProveedor(data);
        } catch (err: any) {
            console.error('Error cargando tipos de proveedor:', err);
        }
    }

    function openCreateModal() {
        setEditingId(null);
        setFormData({
            nombre: '',
            rut: '',
            contacto: '',
            email: '',
            telefono: '',
            direccion: '',
            tipo_proveedor_id: null,
            activo: true
        });
        setModalOpen(true);
    }

    function openEditModal(proveedor: Proveedor) {
        setEditingId(proveedor.id);
        setFormData({
            nombre: proveedor.nombre,
            rut: proveedor.rut || '',
            contacto: proveedor.contacto || '',
            email: proveedor.email || '',
            telefono: proveedor.telefono || '',
            direccion: proveedor.direccion || '',
            tipo_proveedor_id: proveedor.tipo_proveedor_id || null,
            activo: proveedor.activo
        });
        setModalOpen(true);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        try {
            if (editingId) {
                await updateProveedor(editingId, formData);
            } else {
                await createProveedor(formData);
            }
            await loadData();
            setModalOpen(false);
        } catch (err: any) {
            alert(err.message);
        }
    }

    async function handleDelete(id: number, nombre: string) {
        if (!confirm(`¿Está seguro de eliminar el proveedor "${nombre}"?`)) {
            return;
        }

        try {
            await deleteProveedor(id);
            await loadData();
        } catch (err: any) {
            alert(err.message || 'Error al eliminar proveedor');
        }
    }

    if (loading) {
        return <div className="text-gray-400">Cargando proveedores...</div>;
    }

    if (error) {
        return <div className="text-red-500">{error}</div>;
    }

    return (
        <div>
            <div className="flex justify-end mb-4">
                <button
                    onClick={openCreateModal}
                    className="bg-primary hover:bg-primary-dark text-slate-900 px-4 py-2 rounded-lg transition-colors font-semibold"
                >
                    + Nuevo Proveedor
                </button>
            </div>

            {proveedores.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                    No hay proveedores registrados.
                </div>
            ) : (
                <div className="overflow-x-auto bg-slate-700 rounded-lg">
                    <table className="min-w-full divide-y divide-slate-600">
                        <thead className="bg-slate-600">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Nombre</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">RUT</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Tipo</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Contacto</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Teléfono</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase">Estado</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-600">
                            {proveedores.map((proveedor) => (
                                <tr key={proveedor.id} className="hover:bg-slate-600/50">
                                    <td className="px-6 py-4 text-sm font-medium text-white">{proveedor.nombre}</td>
                                    <td className="px-6 py-4 text-sm text-gray-300">{proveedor.rut || '-'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-300">
                                        {proveedor.tipo_proveedor ? (
                                            <span className="px-2 py-1 bg-slate-600 rounded text-xs font-medium text-gray-200">
                                                {proveedor.tipo_proveedor.nombre}
                                            </span>
                                        ) : (
                                            <span className="text-gray-500 italic">Sin definir</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-300">{proveedor.contacto || '-'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-300">{proveedor.email || '-'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-300">{proveedor.telefono || '-'}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${proveedor.activo ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
                                            {proveedor.activo ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        <button
                                            onClick={() => openEditModal(proveedor)}
                                            className="text-primary hover:text-primary-dark text-sm font-medium"
                                        >
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => handleDelete(proveedor.id, proveedor.nombre)}
                                            className="text-red-400 hover:text-red-300 text-sm font-medium"
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
                            {editingId ? 'Editar Proveedor' : 'Nuevo Proveedor'}
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
                                <label className="block text-sm font-medium text-gray-300 mb-1">RUT</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                                    value={formData.rut}
                                    onChange={(e) => setFormData({ ...formData, rut: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Tipo de Proveedor</label>
                                <select
                                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                                    value={formData.tipo_proveedor_id || ''}
                                    onChange={(e) => setFormData({ ...formData, tipo_proveedor_id: e.target.value ? parseInt(e.target.value) : null })}
                                >
                                    <option value="">Seleccionar tipo...</option>
                                    {tiposProveedor.map(tipo => (
                                        <option key={tipo.id} value={tipo.id}>
                                            {tipo.nombre} ({tipo.codigo})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Contacto</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                                    value={formData.contacto}
                                    onChange={(e) => setFormData({ ...formData, contacto: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                                <input
                                    type="email"
                                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Teléfono</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                                    value={formData.telefono}
                                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Dirección</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                                    value={formData.direccion}
                                    onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
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
