
'use client';

import { useState, useEffect } from 'react';
import { AuthService } from '@/lib/auth';

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
    const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [locales, setLocales] = useState<Local[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [roleMenus, setRoleMenus] = useState<number[]>([]); // IDs de menus asignados
    const [loading, setLoading] = useState(false);

    // Estados para formulario usuario
    const [newUser, setNewUser] = useState({ email: '', password: '', nombre: '', role_id: 0 });
    const [showCreateUser, setShowCreateUser] = useState(false);
    
    // Estados para edición de usuario
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [showEditUser, setShowEditUser] = useState(false);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    useEffect(() => {
        fetchUsers();
        fetchRoles();
        fetchMenuItems();
        fetchLocales();
    }, []);

    useEffect(() => {
        if (selectedRole && activeTab === 'roles') {
            fetchRoleMenu(selectedRole.id);
        }
    }, [selectedRole, activeTab]);

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
            console.log('Fetching locales from:', `${API_URL}/api/locales`);
            const res = await fetch(`${API_URL}/api/locales`, { headers: getHeaders() });
            if (res.ok) {
                const data = await res.json();
                console.log('Locales received:', data);
                setLocales(data);
            } else {
                console.error('Error fetching locales:', res.status, res.statusText);
            }
        } catch (e) { 
            console.error('Exception fetching locales:', e); 
        }
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

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newUser.role_id === 0) return alert('Seleccione un rol');
        try {
            const res = await fetch(`${API_URL}/api/admin/users`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    email: newUser.email,
                    password: newUser.password,
                    nombre_completo: newUser.nombre,
                    role_id: newUser.role_id,
                    is_active: true
                })
            });
            if (res.ok) {
                alert('Usuario creado');
                setShowCreateUser(false);
                setNewUser({ email: '', password: '', nombre: '', role_id: 0 });
                fetchUsers();
            } else {
                const err = await res.json();
                alert(`Error: ${err.detail}`);
            }
        } catch (e) { alert('Error al crear usuario'); }
    };

    const handleEditUser = (user: User) => {
        setEditingUser(user);
        setShowEditUser(true);
        setShowCreateUser(false);
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        try {
            const res = await fetch(`${API_URL}/api/admin/users/${editingUser.id}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify({
                    nombre_completo: editingUser.nombre_completo,
                    role_id: editingUser.role_id,
                    is_active: editingUser.is_active,
                    local_defecto_id: editingUser.local_defecto_id
                })
            });
            if (res.ok) {
                alert('Usuario actualizado');
                setShowEditUser(false);
                setEditingUser(null);
                fetchUsers();
            } else {
                const err = await res.json();
                alert(`Error: ${err.detail}`);
            }
        } catch (e) { alert('Error al actualizar usuario'); }
    };

    const handleSavePermissions = async () => {
        if (!selectedRole) return;
        try {
            const res = await fetch(`${API_URL}/api/admin/roles/${selectedRole.id}/menu`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(roleMenus) // Enviar lista de IDs [1, 2, 3]
            });
            if (res.ok) alert('Permisos guardados correctamente');
            else alert('Error al guardar permisos');
        } catch (e) { alert('Error de red'); }
    };

    const toggleMenuPermission = (menuId: number) => {
        setRoleMenus(prev =>
            prev.includes(menuId)
                ? prev.filter(id => id !== menuId)
                : [...prev, menuId]
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white">Gestión de Usuarios y Roles</h1>
            </div>

            {/* Tabs */}
            <div className="flex space-x-4 border-b border-slate-700">
                <button
                    className={`py-2 px-4 ${activeTab === 'users' ? 'border-b-2 border-primary text-primary' : 'text-slate-400'}`}
                    onClick={() => setActiveTab('users')}
                >
                    Usuarios
                </button>
                <button
                    className={`py-2 px-4 ${activeTab === 'roles' ? 'border-b-2 border-primary text-primary' : 'text-slate-400'}`}
                    onClick={() => setActiveTab('roles')}
                >
                    Roles y Permisos
                </button>
            </div>

            {/* Content */}
            <div className="min-h-[400px]">
                {activeTab === 'users' && (
                    <div>
                        <div className="flex justify-end mb-4">
                            <button
                                onClick={() => setShowCreateUser(!showCreateUser)}
                                className="bg-primary hover:bg-amber-600 text-slate-900 px-4 py-2 rounded-lg font-semibold"
                            >
                                {showCreateUser ? 'Cancelar' : '+ Nuevo Usuario'}
                            </button>
                        </div>

                        {showCreateUser && (
                            <div className="bg-slate-800 p-6 rounded-lg mb-6 border border-slate-700">
                                <h3 className="text-xl text-white mb-4">Crear Usuario</h3>
                                <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input
                                        className="bg-slate-900 border border-slate-600 p-2 rounded text-white"
                                        placeholder="Nombre Completo"
                                        value={newUser.nombre} onChange={e => setNewUser({ ...newUser, nombre: e.target.value })}
                                        required
                                    />
                                    <input
                                        className="bg-slate-900 border border-slate-600 p-2 rounded text-white"
                                        placeholder="Email" type="email"
                                        value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                        required
                                    />
                                    <input
                                        className="bg-slate-900 border border-slate-600 p-2 rounded text-white"
                                        placeholder="Contraseña" type="password"
                                        value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                        required
                                    />
                                    <select
                                        className="bg-slate-900 border border-slate-600 p-2 rounded text-white"
                                        value={newUser.role_id} onChange={e => setNewUser({ ...newUser, role_id: Number(e.target.value) })}
                                        required
                                    >
                                        <option value={0}>Seleccione Rol...</option>
                                        {roles.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                                    </select>
                                    <div className="col-span-2">
                                        <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded">Guardar</button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {showEditUser && editingUser && (
                            <div className="bg-slate-800 p-6 rounded-lg mb-6 border border-slate-700">
                                <h3 className="text-xl text-white mb-4">Editar Usuario: {editingUser.email}</h3>
                                <form onSubmit={handleUpdateUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                        <option value="">Sin local asignado</option>
                                        {locales && locales.filter(l => l.codigo !== 'WEB').map(l => (
                                            <option key={l.id} value={l.id}>{l.nombre}</option>
                                        ))}
                                    </select>
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id="is_active"
                                            checked={editingUser.is_active}
                                            onChange={e => setEditingUser({ ...editingUser, is_active: e.target.checked })}
                                            className="mr-2"
                                        />
                                        <label htmlFor="is_active" className="text-white">Usuario Activo</label>
                                    </div>
                                    <div className="col-span-2 flex gap-2">
                                        <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded">Actualizar</button>
                                        <button type="button" onClick={() => setShowEditUser(false)} className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded">Cancelar</button>
                                    </div>
                                </form>
                            </div>
                        )}

                        <div className="bg-slate-800 rounded-lg overflow-hidden">
                            <table className="w-full text-left text-slate-300">
                                <thead className="bg-slate-900 text-slate-400 uppercase text-xs">
                                    <tr>
                                        <th className="px-6 py-3">Nombre</th>
                                        <th className="px-6 py-3">Email</th>
                                        <th className="px-6 py-3">Rol</th>
                                        <th className="px-6 py-3">Local</th>
                                        <th className="px-6 py-3">Estado</th>
                                        <th className="px-6 py-3">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700">
                                    {users.map(u => (
                                        <tr key={u.id} className="hover:bg-slate-700/50">
                                            <td className="px-6 py-4">{u.nombre_completo}</td>
                                            <td className="px-6 py-4">{u.email}</td>
                                            <td className="px-6 py-4">
                                                <span className="bg-slate-700 px-2 py-1 rounded text-xs font-bold uppercase text-primary">
                                                    {u.role?.nombre}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {u.local_defecto_id ? (
                                                    locales.find(l => l.id === u.local_defecto_id)?.nombre || `Local ID: ${u.local_defecto_id}`
                                                ) : (
                                                    <span className="text-slate-500">Sin asignar</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {u.is_active ? <span className="text-green-400">Activo</span> : <span className="text-red-400">Inactivo</span>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => handleEditUser(u)}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                                                >
                                                    Editar
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'roles' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Lista de Roles */}
                        <div className="bg-slate-800 rounded-lg p-4 h-fit">
                            <h3 className="text-lg text-white font-semibold mb-4">Roles</h3>
                            <div className="space-y-2">
                                {roles.map(r => (
                                    <div
                                        key={r.id}
                                        onClick={() => setSelectedRole(r)}
                                        className={`p-3 rounded cursor-pointer transition-colors ${selectedRole?.id === r.id ? 'bg-primary text-slate-900 font-bold' : 'bg-slate-900 text-slate-300 hover:bg-slate-700'}`}
                                    >
                                        {r.nombre.toUpperCase()}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Editor de Permisos */}
                        <div className="md:col-span-2 bg-slate-800 rounded-lg p-6">
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
                                                <label key={item.id} className="flex items-center space-x-3 p-3 bg-slate-900 rounded hover:bg-slate-700 cursor-pointer">
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
                    </div>
                )}
            </div>
        </div>
    );
}
