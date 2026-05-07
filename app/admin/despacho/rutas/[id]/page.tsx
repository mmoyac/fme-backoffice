'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { AuthService } from '@/lib/auth';
import {
  obtenerHojaRuta,
  marcarEnRuta,
  marcarEntregado,
  calcularCobrosChofer,
  pagarChofer,
  type HojaRuta,
} from '@/lib/api/hojas_ruta';

const ESTADO_BADGE: Record<string, { label: string; cls: string }> = {
  PENDIENTE: { label: 'Pendiente', cls: 'bg-yellow-900/50 text-yellow-400 border-yellow-800' },
  EN_RUTA: { label: 'En Ruta', cls: 'bg-blue-900/50 text-blue-400 border-blue-800' },
  COMPLETADA: { label: 'Completada', cls: 'bg-emerald-900/50 text-emerald-400 border-emerald-800' },
};

export default function HojaRutaDetallePage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);

  const [hoja, setHoja] = useState<HojaRuta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState<number | null>(null);
  const [notasModal, setNotasModal] = useState<{ itemId: number; pedidoNumero: string } | null>(null);
  const [notasTexto, setNotasTexto] = useState('');
  const [procesandoPago, setProcesandoPago] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const h = await obtenerHojaRuta(id);
      setHoja(h);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!AuthService.isAuthenticated()) { router.push('/login'); return; }
    cargar();
  }, [cargar]);

  const handleSalir = async () => {
    if (!hoja) return;
    if (!confirm('¿Confirmar salida del camión?')) return;
    try {
      await marcarEnRuta(hoja.id);
      cargar();
    } catch (e: any) { alert(e.message); }
  };

  const abrirModalEntrega = (itemId: number, pedidoNumero: string) => {
    setNotasModal({ itemId, pedidoNumero });
    setNotasTexto('');
  };

  const handleCalcularCobro = async () => {
    if (!hoja) return;
    try {
      await calcularCobrosChofer(hoja.id);
      cargar();
    } catch (e: any) { alert(e.message); }
  };

  const handlePagarChofer = async () => {
    if (!hoja) return;
    if (!confirm('¿Confirmar pago al chofer?')) return;
    setProcesandoPago(true);
    try {
      await pagarChofer(hoja.id);
      cargar();
    } catch (e: any) { alert(e.message); } finally { setProcesandoPago(false); }
  };

  const confirmarEntrega = async () => {
    if (!notasModal || !hoja) return;
    setEnviando(notasModal.itemId);
    try {
      const res = await marcarEntregado(hoja.id, notasModal.itemId, notasTexto || undefined);
      setNotasModal(null);
      cargar();
      if (res.hoja_completada) {
        setTimeout(() => alert('🎉 ¡Todos los pedidos entregados! Hoja de ruta completada.'), 200);
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setEnviando(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-400" />
      </div>
    );
  }

  if (error || !hoja) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-lg px-4 py-3">{error || 'No encontrado'}</div>
        <Link href="/admin/despacho/rutas" className="text-cyan-400 hover:underline mt-4 block">← Volver</Link>
      </div>
    );
  }

  const badge = ESTADO_BADGE[hoja.estado] ?? ESTADO_BADGE.PENDIENTE;
  const pctCarga = hoja.capacidad_kg && hoja.capacidad_kg > 0
    ? Math.min((hoja.total_kg / hoja.capacidad_kg) * 100, 100)
    : null;
  const barColor = pctCarga === null ? 'bg-cyan-500' : pctCarga > 90 ? 'bg-red-500' : pctCarga > 70 ? 'bg-yellow-500' : 'bg-emerald-500';

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Link href="/admin/despacho/rutas" className="text-slate-400 hover:text-white text-sm">← Rutas</Link>
        <span className="text-slate-600">/</span>
        <h1 className="text-white font-bold text-xl">Hoja de Ruta</h1>
        <span className={`text-xs border px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
      </div>

      {/* Info de cabecera */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl px-6 py-5 mb-6 space-y-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-white text-xl font-bold">
              👤 {hoja.chofer?.nombre ?? hoja.chofer_nombre ?? '—'}
            </div>
            {hoja.vehiculo && (
              <div className="mt-1 flex items-center gap-2 flex-wrap">
                <span className="text-slate-400 font-mono text-sm bg-slate-700/60 px-2 py-0.5 rounded">
                  🚚 {hoja.vehiculo.label}
                </span>
                {hoja.vehiculo.tipo && (
                  <span className="text-slate-500 text-xs">{hoja.vehiculo.tipo}</span>
                )}
              </div>
            )}
          </div>
          {hoja.estado === 'PENDIENTE' && (
            <button
              onClick={handleSalir}
              className="bg-blue-700 hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg text-sm"
            >
              🚚 Confirmar Salida
            </button>
          )}
        </div>

        {/* Fechas */}
        <div className="flex flex-wrap gap-4 text-sm text-slate-400">
          <span>Creada: {new Date(hoja.fecha_creacion).toLocaleDateString('es-CL')}</span>
          {hoja.fecha_salida && (
            <span>Salida: {new Date(hoja.fecha_salida).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span>
          )}
          {hoja.fecha_retorno && (
            <span>Retorno: {new Date(hoja.fecha_retorno).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span>
          )}
        </div>

        {/* Barra kg */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-300">Carga total</span>
            <span className="text-cyan-400 font-semibold">
              {hoja.total_kg.toFixed(1)} kg
              {hoja.capacidad_kg ? ` / ${hoja.capacidad_kg.toFixed(0)} kg (${hoja.porcentaje_carga?.toFixed(0)}%)` : ''}
            </span>
          </div>
          <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${barColor} rounded-full transition-all`}
              style={{ width: pctCarga !== null ? `${pctCarga}%` : '100%' }}
            />
          </div>
        </div>

        {/* Progreso entregas */}
        <div className="flex items-center gap-4 text-sm text-slate-400">
          <span>📦 {hoja.total_pedidos} pedidos</span>
          <span className="text-emerald-400">✅ {hoja.pedidos_entregados} entregados</span>
          <span className="text-slate-500">{hoja.total_pedidos - hoja.pedidos_entregados} pendientes</span>
        </div>

        {hoja.notas && (
          <div className="text-slate-400 text-sm italic bg-slate-700/40 rounded px-3 py-2">{hoja.notas}</div>
        )}
      </div>

      {/* Lista de pedidos */}
      <h2 className="text-white font-semibold mb-3">Pedidos en esta ruta</h2>
      {(!hoja.items || hoja.items.length === 0) ? (
        <div className="text-slate-500 text-center py-8">No hay pedidos asignados</div>
      ) : (
        <div className="space-y-3">
          {hoja.items.map((item) => {
            const pedido = item.pedido;
            const entregado = item.entregado;
            return (
              <div
                key={item.id}
                className={`border rounded-xl overflow-hidden transition-all ${
                  entregado
                    ? 'bg-slate-800/40 border-slate-700/50 opacity-60'
                    : 'bg-slate-800 border-slate-700'
                }`}
              >
                <div className="px-5 py-4 flex items-start gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`font-mono font-semibold text-sm ${entregado ? 'text-slate-400 line-through' : 'text-white'}`}>
                        {pedido?.numero_pedido ?? `#${item.pedido_id}`}
                      </span>
                      {pedido && !pedido.es_pagado && !entregado && (
                        <span className="text-xs bg-amber-900/50 text-amber-400 border border-amber-700 px-2 py-0.5 rounded-full">⚠️ No pagado</span>
                      )}
                      {entregado && (
                        <span className="text-xs bg-emerald-900/50 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full">
                          ✅ Entregado
                        </span>
                      )}
                    </div>

                    {pedido && (
                      <>
                        <div className="text-slate-300 text-sm mt-1">
                          👤 {pedido.cliente_nombre ?? '—'}
                          {pedido.cliente_telefono && (
                            <span className="ml-2 text-slate-500">{pedido.cliente_telefono}</span>
                          )}
                        </div>
                        {pedido.direccion && (
                          <div className="text-slate-500 text-xs mt-0.5 truncate">📍 {pedido.direccion}</div>
                        )}
                        <div className="flex flex-wrap gap-3 mt-2 text-sm">
                          {pedido.kg_brutos > 0 && (
                            <span className="text-cyan-400 font-semibold">{pedido.kg_brutos.toFixed(1)} kg</span>
                          )}
                          <span className="text-emerald-400">
                            ${(pedido.monto_total ?? 0).toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                      </>
                    )}

                    {entregado && item.fecha_entrega && (
                      <div className="text-slate-500 text-xs mt-2">
                        Entregado: {new Date(item.fecha_entrega).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                        {item.notas_entrega && ` — ${item.notas_entrega}`}
                      </div>
                    )}
                  </div>

                  {!entregado && hoja.estado !== 'PENDIENTE' && (
                    <button
                      onClick={() => abrirModalEntrega(item.id, pedido?.numero_pedido ?? String(item.pedido_id))}
                      disabled={enviando === item.id}
                      className="bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg text-sm shrink-0"
                    >
                      {enviando === item.id ? '...' : '✓ Entregar'}
                    </button>
                  )}

                  {!entregado && hoja.estado === 'PENDIENTE' && (
                    <span className="text-slate-600 text-xs self-center">Inicia ruta para entregar</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cobro al chofer */}
      {hoja.tipo_cobro_chofer && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl px-6 py-5 mt-6">
          <h2 className="text-white font-semibold mb-3">💰 Cobro al chofer</h2>
          <div className="flex flex-wrap gap-4 items-center">
            <div className="text-slate-400 text-sm">
              Tipo: <span className="text-white font-medium">{hoja.tipo_cobro_chofer === 'FIJO' ? 'Precio fijo' : 'Por kg entregado'}</span>
            </div>
            {hoja.tarifa_chofer !== null && (
              <div className="text-slate-400 text-sm">
                Tarifa: <span className="text-cyan-400 font-medium">
                  ${Math.round(hoja.tarifa_chofer).toLocaleString('es-CL')}
                  {hoja.tipo_cobro_chofer === 'POR_KG' ? '/kg' : ''}
                </span>
              </div>
            )}
            {hoja.monto_cobro_chofer !== null ? (
              <div className="text-slate-400 text-sm">
                Total a pagar: <span className="text-white font-bold text-lg">
                  ${Math.round(hoja.monto_cobro_chofer).toLocaleString('es-CL')}
                </span>
              </div>
            ) : hoja.tipo_cobro_chofer === 'POR_KG' && hoja.estado === 'COMPLETADA' ? (
              <button
                onClick={handleCalcularCobro}
                className="bg-slate-700 hover:bg-slate-600 text-cyan-400 text-sm px-3 py-1.5 rounded-lg border border-slate-600"
              >
                Calcular monto final
              </button>
            ) : null}
          </div>

          {hoja.cobro_chofer_pagado ? (
            <div className="mt-3 flex items-center gap-2">
              <span className="bg-emerald-900/50 text-emerald-400 border border-emerald-800 text-sm px-3 py-1.5 rounded-lg">
                ✅ Pagado el {hoja.fecha_pago_chofer ? new Date(hoja.fecha_pago_chofer).toLocaleDateString('es-CL') : '—'}
              </span>
            </div>
          ) : hoja.monto_cobro_chofer !== null ? (
            <div className="mt-3">
              <button
                onClick={handlePagarChofer}
                disabled={procesandoPago}
                className="bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg text-sm"
              >
                {procesandoPago ? 'Procesando...' : '💰 Marcar como pagado'}
              </button>
            </div>
          ) : null}
        </div>
      )}

      {/* Timeline de la ruta */}
      {hoja.fecha_salida && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl px-6 py-5 mb-6">
          <h2 className="text-white font-semibold mb-4">🗺️ Tracking de ruta</h2>
          <ol className="relative border-l border-slate-600 ml-2 space-y-5">

            {/* Salida */}
            <li className="pl-6">
              <span className="absolute -left-2.5 flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 ring-4 ring-slate-800">
                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM3 4h1.5l2.7 6.39A2 2 0 009 11.5h5a2 2 0 001.96-1.6L17 5H3z" />
                </svg>
              </span>
              <p className="text-sm font-semibold text-blue-300">Salida del camión</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {new Date(hoja.fecha_salida).toLocaleString('es-CL', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
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
                  <li key={item.id} className="pl-6">
                    <span className="absolute -left-2.5 flex items-center justify-center w-5 h-5 rounded-full bg-emerald-600 ring-4 ring-slate-800">
                      <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-emerald-300">{item.pedido.cliente_nombre}</p>
                        <p className="text-xs text-slate-500">{item.pedido.numero_pedido}</p>
                        {item.notas_entrega && (
                          <p className="text-xs text-slate-400 italic mt-0.5">"{item.notas_entrega}"</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-mono text-white">
                          {curr.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {mins > 0 && (
                          <p className="text-xs text-slate-500">+{mins} min</p>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}

            {/* Pendientes (ruta en curso) */}
            {hoja.items.filter(i => !i.entregado).length > 0 && (
              <li className="pl-6">
                <span className="absolute -left-2.5 flex items-center justify-center w-5 h-5 rounded-full bg-slate-600 ring-4 ring-slate-800">
                  <span className="w-2 h-2 rounded-full bg-slate-400 animate-pulse" />
                </span>
                <p className="text-sm text-slate-400 italic">
                  {hoja.items.filter(i => !i.entregado).length} entrega{hoja.items.filter(i => !i.entregado).length !== 1 ? 's' : ''} pendiente{hoja.items.filter(i => !i.entregado).length !== 1 ? 's' : ''}...
                </p>
              </li>
            )}

            {/* Retorno */}
            {hoja.fecha_retorno && (
              <li className="pl-6">
                <span className="absolute -left-2.5 flex items-center justify-center w-5 h-5 rounded-full bg-slate-500 ring-4 ring-slate-800">
                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.707-10.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L9.414 11H13a1 1 0 100-2H9.414l1.293-1.293z" clipRule="evenodd" />
                  </svg>
                </span>
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-semibold text-slate-300">Retorno</p>
                  <div className="text-right">
                    <p className="text-sm font-mono text-white">
                      {new Date(hoja.fecha_retorno).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-xs text-slate-500">
                      Duración total: {Math.round((new Date(hoja.fecha_retorno).getTime() - new Date(hoja.fecha_salida).getTime()) / 60000)} min
                    </p>
                  </div>
                </div>
              </li>
            )}

          </ol>
        </div>
      )}

      {/* Modal notas entrega */}
      {notasModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-700">
              <h3 className="text-white font-bold">Confirmar entrega</h3>
              <p className="text-slate-400 text-sm">{notasModal.pedidoNumero}</p>
            </div>
            <div className="px-6 py-4">
              <label className="text-slate-300 text-sm block mb-2">Notas de entrega (opcional)</label>
              <textarea
                value={notasTexto}
                onChange={(e) => setNotasTexto(e.target.value)}
                placeholder="Ej: Dejado en portería, recibido por..."
                rows={3}
                className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm resize-none"
              />
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-700">
              <button
                onClick={() => setNotasModal(null)}
                className="text-slate-400 hover:text-white px-4 py-2 rounded-lg text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarEntrega}
                disabled={enviando !== null}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-lg text-sm"
              >
                {enviando !== null ? 'Guardando...' : '✓ Confirmar Entrega'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
