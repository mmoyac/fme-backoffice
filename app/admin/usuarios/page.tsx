
'use client';

import { useState, useEffect } from 'react';
import { AuthService } from '@/lib/auth';
import DataList from '@/components/ui/DataList';
import PageHeader from '@/components/ui/PageHeader';

interface Role {
    id: number;
    nombre: string;
    descripcion: string;
}

interface User {
    id: number;
    email: string;
    nombre_completo: string;
    role_id: number;
    role: Role;
    is_active: boolean;
    local_defecto_id?: number;
    porcentaje_comision?: number | null;
}

interface MenuItem {
    id: number;
    nombre: string;
    href: string;
}

interface Local {
    id: number;
    nombre: string;
    codigo: string;
}

export default function UsuariosPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [locales, setLocales] = useState<Local[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [newUser, setNewUser] = useState({ email: '', password: '', nombre: '', role_id: 0, local_defecto_id: 0 });
    const [showCreateUser, setShowCreateUser] = useState(false);

    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [showEditUser, setShowEditUser] = useState(false);

    // Modal de permisos de rol desde la lista de usuarios
    const [roleModalUser, setRoleModalUser] = useState<User | null>(null);
    const [roleModalMenus, setRoleModalMenus] = useState<number[]>([]);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    useEffect(() => {
        fetchUsers();
        fetchRoles();
        fetchMenuItems();
        fetchLocales();
    }, []);

    const getHeaders = () => ({
        'Authorization': `Bearer ${AuthService.getToken()}`,
        'Content-Type': 'application/json'
    });

    const fetchUsers = async () => {
        try {
            const res = await fetch(`${API_URL}/api/admin/users`, { headers: getHeaders() });
            if (res.ok) setUsers(await res.json());
        } catch (e) { console.error(e); }
    };

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

    const fetchLocales = async () => {
        try {
            const res = await fetch(`${API_URL}/api/locales/`, { headers: getHeaders() });
            if (res.ok) setLocales(await res.json());
        } catch (e) { console.error(e); }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newUser.role_id === 0) return alert('Seleccione un rol');
        if (newUser.local_defecto_id === 0) return alert('Seleccione un local');
        try {
            const res = await fetch(`${API_URL}/api/admin/users`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    email: newUser.email,
                    password: newUser.password,
                    nombre_completo: newUser.nombre,
                    role_id: newUser.role_id,
                    local_defecto_id: newUser.local_defecto_id,
                    is_active: true
                })
            });
            if (res.ok) {
                setShowCreateUser(false);
                setNewUser({ email: '', password: '', nombre: '', role_id: 0, local_defecto_id: 0 });
                fetchUsers();
            } else {
                const err = await res.json();
                alert(`Error: ${err.detail}`);
            }
        } catch (e) { alert('Error al crear usuario'); }
    };

    const handleEditUser = (user: User) => {
        setEditingUser({ ...user, role_id: user.role?.id ?? user.role_id });
        setShowEditUser(true);
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        if (!editingUser.role_id) return alert('Seleccione un rol');
        if (!editingUser.local_defecto_id) return alert('Seleccione un local');
        try {
            const res = await fetch(`${API_URL}/api/admin/users/${editingUser.id}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify({
                    nombre_completo: editingUser.nombre_completo,
                    role_id: editingUser.role_id,
                    is_active: editingUser.is_active,
                    local_defecto_id: editingUser.local_defecto_id,
                    porcentaje_comision: editingUser.porcentaje_comision ?? null,
                })
            });
            if (res.ok) {
                setShowEditUser(false);
                setEditingUser(null);
                fetchUsers();
            } else {
                const err = await res.json();
                alert(`Error: ${err.detail}`);
            }
        } catch (e) { alert('Error al actualizar usuario'); }
    };

    const handleDeleteUser = async (user: User) => {
        if (!confirm(`¿Eliminar usuario "${user.nombre_completo}"? Esta acción no se puede deshacer.`)) return;
        try {
            const res = await fetch(`${API_URL}/api/admin/users/${user.id}`, {
                method: 'DELETE',
                headers: getHeaders(),
            });
            if (res.ok) {
                fetchUsers();
            } else {
                const err = await res.json();
                alert(`Error: ${err.detail}`);
            }
        } catch (e) { alert('Error al eliminar usuario'); }
    };


    const handleSaveRoleModal = async () => {
        if (!roleModalUser) return;
        try {
            const roleId = roleModalUser.role?.id ?? roleModalUser.role_id;
            const res = await fetch(`${API_URL}/api/admin/roles/${roleId}/menu`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(roleModalMenus)
            });
            if (res.ok) setRoleModalUser(null);
            else alert('Error al guardar permisos');
        } catch (e) { alert('Error de red'); }
    };

    const rolBadge = (u: User) => (
        <span className="inline-block bg-slate-700 px-2 py-1 rounded text-xs font-bold uppercase text-primary break-all">
            {u.role?.nombre}
        </span>
    );

    const localDe = (u: User) =>
        u.local_defecto_id
            ? <span>{locales.find(l => l.id === u.local_defecto_id)?.nombre || `Local ID: ${u.local_defecto_id}`}</span>
            : <span className="text-slate-500">Sin asignar</span>;

    const estadoDe = (u: User) =>
        u.is_active
            ? <span className="text-green-400">Activo</span>
            : <span className="text-red-400">Inactivo</span>;

    const accionesDe = (u: User) => (
        <div className="flex flex-wrap gap-2">
            <button
                onClick={() => handleEditUser(u)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
            >
                Editar
            </button>
            <button
                onClick={() => handleDeleteUser(u)}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
            >
                Eliminar
            </button>
        </div>
    );

    return (
        <div className="space-y-6">
            <PageHeader
                title="Gestión de Usuarios"
                actions={
                    <button
                        onClick={() => setShowCreateUser(true)}
                        className="bg-primary hover:bg-amber-600 text-slate-900 px-4 py-2 rounded-lg font-semibold"
                    >
                        + Nuevo Usuario
                    </button>
                }
            />

            <div className="min-h-[400px]">
                <DataList
                    items={users}
                    getKey={(u) => u.id}
                    columns={[
                        { header: 'Nombre', className: 'w-[22%]', cell: (u) => <span className="text-slate-200" title={u.nombre_completo}>{u.nombre_completo}</span> },
                        { header: 'Email', className: 'w-[24%]', cell: (u) => <span className="text-slate-300" title={u.email}>{u.email}</span> },
                        { header: 'Rol', className: 'w-[13%]', sinTruncar: true, cell: rolBadge },
                        { header: 'Local', className: 'w-[13%]', cell: localDe },
                        { header: 'Estado', className: 'w-[9%]', sinTruncar: true, cell: estadoDe },
                        { header: 'Acciones', className: 'w-[19%]', sinTruncar: true, cell: accionesDe },
                    ]}
                    card={(u) => (
                        <div className="space-y-2 text-slate-300">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="text-white font-medium break-words">{u.nombre_completo}</div>
                                    <div className="text-xs text-slate-400 break-all">{u.email}</div>
                                </div>
                                <div className="shrink-0 text-right space-y-1">
                                    {rolBadge(u)}
                                    <div className="text-xs">{estadoDe(u)}</div>
                                </div>
                            </div>
                            <div className="text-sm">Local: {localDe(u)}</div>
                            <div className="pt-2 border-t border-slate-700">{accionesDe(u)}</div>
                        </div>
                    )}
                />
            </div>

            {/* Modal: Nuevo Usuario */}
            {showCreateUser && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 rounded-xl p-5 sm:p-8 w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto border border-slate-700 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">Nuevo Usuario</h3>
                            <button onClick={() => setShowCreateUser(false)} className="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
                        </div>
                        <form onSubmit={handleCreateUser} className="grid grid-cols-1 gap-4">
                            <input
                                className="bg-slate-900 border border-slate-600 p-2 rounded text-white"
                                placeholder="Nombre Completo"
                                value={newUser.nombre}
                                onChange={e => setNewUser({ ...newUser, nombre: e.target.value })}
                                required
                            />
                            <input
                                className="bg-slate-900 border border-slate-600 p-2 rounded text-white"
                                placeholder="Email" type="email"
                                value={newUser.email}
                                onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                required
                            />
                            <input
                                className="bg-slate-900 border border-slate-600 p-2 rounded text-white"
                                placeholder="Contraseña" type="password"
                                value={newUser.password}
                                onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                required
                            />
                            <select
                                className="bg-slate-900 border border-slate-600 p-2 rounded text-white"
                                value={newUser.role_id}
                                onChange={e => setNewUser({ ...newUser, role_id: Number(e.target.value) })}
                                required
                            >
                                <option value={0}>Seleccione Rol...</option>
                                {roles.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                            </select>
                            <select
                                className="bg-slate-900 border border-slate-600 p-2 rounded text-white"
                                value={newUser.local_defecto_id}
                                onChange={e => setNewUser({ ...newUser, local_defecto_id: Number(e.target.value) })}
                                required
                            >
                                <option value={0}>Seleccione Local...</option>
                                {locales && locales.filter(l => l.codigo !== 'WEB').map(l => (
                                    <option key={l.id} value={l.id}>{l.nombre}</option>
                                ))}
                            </select>
                            <div className="flex gap-2 justify-end mt-2">
                                <button type="button" onClick={() => setShowCreateUser(false)} className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded">Cancelar</button>
                                <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Editar Usuario */}
            {showEditUser && editingUser && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 rounded-xl p-5 sm:p-8 w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto border border-slate-700 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">Editar: {editingUser.email}</h3>
                            <button onClick={() => setShowEditUser(false)} className="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
                        </div>
                        <form onSubmit={handleUpdateUser} className="grid grid-cols-1 gap-4">
                            <input
                                className="bg-slate-900 border border-slate-600 p-2 rounded text-white"
                                placeholder="Nombre Completo"
                                value={editingUser.nombre_completo || ''}
                                onChange={e => setEditingUser({ ...editingUser, nombre_completo: e.target.value })}
                                required
                            />
                            <select
                                className="bg-slate-900 border border-slate-600 p-2 rounded text-white"
                                value={editingUser.role_id}
                                onChange={e => setEditingUser({ ...editingUser, role_id: Number(e.target.value) })}
                                required
                            >
                                <option value={0}>Seleccione Rol...</option>
                                {roles.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                            </select>
                            <select
                                className="bg-slate-900 border border-slate-600 p-2 rounded text-white"
                                value={editingUser.local_defecto_id || ''}
                                onChange={e => setEditingUser({ ...editingUser, local_defecto_id: e.target.value ? Number(e.target.value) : undefined })}
                            >
                                    <option value="">Seleccione Local...</option>
                                {locales && locales.filter(l => l.codigo !== 'WEB').map(l => (
                                    <option key={l.id} value={l.id}>{l.nombre}</option>
                                ))}
                            </select>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="is_active_edit"
                                    checked={editingUser.is_active}
                                    onChange={e => setEditingUser({ ...editingUser, is_active: e.target.checked })}
                                />
                                <label htmlFor="is_active_edit" className="text-white">Usuario Activo</label>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-slate-400 text-xs">% Comisión sobre neto (dejar vacío = sin comisión)</label>
                                <input
                                    type="number" step="0.01" min="0" max="100"
                                    className="bg-slate-900 border border-slate-600 p-2 rounded text-white"
                                    placeholder="Ej: 1.50"
                                    value={editingUser.porcentaje_comision ?? ''}
                                    onChange={e => setEditingUser({
                                        ...editingUser,
                                        porcentaje_comision: e.target.value === '' ? null : Number(e.target.value)
                                    })}
                                />
                            </div>
                            <div className="flex gap-2 justify-end mt-2">
                                <button type="button" onClick={() => setShowEditUser(false)} className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded">Cancelar</button>
                                <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded">Actualizar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Permisos de rol desde lista de usuarios */}
            {roleModalUser && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 rounded-xl p-5 sm:p-8 w-full max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto border border-slate-700 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-white">Permisos del rol</h3>
                                <p className="text-slate-400 text-sm mt-1">
                                    {roleModalUser.nombre_completo} &mdash; <span className="text-primary font-semibold uppercase">{roleModalUser.role?.nombre}</span>
                                </p>
                            </div>
                            <button onClick={() => setRoleModalUser(null)} className="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
                        </div>
                        {menuItems.length === 0 ? (
                            <p className="text-slate-400">Cargando permisos...</p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                                {menuItems.map(item => (
                                    <label key={item.id} className="flex items-center space-x-3 p-3 bg-slate-900 rounded hover:bg-slate-700 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={roleModalMenus.includes(item.id)}
                                            onChange={() => setRoleModalMenus(prev =>
                                                prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]
                                            )}
                                            className="form-checkbox h-5 w-5 text-primary rounded border-slate-600 bg-slate-800"
                                        />
                                        <span className="text-slate-200">{item.nombre}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                        <p className="text-slate-500 text-xs mb-4">Los cambios afectan a todos los usuarios con el rol <span className="text-primary uppercase">{roleModalUser.role?.nombre}</span>.</p>
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => setRoleModalUser(null)} className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded">Cancelar</button>
                            <button onClick={handleSaveRoleModal} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded">Guardar Cambios</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
