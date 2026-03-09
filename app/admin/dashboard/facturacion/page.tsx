'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';
import { listarFacturas } from '@/lib/api/facturas';
import type { Pedido } from '@/lib/api/pedidos';

function fmt(n: number) {
  return `$${Math.round(n).toLocaleString('es-CL')}`;
}

function formatFecha(f?: string) {
  if (!f) return '—';
  return new Date(f).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Barra de progreso horizontal
function BarraProgreso({ valor, total, color }: { valor: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min(100, (valor / total) * 100) : 0;
  return (
    <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
      <div className={`h-2 rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function TableroFacturacionPage() {
  const router = useRouter();
  const [facturas, setFacturas] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await listarFacturas();
      setFacturas(data);
    } catch (e: any) {
      setError(e.message || 'Error al cargar facturas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // ── Cálculos ────────────────────────────────────────────────────────────────
  const activas = facturas.filter(f => f.estado !== 'CANCELADO' && (f.total ?? 0) > 0);
  const canceladas = facturas.filter(f => f.estado === 'CANCELADO');

  // Financiero
  const totalFacturado   = activas.reduce((s, f) => s + (f.total ?? 0), 0);
  const totalCobrado     = activas.filter(f => f.pagado).reduce((s, f) => s + (f.total ?? 0), 0);
  const totalPorCobrar   = activas.filter(f => !f.pagado).reduce((s, f) => s + (f.total ?? 0), 0);
  const totalChequePdte  = activas.filter(f => !f.pagado && f.permite_cheque).reduce((s, f) => s + (f.total ?? 0), 0);
  const totalSinMedioPago = activas.filter(f => !f.pagado && !f.medio_pago_id).reduce((s, f) => s + (f.total ?? 0), 0);
  const totalCobradoCheques = activas.reduce((s, f) => s + (f.monto_cobrado_cheques ?? 0), 0);

  // SII
  const sinFolio  = activas.filter(f => !f.folio_sii).length;
  const aprobadas = activas.filter(f => f.estado_sii === 'APROBADO').length;
  const rechazadas = activas.filter(f => f.estado_sii === 'RECHAZADO').length;
  const pendientesSii = activas.filter(f => !f.estado_sii || f.estado_sii === 'PENDIENTE').length;

  // ── Gráfico facturación por mes (últimos 12 meses) ────────────────────────
  const datosMes: { mes: string; facturado: number; cobrado: number; porCobrar: number }[] = [];
  {
    const hoy = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('es-CL', { month: 'short', year: '2-digit' });
      const del_mes = activas.filter(f => {
        const fp = new Date(f.fecha_pedido);
        return fp.getFullYear() === d.getFullYear() && fp.getMonth() === d.getMonth();
      });
      datosMes.push({
        mes: label,
        facturado: del_mes.reduce((s, f) => s + (f.total ?? 0), 0),
        cobrado:   del_mes.filter(f => f.pagado).reduce((s, f) => s + (f.total ?? 0), 0),
        porCobrar: del_mes.filter(f => !f.pagado).reduce((s, f) => s + (f.total ?? 0), 0),
      });
    }
  }

  // Ranking clientes por monto pendiente
  const rankingClientes: { nombre: string; rut?: string; monto: number; cantidad: number }[] = [];
  activas.filter(f => !f.pagado).forEach(f => {
    const nombre = f.cliente?.razon_social || f.cliente?.nombre || `Cliente #${f.cliente_id}`;
    const rut = f.cliente?.rut;
    const existing = rankingClientes.find(r => r.nombre === nombre);
    if (existing) {
      existing.monto += f.total ?? 0;
      existing.cantidad++;
    } else {
      rankingClientes.push({ nombre, rut, monto: f.total ?? 0, cantidad: 1 });
    }
  });
  rankingClientes.sort((a, b) => b.monto - a.monto);

  // Cheques próximos a vencer (7 días) — se infieren de facturas con cheque pendiente
  const hoy = new Date();

  // Últimas facturas sin folio
  const ultimasSinFolio = activas
    .filter(f => !f.folio_sii)
    .sort((a, b) => new Date(b.fecha_pedido).getTime() - new Date(a.fecha_pedido).getTime())
    .slice(0, 5);

  // Últimas facturas sin pago registrado
  const ultimasSinPago = activas
    .filter(f => !f.pagado && !f.medio_pago_id)
    .sort((a, b) => new Date(a.fecha_pedido).getTime() - new Date(b.fecha_pedido).getTime())
    .slice(0, 5);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">🧾</div>
          <p className="text-slate-400">Cargando tablero de facturación...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="text-slate-400 hover:text-white text-sm mb-2 flex items-center gap-1 transition-colors"
            >
              ← Dashboard principal
            </button>
            <h1 className="text-3xl font-bold text-transparent bg-gradient-to-r from-orange-300 to-yellow-300 bg-clip-text">
              🧾 Tablero de Facturación
            </h1>
            <p className="text-slate-400 mt-1">Control de cobranza, estado SII y gestión de pagos</p>
          </div>
          <button
            onClick={cargar}
            className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            🔄 Actualizar
          </button>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 rounded-lg p-4 text-sm">⚠️ {error}</div>
        )}

        {/* ── Fila 1: KPIs financieros ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total facturado', valor: totalFacturado, sub: `${activas.length} facturas`, color: 'text-white', border: 'border-slate-600' },
            { label: 'Por cobrar', valor: totalPorCobrar, sub: `${activas.filter(f => !f.pagado).length} facturas pendientes`, color: 'text-yellow-400', border: 'border-yellow-600' },
            { label: 'Cobrado', valor: totalCobrado, sub: `${activas.filter(f => f.pagado).length} facturas pagadas`, color: 'text-green-400', border: 'border-green-700' },
            { label: 'Cheques acreditados', valor: totalCobradoCheques, sub: `${activas.filter(f => f.permite_cheque && f.pagado).length} completamente cobrados`, color: 'text-cyan-400', border: 'border-cyan-700' },
          ].map(k => (
            <div key={k.label} className={`bg-slate-800 border ${k.border} rounded-xl p-5`}>
              <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">{k.label}</p>
              <p className={`text-2xl font-bold ${k.color}`}>{fmt(k.valor)}</p>
              <p className="text-slate-500 text-xs mt-1">{k.sub}</p>
              <BarraProgreso valor={k.valor} total={totalFacturado} color={
                k.label === 'Cobrado' ? 'bg-green-500' :
                k.label === 'Por cobrar' ? 'bg-yellow-500' :
                k.label === 'Cheques acreditados' ? 'bg-cyan-500' : 'bg-slate-500'
              } />
            </div>
          ))}
        </div>

        {/* ── Gráfico: Facturación por mes ── */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-white font-semibold text-lg">📈 Facturación por Mes</h3>
              <p className="text-slate-400 text-sm mt-0.5">Últimos 12 meses — facturado, cobrado y por cobrar</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-cyan-500 inline-block"></span> Facturado</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-500 inline-block"></span> Cobrado</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-yellow-500 inline-block"></span> Por cobrar</span>
            </div>
          </div>

          {datosMes.every(d => d.facturado === 0) ? (
            <div className="flex items-center justify-center h-40 text-slate-500 text-sm">
              Sin datos de facturación aún
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={datosMes} margin={{ top: 4, right: 8, left: 10, bottom: 0 }} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis
                  dataKey="mes"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={{ stroke: '#475569' }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={v => v === 0 ? '0' : `$${(v / 1000000).toFixed(1)}M`}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={58}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8 }}
                  labelStyle={{ color: '#e2e8f0', fontWeight: 600, marginBottom: 4 }}
                  itemStyle={{ color: '#cbd5e1' }}
                  formatter={(value, name) => [
                    `$${Math.round(Number(value ?? 0)).toLocaleString('es-CL')}`,
                    name === 'facturado' ? 'Facturado' : name === 'cobrado' ? 'Cobrado' : 'Por cobrar'
                  ] as [string, string]}
                />
                <Bar dataKey="facturado" fill="#06b6d4" radius={[3, 3, 0, 0]} maxBarSize={32} />
                <Bar dataKey="cobrado"   fill="#22c55e" radius={[3, 3, 0, 0]} maxBarSize={32} />
                <Bar dataKey="porCobrar" fill="#eab308" radius={[3, 3, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── Fila 2: Desglose cobranza + Estado SII ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Desglose por cobrar */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">💰 Desglose "Por Cobrar"</h3>
            <div className="space-y-3">
              {[
                { label: 'Cheques pendientes de acreditar', valor: totalChequePdte, color: 'text-orange-400', dot: 'bg-orange-400', count: activas.filter(f => !f.pagado && f.permite_cheque).length },
                { label: 'Sin medio de pago registrado', valor: totalSinMedioPago, color: 'text-red-400', dot: 'bg-red-400', count: activas.filter(f => !f.pagado && !f.medio_pago_id).length },
                { label: 'Otro medio (no pagado)', valor: totalPorCobrar - totalChequePdte - totalSinMedioPago, color: 'text-blue-400', dot: 'bg-blue-400', count: activas.filter(f => !f.pagado && f.medio_pago_id && !f.permite_cheque).length },
              ].map(d => (
                <div key={d.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${d.dot}`}></span>
                    <span className="text-slate-300 text-sm">{d.label}</span>
                  </div>
                  <div className="text-right">
                    <span className={`font-semibold text-sm ${d.color}`}>{fmt(d.valor)}</span>
                    <span className="text-slate-500 text-xs block">{d.count} fact.</span>
                  </div>
                </div>
              ))}
              <div className="border-t border-slate-700 pt-3 flex justify-between">
                <span className="text-slate-400 text-sm font-medium">Total por cobrar</span>
                <span className="text-yellow-400 font-bold">{fmt(totalPorCobrar)}</span>
              </div>
            </div>
          </div>

          {/* Estado SII */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">📋 Estado SII</h3>
            <div className="space-y-3">
              {[
                { label: 'Sin folio registrado', count: sinFolio, color: 'text-red-400', dot: 'bg-red-400', alerta: true },
                { label: 'Pendiente envío', count: pendientesSii, color: 'text-yellow-400', dot: 'bg-yellow-400', alerta: pendientesSii > 0 },
                { label: 'Aprobadas por SII', count: aprobadas, color: 'text-green-400', dot: 'bg-green-400', alerta: false },
                { label: 'Rechazadas por SII', count: rechazadas, color: 'text-red-400', dot: 'bg-red-500', alerta: rechazadas > 0 },
                { label: 'Anuladas/canceladas', count: canceladas.length, color: 'text-slate-400', dot: 'bg-slate-500', alerta: false },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`}></span>
                    <span className="text-slate-300 text-sm">{s.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.alerta && s.count > 0 && <span className="text-xs text-orange-400">⚠️</span>}
                    <span className={`font-bold ${s.color}`}>{s.count}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-slate-700">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Cobertura SII</span>
                <span>{activas.length > 0 ? Math.round(((activas.length - sinFolio) / activas.length) * 100) : 0}%</span>
              </div>
              <BarraProgreso valor={activas.length - sinFolio} total={activas.length} color="bg-green-500" />
            </div>
          </div>

          {/* Cobro cheques */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">📝 Cobranza de Cheques</h3>
            <div className="space-y-3">
              {[
                { label: 'Con cheque pendiente', count: activas.filter(f => !f.pagado && f.permite_cheque).length, monto: totalChequePdte, color: 'text-orange-400' },
                { label: 'Cheque totalmente cobrado', count: activas.filter(f => f.pagado && f.permite_cheque).length, monto: activas.filter(f => f.pagado && f.permite_cheque).reduce((s, f) => s + (f.total ?? 0), 0), color: 'text-green-400' },
              ].map(c => (
                <div key={c.label} className="bg-slate-700/60 rounded-lg p-3">
                  <p className="text-slate-400 text-xs">{c.label}</p>
                  <p className={`font-bold text-lg ${c.color}`}>{fmt(c.monto)}</p>
                  <p className="text-slate-500 text-xs">{c.count} facturas</p>
                </div>
              ))}
              <div className="bg-slate-700/60 rounded-lg p-3">
                <p className="text-slate-400 text-xs">Acreditado en DB</p>
                <p className="text-cyan-400 font-bold text-lg">{fmt(totalCobradoCheques)}</p>
                <p className="text-slate-500 text-xs">cheques marcados COBRADO</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Fila 3: Ranking clientes + Alertas ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Top deudores */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">🏆 Top Clientes por Cobrar</h3>
              <button
                onClick={() => router.push('/admin/facturas')}
                className="text-teal-400 hover:text-teal-300 text-xs transition-colors"
              >
                Ver facturas →
              </button>
            </div>
            {rankingClientes.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-6">🎉 No hay montos pendientes</p>
            ) : (
              <div className="space-y-2">
                {rankingClientes.slice(0, 7).map((c, i) => (
                  <div key={c.nombre} className="flex items-center gap-3">
                    <span className={`w-6 h-6 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${
                      i === 0 ? 'bg-yellow-500/30 text-yellow-400' :
                      i === 1 ? 'bg-slate-500/30 text-slate-300' :
                      i === 2 ? 'bg-orange-700/30 text-orange-400' :
                      'bg-slate-700 text-slate-400'
                    }`}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{c.nombre}</p>
                      {c.rut && <p className="text-slate-500 text-xs">{c.rut}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-yellow-400 font-semibold text-sm">{fmt(c.monto)}</p>
                      <p className="text-slate-500 text-xs">{c.cantidad} factura{c.cantidad > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                ))}
                {rankingClientes.length > 7 && (
                  <p className="text-slate-500 text-xs text-center pt-2">+{rankingClientes.length - 7} clientes más</p>
                )}
              </div>
            )}
          </div>

          {/* Alertas */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-4">🚨 Alertas Pendientes</h3>
            <div className="space-y-3">

              {/* Sin folio */}
              {ultimasSinFolio.length > 0 && (
                <div className="border border-red-500/30 bg-red-900/10 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-red-400 text-sm font-semibold">🔴 Sin folio SII ({sinFolio})</p>
                    <button onClick={() => router.push('/admin/facturas')} className="text-xs text-red-400 hover:text-red-300">Ver →</button>
                  </div>
                  <div className="space-y-1">
                    {ultimasSinFolio.map(f => (
                      <div key={f.id} className="flex justify-between text-xs">
                        <span className="text-slate-400 font-mono">{f.numero_pedido}</span>
                        <span className="text-slate-400">{f.cliente?.razon_social || f.cliente?.nombre}</span>
                        <span className="text-white font-medium">{fmt(f.total ?? 0)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sin medio de pago */}
              {ultimasSinPago.length > 0 && (
                <div className="border border-orange-500/30 bg-orange-900/10 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-orange-400 text-sm font-semibold">🟠 Sin pago registrado ({activas.filter(f => !f.pagado && !f.medio_pago_id).length})</p>
                    <button onClick={() => router.push('/admin/facturas')} className="text-xs text-orange-400 hover:text-orange-300">Ver →</button>
                  </div>
                  <div className="space-y-1">
                    {ultimasSinPago.map(f => (
                      <div key={f.id} className="flex justify-between text-xs">
                        <span className="text-slate-400 font-mono">{f.numero_pedido}</span>
                        <span className="text-slate-400">{formatFecha(f.fecha_pedido)}</span>
                        <span className="text-white font-medium">{fmt(f.total ?? 0)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SII rechazadas */}
              {rechazadas > 0 && (
                <div className="border border-red-500/30 bg-red-900/10 rounded-lg p-3">
                  <p className="text-red-400 text-sm font-semibold">🔴 {rechazadas} factura{rechazadas > 1 ? 's' : ''} rechazada{rechazadas > 1 ? 's' : ''} por SII</p>
                  <p className="text-slate-400 text-xs mt-1">Requieren Nota de Crédito o corrección</p>
                </div>
              )}

              {/* Todo OK */}
              {ultimasSinFolio.length === 0 && ultimasSinPago.length === 0 && rechazadas === 0 && (
                <div className="text-center py-8">
                  <p className="text-4xl mb-2">✅</p>
                  <p className="text-green-400 font-semibold">Sin alertas pendientes</p>
                  <p className="text-slate-500 text-sm mt-1">Todo al día</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Acciones rápidas ── */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">⚡ Acciones Rápidas</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Gestionar Facturas', sub: 'Folio, pago, cheques', icon: '🧾', ruta: '/admin/facturas', color: 'hover:border-orange-500' },
              { label: 'Por Cobrar', sub: `${activas.filter(f => !f.pagado).length} pendientes`, icon: '⏳', ruta: '/admin/facturas?porCobrar=1', color: 'hover:border-yellow-500' },
              { label: 'Clientes', sub: 'Crédito y cobranza', icon: '👥', ruta: '/admin/clientes', color: 'hover:border-blue-500' },
              { label: 'Pedidos', sub: 'Origen de facturas', icon: '📦', ruta: '/admin/pedidos', color: 'hover:border-teal-500' },
            ].map(a => (
              <button
                key={a.label}
                onClick={() => router.push(a.ruta)}
                className={`bg-slate-700 border border-slate-600 ${a.color} rounded-lg p-4 text-left transition-colors`}
              >
                <div className="text-2xl mb-2">{a.icon}</div>
                <p className="text-white text-sm font-semibold">{a.label}</p>
                <p className="text-slate-400 text-xs mt-0.5">{a.sub}</p>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
