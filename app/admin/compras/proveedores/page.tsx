'use client';

import { useState, useEffect } from 'react';
import { getProveedores, createProveedor, updateProveedor, Proveedor, ProveedorCreate, getTiposProveedor, TipoProveedor } from '@/lib/api/compras';

export default function ProveedoresPage() {
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
        tipo_proveedor_id: null,
        activo: true
    });

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            setLoading(true);
            const [proveedoresData, tiposData] = await Promise.all([
                getProveedores(),
                getTiposProveedor()
            ]);
            setProveedores(proveedoresData);
            setTiposProveedor(tiposData);
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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-400">Cargando proveedores...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-900/20 border border-red-500 text-red-200 px-4 py-3 rounded">
                {error}
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-white">Proveedores</h1>
                <button
                    onClick={openCreateModal}
                    className="bg-primary hover:bg-primary-dark text-slate-900 font-semibold px-6 py-2 rounded-lg transition-colors"
                >
                    + Nuevo Proveedor
                </button>
            </div>

            {proveedores.length === 0 ? (
                <div className="bg-slate-800 rounded-lg p-8 text-center text-gray-400">
                    No hay proveedores registrados.
                </div>
            ) : (
                <div className="bg-slate-800 rounded-lg overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Nombre</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">RUT</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Contacto</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Email</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Teléfono</th>
                                <th className="px-6 py-3 text-center text-sm font-semibold text-gray-300">Estado</th>
                                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-300">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {proveedores.map((proveedor) => (
                                <tr key={proveedor.id} className="hover:bg-slate-700/50">
                                    <td className="px-6 py-4 text-sm text-white font-medium">{proveedor.nombre}</td>
                                    <td className="px-6 py-4 text-sm text-gray-300">{proveedor.rut || '-'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-300">{proveedor.contacto || '-'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-300">{proveedor.email || '-'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-300">{proveedor.telefono || '-'}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${proveedor.activo ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
                                            {proveedor.activo ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => openEditModal(proveedor)}
                                            className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-xs"
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
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-slate-800 rounded-lg p-6 max-w-lg w-full shadow-xl border border-slate-700">
                        <h2 className="text-xl font-bold text-white mb-4">
                            {editingId ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-300 mb-1">Nombre *</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                                    value={formData.nombre}
                                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-300 mb-1">RUT</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                                    value={formData.rut}
                                    onChange={(e) => setFormData({ ...formData, rut: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-300 mb-1">Tipo de Proveedor</label>
                                <select
                                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                                    value={formData.tipo_proveedor_id || ''}
                                    onChange={(e) => setFormData({ ...formData, tipo_proveedor_id: e.target.value ? parseInt(e.target.value) : null })}
                                >
                                    <option value="">Seleccionar tipo</option>
                                    {tiposProveedor.map((tipo) => (
                                        <option key={tipo.id} value={tipo.id}>
                                            {tipo.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-300 mb-1">Contacto</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                                    value={formData.contacto}
                                    onChange={(e) => setFormData({ ...formData, contacto: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-300 mb-1">Email</label>
                                <input
                                    type="email"
                                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-300 mb-1">Teléfono</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                                    value={formData.telefono}
                                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-300 mb-1">Dirección</label>
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
                                <label htmlFor="activo" className="text-sm text-gray-300">Activo</label>
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
                                    className="px-4 py-2 rounded bg-primary hover:bg-primary-dark text-slate-900 font-bold"
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
