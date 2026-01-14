'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthProvider';

interface TipoPedido {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  local_despacho_default_id?: number;
  local_despacho_default?: {
    id: number;
    codigo: string;
    nombre: string;
  };
  activo: boolean;
}

interface Local {
  id: number;
  codigo: string;
  nombre: string;
  activo: boolean;
}

export default function TiposPedidoList() {
  const { user } = useAuth();
  const [tiposPedido, setTiposPedido] = useState<TipoPedido[]>([]);
  const [locales, setLocales] = useState<Local[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    local_despacho_default_id: null as number | null,
    activo: true
  });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchTiposPedido();
      if (user?.access_token) {
        await fetchLocales();
      }
      setLoading(false);
    };
    
    loadData();
  }, [user]);

  const fetchTiposPedido = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tipos-pedido/`);

      if (!response.ok) {
        throw new Error('Error al cargar tipos de pedido');
      }

      const data = await response.json();
      setTiposPedido(data);
    } catch (error) {
      console.error('Error:', error);
      setError('Error al cargar tipos de pedido');
    }
  };

  const fetchLocales = async () => {
    try {
      if (!user?.access_token) {
        setError('Usuario no autenticado');
        return;
      }
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/locales/`, {
        headers: {
          'Authorization': `Bearer ${user.access_token}`,
          'Content-Type': 'application/json'
        },
      });

      if (response.ok) {
        const data = await response.json();
        const localesActivos = data.filter((local: Local) => local.activo);
        setLocales(localesActivos);
      } else {
        const errorText = await response.text();
        console.error('Error loading locales:', response.status, errorText);
        setError('No se pudieron cargar los locales');
      }
    } catch (error) {
      console.error('Error fetching locales:', error);
      setError('Error de conexión al cargar locales');
    }
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({
      codigo: '',
      nombre: '',
      descripcion: '',
      local_despacho_default_id: null,
      activo: true
    });
    setError(null);
    setModalOpen(true);
  };

  const openEditModal = (tipo: TipoPedido) => {
    setEditingId(tipo.id);
    setFormData({
      codigo: tipo.codigo,
      nombre: tipo.nombre,
      descripcion: tipo.descripcion || '',
      local_despacho_default_id: tipo.local_despacho_default_id || null,
      activo: tipo.activo
    });
    setError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingId
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/tipos-pedido/${editingId}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/tipos-pedido/`;

      const response = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.access_token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al guardar tipo de pedido');
      }

      fetchTiposPedido();
      setModalOpen(false);
    } catch (error: any) {
      console.error('Error:', error);
      setError(error.message || 'Error al guardar tipo de pedido');
    }
  };

  const handleDelete = async (id: number, nombre: string) => {
    if (!confirm(`¿Está seguro de eliminar el tipo de pedido "${nombre}"?`)) {
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tipos-pedido/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user?.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al eliminar tipo de pedido');
      }

      fetchTiposPedido();
    } catch (error: any) {
      console.error('Error:', error);
      alert(error.message || 'Error al eliminar tipo de pedido');
    }
  };

  if (loading) {
    return <div className="text-center py-4 text-gray-400">Cargando...</div>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-100 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={openCreateModal}
          className="bg-primary hover:bg-primary-dark text-slate-900 px-4 py-2 rounded-lg font-semibold transition-colors"
        >
          + Nuevo Tipo
        </button>
      </div>

      {tiposPedido.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          No hay tipos de pedido registrados
        </div>
      ) : (
        <div className="overflow-x-auto bg-slate-700 rounded-lg">
          <table className="min-w-full divide-y divide-slate-600">
            <thead className="bg-slate-600">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Código
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Local por Defecto
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-600">
              {tiposPedido.map((tipo) => (
                <tr key={tipo.id} className="hover:bg-slate-600/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-300">
                    {tipo.codigo}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                    {tipo.nombre}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {tipo.local_despacho_default ? (
                      <span className="px-2 py-1 bg-slate-600 rounded text-xs font-medium">
                        {tipo.local_despacho_default.nombre}
                      </span>
                    ) : (
                      <span className="text-gray-500 italic">Sin asignar</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      tipo.activo ? "bg-green-900 text-green-300" : "bg-gray-700 text-gray-400"
                    }`}>
                      {tipo.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                    <button
                      onClick={() => openEditModal(tipo)}
                      className="text-primary hover:text-primary-dark font-medium"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(tipo.id, tipo.nombre)}
                      className="text-red-400 hover:text-red-300 font-medium"
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
              {editingId ? 'Editar Tipo de Pedido' : 'Nuevo Tipo de Pedido'}
            </h2>
            
            {error && (
              <div className="bg-red-900/50 border border-red-500 text-red-100 px-3 py-2 rounded mb-4 text-sm">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Código *
                </label>
                <input
                  type="text"
                  required
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                  disabled={!!editingId} // No editable si es edición
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  required
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Descripción
                </label>
                <textarea
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                  rows={3}
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Local de Despacho por Defecto
                </label>
                <select
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                  value={formData.local_despacho_default_id || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    local_despacho_default_id: e.target.value ? parseInt(e.target.value) : null 
                  })}
                >
                  <option value="">Seleccionar local...</option>
                  {locales.map((local) => (
                    <option key={local.id} value={local.id}>
                      {local.nombre} ({local.codigo})
                    </option>
                  ))}
                </select>
                {locales.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    No se pudieron cargar los locales
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="activo-tipo-pedido"
                  className="w-4 h-4 text-primary bg-slate-700 border-slate-600 rounded focus:ring-primary focus:ring-2"
                  checked={formData.activo}
                  onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                />
                <label htmlFor="activo-tipo-pedido" className="text-sm font-medium text-gray-300 cursor-pointer">
                  Activo
                </label>
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