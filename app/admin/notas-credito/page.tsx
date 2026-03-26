'use client';

import React, { useState, useEffect, useRef } from 'react';
import { listarNotasCredito, actualizarNotaCredito, NotaCredito } from '@/lib/api/notas_credito';

const ESTADOS_SII = [
  { value: '', label: 'Todos los estados' },
  { value: 'PENDIENTE', label: 'Pendiente', color: 'bg-yellow-500' },
  { value: 'ENVIADO', label: 'Enviado', color: 'bg-indigo-500' },
  { value: 'APROBADO', label: 'Aprobado', color: 'bg-green-500' },
  { value: 'RECHAZADO', label: 'Rechazado', color: 'bg-red-500' },
];

function EstadoSiiBadge({ estado }: { estado?: string }) {
  const e = ESTADOS_SII.find(s => s.value === estado);
  return (
    <span className={`${e?.color ?? 'bg-gray-500'} text-white px-2 py-0.5 rounded-full text-xs font-semibold`}>
      {e?.label ?? (estado || 'Sin estado')}
    </span>
  );
}

function formatFecha(fecha?: string) {
  if (!fecha) return '—';
  return new Date(fecha).toLocaleDateString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

type Editando = { notaId: number; campo: 'folio_sii' | 'estado_sii'; valor: string } | null;

export default function NotasCreditoPage() {
  const [notas, setNotas] = useState<NotaCredito[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtroEstadoSii, setFiltroEstadoSii] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [editando, setEditando] = useState<Editando>(null);
  const [guardando, setGuardando] = useState(false);
  const [expandidas, setExpandidas] = useState<Set<number>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  const toggleExpanida = (id: number) =>
    setExpandidas(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  useEffect(() => {
    cargar();
  }, [filtroEstadoSii, fechaDesde, fechaHasta]);

  useEffect(() => {
    if (editando) inputRef.current?.focus();
  }, [editando]);

  const iniciarEdicion = (notaId: number, campo: 'folio_sii' | 'estado_sii', valorActual: string) => {
    setEditando({ notaId, campo, valor: valorActual });
  };

  const guardar = async () => {
    if (!editando) return;
    setGuardando(true);
    try {
      const body: { folio_sii?: string; estado_sii?: string } = { [editando.campo]: editando.valor };
      // Al registrar el folio, avanzar estado automáticamente a APROBADO si estaba PENDIENTE
      if (editando.campo === 'folio_sii' && editando.valor) {
        const notaActual = notas.find(n => n.id === editando.notaId);
        if (notaActual?.estado_sii === 'PENDIENTE') {
          body.estado_sii = 'APROBADO';
        }
      }
      const actualizada = await actualizarNotaCredito(editando.notaId, body);
      setNotas(prev => prev.map(n => n.id === editando.notaId ? { ...n, ...actualizada } : n));
      setEditando(null);
    } catch {
      alert('Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const cancelar = () => setEditando(null);

  const cargar = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await listarNotasCredito({
        estado_sii: filtroEstadoSii || undefined,
        fecha_desde: fechaDesde || undefined,
        fecha_hasta: fechaHasta || undefined,
        limit: 200,
      });
      setNotas(data.items);
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message || 'Error al cargar notas de crédito');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Notas de Crédito</h1>
          <p className="text-gray-400 mt-1">{total} registros en total</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-slate-800 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Estado SII</label>
            <select
              value={filtroEstadoSii}
              onChange={e => setFiltroEstadoSii(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2"
            >
              {ESTADOS_SII.map(e => (
                <option key={e.value} value={e.value}>{e.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Desde</label>
            <input
              type="date"
              value={fechaDesde}
              onChange={e => setFechaDesde(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Hasta</label>
            <input
              type="date"
              value={fechaHasta}
              onChange={e => setFechaHasta(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 text-red-400">{error}</div>
      )}

      {loading ? (
        <div className="text-center text-gray-400 py-12">Cargando...</div>
      ) : notas.length === 0 ? (
        <div className="text-center text-gray-400 py-12">No hay notas de crédito registradas.</div>
      ) : (
        <div className="bg-slate-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700 text-left text-gray-400 text-sm">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Pedido</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Monto</th>
                <th className="px-4 py-3">Fecha emisión</th>
                <th className="px-4 py-3">Estado SII</th>
                <th className="px-4 py-3">Folio SII</th>
                <th className="px-4 py-3">Items</th>
              </tr>
            </thead>
            <tbody>
              {notas.map(nota => (
                <React.Fragment key={nota.id}>
                <tr className="border-b border-slate-700 hover:bg-slate-700/50">
                  <td className="px-4 py-3 text-gray-400 text-sm font-mono">#{nota.id}</td>
                  <td className="px-4 py-3">
                    <a
                      href={`/admin/pedidos/${nota.pedido_id}`}
                      className="text-blue-400 hover:underline font-medium"
                    >
                      {nota.pedido?.numero_pedido ?? `#${nota.pedido_id}`}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-white text-sm">
                    {nota.tipo_documento?.nombre ?? `Tipo ${nota.tipo_documento_id}`}
                  </td>
                  <td className="px-4 py-3 text-white font-mono">
                    ${Number(nota.monto).toLocaleString('es-CL')}
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-sm">{formatFecha(nota.fecha_emision)}</td>
                  <td className="px-4 py-3">
                    {editando?.notaId === nota.id && editando.campo === 'estado_sii' ? (
                      <div className="flex items-center gap-1">
                        <select
                          value={editando.valor}
                          onChange={e => setEditando({ ...editando, valor: e.target.value })}
                          className="bg-slate-700 border border-slate-500 text-white rounded px-2 py-0.5 text-sm"
                          disabled={guardando}
                        >
                          {ESTADOS_SII.filter(e => e.value).map(e => (
                            <option key={e.value} value={e.value}>{e.label}</option>
                          ))}
                        </select>
                        <button onClick={guardar} disabled={guardando} className="text-green-400 hover:text-green-300 text-xs px-1">✓</button>
                        <button onClick={cancelar} className="text-gray-400 hover:text-gray-300 text-xs px-1">✕</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => iniciarEdicion(nota.id, 'estado_sii', nota.estado_sii || 'PENDIENTE')}
                        title="Clic para editar estado"
                      >
                        <EstadoSiiBadge estado={nota.estado_sii} />
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editando?.notaId === nota.id && editando.campo === 'folio_sii' ? (
                      <div className="flex items-center gap-1">
                        <input
                          ref={inputRef}
                          type="text"
                          value={editando.valor}
                          onChange={e => setEditando({ ...editando, valor: e.target.value })}
                          onKeyDown={e => { if (e.key === 'Enter') guardar(); if (e.key === 'Escape') cancelar(); }}
                          className="bg-slate-700 border border-slate-500 text-white rounded px-2 py-0.5 text-sm w-28 font-mono"
                          placeholder="Ej: 123"
                          disabled={guardando}
                        />
                        <button onClick={guardar} disabled={guardando} className="text-green-400 hover:text-green-300 text-xs px-1">✓</button>
                        <button onClick={cancelar} className="text-gray-400 hover:text-gray-300 text-xs px-1">✕</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => iniciarEdicion(nota.id, 'folio_sii', nota.folio_sii || '')}
                        title="Clic para registrar folio SII"
                        className="text-left"
                      >
                        {nota.folio_sii
                          ? <span className="text-cyan-400 font-mono text-sm">{nota.folio_sii}</span>
                          : <span className="text-slate-500 text-sm italic hover:text-slate-400">+ Agregar folio</span>
                        }
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {nota.items_devolucion && nota.items_devolucion.length > 0 ? (
                      <button
                        onClick={() => toggleExpanida(nota.id)}
                        className="text-xs text-amber-400 hover:text-amber-300 font-medium"
                      >
                        {nota.items_devolucion.length} producto{nota.items_devolucion.length > 1 ? 's' : ''} {expandidas.has(nota.id) ? '▲' : '▼'}
                      </button>
                    ) : (
                      <span className="text-slate-600 text-xs">—</span>
                    )}
                  </td>
                </tr>
                {expandidas.has(nota.id) && nota.items_devolucion && nota.items_devolucion.length > 0 && (
                  <tr key={`${nota.id}-items`} className="bg-slate-900/50">
                    <td colSpan={8} className="px-8 py-3">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-gray-500 text-xs">
                            <th className="text-left pb-1">Producto</th>
                            <th className="text-left pb-1">Cantidad devuelta</th>
                            <th className="text-left pb-1">Local destino</th>
                          </tr>
                        </thead>
                        <tbody>
                          {nota.items_devolucion.map((item, i) => (
                            <tr key={i} className="border-t border-slate-800">
                              <td className="py-1 text-white">{item.producto}</td>
                              <td className="py-1 text-gray-300 font-mono">{item.cantidad_devuelta}</td>
                              <td className="py-1 text-gray-400">{item.local_destino ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
