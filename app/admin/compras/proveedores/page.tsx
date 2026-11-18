'use client';

import { useState, useEffect } from 'react';
import { getProveedores, createProveedor, updateProveedor, Proveedor, ProveedorCreate, getTiposProveedor, TipoProveedor } from '@/lib/api/compras';
import DataList, { type Columna } from '@/components/ui/DataList';
import PageHeader from '@/components/ui/PageHeader';

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

    const estadoBadge = (p: Proveedor) => (
        <span className={`px-2 py-1 rounded text-xs font-bold ${p.activo ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
            {p.activo ? 'Activo' : 'Inactivo'}
        </span>
    );

    const botonEditar = (p: Proveedor) => (
        <button
            onClick={(e) => { e.stopPropagation(); openEditModal(p); }}
            className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-xs"
        >
            Editar
        </button>
    );

    const columnas: Columna<Proveedor>[] = [
        { header: 'Nombre', className: 'w-[22%]', cell: (p) => <span className="text-white font-medium" title={p.nombre}>{p.nombre}</span> },
        { header: 'RUT', className: 'w-[12%]', cell: (p) => <span className="text-gray-300">{p.rut || '-'}</span> },
        { header: 'Contacto', className: 'w-[15%]', cell: (p) => <span className="text-gray-300" title={p.contacto || undefined}>{p.contacto || '-'}</span> },
        { header: 'Email', className: 'w-[20%]', cell: (p) => <span className="text-gray-300" title={p.email || undefined}>{p.email || '-'}</span> },
        { header: 'Teléfono', className: 'w-[12%]', cell: (p) => <span className="text-gray-300">{p.telefono || '-'}</span> },
        { header: 'Estado', className: 'w-[10%] text-center', sinTruncar: true, cell: estadoBadge },
        { header: 'Acciones', className: 'w-[9%] text-right', sinTruncar: true, cell: botonEditar },
    ];

    return (
        <div>
            <PageHeader
                title="Proveedores"
                actions={
                    <button
                        onClick={openCreateModal}
                        className="bg-primary hover:bg-primary-dark text-slate-900 font-semibold px-6 py-2 rounded-lg transition-colors"
                    >
                        + Nuevo Proveedor
                    </button>
                }
            />

            <DataList
                items={proveedores}
                getKey={(p) => p.id}
                columns={columnas}
                empty="No hay proveedores registrados."
                card={(p) => (
                    <div className="space-y-2">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="text-white font-medium break-words">{p.nombre}</div>
                                <div className="text-xs text-gray-400">RUT: {p.rut || '-'}</div>
                            </div>
                            <div className="shrink-0">{estadoBadge(p)}</div>
                        </div>
                        <div className="text-sm text-gray-300 space-y-0.5 min-w-0">
                            <div className="break-words">Contacto: {p.contacto || '-'}</div>
                            <div className="break-all">Email: {p.email || '-'}</div>
                            <div>Teléfono: {p.telefono || '-'}</div>
                        </div>
                        <div className="pt-2 border-t border-slate-700">{botonEditar(p)}</div>
                    </div>
                )}
            />

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
