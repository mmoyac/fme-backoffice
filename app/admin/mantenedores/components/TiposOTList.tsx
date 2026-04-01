'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthProvider';

interface TipoOT {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
}

const FORM_EMPTY = { codigo: '', nombre: '', descripcion: '', activo: true };

export default function TiposOTList() {
  const { user } = useAuth();
  const [tipos, setTipos] = useState<TipoOT[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ ...FORM_EMPTY });

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${user?.access_token}`,
  };

  useEffect(() => { fetchTipos(); }, []);

  const fetchTipos = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ordenes-trabajo/tipos`, { headers });
      if (!res.ok) throw new Error();
      setTipos(await res.json());
      setError(null);
    } catch {
      setError('Error al cargar tipos de OT');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setFormData({ ...FORM_EMPTY });
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (t: TipoOT) => {
    setEditingId(t.id);
    setFormData({ codigo: t.codigo, nombre: t.nombre, descripcion: t.descripcion || '', activo: t.activo });
    setError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingId
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/ordenes-trabajo/tipos/${editingId}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/ordenes-trabajo/tipos`;
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers,
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Error al guardar');
      }
      fetchTipos();
      setModalOpen(false);
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (loading) return <div className="text-center py-4 text-gray-400">Cargando...</div>;

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-100 px-4 py-3 rounded text-sm">{error}</div>
      )}

      <div className="flex justify-end">
        <button onClick={openCreate} className="bg-primary hover:bg-primary-dark text-slate-900 px-4 py-2 rounded-lg font-semibold transition-colors text-sm">
          + Nuevo Tipo
        </button>
      </div>

      {tipos.length === 0 ? (
        <div className="text-center py-8 text-gray-400">No hay tipos de OT registrados</div>
      ) : (
        <div className="overflow-x-auto bg-slate-700 rounded-lg">
          <table className="min-w-full divide-y divide-slate-600">
            <thead className="bg-slate-600">
              <tr>
                {['Código', 'Nombre', 'Descripción', 'Estado', 'Acciones'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-600">
              {tipos.map(tipo => (
                <tr key={tipo.id} className="hover:bg-slate-600/50">
                  <td className="px-6 py-4 text-sm font-mono font-bold text-primary">{tipo.codigo}</td>
                  <td className="px-6 py-4 text-sm font-medium text-white">{tipo.nombre}</td>
                  <td className="px-6 py-4 text-sm text-gray-400">{tipo.descripcion || <span className="italic">—</span>}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${tipo.activo ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
                      {tipo.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-3">
                    <button onClick={() => openEdit(tipo)} className="text-primary hover:text-primary-dark text-sm font-medium">Editar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full shadow-xl border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">{editingId ? 'Editar Tipo de OT' : 'Nuevo Tipo de OT'}</h2>

            {error && (
              <div className="bg-red-900/50 border border-red-500 text-red-100 px-3 py-2 rounded mb-4 text-sm">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Código *</label>
                <input
                  type="text"
                  required
                  disabled={!!editingId}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white font-mono uppercase disabled:opacity-50"
                  placeholder="Ej: OM"
                  value={formData.codigo}
                  onChange={e => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                />
                {!!editingId && <p className="text-xs text-gray-500 mt-1">El código no se puede modificar</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Nombre *</label>
                <input
                  type="text"
                  required
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                  placeholder="Ej: Orden de Mantención"
                  value={formData.nombre}
                  onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Descripción</label>
                <textarea
                  rows={3}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                  placeholder="Descripción del tipo de OT"
                  value={formData.descripcion}
                  onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-primary bg-slate-700 border-slate-600 rounded"
                  checked={formData.activo}
                  onChange={e => setFormData({ ...formData, activo: e.target.checked })}
                />
                <span className="text-sm text-gray-300">Activo</span>
              </label>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded text-gray-300 hover:bg-slate-700">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 rounded bg-primary hover:bg-primary-dark text-slate-900 font-semibold">
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
