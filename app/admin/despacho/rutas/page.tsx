'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthService } from '@/lib/auth';
import {
  listarHojasRuta,
  listarPedidosDisponibles,
  crearHojaRuta,
  marcarEnRuta,
  eliminarHojaRuta,
  pagarChoferMasivo,
  type HojaRuta,
  type PedidoResumen,
} from '@/lib/api/hojas_ruta';
import {
  listarVehiculos,
  listarUsuarios,
  type Vehiculo,
  type UsuarioChofer,
} from '@/lib/api/vehiculos';

const ESTADO_BADGE: Record<string, { label: string; cls: string }> = {
  PENDIENTE: { label: 'Pendiente', cls: 'bg-yellow-900/50 text-yellow-400 border-yellow-800' },
  EN_RUTA: { label: 'En Ruta', cls: 'bg-blue-900/50 text-blue-400 border-blue-800' },
  COMPLETADA: { label: 'Completada', cls: 'bg-emerald-900/50 text-emerald-400 border-emerald-800' },
};

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
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function HojasRutaPage() {
  const router = useRouter();
  const [hojas, setHojas] = useState<HojaRuta[]>([]);
  const [pedidosDisponibles, setPedidosDisponibles] = useState<PedidoResumen[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioChofer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalCrear, setModalCrear] = useState(false);

  // Form crear
  const [vehiculoId, setVehiculoId] = useState('');
  const [choferId, setChoferId] = useState('');
  const [notas, setNotas] = useState('');
  const [tipoCobro, setTipoCobro] = useState<'' | 'FIJO' | 'POR_KG'>('');
  const [tarifaChofer, setTarifaChofer] = useState('');
  const [pedidosSeleccionados, setPedidosSeleccionados] = useState<Set<number>>(new Set());
  const [creando, setCreando] = useState(false);
  const [errorCrear, setErrorCrear] = useState('');

  // Vehículo seleccionado (para mostrar capacidad)
  const vehiculoSel = vehiculos.find((v) => v.id === Number(vehiculoId)) ?? null;
  const capacidadNum = vehiculoSel?.capacidad_kg ?? 0;

  const cargar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [h, p, v, u] = await Promise.all([
        listarHojasRuta(),
        listarPedidosDisponibles(),
        listarVehiculos(),
        listarUsuarios(),
      ]);
      setHojas(h);
      setPedidosDisponibles(p);
      setVehiculos(v);
      setUsuarios(u.filter((u) => u.is_active));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!AuthService.isAuthenticated()) { router.push('/login'); return; }
    cargar();
  }, [cargar]);

  const togglePedido = (id: number) => {
    setPedidosSeleccionados((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const kgSeleccionados = pedidosDisponibles
    .filter((p) => pedidosSeleccionados.has(p.id))
    .reduce((s, p) => s + p.kg_brutos, 0);

  const excedeLimite = capacidadNum > 0 && kgSeleccionados > capacidadNum;

  const handleCrear = async () => {
    if (!vehiculoId) { setErrorCrear('Seleccione un vehículo'); return; }
    if (!choferId) { setErrorCrear('Seleccione un chofer'); return; }
    if (pedidosSeleccionados.size === 0) { setErrorCrear('Seleccione al menos un pedido'); return; }
    if (excedeLimite) { setErrorCrear('Los pedidos seleccionados superan la capacidad del vehículo'); return; }
    setCreando(true);
    setErrorCrear('');
    try {
      await crearHojaRuta({
        vehiculo_id: Number(vehiculoId),
        chofer_id: Number(choferId),
        notas: notas || undefined,
        pedido_ids: Array.from(pedidosSeleccionados),
        tipo_cobro_chofer: tipoCobro || undefined,
        tarifa_chofer: tarifaChofer ? Number(tarifaChofer) : undefined,
      });
      setModalCrear(false);
      setVehiculoId(''); setChoferId(''); setNotas('');
      setTipoCobro(''); setTarifaChofer('');
      setPedidosSeleccionados(new Set());
      cargar();
    } catch (e: any) {
      setErrorCrear(e.message);
    } finally {
      setCreando(false);
    }
  };

  const handleSalir = async (id: number) => {
    if (!confirm('¿Confirmar salida del camión?')) return;
    try {
      await marcarEnRuta(id);
      cargar();
    } catch (e: any) { alert(e.message); }
  };

  // ── Pago masivo ──
  const [modalPago, setModalPago] = useState(false);
  const [choferPagoId, setChoferPagoId] = useState('');
  const [hojasPagoSel, setHojasPagoSel] = useState<Set<number>>(new Set());
  const [pagando, setPagando] = useState(false);
  const [errorPago, setErrorPago] = useState('');

  // Rutas con cobro pendiente agrupadas por chofer
  const rutasPendientePago = hojas.filter(
    (h) => h.tipo_cobro_chofer && !h.cobro_chofer_pagado && h.monto_cobro_chofer !== null
  );
  const choferesPendientes = Array.from(
    new Map(
      rutasPendientePago.map((h) => [
        String(h.chofer_id ?? h.chofer_nombre),
        { id: String(h.chofer_id ?? h.chofer_nombre), nombre: h.chofer?.nombre ?? h.chofer_nombre ?? '—' },
      ])
    ).values()
  );
  const rutasDelChofer = rutasPendientePago.filter(
    (h) => String(h.chofer_id ?? h.chofer_nombre) === choferPagoId
  );
  const totalSeleccionado = rutasDelChofer
    .filter((h) => hojasPagoSel.has(h.id))
    .reduce((s, h) => s + (h.monto_cobro_chofer ?? 0), 0);

  const abrirModalPago = () => {
    setChoferPagoId('');
    setHojasPagoSel(new Set());
    setErrorPago('');
    setModalPago(true);
  };

  const toggleHojaPago = (id: number) =>
    setHojasPagoSel((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const seleccionarTodasRutas = () =>
    setHojasPagoSel(new Set(rutasDelChofer.map((h) => h.id)));

  const handleConfirmarPago = async () => {
    if (hojasPagoSel.size === 0) { setErrorPago('Seleccione al menos una ruta'); return; }
    setPagando(true);
    setErrorPago('');
    try {
      const ids = Array.from(hojasPagoSel);
      await pagarChoferMasivo(ids);
      const rutasPagadas = rutasDelChofer.filter((h) => hojasPagoSel.has(h.id));
      const choferNombre = rutasDelChofer[0]?.chofer?.nombre ?? rutasDelChofer[0]?.chofer_nombre ?? '—';
      imprimirVoucher(choferNombre, rutasPagadas, totalSeleccionado);
      setModalPago(false);
      cargar();
    } catch (e: any) {
      setErrorPago(e.message);
    } finally {
      setPagando(false);
    }
  };

  const imprimirVoucher = (choferNombre: string, rutas: HojaRuta[], total: number) => {
    // Si todas las rutas tienen la misma fecha de pago, usar esa; si no, usar ahora
    const fechaPago = rutas.length === 1 && rutas[0].fecha_pago_chofer
      ? new Date(rutas[0].fecha_pago_chofer)
      : new Date();
    const fecha = fechaPago.toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' });
    const hora = fechaPago.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    const filas = rutas.map((h) => `
      <tr>
        <td>${h.fecha_creacion ? new Date(h.fecha_creacion).toLocaleDateString('es-CL') : '—'}</td>
        <td>${h.vehiculo?.label ?? '—'}</td>
        <td style="text-align:center">${h.pedidos_entregados} / ${h.total_pedidos}</td>
        <td style="text-align:center">${h.total_kg.toFixed(1)} kg</td>
        <td style="text-align:center">${h.tipo_cobro_chofer === 'FIJO' ? 'Precio fijo' : 'Por kg'}</td>
        <td style="text-align:right;font-weight:bold">$${Math.round(h.monto_cobro_chofer ?? 0).toLocaleString('es-CL')}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Comprobante de Pago</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 30px; max-width: 720px; margin: auto; }
    h1 { font-size: 18px; text-align: center; margin-bottom: 4px; }
    .sub { text-align: center; color: #555; margin-bottom: 20px; font-size: 11px; }
    .info { display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    th { background: #eee; border: 1px solid #ccc; padding: 6px 8px; text-align: left; font-size: 11px; }
    td { border: 1px solid #ccc; padding: 6px 8px; font-size: 11px; }
    .total-row td { font-weight: bold; font-size: 13px; background: #f5f5f5; }
    .firmas { display: flex; justify-content: space-between; margin-top: 40px; gap: 40px; }
    .firma { flex: 1; border-top: 1px solid #333; padding-top: 6px; text-align: center; font-size: 11px; color: #444; }
    .aviso { font-size: 10px; color: #888; text-align: center; margin-top: 20px; }
    @media print { body { padding: 15px; } button { display: none !important; } }
  </style>
</head>
<body>
  <h1>Comprobante de Pago a Chofer</h1>
  <p class="sub">Documento de liquidación de servicios de transporte</p>
  <div class="info">
    <div><strong>Chofer:</strong> ${choferNombre}</div>
    <div><strong>Fecha:</strong> ${fecha} ${hora}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Fecha ruta</th>
        <th>Vehículo</th>
        <th style="text-align:center">Entregas</th>
        <th style="text-align:center">Kg</th>
        <th style="text-align:center">Tipo cobro</th>
        <th style="text-align:right">Monto</th>
      </tr>
    </thead>
    <tbody>
      ${filas}
      <tr class="total-row">
        <td colspan="5" style="text-align:right">TOTAL PAGADO</td>
        <td style="text-align:right">$${Math.round(total).toLocaleString('es-CL')}</td>
      </tr>
    </tbody>
  </table>
  <div class="firmas">
    <div class="firma">Firma del Chofer<br/><br/>${choferNombre}</div>
    <div class="firma">Firma del Empleador<br/><br/>________________________</div>
  </div>
  <p class="aviso">Este comprobante acredita el pago total de los servicios de transporte detallados.</p>
  <br/>
  <div style="text-align:center">
    <button onclick="window.print()" style="padding:8px 20px;font-size:13px;cursor:pointer;background:#1a7a5e;color:white;border:none;border-radius:6px">🖨️ Imprimir</button>
  </div>
</body>
</html>`;
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
  };

  const handleEliminar = async (id: number) => {
    if (!confirm('¿Eliminar esta hoja de ruta?')) return;
    try {
      await eliminarHojaRuta(id);
      cargar();
    } catch (e: any) { alert(e.message); }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Hojas de Ruta</h1>
          <p className="text-slate-400 text-sm">Asignación de pedidos a camión y control de entregas</p>
        </div>
        <div className="flex gap-2">
          {rutasPendientePago.length > 0 && (
            <button
              onClick={abrirModalPago}
              className="bg-amber-600 hover:bg-amber-500 text-white font-semibold px-4 py-2 rounded-lg text-sm"
            >
              💸 Pagar chofer ({rutasPendientePago.length})
            </button>
          )}
          <button
            onClick={() => setModalCrear(true)}
            className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold px-4 py-2 rounded-lg text-sm"
          >
            + Nueva Hoja de Ruta
          </button>
        </div>
      </div>

      {error && <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-lg px-4 py-3 mb-4">{error}</div>}

      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-400" />
        </div>
      ) : hojas.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <div className="text-5xl mb-3">🚚</div>
          <div className="text-lg">No hay hojas de ruta</div>
          <p className="text-sm mt-1">Crea una nueva para asignar pedidos al camión</p>
        </div>
      ) : (
        <div className="space-y-4">
          {hojas.map((hoja) => {
            const badge = ESTADO_BADGE[hoja.estado] ?? ESTADO_BADGE.PENDIENTE;
            return (
              <div key={hoja.id} className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                <div className="px-5 py-4 flex items-start gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-1">
                      <span className="text-white font-semibold text-lg">
                        👤 {hoja.chofer?.nombre ?? hoja.chofer_nombre ?? '—'}
                      </span>
                      {hoja.vehiculo && (
                        <span className="text-slate-400 text-sm font-mono bg-slate-700 px-2 py-0.5 rounded">
                          🚚 {hoja.vehiculo.label}
                        </span>
                      )}
                      <span className={`text-xs border px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-slate-400 mt-2">
                      <span>📦 {hoja.total_pedidos} pedido{hoja.total_pedidos !== 1 ? 's' : ''}</span>
                      <span>✅ {hoja.pedidos_entregados} entregados</span>
                      {hoja.fecha_salida && (
                        <span>🕐 Salida: {new Date(hoja.fecha_salida).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span>
                      )}
                      {hoja.tipo_cobro_chofer && hoja.monto_cobro_chofer !== null && (
                        <span className={`text-xs border px-2 py-0.5 rounded-full ${hoja.cobro_chofer_pagado ? 'bg-emerald-900/50 text-emerald-400 border-emerald-800' : 'bg-amber-900/50 text-amber-400 border-amber-700'}`}>
                          {hoja.cobro_chofer_pagado ? '💰 Chofer pagado' : `⏳ Chofer: $${Math.round(hoja.monto_cobro_chofer).toLocaleString('es-CL')}`}
                        </span>
                      )}
                      {hoja.tipo_cobro_chofer && hoja.monto_cobro_chofer === null && (
                        <span className="text-xs border px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-400 border-slate-600">
                          {hoja.tipo_cobro_chofer === 'FIJO' ? `Tarifa fija: $${Math.round(hoja.tarifa_chofer ?? 0).toLocaleString('es-CL')}` : `Por kg: $${hoja.tarifa_chofer}/kg`}
                        </span>
                      )}
                    </div>
                    <div className="mt-3 max-w-xs">
                      <KgBar usado={hoja.total_kg} capacidad={hoja.capacidad_kg} />
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap items-start">
                    <Link
                      href={`/admin/despacho/rutas/${hoja.id}`}
                      className="bg-slate-700 hover:bg-slate-600 text-white text-sm px-3 py-1.5 rounded-lg"
                    >
                      Ver detalle
                    </Link>
                    {hoja.cobro_chofer_pagado && (
                      <button
                        onClick={() => imprimirVoucher(
                          hoja.chofer?.nombre ?? hoja.chofer_nombre ?? '—',
                          [hoja],
                          hoja.monto_cobro_chofer ?? 0
                        )}
                        className="bg-emerald-900/50 hover:bg-emerald-900 text-emerald-400 border border-emerald-800 text-sm px-3 py-1.5 rounded-lg"
                      >
                        🧾 Comprobante
                      </button>
                    )}
                    {hoja.estado === 'PENDIENTE' && (
                      <button
                        onClick={() => handleSalir(hoja.id)}
                        className="bg-blue-700 hover:bg-blue-600 text-white text-sm px-3 py-1.5 rounded-lg"
                      >
                        🚚 Salir
                      </button>
                    )}
                    {hoja.estado === 'PENDIENTE' && (
                      <button
                        onClick={() => handleEliminar(hoja.id)}
                        className="text-red-400 border border-red-800 text-sm px-3 py-1.5 rounded-lg hover:bg-red-900/30"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal Pago Masivo ── */}
      {modalPago && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center overflow-y-auto py-8 px-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <h2 className="text-white font-bold text-lg">💸 Pago Masivo a Chofer</h2>
              <button onClick={() => setModalPago(false)} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* Selector de chofer */}
              <div>
                <label className="text-slate-300 text-sm block mb-1">Chofer a liquidar</label>
                <select
                  value={choferPagoId}
                  onChange={(e) => {
                    setChoferPagoId(e.target.value);
                    setHojasPagoSel(new Set(
                      rutasPendientePago
                        .filter((h) => String(h.chofer_id ?? h.chofer_nombre) === e.target.value)
                        .map((h) => h.id)
                    ));
                  }}
                  className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">— Seleccionar chofer —</option>
                  {choferesPendientes.map((c) => {
                    const pendiente = rutasPendientePago
                      .filter((h) => String(h.chofer_id ?? h.chofer_nombre) === c.id)
                      .reduce((s, h) => s + (h.monto_cobro_chofer ?? 0), 0);
                    return (
                      <option key={c.id} value={c.id}>
                        {c.nombre} — ${Math.round(pendiente).toLocaleString('es-CL')} pendiente
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Rutas del chofer seleccionado */}
              {choferPagoId && rutasDelChofer.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-slate-300 text-sm">Rutas a liquidar</label>
                    <button
                      onClick={seleccionarTodasRutas}
                      className="text-cyan-400 text-xs hover:underline"
                    >
                      Seleccionar todas
                    </button>
                  </div>
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {rutasDelChofer.map((h) => {
                      const sel = hojasPagoSel.has(h.id);
                      return (
                        <label
                          key={h.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            sel ? 'bg-amber-900/20 border-amber-700' : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={sel}
                            onChange={() => toggleHojaPago(h.id)}
                            className="accent-amber-500 shrink-0"
                          />
                          <div className="flex-1 min-w-0 text-sm">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-white font-medium">
                                {h.vehiculo?.label ?? '—'}
                              </span>
                              <span className="text-slate-400 text-xs">
                                {h.fecha_creacion ? new Date(h.fecha_creacion).toLocaleDateString('es-CL') : ''}
                              </span>
                              <span className={`text-xs border px-1.5 py-0.5 rounded-full ${
                                h.estado === 'COMPLETADA'
                                  ? 'bg-emerald-900/50 text-emerald-400 border-emerald-800'
                                  : 'bg-blue-900/50 text-blue-400 border-blue-800'
                              }`}>
                                {h.estado === 'COMPLETADA' ? 'Completada' : 'En ruta'}
                              </span>
                            </div>
                            <div className="text-slate-400 text-xs mt-0.5">
                              {h.pedidos_entregados}/{h.total_pedidos} entregas · {h.total_kg.toFixed(1)} kg · {h.tipo_cobro_chofer === 'FIJO' ? 'Precio fijo' : 'Por kg'}
                            </div>
                          </div>
                          <div className="text-amber-400 font-bold text-sm shrink-0">
                            ${Math.round(h.monto_cobro_chofer ?? 0).toLocaleString('es-CL')}
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  {/* Total */}
                  <div className="mt-3 bg-slate-800 border border-amber-700/50 rounded-lg px-4 py-3 flex items-center justify-between">
                    <span className="text-slate-300 text-sm">{hojasPagoSel.size} ruta{hojasPagoSel.size !== 1 ? 's' : ''} seleccionada{hojasPagoSel.size !== 1 ? 's' : ''}</span>
                    <span className="text-amber-400 font-bold text-lg">
                      Total: ${Math.round(totalSeleccionado).toLocaleString('es-CL')}
                    </span>
                  </div>
                </div>
              )}

              {choferPagoId && rutasDelChofer.length === 0 && (
                <div className="text-slate-500 text-sm text-center py-4">
                  Sin rutas pendientes de pago para este chofer
                </div>
              )}

              {errorPago && (
                <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-lg px-4 py-2 text-sm">{errorPago}</div>
              )}
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-700">
              <button
                onClick={() => setModalPago(false)}
                className="text-slate-400 hover:text-white px-4 py-2 rounded-lg text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarPago}
                disabled={pagando || hojasPagoSel.size === 0}
                className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-5 py-2 rounded-lg text-sm"
              >
                {pagando ? 'Procesando...' : '💸 Confirmar y generar comprobante'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Crear Hoja de Ruta ── */}
      {modalCrear && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center overflow-y-auto py-8 px-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <h2 className="text-white font-bold text-lg">Nueva Hoja de Ruta</h2>
              <button onClick={() => setModalCrear(false)} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* Vehículo y Chofer */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-300 text-sm block mb-1">Vehículo *</label>
                  <select
                    value={vehiculoId}
                    onChange={(e) => setVehiculoId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">— Seleccionar vehículo —</option>
                    {vehiculos.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.label}{v.capacidad_kg ? ` · ${v.capacidad_kg} kg` : ''}
                      </option>
                    ))}
                  </select>
                  {vehiculoSel?.capacidad_kg && (
                    <p className="text-cyan-400 text-xs mt-1">
                      Capacidad: {vehiculoSel.capacidad_kg.toLocaleString('es-CL')} kg brutos
                    </p>
                  )}
                  {vehiculos.length === 0 && (
                    <p className="text-amber-400 text-xs mt-1">
                      No hay vehículos registrados.{' '}
                      <a href="/admin/vehiculos" className="underline">Agregar</a>
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-slate-300 text-sm block mb-1">Chofer *</label>
                  <select
                    value={choferId}
                    onChange={(e) => setChoferId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">— Seleccionar chofer —</option>
                    {usuarios.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nombre_completo}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-slate-300 text-sm block mb-1">Notas</label>
                  <input
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    placeholder="Opcional"
                    className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm"
                  />
                </div>

                {/* Cobro chofer */}
                <div>
                  <label className="text-slate-300 text-sm block mb-1">Cobro al chofer</label>
                  <select
                    value={tipoCobro}
                    onChange={(e) => setTipoCobro(e.target.value as '' | 'FIJO' | 'POR_KG')}
                    className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">— Sin definir —</option>
                    <option value="FIJO">Precio fijo</option>
                    <option value="POR_KG">Por kilogramo entregado</option>
                  </select>
                </div>

                {tipoCobro && (
                  <div>
                    <label className="text-slate-300 text-sm block mb-1">
                      {tipoCobro === 'FIJO' ? 'Monto fijo ($)' : 'Tarifa por kg ($)'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={tarifaChofer}
                      onChange={(e) => setTarifaChofer(e.target.value)}
                      placeholder={tipoCobro === 'FIJO' ? 'Ej: 15000' : 'Ej: 120'}
                      className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm"
                    />
                    {tipoCobro === 'POR_KG' && (
                      <p className="text-slate-500 text-xs mt-1">
                        El monto final se calculará sobre los kg efectivamente entregados
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Selección de pedidos */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-slate-300 text-sm">Pedidos a incluir *</label>
                  <div className={`text-sm font-semibold ${excedeLimite ? 'text-red-400' : 'text-cyan-400'}`}>
                    {kgSeleccionados.toFixed(1)} kg seleccionados
                    {capacidadNum > 0 && ` / ${capacidadNum} kg`}
                    {excedeLimite && ' ⚠️ EXCEDE CAPACIDAD'}
                  </div>
                </div>

                {pedidosDisponibles.length === 0 ? (
                  <div className="text-slate-500 text-sm text-center py-6 bg-slate-800/50 rounded-lg">
                    No hay pedidos confirmados disponibles para asignar
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {pedidosDisponibles.map((p) => {
                      const sel = pedidosSeleccionados.has(p.id);
                      return (
                        <label
                          key={p.id}
                          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            sel
                              ? 'bg-cyan-900/30 border-cyan-700'
                              : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={sel}
                            onChange={() => togglePedido(p.id)}
                            className="mt-0.5 accent-cyan-500"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-white font-mono text-sm font-semibold">{p.numero_pedido}</span>
                              <span className="text-slate-300 text-sm truncate">{p.cliente_nombre}</span>
                              {!p.es_pagado && (
                                <span className="text-xs bg-amber-900/50 text-amber-400 border border-amber-700 px-1.5 py-0.5 rounded-full">⚠️ No pagado</span>
                              )}
                            </div>
                            {p.direccion && <div className="text-slate-500 text-xs truncate">{p.direccion}</div>}
                          </div>
                          <div className="text-right shrink-0">
                            <div className={`text-sm font-bold ${p.kg_brutos > 0 ? 'text-cyan-400' : 'text-slate-500'}`}>
                              {p.kg_brutos > 0 ? `${p.kg_brutos.toFixed(1)} kg` : 'sin kg'}
                            </div>
                            <div className="text-slate-500 text-xs">
                              ${p.monto_total.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                            </div>
                            {p.costo_delivery > 0 && (
                              <div className="text-emerald-400 text-xs">
                                +${p.costo_delivery.toLocaleString('es-CL', { maximumFractionDigits: 0 })} delivery
                              </div>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {errorCrear && (
                <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-lg px-4 py-2 text-sm">{errorCrear}</div>
              )}
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-700">
              <button
                onClick={() => setModalCrear(false)}
                className="text-slate-400 hover:text-white px-4 py-2 rounded-lg text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleCrear}
                disabled={creando || excedeLimite || pedidosSeleccionados.size === 0 || !vehiculoId || !choferId}
                className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-5 py-2 rounded-lg text-sm"
              >
                {creando ? 'Creando...' : 'Crear Hoja de Ruta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
