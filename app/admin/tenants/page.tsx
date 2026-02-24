'use client';

import { useState, useEffect } from 'react';
import { AuthService } from '@/lib/auth';

interface Tenant {
    id: number;
    codigo: string;
    nombre: string;
    dominio_principal: string | null;
    subdomain: string | null;
    activo: boolean;
    correlativo_pedido: number;
    created_at: string;
    updated_at: string;
    total_productos?: number;
    total_clientes?: number;
    total_pedidos?: number;
    total_usuarios?: number;
}

export default function TenantsPage() {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(false);
    const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showUsersModal, setShowUsersModal] = useState(false);
    const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [newTenant, setNewTenant] = useState({
        codigo: '',
        nombre: '',
        dominio_principal: '',
        subdomain: '',
        activo: true
    });

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    useEffect(() => {
        fetchTenants();
    }, []);

    const getHeaders = () => ({
        'Authorization': `Bearer ${AuthService.getToken()}`,
        'Content-Type': 'application/json'
    });

    const fetchTenants = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/tenants/`, { headers: getHeaders() });
            if (res.ok) {
                const data = await res.json();
                setTenants(data);
            } else {
                alert('Error al cargar tenants');
            }
        } catch (e) {
            console.error(e);
            alert('Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = (tenant: Tenant) => {
        setEditingTenant({ ...tenant });
        setShowEditModal(true);
    };

    const handleSaveEdit = async () => {
        if (!editingTenant) return;

        setLoading(true);
        try {
            // Si el usuario borra el campo, enviar cadena vacía ("") para forzar borrado en backend
            const updateData = {
                nombre: editingTenant.nombre,
                dominio_principal: typeof editingTenant.dominio_principal === 'string' ? editingTenant.dominio_principal : '',
                subdomain: typeof editingTenant.subdomain === 'string' ? editingTenant.subdomain : '',
                activo: editingTenant.activo,
                correlativo_pedido: editingTenant.correlativo_pedido,
            };

            const res = await fetch(`${API_URL}/api/tenants/${editingTenant.id}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(updateData)
            });

            if (res.ok) {
                alert('✅ Tenant actualizado exitosamente');
                setShowEditModal(false);
                setEditingTenant(null);
                fetchTenants();
            } else {
                const error = await res.json();
                alert(`❌ Error: ${error.detail || 'Error al actualizar'}`);
            }
        } catch (e) {
            console.error(e);
            alert('❌ Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleActive = async (tenant: Tenant) => {
        const newStatus = !tenant.activo;
        const confirmMsg = newStatus
            ? `¿Activar tenant "${tenant.nombre}"?`
            : `⚠️ ¿DESACTIVAR tenant "${tenant.nombre}"?\n\nSus usuarios NO podrán acceder al sistema.`;

        if (!confirm(confirmMsg)) return;

        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/tenants/${tenant.id}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify({ activo: newStatus })
            });

            if (res.ok) {
                alert(newStatus ? '✅ Tenant activado' : '🔒 Tenant desactivado');
                fetchTenants();
            } else {
                alert('❌ Error al cambiar estado');
            }
        } catch (e) {
            console.error(e);
            alert('❌ Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    const handleShowUsers = async (tenantId: number) => {
        setSelectedTenantId(tenantId);
        setShowUsersModal(true);
        await fetchUsers(tenantId);
    };

    const fetchUsers = async (tenantId: number) => {
        try {
            const res = await fetch(`${API_URL}/api/tenants/${tenantId}/users`, { headers: getHeaders() });
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            } else {
                alert('Error al cargar usuarios');
            }
        } catch (e) {
            console.error(e);
            alert('Error de conexión');
        }
    };

    // Eliminar tenant
    const handleDeleteTenant = async (tenant: Tenant) => {
        if (tenant.id === 1) {
            alert('No se puede eliminar el tenant principal');
            return;
        }
        if (!confirm(`¿Seguro que deseas eliminar el tenant "${tenant.nombre}"?\n\nEsta acción es irreversible y eliminará TODOS los datos asociados (productos, clientes, pedidos, usuarios, etc).`)) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/tenants/${tenant.id}`, {
                method: 'DELETE',
                headers: getHeaders(),
            });
            if (res.ok) {
                alert('✅ Tenant eliminado correctamente');
                fetchTenants();
            } else {
                const error = await res.json();
                alert(`❌ Error: ${error.detail || 'No se pudo eliminar el tenant'}`);
            }
        } catch (e) {
            alert('❌ Error de conexión');
        } finally {
            setLoading(false);
        }
    };
    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-white">🏢 Gestión de Tenants (SaaS)</h1>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg"
                >
                    + Nuevo Tenant
                </button>
            </div>
            {/* Modal de creación */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-2xl w-full mx-4">
                        <h2 className="text-2xl font-bold mb-4 text-white">➕ Nuevo Tenant</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Código único *</label>
                                <input type="text" value={newTenant.codigo} onChange={e => setNewTenant({ ...newTenant, codigo: e.target.value })} className="w-full p-2 border border-slate-600 rounded bg-slate-700 text-white" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Nombre comercial *</label>
                                <input type="text" value={newTenant.nombre} onChange={e => setNewTenant({ ...newTenant, nombre: e.target.value })} className="w-full p-2 border border-slate-600 rounded bg-slate-700 text-white" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Dominio principal</label>
                                <input type="text" value={newTenant.dominio_principal} onChange={e => setNewTenant({ ...newTenant, dominio_principal: e.target.value })} className="w-full p-2 border border-slate-600 rounded bg-slate-700 text-white" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Subdominio</label>
                                <input type="text" value={newTenant.subdomain} onChange={e => setNewTenant({ ...newTenant, subdomain: e.target.value })} className="w-full p-2 border border-slate-600 rounded bg-slate-700 text-white" />
                            </div>
                            <div className="flex items-center space-x-2">
                                <input type="checkbox" checked={newTenant.activo} onChange={e => setNewTenant({ ...newTenant, activo: e.target.checked })} id="activo" />
                                <label htmlFor="activo" className="text-sm text-gray-300">Activo</label>
                            </div>
                        </div>
                        <div className="flex justify-end space-x-2 mt-6">
                            <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 bg-slate-600 text-white rounded-lg">Cancelar</button>
                            <button
                                onClick={async () => {
                                    if (!newTenant.codigo || !newTenant.nombre) {
                                        alert('Completa los campos obligatorios');
                                        return;
                                    }
                                    setLoading(true);
                                    try {
                                        const res = await fetch(`${API_URL}/api/tenants/`, {
                                            method: 'POST',
                                            headers: {
                                                'Content-Type': 'application/json',
                                                'Authorization': `Bearer ${AuthService.getToken()}`
                                            },
                                            body: JSON.stringify(newTenant)
                                        });
                                        if (res.ok) {
                                            const createdTenant = await res.json();
                                            const adminInfo = createdTenant.usuario_admin_email 
                                                ? `\n\n✅ Usuario administrador creado:\n📧 Email: ${createdTenant.usuario_admin_email}\n🔑 Contraseña: ${createdTenant.usuario_admin_password_temporal}\n\n⚠️ Guarda estas credenciales, la contraseña debe ser cambiada al primer login.`
                                                : '';
                                            alert(`✅ Tenant creado exitosamente${adminInfo}`);
                                            setShowCreateModal(false);
                                            setNewTenant({ codigo: '', nombre: '', dominio_principal: '', subdomain: '', activo: true });
                                            fetchTenants();
                                        } else {
                                            const error = await res.json();
                                            alert(`❌ Error: ${error.detail || 'No se pudo crear el tenant'}`);
                                        }
                                    } catch (e) {
                                        alert('❌ Error de conexión');
                                    } finally {
                                        setLoading(false);
                                    }
                                }}
                                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold"
                                disabled={loading}
                            >
                                Crear
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Advertencia */}
            <div className="mb-6 p-4 bg-amber-900/30 border border-amber-700 rounded-lg">
                <p className="text-sm text-amber-200">
                    ⚠️ <strong>Administración Multi-Tenant:</strong> Los cambios aquí afectan el acceso de clientes a la plataforma.
                    Desactivar un tenant bloqueará completamente su acceso.
                </p>
            </div>

            {/* Tabla de tenants */}
            <div className="bg-slate-800 shadow-md rounded-lg overflow-hidden border border-slate-700">
                <table className="min-w-full">
                    <thead className="bg-slate-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Código</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Nombre</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Dominio</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Correlativo</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Estado</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Estadísticas</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-slate-800 divide-y divide-slate-700">
                        {tenants.map((tenant) => (
                            <tr key={tenant.id} className={!tenant.activo ? 'bg-red-900/20' : ''}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{tenant.id}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <code className="text-sm bg-slate-700 text-primary px-2 py-1 rounded">{tenant.codigo}</code>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                                    {tenant.nombre}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                    {tenant.dominio_principal || tenant.subdomain || '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-mono">
                                    {tenant.correlativo_pedido.toString().padStart(5, '0')}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                        tenant.activo
                                            ? 'bg-green-900/30 text-green-400 border border-green-700'
                                            : 'bg-red-900/30 text-red-400 border border-red-700'
                                    }`}>
                                        {tenant.activo ? '✅ ACTIVO' : '🔒 INACTIVO'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-300">
                                    <div className="space-y-1">
                                        <div>📦 Productos: {tenant.total_productos || 0}</div>
                                        <div>👥 Clientes: {tenant.total_clientes || 0}</div>
                                        <div>📋 Pedidos: {tenant.total_pedidos || 0}</div>
                                        <div>🔐 Usuarios: {tenant.total_usuarios || 0}</div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                                    <button
                                        onClick={() => handleEditClick(tenant)}
                                        className="text-primary hover:text-primary-dark font-medium"
                                        disabled={loading}
                                    >
                                        ✏️ Editar
                                    </button>
                                    <button
                                        onClick={() => handleToggleActive(tenant)}
                                        className={tenant.activo ? 'text-red-400 hover:text-red-300' : 'text-green-400 hover:text-green-300'}
                                        disabled={loading || tenant.id === 1}
                                        title={tenant.id === 1 ? 'No se puede desactivar el tenant principal' : ''}
                                    >
                                        {tenant.activo ? '🔒 Desactivar' : '✅ Activar'}
                                    </button>
                                    <button
                                        onClick={() => handleShowUsers(tenant.id)}
                                        className="text-purple-400 hover:text-purple-300 font-medium"
                                        disabled={loading}
                                    >
                                        👥 Usuarios ({tenant.total_usuarios || 0})
                                    </button>
                                    <button
                                        onClick={() => handleDeleteTenant(tenant)}
                                        className="text-red-500 hover:text-red-300 font-medium"
                                        disabled={loading || tenant.id === 1}
                                        title={tenant.id === 1 ? 'No se puede eliminar el tenant principal' : 'Eliminar tenant'}
                                    >
                                        🗑️ Eliminar
                                    </button>
                                    <a
                                        href={`/admin/configuracion/landing?tenant_id=${tenant.id}`}
                                        className="text-blue-400 hover:text-blue-300 font-medium underline ml-2"
                                        title="Configurar landing de este tenant"
                                    >
                                        🎨 Landing
                                    </a>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {tenants.length === 0 && !loading && (
                    <div className="p-8 text-center text-gray-400">
                        No hay tenants registrados
                    </div>
                )}
            </div>

            {/* Modal de edición */}
            {showEditModal && editingTenant && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-2xl w-full mx-4">
                        <h2 className="text-2xl font-bold mb-4 text-white">✏️ Editar Tenant: {editingTenant.nombre}</h2>

                        <div className="space-y-4">
                            {/* Código (solo lectura) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Código (no editable)
                                </label>
                                <input
                                    type="text"
                                    value={editingTenant.codigo}
                                    disabled
                                    className="w-full p-2 border border-slate-600 rounded bg-slate-700 text-gray-400 cursor-not-allowed"
                                />
                            </div>

                            {/* Nombre */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Nombre comercial
                                </label>
                                <input
                                    type="text"
                                    value={editingTenant.nombre}
                                    onChange={(e) => setEditingTenant({ ...editingTenant, nombre: e.target.value })}
                                    className="w-full p-2 border border-slate-600 bg-slate-700 text-white rounded focus:ring-2 focus:ring-primary"
                                />
                            </div>

                            {/* Dominio principal */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Dominio principal (ej: masasestacion.cl)
                                </label>
                                <input
                                    type="text"
                                    value={editingTenant.dominio_principal || ''}
                                    onChange={(e) => setEditingTenant({ ...editingTenant, dominio_principal: e.target.value })}
                                    className="w-full p-2 border border-slate-600 bg-slate-700 text-white rounded focus:ring-2 focus:ring-primary"
                                    placeholder="dominio.cl"
                                />
                            </div>

                            {/* Subdominio */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Subdominio (ej: masasestacion)
                                </label>
                                <input
                                    type="text"
                                    value={editingTenant.subdomain || ''}
                                    onChange={(e) => setEditingTenant({ ...editingTenant, subdomain: e.target.value })}
                                    className="w-full p-2 border border-slate-600 bg-slate-700 text-white rounded focus:ring-2 focus:ring-primary"
                                    placeholder="subdominio"
                                />
                            </div>

                            {/* Correlativo de pedidos */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Correlativo de pedidos
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={editingTenant.correlativo_pedido}
                                    onChange={(e) => setEditingTenant({ ...editingTenant, correlativo_pedido: parseInt(e.target.value) || 0 })}
                                    className="w-full p-2 border border-slate-600 bg-slate-700 text-white rounded focus:ring-2 focus:ring-primary"
                                />
                                <p className="text-xs text-gray-400 mt-1">
                                    ⚠️ Próximo pedido será: {editingTenant.codigo.toUpperCase().replace('-', '')
                                        .split('').map((c, i) => i === 0 || c === c.toUpperCase() ? c : '').join('')
                                    }-{new Date().getFullYear()}-{(editingTenant.correlativo_pedido + 1).toString().padStart(5, '0')}
                                </p>
                            </div>

                            {/* Estado activo */}
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    checked={editingTenant.activo}
                                    onChange={(e) => setEditingTenant({ ...editingTenant, activo: e.target.checked })}
                                    className="w-4 h-4 text-primary rounded focus:ring-primary"
                                />
                                <label className="text-sm font-medium text-gray-300">
                                    Tenant activo (puede acceder al sistema)
                                </label>
                            </div>

                            {!editingTenant.activo && (
                                <div className="p-3 bg-red-900/30 border border-red-600/50 rounded">
                                    <p className="text-sm text-red-200">
                                        ⚠️ <strong>ADVERTENCIA:</strong> Desactivar este tenant bloqueará el acceso de todos sus usuarios.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Botones */}
                        <div className="flex justify-end space-x-3 mt-6">
                            <button
                                onClick={() => {
                                    setShowEditModal(false);
                                    setEditingTenant(null);
                                }}
                                className="px-4 py-2 border border-slate-600 text-gray-300 rounded-lg hover:bg-slate-700"
                                disabled={loading}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:bg-slate-600"
                                disabled={loading}
                            >
                                {loading ? '⏳ Guardando...' : '💾 Guardar Cambios'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Modal de Gestión de Usuarios */}
            {showUsersModal && selectedTenantId && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold text-white">
                                👥 Usuarios del Tenant: {tenants.find(t => t.id === selectedTenantId)?.nombre}
                            </h2>
                            <button
                                onClick={() => {
                                    setShowUsersModal(false);
                                    setSelectedTenantId(null);
                                    setUsers([]);
                                }}
                                className="text-gray-400 hover:text-white text-2xl"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Tabla de usuarios */}
                        <div className="bg-slate-900 rounded-lg overflow-hidden">
                            <table className="min-w-full divide-y divide-slate-700">
                                <thead className="bg-slate-800">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">ID</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Email</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Nombre</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Rol</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Local</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-slate-900 divide-y divide-slate-700">
                                    {users.map((user) => (
                                        <tr key={user.id} className="hover:bg-slate-800">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                                #{user.id}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">
                                                {user.email}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                                {user.nombre_completo}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className="px-2 py-1 rounded-full text-xs bg-blue-900/30 text-blue-400 border border-blue-700">
                                                    {user.role_nombre || 'Sin rol'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                                {user.local_nombre || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                    user.is_active
                                                        ? 'bg-green-900/30 text-green-400 border border-green-700'
                                                        : 'bg-red-900/30 text-red-400 border border-red-700'
                                                }`}>
                                                    {user.is_active ? '✅ ACTIVO' : '🔒 INACTIVO'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {users.length === 0 && (
                                <div className="p-8 text-center text-gray-400">
                                    No hay usuarios registrados para este tenant
                                </div>
                            )}
                        </div>

                        {/* Información adicional */}
                        <div className="mt-4 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                            <p className="text-sm text-blue-300">
                                ℹ️ <strong>Nota:</strong> Los usuarios se crean automáticamente al crear un nuevo tenant. 
                                El usuario administrador inicial tiene email <code className="bg-slate-800 px-2 py-1 rounded">admin@{tenants.find(t => t.id === selectedTenantId)?.codigo.toLowerCase()}.com</code> 
                                con contraseña temporal <code className="bg-slate-800 px-2 py-1 rounded">admin123</code>.
                            </p>
                            <p className="text-xs text-blue-400 mt-2">
                                💡 Puedes gestionar usuarios desde el menú <strong>Admin → Usuarios</strong> filtrando por tenant.
                            </p>
                        </div>

                        {/* Botón cerrar */}
                        <div className="flex justify-end mt-6">
                            <button
                                onClick={() => {
                                    setShowUsersModal(false);
                                    setSelectedTenantId(null);
                                    setUsers([]);
                                }}
                                className="px-4 py-2 border border-slate-600 text-gray-300 rounded-lg hover:bg-slate-700"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
