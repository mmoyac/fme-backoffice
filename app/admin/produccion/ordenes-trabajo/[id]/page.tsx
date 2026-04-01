'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthProvider';

interface TipoOT { id: number; codigo: string; nombre: string; }
interface EstadoOT { id: number; codigo: string; nombre: string; color: string; es_final: boolean; }
interface OtEtapa { id: number; nombre: string; orden: number; es_etapa_final: boolean; color?: string; tipo_ot: TipoOT; }
interface Local { id: number; nombre: string; }
interface Producto { id: number; nombre: string; }
interface UnidadMedida { id: number; nombre: string; abreviacion?: string; }
interface Usuario { id: number; nombre_completo?: string; email: string; }

interface OtItem {
  id: number;
  producto: Producto;
  unidad_medida?: UnidadMedida;
  cantidad: number;
  cantidad_ejecutada?: number;
  notas?: string;
}

interface OtLogEntry {
  id: number;
  accion: string;
  detalle?: string;
  etapa?: OtEtapa;
  usuario?: Usuario;
  created_at: string;
}

interface OT {
  id: number;
  tenant_id: number;
  numero_ot: string;
  tipo_ot: TipoOT;
  estado_ot: EstadoOT;
  etapa_actual?: OtEtapa;
  local: Local;
  pedido_id?: number;
  cotizacion_id?: number;
  op_id?: number;
  fecha_programada?: string;
  fecha_inicio?: string;
  fecha_cierre?: string;
  notas?: string;
  creado_por?: Usuario;
  items: OtItem[];
  log: OtLogEntry[];
  created_at: string;
  updated_at: string;
}

const ESTADO_COLORS: Record<string, string> = {
  PENDIENTE:   'bg-gray-600 text-gray-200',
  EN_PROCESO:  'bg-blue-900 text-blue-200',
  TERMINADA:   'bg-yellow-900 text-yellow-200',
  CERRADA:     'bg-green-900 text-green-200',
  CANCELADA:   'bg-red-900 text-red-200',
};

const ACCION_LABELS: Record<string, string> = {
  CREADA:         'OT Creada',
  ETAPA_AVANZADA: 'Etapa avanzada',
  CERRADA:        'OT Cerrada',
  CANCELADA:      'OT Cancelada',
};

export default function OTDetallePage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [ot, setOt] = useState<OT | null>(null);
  const [etapasDisponibles, setEtapasDisponibles] = useState<OtEtapa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal avanzar etapa
  const [modalEtapa, setModalEtapa] = useState(false);
  const [etapaSeleccionada, setEtapaSeleccionada] = useState<number | ''>('');
  const [detalleEtapa, setDetalleEtapa] = useState('');
  const [procesando, setProcesando] = useState(false);

  // Modal cerrar OT
  const [modalCerrar, setModalCerrar] = useState(false);
  const [detalleCierre, setDetalleCierre] = useState('');

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${user?.access_token}`,
  };

  const cargar = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ordenes-trabajo/${id}`, { headers });
      if (!res.ok) throw new Error('No encontrada');
      const data: OT = await res.json();
      setOt(data);
      setError('');

      // Cargar etapas del mismo tipo
      const etapasRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/ordenes-trabajo/etapas?tipo_ot_id=${data.tipo_ot.id}&activo=true`,
        { headers }
      );
      if (etapasRes.ok) setEtapasDisponibles(await etapasRes.json());
    } catch {
      setError('Error al cargar la OT');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, [id]);

  const fmt = (d?: string) => d
    ? new Date(d).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

  const avanzarEtapa = async () => {
    if (!etapaSeleccionada) return;
    setProcesando(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ordenes-trabajo/${id}/avanzar-etapa`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ etapa_id: etapaSeleccionada, detalle: detalleEtapa || null }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Error al avanzar etapa');
      }
      setModalEtapa(false);
      setEtapaSeleccionada('');
      setDetalleEtapa('');
      await cargar();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setProcesando(false);
    }
  };

  const cerrarOT = async () => {
    setProcesando(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ordenes-trabajo/${id}/cerrar`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ detalle: detalleCierre || null }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Error al cerrar OT');
      }
      setModalCerrar(false);
      await cargar();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setProcesando(false);
    }
  };

  const cancelarOT = async () => {
    if (!confirm('¿Confirmas cancelar esta Orden de Trabajo?')) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ordenes-trabajo/${id}/cancelar`, {
        method: 'POST',
        headers,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Error al cancelar');
      }
      await cargar();
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-400">Cargando...</div>;
  if (error && !ot) return <div className="bg-red-900/50 border border-red-500 text-red-100 px-4 py-3 rounded">{error}</div>;
  if (!ot) return null;

  const esFinal = ot.estado_ot.es_final;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-white text-sm">← Volver</button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white font-mono">{ot.numero_ot}</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${ESTADO_COLORS[ot.estado_ot.codigo] ?? 'bg-gray-700 text-gray-300'}`}>
                {ot.estado_ot.nombre}
              </span>
              <span className="text-xs font-mono bg-slate-700 text-gray-300 px-2 py-0.5 rounded">
                {ot.tipo_ot.codigo}
              </span>
            </div>
            <p className="text-gray-400 text-sm mt-1">{ot.tipo_ot.nombre} · {ot.local.nombre}</p>
          </div>
        </div>

        {!esFinal && ot.tipo_ot.codigo === 'OP' && (
          <div className="flex items-center gap-3 bg-blue-900/30 border border-blue-700 text-blue-200 px-4 py-2 rounded text-sm">
            <span>Esta OT se gestiona desde el módulo de Producción</span>
            <a
              href="/admin/produccion"
              className="bg-blue-700 hover:bg-blue-600 text-white px-3 py-1.5 rounded font-medium text-xs whitespace-nowrap"
            >
              Ir a Producción →
            </a>
            <button
              onClick={cancelarOT}
              className="ml-2 text-red-400 hover:text-red-300 text-xs underline"
            >
              Cancelar OT
            </button>
          </div>
        )}
        {!esFinal && ot.tipo_ot.codigo !== 'OP' && (
          <div className="flex gap-2">
            <button
              onClick={() => setModalEtapa(true)}
              className="px-4 py-2 rounded bg-blue-700 hover:bg-blue-600 text-white text-sm font-medium"
            >
              Avanzar etapa
            </button>
            <button
              onClick={() => setModalCerrar(true)}
              className="px-4 py-2 rounded bg-green-700 hover:bg-green-600 text-white text-sm font-medium"
            >
              Cerrar OT
            </button>
            <button
              onClick={cancelarOT}
              className="px-4 py-2 rounded bg-slate-700 hover:bg-red-900 text-gray-300 hover:text-red-300 text-sm font-medium"
            >
              Cancelar OT
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-100 px-4 py-3 rounded text-sm">{error}</div>
      )}

      {/* Stepper de etapas */}
      {etapasDisponibles.length > 0 && (
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Flujo de etapas</h2>
          <div className="flex items-center gap-0 overflow-x-auto pb-2">
            {etapasDisponibles.map((etapa, idx) => {
              const isActual = ot.etapa_actual?.id === etapa.id;
              const isPasada = ot.log.some(l => l.accion === 'ETAPA_AVANZADA' && l.etapa?.id === etapa.id && !isActual);
              return (
                <div key={etapa.id} className="flex items-center">
                  {idx > 0 && (
                    <div className={`h-0.5 w-8 flex-shrink-0 ${isPasada || isActual ? 'bg-primary' : 'bg-slate-600'}`} />
                  )}
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                        isActual
                          ? 'bg-primary text-slate-900 ring-2 ring-primary ring-offset-2 ring-offset-slate-800'
                          : isPasada
                          ? 'bg-primary/40 text-white'
                          : 'bg-slate-700 text-gray-400'
                      }`}
                      style={etapa.color && isActual ? { backgroundColor: etapa.color, color: '#fff' } : undefined}
                    >
                      {etapa.es_etapa_final ? '✓' : idx + 1}
                    </div>
                    <span className={`text-xs mt-1 text-center max-w-[72px] leading-tight ${
                      isActual ? 'text-primary font-semibold' : isPasada ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {etapa.nombre}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Datos + Ítems */}
      <div className="grid grid-cols-2 gap-6">
        {/* Info general */}
        <div className="bg-slate-800 rounded-lg p-6 space-y-3">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider border-b border-slate-700 pb-2">
            Información general
          </h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-400">Tipo OT</dt>
              <dd className="text-white">{ot.tipo_ot.nombre}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">Local</dt>
              <dd className="text-white">{ot.local.nombre}</dd>
            </div>
            {ot.etapa_actual && (
              <div className="flex justify-between">
                <dt className="text-gray-400">Etapa actual</dt>
                <dd className="text-white">{ot.etapa_actual.nombre}</dd>
              </div>
            )}
            {ot.cotizacion_id && (
              <div className="flex justify-between">
                <dt className="text-gray-400">Cotización</dt>
                <dd>
                  <a href={`/admin/cotizaciones/${ot.cotizacion_id}`} className="text-primary hover:underline">
                    #{ot.cotizacion_id}
                  </a>
                </dd>
              </div>
            )}
            {ot.pedido_id && (
              <div className="flex justify-between">
                <dt className="text-gray-400">Pedido</dt>
                <dd>
                  <a href={`/admin/pedidos/${ot.pedido_id}`} className="text-primary hover:underline">
                    #{ot.pedido_id}
                  </a>
                </dd>
              </div>
            )}
            {ot.op_id && (
              <div className="flex justify-between items-center pt-2 border-t border-slate-700 mt-2">
                <dt className="text-gray-400">Orden de Producción</dt>
                <dd className="flex items-center gap-2">
                  <span className="text-xs bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded font-mono">OP #{ot.op_id}</span>
                  <a
                    href={`/admin/produccion`}
                    className="text-primary hover:underline text-xs"
                    title="Ver en módulo de Producción"
                  >
                    Ver en Producción →
                  </a>
                </dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-gray-400">Programada</dt>
              <dd className="text-white">{fmt(ot.fecha_programada)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">Inicio</dt>
              <dd className="text-white">{fmt(ot.fecha_inicio)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">Cierre</dt>
              <dd className="text-white">{fmt(ot.fecha_cierre)}</dd>
            </div>
            {ot.creado_por && (
              <div className="flex justify-between">
                <dt className="text-gray-400">Creada por</dt>
                <dd className="text-white">{ot.creado_por.nombre_completo || ot.creado_por.email}</dd>
              </div>
            )}
            {ot.notas && (
              <div className="pt-2 border-t border-slate-700">
                <dt className="text-gray-400 mb-1">Notas</dt>
                <dd className="text-gray-300 text-xs">{ot.notas}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Ítems */}
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider border-b border-slate-700 pb-2 mb-3">
            Ítems ({ot.items.length})
          </h2>
          {ot.items.length === 0 ? (
            <p className="text-gray-500 italic text-sm">Sin ítems</p>
          ) : (
            <div className="space-y-2">
              {ot.items.map(item => (
                <div key={item.id} className="bg-slate-700 rounded p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{item.producto.nombre}</p>
                    {item.notas && <p className="text-xs text-gray-400">{item.notas}</p>}
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-white">
                      {item.cantidad} {item.unidad_medida?.abreviacion || item.unidad_medida?.nombre || ''}
                    </span>
                    {item.cantidad_ejecutada != null && (
                      <p className="text-xs text-green-400 mt-0.5">Ejec: {item.cantidad_ejecutada}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Log de actividad */}
      <div className="bg-slate-800 rounded-lg p-6">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider border-b border-slate-700 pb-2 mb-4">
          Registro de actividad
        </h2>
        {ot.log.length === 0 ? (
          <p className="text-gray-500 italic text-sm">Sin eventos registrados</p>
        ) : (
          <div className="space-y-3">
            {[...ot.log].reverse().map(entry => (
              <div key={entry.id} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">
                      {ACCION_LABELS[entry.accion] || entry.accion}
                    </span>
                    {entry.etapa && (
                      <span className="text-xs text-gray-400">→ {entry.etapa.nombre}</span>
                    )}
                  </div>
                  {entry.detalle && <p className="text-xs text-gray-400 mt-0.5">{entry.detalle}</p>}
                  <p className="text-xs text-gray-600 mt-0.5">
                    {fmt(entry.created_at)}
                    {entry.usuario && ` · ${entry.usuario.nombre_completo || entry.usuario.email}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Avanzar etapa */}
      {modalEtapa && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-semibold text-white">Avanzar a etapa</h3>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Etapa destino *</label>
              <select
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                value={etapaSeleccionada}
                onChange={e => setEtapaSeleccionada(Number(e.target.value))}
              >
                <option value="">Seleccionar etapa...</option>
                {etapasDisponibles
                  .filter(e => e.id !== ot.etapa_actual?.id)
                  .map(e => (
                    <option key={e.id} value={e.id}>{e.nombre}</option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Detalle (opcional)</label>
              <textarea
                rows={2}
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm"
                placeholder="Observaciones del avance..."
                value={detalleEtapa}
                onChange={e => setDetalleEtapa(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => { setModalEtapa(false); setEtapaSeleccionada(''); setDetalleEtapa(''); }}
                className="px-4 py-2 rounded text-gray-300 hover:bg-slate-700"
                disabled={procesando}
              >
                Cancelar
              </button>
              <button
                onClick={avanzarEtapa}
                disabled={!etapaSeleccionada || procesando}
                className="px-5 py-2 rounded bg-blue-700 hover:bg-blue-600 text-white font-semibold disabled:opacity-50"
              >
                {procesando ? 'Guardando...' : 'Avanzar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Cerrar OT */}
      {modalCerrar && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-semibold text-white">Cerrar Orden de Trabajo</h3>
            <p className="text-sm text-gray-400">
              Al cerrar, la OT pasará a estado <strong className="text-green-400">CERRADA</strong> y no podrá modificarse.
            </p>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Notas de cierre (opcional)</label>
              <textarea
                rows={3}
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm"
                placeholder="Observaciones finales, resultado de la producción..."
                value={detalleCierre}
                onChange={e => setDetalleCierre(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setModalCerrar(false)}
                className="px-4 py-2 rounded text-gray-300 hover:bg-slate-700"
                disabled={procesando}
              >
                Cancelar
              </button>
              <button
                onClick={cerrarOT}
                disabled={procesando}
                className="px-5 py-2 rounded bg-green-700 hover:bg-green-600 text-white font-semibold disabled:opacity-50"
              >
                {procesando ? 'Cerrando...' : 'Confirmar cierre'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
