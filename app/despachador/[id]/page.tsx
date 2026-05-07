'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  obtenerHojaRuta,
  marcarEnRuta,
  marcarEntregado,
  type HojaRuta,
  type HojaRutaItem,
} from '@/lib/api/hojas_ruta';

function formatCLP(n: number) {
  return n.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
}

const ESTADO_CONFIG: Record<string, { label: string; cls: string }> = {
  PENDIENTE: { label: 'Pendiente salida', cls: 'bg-yellow-900/40 text-yellow-300 border-yellow-700' },
  EN_RUTA:   { label: 'En Ruta',          cls: 'bg-blue-900/40 text-blue-300 border-blue-700' },
  COMPLETADA:{ label: 'Completada',        cls: 'bg-emerald-900/40 text-emerald-300 border-emerald-700' },
};

export default function HojaRutaDespachadorPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [hoja, setHoja] = useState<HojaRuta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal entrega
  const [modalItem, setModalItem] = useState<HojaRutaItem | null>(null);
  const [notas, setNotas] = useState('');
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setHoja(await obtenerHojaRuta(id));
    } catch (e: any) {
      setError(e.message || 'Error al cargar hoja de ruta');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  const handleSalir = async () => {
    if (!hoja || !confirm('¿Confirmar salida del camión?')) return;
    try {
      await marcarEnRuta(hoja.id);
      cargar();
    } catch (e: any) { alert(e.message); }
  };

  const confirmarEntrega = async () => {
    if (!hoja || !modalItem) return;
    setEnviando(true);
    try {
      await marcarEntregado(hoja.id, modalItem.id, notas || undefined);
      setModalItem(null);
      setNotas('');
      cargar();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setEnviando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500" />
      </div>
    );
  }

  if (error || !hoja) {
    return (
      <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 text-red-300 text-sm">
        {error || 'Hoja de ruta no encontrada'}
        <Link href="/despachador" className="block mt-2 text-amber-400 underline text-xs">Volver</Link>
      </div>
    );
  }

  const cfg = ESTADO_CONFIG[hoja.estado] ?? ESTADO_CONFIG.PENDIENTE;
  const pendientes = hoja.items.filter(i => !i.entregado);
  const entregados = hoja.items.filter(i => i.entregado);
  const deliveryCobrable = hoja.items
    .filter(i => !i.entregado && !i.pedido.es_pagado)
    .reduce((acc, i) => acc + ((i.pedido as any).costo_delivery ?? 0), 0);

  return (
    <div className="space-y-4">
      {/* Header hoja */}
      <div className="flex items-center gap-3 mb-2">
        <Link href="/despachador" className="text-slate-400 hover:text-white p-1">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-white leading-none">Hoja #{hoja.id}</h1>
          <p className="text-xs text-slate-400 mt-0.5">{hoja.vehiculo?.label ?? hoja.patente ?? 'Sin vehículo'}</p>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.cls}`}>
          {cfg.label}
        </span>
      </div>

      {/* Progreso */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-slate-300 font-medium">{entregados.length} / {hoja.total_pedidos} entregados</span>
          <span className="text-slate-500">{pendientes.length} pendiente{pendientes.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: hoja.total_pedidos > 0 ? `${(entregados.length / hoja.total_pedidos) * 100}%` : '0%' }}
          />
        </div>

        {deliveryCobrable > 0 && (
          <div className="mt-3 flex items-center justify-between bg-amber-900/20 border border-amber-800/50 rounded-lg px-3 py-2">
            <span className="text-xs text-amber-400">Delivery por cobrar</span>
            <span className="text-sm font-bold text-amber-300">{formatCLP(deliveryCobrable)}</span>
          </div>
        )}
      </div>

      {/* Botón salir (si PENDIENTE) */}
      {hoja.estado === 'PENDIENTE' && (
        <button
          onClick={handleSalir}
          className="w-full py-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl text-lg transition-colors"
        >
          Confirmar Salida del Camión
        </button>
      )}

      {/* Pedidos pendientes */}
      {pendientes.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2 px-1">
            Por entregar ({pendientes.length})
          </h2>
          <div className="space-y-3">
            {pendientes.map(item => (
              <div key={item.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">{item.pedido.cliente_nombre}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Pedido {item.pedido.numero_pedido}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-white">{formatCLP(item.pedido.monto_total)}</p>
                    {!item.pedido.es_pagado && (
                      <span className="text-xs text-amber-400 font-medium">No pagado</span>
                    )}
                    {item.pedido.es_pagado && (
                      <span className="text-xs text-emerald-400 font-medium">Pagado</span>
                    )}
                  </div>
                </div>

                {item.pedido.direccion && (
                  <div className="flex items-start gap-2 mb-3">
                    <svg className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-sm text-slate-300">{item.pedido.direccion}</p>
                  </div>
                )}

                {item.pedido.cliente_telefono && (
                  <a
                    href={`tel:${item.pedido.cliente_telefono}`}
                    className="flex items-center gap-2 text-sm text-blue-400 mb-3 hover:text-blue-300"
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 7V5z" />
                    </svg>
                    {item.pedido.cliente_telefono}
                  </a>
                )}

                {!item.pedido.es_pagado && (item.pedido as any).costo_delivery > 0 && (
                  <p className="text-xs text-amber-400 mb-3">
                    Cobrar delivery: {formatCLP((item.pedido as any).costo_delivery)}
                  </p>
                )}

                <button
                  onClick={() => { setModalItem(item); setNotas(''); }}
                  disabled={hoja.estado === 'PENDIENTE'}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors"
                >
                  {hoja.estado === 'PENDIENTE' ? 'Espera salida del camión' : 'Marcar Entregado'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pedidos entregados */}
      {entregados.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2 px-1">
            Entregados ({entregados.length})
          </h2>
          <div className="space-y-2">
            {entregados.map(item => (
              <div key={item.id} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-900/50 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-300 truncate">{item.pedido.cliente_nombre}</p>
                  <p className="text-xs text-slate-500">{item.pedido.numero_pedido}</p>
                </div>
                {item.fecha_entrega && (
                  <p className="text-xs text-slate-500 shrink-0">
                    {new Date(item.fecha_entrega).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline de la ruta */}
      {hoja.fecha_salida && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3 px-1">
            Tracking de ruta
          </h2>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <ol className="relative border-l border-slate-600 ml-2 space-y-4">

              {/* Salida */}
              <li className="pl-5">
                <span className="absolute -left-2 flex items-center justify-center w-4 h-4 rounded-full bg-blue-500">
                  <span className="w-2 h-2 rounded-full bg-white" />
                </span>
                <p className="text-xs font-semibold text-blue-300">Salida del camión</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {new Date(hoja.fecha_salida).toLocaleString('es-CL', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </p>
              </li>

              {/* Entregas ordenadas por hora */}
              {[...hoja.items]
                .filter(i => i.entregado && i.fecha_entrega)
                .sort((a, b) => new Date(a.fecha_entrega!).getTime() - new Date(b.fecha_entrega!).getTime())
                .map((item, idx, arr) => {
                  const prev = idx === 0 ? new Date(hoja.fecha_salida!) : new Date(arr[idx - 1].fecha_entrega!);
                  const curr = new Date(item.fecha_entrega!);
                  const mins = Math.round((curr.getTime() - prev.getTime()) / 60000);
                  return (
                    <li key={item.id} className="pl-5">
                      <span className="absolute -left-2 flex items-center justify-center w-4 h-4 rounded-full bg-emerald-600">
                        <span className="w-2 h-2 rounded-full bg-white" />
                      </span>
                      <p className="text-xs font-semibold text-emerald-300">{item.pedido.cliente_nombre}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {curr.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                        {mins > 0 && <span className="text-slate-500 ml-2">+{mins} min</span>}
                      </p>
                      {item.notas_entrega && (
                        <p className="text-xs text-slate-500 italic mt-0.5">{item.notas_entrega}</p>
                      )}
                    </li>
                  );
                })}

              {/* Retorno */}
              {hoja.fecha_retorno && (
                <li className="pl-5">
                  <span className="absolute -left-2 flex items-center justify-center w-4 h-4 rounded-full bg-slate-500">
                    <span className="w-2 h-2 rounded-full bg-white" />
                  </span>
                  <p className="text-xs font-semibold text-slate-300">Retorno</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {new Date(hoja.fecha_retorno).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </li>
              )}

            </ol>
          </div>
        </div>
      )}

      {/* Modal confirmar entrega */}
      {modalItem && (
        <div className="fixed inset-0 bg-black/70 flex items-end z-50" onClick={() => setModalItem(null)}>
          <div
            className="w-full bg-slate-800 border-t border-slate-700 rounded-t-2xl p-6 max-w-2xl mx-auto"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white mb-1">Confirmar entrega</h3>
            <p className="text-slate-400 text-sm mb-4">{modalItem.pedido.cliente_nombre} — {modalItem.pedido.numero_pedido}</p>

            {!modalItem.pedido.es_pagado && (
              <div className="bg-amber-900/30 border border-amber-700 rounded-lg p-3 mb-4">
                <p className="text-sm font-semibold text-amber-300">Cobrar al cliente</p>
                <p className="text-2xl font-bold text-amber-300 mt-1">
                  {formatCLP(modalItem.pedido.monto_total)}
                </p>
                {(modalItem.pedido as any).costo_delivery > 0 && (
                  <p className="text-xs text-amber-400 mt-1">
                    Incluye delivery: {formatCLP((modalItem.pedido as any).costo_delivery)}
                  </p>
                )}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm text-slate-400 mb-1">Notas (opcional)</label>
              <textarea
                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-500"
                rows={2}
                placeholder="Ej: dejé en conserjería..."
                value={notas}
                onChange={e => setNotas(e.target.value)}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setModalItem(null)}
                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarEntrega}
                disabled={enviando}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold rounded-xl transition-colors"
              >
                {enviando ? 'Confirmando...' : 'Confirmar Entrega'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
