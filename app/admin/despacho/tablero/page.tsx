'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AuthService } from '@/lib/auth';
import {
  listarHojasRuta,
  listarPedidosDisponibles,
  marcarEnRuta,
  type HojaRuta,
  type PedidoResumen,
} from '@/lib/api/hojas_ruta';

// ── Helpers ──────────────────────────────────────────────────────────

function hoy(fechaStr: string | null | undefined): boolean {
  if (!fechaStr) return false;
  return new Date(fechaStr).toDateString() === new Date().toDateString();
}

function horaCorta(fechaStr: string | null | undefined): string {
  if (!fechaStr) return '—';
  return new Date(fechaStr).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

function KgBar({ usado, capacidad }: { usado: number; capacidad: number | null }) {
  if (!capacidad) return <span className="text-slate-400 text-sm">{usado.toFixed(1)} kg</span>;
  const pct = Math.min((usado / capacidad) * 100, 100);
  const color = pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-yellow-500' : 'bg-emerald-500';
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-slate-400 mb-1">
        <span>{usado.toFixed(1)} kg</span>
        <span>{capacidad.toFixed(0)} kg cap.</span>
      </div>
      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function BadgePago({ pagado }: { pagado: boolean }) {
  if (pagado) return null;
  return (
    <span className="text-xs bg-amber-900/50 text-amber-400 border border-amber-700 px-1.5 py-0.5 rounded-full">
      ⚠️ No pagado
    </span>
  );
}

// ── Componente principal ─────────────────────────────────────────────

export default function TableroDespachoPage() {
  const [hojas, setHojas] = useState<HojaRuta[]>([]);
  const [pedidosSinRuta, setPedidosSinRuta] = useState<PedidoResumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saliendoId, setSaliendoId] = useState<number | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [h, p] = await Promise.all([listarHojasRuta(), listarPedidosDisponibles()]);
      setHojas(h);
      setPedidosSinRuta(p);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!AuthService.isAuthenticated()) return;
    cargar();
    const interval = setInterval(cargar, 60_000); // refresco cada 1 min
    return () => clearInterval(interval);
  }, [cargar]);

  const handleSalir = async (id: number) => {
    if (!confirm('¿Confirmar salida del camión?')) return;
    setSaliendoId(id);
    try {
      await marcarEnRuta(id);
      cargar();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaliendoId(null);
    }
  };

  // ── Derivaciones ──
  const enRuta    = hojas.filter((h) => h.estado === 'EN_RUTA');
  const pendientes = hojas.filter((h) => h.estado === 'PENDIENTE');
  const completadasHoy = hojas.filter((h) => h.estado === 'COMPLETADA' && hoy(h.fecha_retorno));

  const totalPorEntregar = hojas
    .filter((h) => h.estado !== 'COMPLETADA')
    .reduce((s, h) => s + (h.total_pedidos - h.pedidos_entregados), 0);

  const pedidosNoPagados = pedidosSinRuta.filter((p) => !p.es_pagado);

  // Cobros pendientes: rutas con tipo_cobro_chofer definido y no pagadas
  const cobrosPendientes = hojas.filter(
    (h) => h.tipo_cobro_chofer && !h.cobro_chofer_pagado
  );
  const totalCobros = cobrosPendientes.reduce(
    (s, h) => s + (h.monto_cobro_chofer ?? 0), 0
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Tablero de Despacho</h1>
          <p className="text-slate-400 text-sm">Rutas, despachadores y estado de entregas — actualización automática cada 1 min</p>
        </div>
        <button
          onClick={cargar}
          className="text-slate-400 hover:text-white border border-slate-600 hover:border-slate-500 px-3 py-1.5 rounded-lg text-sm"
        >
          🔄 Actualizar
        </button>
      </div>

      {error && (
        <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-lg px-4 py-3">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-400" />
        </div>
      ) : (
        <>
          {/* ── KPIs ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-blue-900/30 border border-blue-700 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-blue-400">{enRuta.length}</div>
              <div className="text-slate-300 text-sm mt-1">🚛 En Ruta Ahora</div>
            </div>
            <div className="bg-yellow-900/30 border border-yellow-700 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-yellow-400">{pendientes.length}</div>
              <div className="text-slate-300 text-sm mt-1">⏳ Pendientes Salida</div>
            </div>
            <div className="bg-slate-700/50 border border-slate-600 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-white">{totalPorEntregar}</div>
              <div className="text-slate-300 text-sm mt-1">📦 Pedidos por Entregar</div>
            </div>
            <div className="bg-emerald-900/30 border border-emerald-700 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-emerald-400">{completadasHoy.length}</div>
              <div className="text-slate-300 text-sm mt-1">✅ Completadas Hoy</div>
            </div>
          </div>

          {/* ── Alerta pedidos no pagados sin ruta ── */}
          {pedidosNoPagados.length > 0 && (
            <div className="bg-amber-900/20 border border-amber-700 rounded-xl px-5 py-3 flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="text-amber-300 font-semibold text-sm">
                  {pedidosNoPagados.length} pedido{pedidosNoPagados.length !== 1 ? 's' : ''} sin ruta y sin pagar
                </p>
                <p className="text-amber-400/70 text-xs">
                  {pedidosNoPagados.map((p) => p.numero_pedido).join(', ')}
                </p>
              </div>
            </div>
          )}

          {/* ── Rutas EN RUTA ── */}
          {enRuta.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-white mb-3">🚛 En Ruta Ahora</h2>
              <div className="space-y-3">
                {enRuta.map((hoja) => (
                  <HojaCard key={hoja.id} hoja={hoja} />
                ))}
              </div>
            </section>
          )}

          {/* ── Rutas PENDIENTES ── */}
          {pendientes.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-white mb-3">⏳ Pendientes de Salida</h2>
              <div className="space-y-3">
                {pendientes.map((hoja) => (
                  <HojaCard
                    key={hoja.id}
                    hoja={hoja}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ── Pedidos CONFIRMADOS sin ruta ── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-white">
                📋 Pedidos Confirmados sin Ruta
                <span className="ml-2 text-base font-normal text-slate-400">({pedidosSinRuta.length})</span>
              </h2>
              {pedidosSinRuta.length > 0 && (
                <Link
                  href="/admin/despacho/rutas"
                  className="text-cyan-400 hover:text-cyan-300 text-sm underline"
                >
                  Asignar a ruta →
                </Link>
              )}
            </div>

            {pedidosSinRuta.length === 0 ? (
              <div className="bg-slate-800 border border-slate-700 rounded-xl py-10 text-center text-slate-500">
                <div className="text-3xl mb-2">🎉</div>
                <p>Todos los pedidos confirmados tienen ruta asignada</p>
              </div>
            ) : (
              <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-slate-400 text-xs">
                      <th className="text-left px-4 py-2">Pedido</th>
                      <th className="text-left px-4 py-2">Cliente</th>
                      <th className="text-left px-4 py-2 hidden sm:table-cell">Dirección</th>
                      <th className="text-right px-4 py-2">Total</th>
                      <th className="text-right px-4 py-2">Kg</th>
                      <th className="text-center px-4 py-2">Pago</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pedidosSinRuta.map((p, i) => (
                      <tr
                        key={p.id}
                        className={`border-b border-slate-700/50 ${i % 2 === 0 ? '' : 'bg-slate-700/20'}`}
                      >
                        <td className="px-4 py-2.5 font-mono text-white font-semibold">{p.numero_pedido}</td>
                        <td className="px-4 py-2.5 text-slate-300">{p.cliente_nombre ?? '—'}</td>
                        <td className="px-4 py-2.5 text-slate-500 hidden sm:table-cell truncate max-w-xs">{p.direccion ?? '—'}</td>
                        <td className="px-4 py-2.5 text-right text-slate-300">
                          ${p.monto_total.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                        </td>
                        <td className={`px-4 py-2.5 text-right font-semibold ${p.kg_brutos > 0 ? 'text-cyan-400' : 'text-slate-500'}`}>
                          {p.kg_brutos > 0 ? `${p.kg_brutos.toFixed(1)} kg` : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {p.es_pagado
                            ? <span className="text-emerald-400 text-xs">✅ Pagado</span>
                            : <span className="text-amber-400 text-xs">⚠️ Pendiente</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ── Completadas Hoy ── */}
          {completadasHoy.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-white mb-3">✅ Completadas Hoy</h2>
              <div className="space-y-3">
                {completadasHoy.map((hoja) => (
                  <HojaCard key={hoja.id} hoja={hoja} />
                ))}
              </div>
            </section>
          )}

          {/* ── Pagos pendientes a choferes ── */}
          {cobrosPendientes.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-white">
                  💸 Pagos Pendientes a Choferes
                  <span className="ml-2 text-base font-normal text-slate-400">({cobrosPendientes.length})</span>
                </h2>
                <span className="text-amber-400 font-bold text-sm">
                  Total: ${Math.round(totalCobros).toLocaleString('es-CL')}
                </span>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-slate-400 text-xs">
                      <th className="text-left px-4 py-2">Chofer</th>
                      <th className="text-left px-4 py-2 hidden sm:table-cell">Vehículo</th>
                      <th className="text-left px-4 py-2">Tipo</th>
                      <th className="text-right px-4 py-2">Tarifa</th>
                      <th className="text-right px-4 py-2">Monto</th>
                      <th className="text-center px-4 py-2">Estado ruta</th>
                      <th className="text-center px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cobrosPendientes.map((h, i) => (
                      <tr
                        key={h.id}
                        className={`border-b border-slate-700/50 ${i % 2 === 0 ? '' : 'bg-slate-700/20'}`}
                      >
                        <td className="px-4 py-2.5 text-white font-medium">
                          {h.chofer?.nombre ?? h.chofer_nombre ?? '—'}
                        </td>
                        <td className="px-4 py-2.5 text-slate-400 font-mono text-xs hidden sm:table-cell">
                          {h.vehiculo?.label ?? '—'}
                        </td>
                        <td className="px-4 py-2.5 text-slate-300">
                          {h.tipo_cobro_chofer === 'FIJO' ? 'Precio fijo' : 'Por kg'}
                        </td>
                        <td className="px-4 py-2.5 text-right text-cyan-400">
                          ${Math.round(h.tarifa_chofer ?? 0).toLocaleString('es-CL')}
                          {h.tipo_cobro_chofer === 'POR_KG' && <span className="text-slate-500">/kg</span>}
                        </td>
                        <td className="px-4 py-2.5 text-right font-bold">
                          {h.monto_cobro_chofer !== null
                            ? <span className="text-amber-400">${Math.round(h.monto_cobro_chofer).toLocaleString('es-CL')}</span>
                            : <span className="text-slate-500 text-xs">Sin calcular</span>
                          }
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {h.estado === 'COMPLETADA'
                            ? <span className="text-xs bg-emerald-900/50 text-emerald-400 border border-emerald-800 px-1.5 py-0.5 rounded-full">Completada</span>
                            : h.estado === 'EN_RUTA'
                            ? <span className="text-xs bg-blue-900/50 text-blue-400 border border-blue-800 px-1.5 py-0.5 rounded-full">En ruta</span>
                            : <span className="text-xs bg-yellow-900/50 text-yellow-400 border border-yellow-800 px-1.5 py-0.5 rounded-full">Pendiente</span>
                          }
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <a
                            href={`/admin/despacho/rutas/${h.id}`}
                            className="text-cyan-400 hover:text-cyan-300 text-xs underline"
                          >
                            Ver →
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Estado vacío total */}
          {hojas.length === 0 && pedidosSinRuta.length === 0 && (
            <div className="text-center py-20 text-slate-500">
              <div className="text-5xl mb-3">🚚</div>
              <p className="text-lg">Sin actividad de despacho</p>
              <p className="text-sm mt-1">Los pedidos confirmados aparecerán aquí</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Tarjeta de Hoja de Ruta ──────────────────────────────────────────

function HojaCard({
  hoja,
  onSalir,
  saliendoId,
}: {
  hoja: HojaRuta;
  onSalir?: () => void;
  saliendoId?: number | null;
}) {
  const progreso = hoja.total_pedidos > 0
    ? Math.round((hoja.pedidos_entregados / hoja.total_pedidos) * 100)
    : 0;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      {/* Encabezado de la hoja */}
      <div className="px-5 py-4 flex items-start gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap mb-2">
            <span className="text-white font-semibold">
              👤 {hoja.chofer?.nombre ?? hoja.chofer_nombre ?? '—'}
            </span>
            {hoja.vehiculo && (
              <span className="text-slate-400 text-sm font-mono bg-slate-700 px-2 py-0.5 rounded">
                🚚 {hoja.vehiculo.label}
              </span>
            )}
            {hoja.estado === 'EN_RUTA' && hoja.fecha_salida && (
              <span className="text-blue-400 text-xs">
                Salió a las {new Date(hoja.fecha_salida).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>

          {/* Barra de progreso de entregas */}
          <div className="flex items-center gap-3 mb-2">
            <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${progreso === 100 ? 'bg-emerald-500' : 'bg-cyan-500'}`}
                style={{ width: `${progreso}%` }}
              />
            </div>
            <span className="text-slate-300 text-sm shrink-0">
              {hoja.pedidos_entregados}/{hoja.total_pedidos} entregas
            </span>
          </div>

          <div className="max-w-xs">
            <KgBar usado={hoja.total_kg} capacidad={hoja.capacidad_kg} />
          </div>

          {hoja.notas && (
            <p className="text-slate-500 text-xs mt-2 italic">{hoja.notas}</p>
          )}

          {/* Cobro chofer */}
          {hoja.tipo_cobro_chofer && (
            <div className="mt-2">
              {hoja.cobro_chofer_pagado ? (
                <span className="text-xs bg-emerald-900/50 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full">
                  💰 Chofer pagado
                </span>
              ) : hoja.monto_cobro_chofer !== null ? (
                <span className="text-xs bg-amber-900/50 text-amber-400 border border-amber-700 px-2 py-0.5 rounded-full">
                  ⏳ Chofer: ${Math.round(hoja.monto_cobro_chofer).toLocaleString('es-CL')} pendiente
                </span>
              ) : (
                <span className="text-xs bg-slate-700/50 text-slate-400 border border-slate-600 px-2 py-0.5 rounded-full">
                  {hoja.tipo_cobro_chofer === 'FIJO'
                    ? `Fijo: $${Math.round(hoja.tarifa_chofer ?? 0).toLocaleString('es-CL')}`
                    : `Por kg: $${hoja.tarifa_chofer}/kg`}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="flex gap-2 items-start shrink-0">
          <Link
            href={`/admin/despacho/rutas/${hoja.id}`}
            className="bg-slate-700 hover:bg-slate-600 text-white text-sm px-3 py-1.5 rounded-lg"
          >
            Ver detalle
          </Link>
          {hoja.estado === 'PENDIENTE' && onSalir && (
            <button
              onClick={onSalir}
              disabled={saliendoId === hoja.id}
              className="bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white text-sm px-3 py-1.5 rounded-lg"
            >
              {saliendoId === hoja.id ? '...' : '🚚 Salir'}
            </button>
          )}
        </div>
      </div>

      {/* Lista de pedidos de la hoja */}
      {hoja.items && hoja.items.length > 0 && (
        <div className="border-t border-slate-700 divide-y divide-slate-700/50">
          {hoja.items.map((item) => {
            const p = item.pedido;
            return (
              <div
                key={item.id}
                className={`px-5 py-2.5 flex items-center gap-3 text-sm flex-wrap ${item.entregado ? 'opacity-50' : ''}`}
              >
                <span className={`font-mono font-semibold ${item.entregado ? 'line-through text-slate-500' : 'text-white'}`}>
                  {p?.numero_pedido ?? `#${item.pedido_id}`}
                </span>
                <span className="text-slate-400 truncate">{p?.cliente_nombre ?? '—'}</span>
                {p?.direccion && (
                  <span className="text-slate-500 text-xs truncate hidden sm:inline">{p.direccion}</span>
                )}
                <div className="ml-auto flex items-center gap-2 shrink-0">
                  {p && <BadgePago pagado={p.es_pagado} />}
                  {p?.kg_brutos != null && p.kg_brutos > 0 && (
                    <span className="text-cyan-400 text-xs">{p.kg_brutos.toFixed(1)} kg</span>
                  )}
                  {item.entregado ? (
                    <span className="text-emerald-400 text-xs">✅ Entregado</span>
                  ) : (
                    <span className="text-slate-500 text-xs">Pendiente</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
