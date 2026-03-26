'use client';

import { useState, useEffect } from 'react';
import { AuthService } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface CanalVenta {
  id: number;
  codigo: string;
  nombre: string;
  activo: boolean;
  entrega_inmediata: boolean;
  visible_en_pos: boolean;
}

function req<T>(path: string, options: RequestInit = {}): Promise<T> {
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...AuthService.getAuthHeaders(), 'Content-Type': 'application/json', ...(options.headers || {}) },
  }).then(async (res) => {
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.detail || `HTTP ${res.status}`);
    }
    if (res.status === 204) return undefined as T;
    return res.json();
  });
}

const CODIGOS_SISTEMA = ['POS', 'LANDING', 'WHATSAPP', 'TELEFONO'];

export default function CanalesVentaList() {
  const [canales, setCanales] = useState<CanalVenta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editando, setEditando] = useState<CanalVenta | null>(null);
  const [creando, setCreando] = useState(false);
  const [form, setForm] = useState({ codigo: '', nombre: '', activo: true, entrega_inmediata: false, visible_en_pos: true });
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState('');

  const cargar = async () => {
    setLoading(true);
    try {
      const data = await req<CanalVenta[]>('/api/canales-venta/');
      setCanales(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const abrirCrear = () => {
    setForm({ codigo: '', nombre: '', activo: true, entrega_inmediata: false, visible_en_pos: true });
    setErrorForm('');
    setCreando(true);
    setEditando(null);
  };

  const abrirEditar = (c: CanalVenta) => {
    setForm({ codigo: c.codigo, nombre: c.nombre, activo: c.activo, entrega_inmediata: c.entrega_inmediata, visible_en_pos: c.visible_en_pos });
    setErrorForm('');
    setEditando(c);
    setCreando(false);
  };

  const cerrar = () => { setCreando(false); setEditando(null); };

  const guardar = async () => {
    if (!form.nombre.trim()) { setErrorForm('El nombre es obligatorio'); return; }
    if (creando && !form.codigo.trim()) { setErrorForm('El código es obligatorio'); return; }
    setGuardando(true);
    setErrorForm('');
    try {
      if (creando) {
        await req('/api/canales-venta/', { method: 'POST', body: JSON.stringify(form) });
      } else if (editando) {
        await req(`/api/canales-venta/${editando.id}`, {
          method: 'PUT',
          body: JSON.stringify({ nombre: form.nombre, activo: form.activo, entrega_inmediata: form.entrega_inmediata, visible_en_pos: form.visible_en_pos }),
        });
      }
      cerrar();
      cargar();
    } catch (e: any) {
      setErrorForm(e.message);
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (c: CanalVenta) => {
    if (CODIGOS_SISTEMA.includes(c.codigo)) {
      alert('Los canales del sistema (POS, LANDING, WHATSAPP, TELEFONO) no pueden eliminarse.');
      return;
    }
    if (!confirm(`¿Eliminar canal "${c.nombre}"?`)) return;
    try {
      await req(`/api/canales-venta/${c.id}`, { method: 'DELETE' });
      cargar();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const toggleActivo = async (c: CanalVenta) => {
    try {
      await req(`/api/canales-venta/${c.id}`, {
        method: 'PUT',
        body: JSON.stringify({ activo: !c.activo }),
      });
      cargar();
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (loading) return <div className="text-slate-400 text-sm">Cargando...</div>;
  if (error) return <div className="text-red-400 text-sm">{error}</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-slate-400 text-sm">
          {canales.length} canal{canales.length !== 1 ? 'es' : ''} configurado{canales.length !== 1 ? 's' : ''}
        </p>
        <button
          onClick={abrirCrear}
          className="bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold px-4 py-2 rounded-lg"
        >
          + Nuevo Canal
        </button>
      </div>

      <div className="space-y-2">
        {canales.map((c) => {
          const esSistema = CODIGOS_SISTEMA.includes(c.codigo);
          return (
            <div
              key={c.id}
              className={`flex items-center gap-4 p-4 rounded-lg border ${
                c.activo ? 'bg-slate-700 border-slate-600' : 'bg-slate-800/50 border-slate-700/50 opacity-60'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs bg-slate-600 text-cyan-300 px-2 py-0.5 rounded">
                    {c.codigo}
                  </span>
                  <span className="text-white font-medium">{c.nombre}</span>
                  {esSistema && (
                    <span className="text-xs bg-slate-600 text-slate-400 px-1.5 py-0.5 rounded">sistema</span>
                  )}
                  {c.entrega_inmediata && (
                    <span className="text-xs bg-emerald-900/50 text-emerald-400 border border-emerald-800 px-1.5 py-0.5 rounded">entrega inmediata</span>
                  )}
                  {!c.visible_en_pos && (
                    <span className="text-xs bg-slate-700 text-slate-400 border border-slate-600 px-1.5 py-0.5 rounded">oculto en POS</span>
                  )}
                  {!c.activo && (
                    <span className="text-xs bg-red-900/50 text-red-400 border border-red-800 px-1.5 py-0.5 rounded">inactivo</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => toggleActivo(c)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                    c.activo
                      ? 'border-slate-500 text-slate-400 hover:text-white hover:border-slate-400'
                      : 'border-emerald-700 text-emerald-400 hover:bg-emerald-900/30'
                  }`}
                >
                  {c.activo ? 'Desactivar' : 'Activar'}
                </button>
                <button
                  onClick={() => abrirEditar(c)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-slate-500 text-slate-300 hover:text-white hover:border-slate-400"
                >
                  Editar
                </button>
                {!esSistema && (
                  <button
                    onClick={() => eliminar(c)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-red-800 text-red-400 hover:bg-red-900/30"
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal crear/editar */}
      {(creando || editando) && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <h3 className="text-white font-bold">{creando ? 'Nuevo Canal de Venta' : 'Editar Canal'}</h3>
              <button onClick={cerrar} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="text-slate-300 text-sm block mb-1">Código {creando ? '*' : ''}</label>
                {creando ? (
                  <>
                    <input
                      value={form.codigo}
                      onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase() })}
                      placeholder="Ej: INSTAGRAM"
                      className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm font-mono"
                    />
                    <p className="text-slate-500 text-xs mt-1">Solo letras y guiones bajos, en mayúsculas</p>
                  </>
                ) : (
                  <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-cyan-300 font-mono text-sm">
                    {editando?.codigo}
                    <span className="text-slate-500 font-sans ml-2 text-xs">(no editable)</span>
                  </div>
                )}
              </div>
              <div>
                <label className="text-slate-300 text-sm block mb-1">Nombre *</label>
                <input
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej: Instagram"
                  className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="activo"
                  checked={form.activo}
                  onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                  className="accent-cyan-500"
                />
                <label htmlFor="activo" className="text-slate-300 text-sm">Activo</label>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="entrega_inmediata"
                  checked={form.entrega_inmediata}
                  onChange={(e) => setForm({ ...form, entrega_inmediata: e.target.checked })}
                  className="accent-emerald-500"
                />
                <label htmlFor="entrega_inmediata" className="text-slate-300 text-sm">
                  Entrega inmediata
                  <span className="text-slate-500 text-xs ml-1">(el pedido se entrega automáticamente al crearse)</span>
                </label>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="visible_en_pos"
                  checked={form.visible_en_pos}
                  onChange={(e) => setForm({ ...form, visible_en_pos: e.target.checked })}
                  className="accent-cyan-500"
                />
                <label htmlFor="visible_en_pos" className="text-slate-300 text-sm">
                  Visible en POS
                  <span className="text-slate-500 text-xs ml-1">(aparece en el selector al crear un pedido)</span>
                </label>
              </div>
              {errorForm && (
                <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-lg px-3 py-2 text-sm">{errorForm}</div>
              )}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-700">
              <button onClick={cerrar} className="text-slate-400 hover:text-white px-4 py-2 rounded-lg text-sm">
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={guardando}
                className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-lg text-sm"
              >
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
