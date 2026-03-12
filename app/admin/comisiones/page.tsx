'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import {
  getComisiones,
  getPeriodos,
  getResumenComisiones,
  getLiquidaciones,
  crearLiquidacion,
  marcarLiquidacionPagada,
  type Comision,
  type LiquidacionComision,
  type ResumenVendedorPeriodo,
} from '@/lib/api/comisiones';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCLP(n: number) {
  return '$' + Math.round(n).toLocaleString('es-CL');
}

function fmtPct(n: number) {
  return n.toFixed(2) + '%';
}

function estadoBadge(estado: string) {
  if (estado === 'PENDIENTE')
    return (
      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-300">
        Pendiente
      </span>
    );
  if (estado === 'LIQUIDADA' || estado === 'PAGADA')
    return (
      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-300">
        {estado === 'PAGADA' ? 'Pagada' : 'Liquidada'}
      </span>
    );
  return <span className="text-slate-400 text-xs">{estado}</span>;
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = 'comisiones' | 'resumen' | 'liquidaciones';

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ComisionesPage() {
  const { user } = useAuth();
  const esAdmin = user?.role?.nombre?.toLowerCase() === 'admin';

  const [tab, setTab] = useState<Tab>(esAdmin ? 'resumen' : 'comisiones');
  const [periodos, setPeriodos] = useState<string[]>([]);
  const [periodoSel, setPeriodoSel] = useState<string>('');

  // ── Comisiones ──────────────────────────────────────────────────────────────
  const [comisiones, setComisiones] = useState<Comision[]>([]);
  const [loadingCom, setLoadingCom] = useState(false);
  const [errorCom, setErrorCom] = useState('');

  // ── Resumen ─────────────────────────────────────────────────────────────────
  const [resumen, setResumen] = useState<ResumenVendedorPeriodo[]>([]);
  const [loadingRes, setLoadingRes] = useState(false);
  const [errorRes, setErrorRes] = useState('');

  // ── Liquidaciones ───────────────────────────────────────────────────────────
  const [liquidaciones, setLiquidaciones] = useState<LiquidacionComision[]>([]);
  const [loadingLiq, setLoadingLiq] = useState(false);
  const [errorLiq, setErrorLiq] = useState('');

  // ── Modal crear liquidación ─────────────────────────────────────────────────
  const [modalLiq, setModalLiq] = useState<ResumenVendedorPeriodo | null>(null);
  const [notasLiq, setNotasLiq] = useState('');
  const [creandoLiq, setCreandoLiq] = useState(false);
  const [errorCrearLiq, setErrorCrearLiq] = useState('');

  // ── Cargar períodos ─────────────────────────────────────────────────────────
  useEffect(() => {
    getPeriodos()
      .then(({ periodos: p }) => {
        setPeriodos(p);
        if (p.length > 0) setPeriodoSel(p[0]);
      })
      .catch(() => {});
  }, []);

  // ── Cargar datos según tab y período ────────────────────────────────────────
  const fetchComisiones = useCallback(() => {
    setLoadingCom(true);
    setErrorCom('');
    getComisiones({ periodo: periodoSel || undefined })
      .then(setComisiones)
      .catch((e) => setErrorCom(e.message))
      .finally(() => setLoadingCom(false));
  }, [periodoSel]);

  const fetchResumen = useCallback(() => {
    setLoadingRes(true);
    setErrorRes('');
    getResumenComisiones(periodoSel || undefined)
      .then(setResumen)
      .catch((e) => setErrorRes(e.message))
      .finally(() => setLoadingRes(false));
  }, [periodoSel]);

  const fetchLiquidaciones = useCallback(() => {
    setLoadingLiq(true);
    setErrorLiq('');
    getLiquidaciones({ periodo: periodoSel || undefined })
      .then(setLiquidaciones)
      .catch((e) => setErrorLiq(e.message))
      .finally(() => setLoadingLiq(false));
  }, [periodoSel]);

  useEffect(() => {
    if (tab === 'comisiones') fetchComisiones();
    else if (tab === 'resumen') fetchResumen();
    else if (tab === 'liquidaciones') fetchLiquidaciones();
  }, [tab, periodoSel, fetchComisiones, fetchResumen, fetchLiquidaciones]);

  // ── Crear liquidación ───────────────────────────────────────────────────────
  const handleCrearLiquidacion = async () => {
    if (!modalLiq) return;
    setCreandoLiq(true);
    setErrorCrearLiq('');
    try {
      await crearLiquidacion({
        vendedor_id: modalLiq.vendedor_id,
        periodo: modalLiq.periodo,
        notas: notasLiq,
      });
      setModalLiq(null);
      setNotasLiq('');
      fetchResumen();
      fetchLiquidaciones();
    } catch (e: any) {
      setErrorCrearLiq(e.message);
    } finally {
      setCreandoLiq(false);
    }
  };

  // ── Pagar liquidación ───────────────────────────────────────────────────────
  const handlePagar = async (id: number) => {
    if (!confirm('¿Confirmas que se realizó el pago de esta liquidación?')) return;
    try {
      await marcarLiquidacionPagada(id);
      fetchLiquidaciones();
    } catch (e: any) {
      alert(e.message);
    }
  };

  // ── UI ──────────────────────────────────────────────────────────────────────

  const tabClass = (t: Tab) =>
    `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
      tab === t
        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
    }`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Comisiones</h1>
          <p className="text-slate-400 text-sm mt-1">
            {esAdmin
              ? 'Gestión de comisiones y liquidaciones de vendedores'
              : 'Mis comisiones por ventas'}
          </p>
        </div>

        {/* Selector de período */}
        <select
          value={periodoSel}
          onChange={(e) => setPeriodoSel(e.target.value)}
          className="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        >
          <option value="">Todos los períodos</option>
          {periodos.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(!esAdmin || true) && (
          <button className={tabClass('comisiones')} onClick={() => setTab('comisiones')}>
            Detalle
          </button>
        )}
        {esAdmin && (
          <button className={tabClass('resumen')} onClick={() => setTab('resumen')}>
            Resumen
          </button>
        )}
        {esAdmin && (
          <button className={tabClass('liquidaciones')} onClick={() => setTab('liquidaciones')}>
            Liquidaciones
          </button>
        )}
      </div>

      {/* ── TAB: Detalle comisiones ── */}
      {tab === 'comisiones' && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          {loadingCom ? (
            <div className="p-8 text-center text-slate-400">Cargando...</div>
          ) : errorCom ? (
            <div className="p-8 text-center text-red-400">{errorCom}</div>
          ) : comisiones.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              Sin comisiones para el período seleccionado
            </div>
          ) : (
            <>
              {/* Totales */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 border-b border-slate-700">
                <Stat
                  label="Ventas neto"
                  value={fmtCLP(comisiones.reduce((s, c) => s + c.monto_neto, 0))}
                />
                <Stat
                  label="Total comisiones"
                  value={fmtCLP(comisiones.reduce((s, c) => s + c.monto_comision, 0))}
                  highlight
                />
                <Stat label="Pedidos" value={String(comisiones.length)} />
                <Stat
                  label="Pendientes"
                  value={String(comisiones.filter((c) => c.estado === 'PENDIENTE').length)}
                />
              </div>

              {/* Tabla */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-900/50">
                    <tr>
                      {esAdmin && (
                        <th className="px-4 py-3 text-left text-slate-400 font-medium">Vendedor</th>
                      )}
                      <th className="px-4 py-3 text-left text-slate-400 font-medium">Pedido</th>
                      <th className="px-4 py-3 text-right text-slate-400 font-medium">Bruto</th>
                      <th className="px-4 py-3 text-right text-slate-400 font-medium">Neto</th>
                      <th className="px-4 py-3 text-right text-slate-400 font-medium">%</th>
                      <th className="px-4 py-3 text-right text-slate-400 font-medium">Comisión</th>
                      <th className="px-4 py-3 text-center text-slate-400 font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {comisiones.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-700/30">
                        {esAdmin && (
                          <td className="px-4 py-3 text-slate-300">
                            {c.vendedor_nombre || `#${c.vendedor_id}`}
                          </td>
                        )}
                        <td className="px-4 py-3 font-mono text-cyan-300">{c.numero_pedido}</td>
                        <td className="px-4 py-3 text-right text-slate-300">{fmtCLP(c.monto_bruto)}</td>
                        <td className="px-4 py-3 text-right text-slate-300">{fmtCLP(c.monto_neto)}</td>
                        <td className="px-4 py-3 text-right text-slate-400">{fmtPct(c.porcentaje)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-300">
                          {fmtCLP(c.monto_comision)}
                        </td>
                        <td className="px-4 py-3 text-center">{estadoBadge(c.estado)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── TAB: Resumen (admin) ── */}
      {tab === 'resumen' && esAdmin && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          {loadingRes ? (
            <div className="p-8 text-center text-slate-400">Cargando...</div>
          ) : errorRes ? (
            <div className="p-8 text-center text-red-400">{errorRes}</div>
          ) : resumen.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              Sin datos para el período seleccionado
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-900/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-slate-400 font-medium">Vendedor</th>
                    <th className="px-4 py-3 text-center text-slate-400 font-medium">Período</th>
                    <th className="px-4 py-3 text-right text-slate-400 font-medium">%</th>
                    <th className="px-4 py-3 text-right text-slate-400 font-medium">Ventas neto</th>
                    <th className="px-4 py-3 text-right text-slate-400 font-medium">Comisión</th>
                    <th className="px-4 py-3 text-center text-slate-400 font-medium">Pedidos</th>
                    <th className="px-4 py-3 text-center text-slate-400 font-medium">Liquidación</th>
                    <th className="px-4 py-3 text-center text-slate-400 font-medium">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {resumen.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-700/30">
                      <td className="px-4 py-3 text-slate-200 font-medium">
                        {r.vendedor_nombre || `Vendedor #${r.vendedor_id}`}
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-slate-300">{r.periodo}</td>
                      <td className="px-4 py-3 text-right text-slate-400">
                        {r.porcentaje_comision ? fmtPct(r.porcentaje_comision) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-200">
                        {fmtCLP(r.total_ventas_neto)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-300">
                        {fmtCLP(r.total_comision)}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-300">{r.cantidad_pedidos}</td>
                      <td className="px-4 py-3 text-center">
                        {r.tiene_liquidacion ? (
                          estadoBadge('LIQUIDADA')
                        ) : (
                          <span className="text-amber-400 text-xs">Sin liquidar</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {!r.tiene_liquidacion && (
                          <button
                            onClick={() => {
                              setModalLiq(r);
                              setNotasLiq('');
                              setErrorCrearLiq('');
                            }}
                            className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
                          >
                            Liquidar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Liquidaciones (admin) ── */}
      {tab === 'liquidaciones' && esAdmin && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          {loadingLiq ? (
            <div className="p-8 text-center text-slate-400">Cargando...</div>
          ) : errorLiq ? (
            <div className="p-8 text-center text-red-400">{errorLiq}</div>
          ) : liquidaciones.length === 0 ? (
            <div className="p-8 text-center text-slate-500">Sin liquidaciones</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-900/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-slate-400 font-medium">Vendedor</th>
                    <th className="px-4 py-3 text-center text-slate-400 font-medium">Período</th>
                    <th className="px-4 py-3 text-right text-slate-400 font-medium">Ventas neto</th>
                    <th className="px-4 py-3 text-right text-slate-400 font-medium">Comisión</th>
                    <th className="px-4 py-3 text-center text-slate-400 font-medium">Pedidos</th>
                    <th className="px-4 py-3 text-center text-slate-400 font-medium">Pago previsto</th>
                    <th className="px-4 py-3 text-center text-slate-400 font-medium">Estado</th>
                    <th className="px-4 py-3 text-center text-slate-400 font-medium">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {liquidaciones.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-700/30">
                      <td className="px-4 py-3 text-slate-200 font-medium">
                        {l.vendedor_nombre || `Vendedor #${l.vendedor_id}`}
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-slate-300">{l.periodo}</td>
                      <td className="px-4 py-3 text-right text-slate-200">
                        {fmtCLP(l.total_ventas_neto)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-300">
                        {fmtCLP(l.total_comision)}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-300">{l.cantidad_pedidos}</td>
                      <td className="px-4 py-3 text-center text-slate-400">{l.fecha_pago_prevista}</td>
                      <td className="px-4 py-3 text-center">{estadoBadge(l.estado)}</td>
                      <td className="px-4 py-3 text-center">
                        {l.estado === 'PENDIENTE' && (
                          <button
                            onClick={() => handlePagar(l.id)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
                          >
                            Marcar pagada
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Modal: Crear Liquidación ── */}
      {modalLiq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-600 w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-white">Crear Liquidación</h2>

            <div className="bg-slate-700/50 rounded-lg p-4 space-y-1 text-sm">
              <div className="flex justify-between text-slate-300">
                <span>Vendedor</span>
                <span className="font-medium text-white">
                  {modalLiq.vendedor_nombre}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Período</span>
                <span className="font-mono text-cyan-300">{modalLiq.periodo}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Total comisión</span>
                <span className="font-bold text-emerald-300">
                  {fmtCLP(modalLiq.total_comision)}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Pedidos incluidos</span>
                <span>{modalLiq.cantidad_pedidos}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Pago previsto</span>
                <span>
                  día 5 de{' '}
                  {(() => {
                    const [y, m] = modalLiq.periodo.split('-').map(Number);
                    const next = m === 12 ? new Date(y + 1, 0) : new Date(y, m);
                    return next.toLocaleString('es-CL', { month: 'long', year: 'numeric' });
                  })()}
                </span>
              </div>
            </div>

            <div>
              <label className="text-sm text-slate-400 block mb-1">Notas (opcional)</label>
              <textarea
                value={notasLiq}
                onChange={(e) => setNotasLiq(e.target.value)}
                rows={2}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="Observaciones para el vendedor..."
              />
            </div>

            {errorCrearLiq && (
              <p className="text-red-400 text-sm">{errorCrearLiq}</p>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setModalLiq(null)}
                className="px-4 py-2 rounded-lg text-slate-300 hover:text-white text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCrearLiquidacion}
                disabled={creandoLiq}
                className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors"
              >
                {creandoLiq ? 'Creando...' : 'Crear liquidación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="text-center p-2">
      <div
        className={`text-lg font-bold ${highlight ? 'text-emerald-300' : 'text-white'}`}
      >
        {value}
      </div>
      <div className="text-xs text-slate-400 mt-0.5">{label}</div>
    </div>
  );
}
