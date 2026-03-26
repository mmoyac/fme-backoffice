'use client';

import { useState, useEffect } from 'react';
import { AuthService } from '@/lib/auth';

interface Role {
    id: number;
    nombre: string;
    descripcion: string;
}

interface MenuItem {
    id: number;
    nombre: string;
    href: string;
}

export default function RolesPermisosList() {
    const [roles, setRoles] = useState<Role[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [roleMenus, setRoleMenus] = useState<number[]>([]);
    const [loading, setLoading] = useState(false);

    // CRUD roles
    const [showCreateRole, setShowCreateRole] = useState(false);
    const [newRole, setNewRole] = useState({ nombre: '', descripcion: '' });
    const [editingRole, setEditingRole] = useState<Role | null>(null);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    const getHeaders = () => ({
        'Authorization': `Bearer ${AuthService.getToken()}`,
        'Content-Type': 'application/json'
    });

    useEffect(() => {
        fetchRoles();
        fetchMenuItems();
    }, []);

    useEffect(() => {
        if (selectedRole) {
            fetchRoleMenu(selectedRole.id);
        }
    }, [selectedRole]);

    const fetchRoles = async () => {
        try {
            const res = await fetch(`${API_URL}/api/admin/roles`, { headers: getHeaders() });
            if (res.ok) setRoles(await res.json());
        } catch (e) { console.error(e); }
    };

    const fetchMenuItems = async () => {
        try {
            const res = await fetch(`${API_URL}/api/admin/menu_items`, { headers: getHeaders() });
            if (res.ok) setMenuItems(await res.json());
        } catch (e) { console.error(e); }
    };

    const fetchRoleMenu = async (roleId: number) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/admin/roles/${roleId}/menu`, { headers: getHeaders() });
            if (res.ok) {
                const items: MenuItem[] = await res.json();
                setRoleMenus(items.map(i => i.id));
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleCreateRole = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_URL}/api/admin/roles`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(newRole)
            });
            if (res.ok) {
                setShowCreateRole(false);
                setNewRole({ nombre: '', descripcion: '' });
                fetchRoles();
            } else {
                const err = await res.json();
                alert(`Error: ${err.detail}`);
            }
        } catch (e) { alert('Error al crear rol'); }
    };

    const handleUpdateRole = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingRole) return;
        try {
            const res = await fetch(`${API_URL}/api/admin/roles/${editingRole.id}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify({ nombre: editingRole.nombre, descripcion: editingRole.descripcion })
            });
            if (res.ok) {
                setEditingRole(null);
                fetchRoles();
            } else {
                const err = await res.json();
                alert(`Error: ${err.detail}`);
            }
        } catch (e) { alert('Error al actualizar rol'); }
    };

    const handleDeleteRole = async (role: Role) => {
        if (!confirm(`¿Eliminar rol "${role.nombre}"? Esta acción no se puede deshacer.`)) return;
        try {
            const res = await fetch(`${API_URL}/api/admin/roles/${role.id}`, {
                method: 'DELETE',
                headers: getHeaders()
            });
            if (res.ok) {
                if (selectedRole?.id === role.id) setSelectedRole(null);
                fetchRoles();
            } else {
                const err = await res.json();
                alert(`Error: ${err.detail}`);
            }
        } catch (e) { alert('Error al eliminar rol'); }
    };

    const handleSavePermissions = async () => {
        if (!selectedRole) return;
        try {
            const res = await fetch(`${API_URL}/api/admin/roles/${selectedRole.id}/menu`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(roleMenus)
            });
            if (res.ok) alert('Permisos guardados correctamente');
            else alert('Error al guardar permisos');
        } catch (e) { alert('Error de red'); }
    };

    const toggleMenuPermission = (menuId: number) => {
        setRoleMenus(prev =>
            prev.includes(menuId) ? prev.filter(id => id !== menuId) : [...prev, menuId]
        );
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Lista de roles */}
            <div className="bg-slate-900 rounded-lg p-4 h-fit">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg text-white font-semibold">Roles</h3>
                    <button
                        onClick={() => setShowCreateRole(true)}
                        className="bg-primary hover:bg-amber-600 text-slate-900 px-3 py-1 rounded text-sm font-semibold"
                    >
                        + Nuevo
                    </button>
                </div>
                <div className="space-y-2">
                    {roles.map(r => (
                        <div
                            key={r.id}
                            onClick={() => setSelectedRole(r)}
                            className={`p-3 rounded cursor-pointer transition-colors ${selectedRole?.id === r.id ? 'bg-primary text-slate-900 font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                        >
                            <div className="flex justify-between items-center">
                                <span>{r.nombre.toUpperCase()}</span>
                                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                                    <button
                                        onClick={() => setEditingRole({ ...r })}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-0.5 rounded text-xs"
                                    >
                                        Editar
                                    </button>
                                    <button
                                        onClick={() => handleDeleteRole(r)}
                                        className="bg-red-600 hover:bg-red-700 text-white px-2 py-0.5 rounded text-xs"
                                    >
                                        Eliminar
                                    </button>
                                </div>
                            </div>
                            {r.descripcion && (
                                <p className={`text-xs mt-1 ${selectedRole?.id === r.id ? 'text-slate-700' : 'text-slate-500'}`}>{r.descripcion}</p>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Permisos del rol seleccionado */}
            <div className="md:col-span-2 bg-slate-900 rounded-lg p-6">
                {selectedRole ? (
                    <>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl text-white">
                                Permisos de Menú: <span className="text-primary font-bold">{selectedRole.nombre.toUpperCase()}</span>
                            </h3>
                            <button
                                onClick={handleSavePermissions}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow-lg"
                            >
                                Guardar Cambios
                            </button>
                        </div>
                        {loading ? (
                            <p className="text-slate-400">Cargando permisos...</p>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                {menuItems.map(item => (
                                    <label key={item.id} className="flex items-center space-x-3 p-3 bg-slate-800 rounded hover:bg-slate-700 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={roleMenus.includes(item.id)}
                                            onChange={() => toggleMenuPermission(item.id)}
                                            className="form-checkbox h-5 w-5 text-primary rounded border-slate-600 bg-slate-800 focus:ring-primary focus:ring-offset-slate-900"
                                        />
                                        <span className="text-slate-200">{item.nombre}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full text-slate-500">
                        <p>Selecciona un rol para editar sus permisos</p>
                    </div>
                )}
            </div>

            {/* Modal: Nuevo Rol */}
            {showCreateRole && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                    <div className="bg-slate-800 rounded-xl p-8 w-full max-w-md border border-slate-700 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">Nuevo Rol</h3>
                            <button onClick={() => setShowCreateRole(false)} className="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
                        </div>
                        <form onSubmit={handleCreateRole} className="grid grid-cols-1 gap-4">
                            <input
                                className="bg-slate-900 border border-slate-600 p-2 rounded text-white"
                                placeholder="Nombre del rol"
                                value={newRole.nombre}
                                onChange={e => setNewRole({ ...newRole, nombre: e.target.value })}
                                required
                            />
                            <input
                                className="bg-slate-900 border border-slate-600 p-2 rounded text-white"
                                placeholder="Descripción (opcional)"
                                value={newRole.descripcion}
                                onChange={e => setNewRole({ ...newRole, descripcion: e.target.value })}
                            />
                            <div className="flex gap-2 justify-end mt-2">
                                <button type="button" onClick={() => setShowCreateRole(false)} className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded">Cancelar</button>
                                <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Editar Rol */}
            {editingRole && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                    <div className="bg-slate-800 rounded-xl p-8 w-full max-w-md border border-slate-700 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">Editar Rol</h3>
                            <button onClick={() => setEditingRole(null)} className="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
                        </div>
                        <form onSubmit={handleUpdateRole} className="grid grid-cols-1 gap-4">
                            <input
                                className="bg-slate-900 border border-slate-600 p-2 rounded text-white"
                                placeholder="Nombre del rol"
                                value={editingRole.nombre}
                                onChange={e => setEditingRole({ ...editingRole, nombre: e.target.value })}
                                required
                            />
                            <input
                                className="bg-slate-900 border border-slate-600 p-2 rounded text-white"
                                placeholder="Descripción (opcional)"
                                value={editingRole.descripcion}
                                onChange={e => setEditingRole({ ...editingRole, descripcion: e.target.value })}
                            />
                            <div className="flex gap-2 justify-end mt-2">
                                <button type="button" onClick={() => setEditingRole(null)} className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded">Cancelar</button>
                                <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded">Actualizar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
