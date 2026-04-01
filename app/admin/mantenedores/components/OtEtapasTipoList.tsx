'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthProvider';

interface TipoOT {
  id: number;
  codigo: string;
  nombre: string;
  activo: boolean;
}

interface OtEtapaTipo {
  id: number;
  tenant_id: number;
  tipo_ot_id: number;
  tipo_ot: TipoOT;
  nombre: string;
  orden: number;
  es_etapa_final: boolean;
  color: string | null;
  activo: boolean;
}

const FORM_EMPTY = {
  tipo_ot_id: 0,
  nombre: '',
  orden: 0,
  es_etapa_final: false,
  color: '',
  activo: true,
};

export default function OtEtapasTipoList() {
  const { user } = useAuth();
  const [etapas, setEtapas] = useState<OtEtapaTipo[]>([]);
  const [tiposOT, setTiposOT] = useState<TipoOT[]>([]);
  const [filtroTipo, setFiltroTipo] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ ...FORM_EMPTY });

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${user?.access_token}`,
  };

  useEffect(() => {
    fetchTiposOT();
  }, []);

  useEffect(() => {
    if (tiposOT.length > 0) fetchEtapas();
  }, [tiposOT, filtroTipo]);

  const fetchTiposOT = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/ordenes-trabajo/tipos?activo=true`,
        { headers }
      );
      if (!res.ok) throw new Error();
      const data: TipoOT[] = await res.json();
      setTiposOT(data);
    } catch {
      setError('Error al cargar tipos de OT');
    }
  };

  const fetchEtapas = async () => {
    setLoading(true);
    try {
      const params = filtroTipo ? `?tipo_ot_id=${filtroTipo}` : '';
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/ordenes-trabajo/etapas${params}`,
        { headers }
      );
      if (!res.ok) throw new Error();
      setEtapas(await res.json());
      setError(null);
    } catch {
      setError('Error al cargar etapas');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setFormData({ ...FORM_EMPTY, tipo_ot_id: filtroTipo ?? tiposOT[0]?.id ?? 0 });
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (e: OtEtapaTipo) => {
    setEditingId(e.id);
    setFormData({
      tipo_ot_id: e.tipo_ot_id,
      nombre: e.nombre,
      orden: e.orden,
      es_etapa_final: e.es_etapa_final,
      color: e.color ?? '',
      activo: e.activo,
    });
    setError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const body = { ...formData, color: formData.color || null };
    try {
      const url = editingId
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/ordenes-trabajo/etapas/${editingId}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/ordenes-trabajo/etapas`;
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers,
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Error al guardar');
      }
      fetchEtapas();
      setModalOpen(false);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleDelete = async (id: number, nombre: string) => {
    if (!confirm(`¿Desactivar la etapa "${nombre}"?`)) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/ordenes-trabajo/etapas/${id}`,
        { method: 'DELETE', headers }
      );
      if (!res.ok) throw new Error();
      fetchEtapas();
    } catch {
      alert('Error al desactivar etapa');
    }
  };

  // Agrupar etapas por tipo para mostrar stepper
  const etapasPorTipo = tiposOT.map(tipo => ({
    tipo,
    etapas: etapas.filter(e => e.tipo_ot_id === tipo.id).sort((a, b) => a.orden - b.orden),
  })).filter(g => (filtroTipo ? g.tipo.id === filtroTipo : true));

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-100 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      {/* Filtro + botón */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">Filtrar por tipo:</span>
          <select
            className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm"
            value={filtroTipo ?? ''}
            onChange={e => setFiltroTipo(e.target.value ? parseInt(e.target.value) : null)}
          >
            <option value="">Todos</option>
            {tiposOT.map(t => (
              <option key={t.id} value={t.id}>{t.nombre}</option>
            ))}
          </select>
        </div>
        <button
          onClick={openCreate}
          className="bg-primary hover:bg-primary-dark text-slate-900 px-4 py-2 rounded-lg font-semibold transition-colors text-sm"
        >
          + Nueva Etapa
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400">Cargando etapas...</div>
      ) : (
        etapasPorTipo.map(({ tipo, etapas: items }) => (
          <div key={tipo.id} className="bg-slate-700 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-slate-600 flex items-center gap-2">
              <span className="text-xs font-mono bg-slate-500 px-2 py-0.5 rounded text-gray-200">{tipo.codigo}</span>
              <span className="font-semibold text-white">{tipo.nombre}</span>
              <span className="ml-auto text-xs text-gray-400">{items.length} etapa{items.length !== 1 ? 's' : ''}</span>
            </div>

            {items.length === 0 ? (
              <div className="px-4 py-6 text-center text-gray-500 text-sm italic">
                Sin etapas configuradas para este tipo
              </div>
            ) : (
              <>
                {/* Stepper visual */}
                <div className="px-4 py-4 flex items-center gap-1 overflow-x-auto">
                  {items.map((etapa, idx) => (
                    <React.Fragment key={etapa.id}>
                      <div
                        className={`flex flex-col items-center min-w-[90px] px-2 py-2 rounded-lg border ${
                          etapa.es_etapa_final
                            ? 'border-green-600 bg-green-900/30'
                            : 'border-slate-500 bg-slate-600'
                        } ${!etapa.activo ? 'opacity-40' : ''}`}
                      >
                        <span className="text-xs font-bold text-gray-400">#{etapa.orden}</span>
                        {etapa.color && (
                          <span
                            className="w-3 h-3 rounded-full mt-1"
                            style={{ backgroundColor: etapa.color }}
                          />
                        )}
                        <span className="text-xs text-white text-center mt-1 leading-tight">{etapa.nombre}</span>
                        {etapa.es_etapa_final && (
                          <span className="text-xs text-green-400 mt-1">✓ Final</span>
                        )}
                      </div>
                      {idx < items.length - 1 && (
                        <span className="text-gray-500 text-lg flex-shrink-0">→</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>

                {/* Tabla */}
                <table className="min-w-full divide-y divide-slate-600">
                  <thead className="bg-slate-600/50">
                    <tr>
                      {['Orden', 'Nombre', 'Color', 'Etapa Final', 'Estado', 'Acciones'].map(h => (
                        <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-600">
                    {items.map(etapa => (
                      <tr key={etapa.id} className="hover:bg-slate-600/40">
                        <td className="px-4 py-3 text-sm text-gray-300 font-mono">{etapa.orden}</td>
                        <td className="px-4 py-3 text-sm font-medium text-white">{etapa.nombre}</td>
                        <td className="px-4 py-3">
                          {etapa.color ? (
                            <div className="flex items-center gap-2">
                              <span className="w-4 h-4 rounded" style={{ backgroundColor: etapa.color }} />
                              <span className="text-xs font-mono text-gray-300">{etapa.color}</span>
                            </div>
                          ) : (
                            <span className="text-gray-500 text-xs italic">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {etapa.es_etapa_final ? (
                            <span className="text-green-400 text-sm">✓</span>
                          ) : (
                            <span className="text-gray-600 text-sm">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            etapa.activo ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'
                          }`}>
                            {etapa.activo ? 'Activa' : 'Inactiva'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right space-x-3">
                          <button
                            onClick={() => openEdit(etapa)}
                            className="text-primary hover:text-primary-dark text-sm font-medium"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(etapa.id, etapa.nombre)}
                            className="text-red-400 hover:text-red-300 text-sm font-medium"
                          >
                            Desactivar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        ))
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full shadow-xl border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">
              {editingId ? 'Editar Etapa' : 'Nueva Etapa'}
            </h2>

            {error && (
              <div className="bg-red-900/50 border border-red-500 text-red-100 px-3 py-2 rounded mb-4 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Tipo de OT *</label>
                <select
                  required
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                  value={formData.tipo_ot_id}
                  onChange={e => setFormData({ ...formData, tipo_ot_id: parseInt(e.target.value) })}
                >
                  <option value={0} disabled>Seleccionar...</option>
                  {tiposOT.map(t => (
                    <option key={t.id} value={t.id}>{t.nombre} ({t.codigo})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Nombre *</label>
                <input
                  type="text"
                  required
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                  placeholder="Ej: Control de calidad"
                  value={formData.nombre}
                  onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Orden</label>
                <input
                  type="number"
                  min={0}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                  value={formData.orden}
                  onChange={e => setFormData({ ...formData, orden: parseInt(e.target.value) || 0 })}
                />
                <p className="text-xs text-gray-500 mt-1">Número que define la posición en el flujo (menor = antes)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Color (hex)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    className="w-10 h-10 bg-slate-700 border border-slate-600 rounded cursor-pointer"
                    value={formData.color || '#64748b'}
                    onChange={e => setFormData({ ...formData, color: e.target.value })}
                  />
                  <input
                    type="text"
                    className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white font-mono text-sm"
                    placeholder="#64748b"
                    value={formData.color}
                    onChange={e => setFormData({ ...formData, color: e.target.value })}
                  />
                  {formData.color && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, color: '' })}
                      className="text-gray-400 hover:text-white text-xs px-2"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-primary bg-slate-700 border-slate-600 rounded"
                    checked={formData.es_etapa_final}
                    onChange={e => setFormData({ ...formData, es_etapa_final: e.target.checked })}
                  />
                  <span className="text-sm text-gray-300">Etapa final (cierra la OT)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-primary bg-slate-700 border-slate-600 rounded"
                    checked={formData.activo}
                    onChange={e => setFormData({ ...formData, activo: e.target.checked })}
                  />
                  <span className="text-sm text-gray-300">Activa</span>
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
