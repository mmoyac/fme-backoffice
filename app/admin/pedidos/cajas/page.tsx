'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AuthService } from '@/lib/auth';
import {
  listarPreventas,
  cancelarPreventa,
  eliminarItemPreventa,
  getPdfUrl,
  getFrigorificoPdfUrl,
  type PreventaOut,
  type ItemPreventaOut,
} from '@/lib/api/preventa';
import { listarPedidos, type Pedido } from '@/lib/api/pedidos';

function formatFecha(iso: string) {
  return new Date(iso).toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function proveedoresEnPreventa(preventas: PreventaOut[]) {
  const map = new Map<number, { id: number; nombre: string }>();
  for (const p of preventas) {
    for (const item of p.items) {
      if (item.proveedor_id && !map.has(item.proveedor_id)) {
        map.set(item.proveedor_id, { id: item.proveedor_id, nombre: item.proveedor_nombre || 'Proveedor' });
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
}

function cajasPorProveedor(preventas: PreventaOut[]) {
  const map = new Map<number, { nombre: string; cajas: number }>();
  for (const p of preventas) {
    for (const item of p.items) {
      if (!item.proveedor_id) continue;
      const cur = map.get(item.proveedor_id);
      if (cur) { cur.cajas += item.cantidad; }
      else { map.set(item.proveedor_id, { nombre: item.proveedor_nombre || '?', cajas: item.cantidad }); }
    }
  }
  return map;
}

export default function ListadoPreventasPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const successMsg = searchParams.get('success');
  const todayStr = new Date().toISOString().split('T')[0];
  const [fecha, setFecha] = useState(todayStr);
  const [preventas, setPreventas] = useState<PreventaOut[]>([]);
  const [historico, setHistorico] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelando, setCancelando] = useState<number | null>(null);
  const [eliminandoItem, setEliminandoItem] = useState<number | null>(null);
  const [expandido, setExpandido] = useState<number | null>(null);
  const [expandidoHistorico, setExpandidoHistorico] = useState<number | null>(null);
  const [esAdmin, setEsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [data, confirmados] = await Promise.all([
        listarPreventas(fecha),
        listarPedidos('CONFIRMADO', fecha, 2),
      ]);
      setPreventas(data);
      setHistorico(confirmados);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [fecha]);

  useEffect(() => {
    if (!AuthService.isAuthenticated()) { router.push('/login'); return; }
    AuthService.getCurrentUser().then((u) => {
      setEsAdmin(u.role?.nombre?.toLowerCase() === 'admin');
      setCurrentUserId(u.id ?? null);
    }).catch(() => {});
    cargar();
  }, [cargar]);

  const handleCancelar = async (id: number) => {
    if (!confirm('Cancelar esta pre-venta?')) return;
    setCancelando(id);
    try {
      await cancelarPreventa(id);
      cargar();
    } catch (e: any) { alert(e.message); }
    finally { setCancelando(null); }
  };

  const handleEliminarItem = async (itemId: number, pedidoId: number) => {
    const pedido = preventas.find(p => p.id === pedidoId);
    const esUltimo = pedido ? pedido.items.length === 1 : false;
    const msg = esUltimo
      ? '¿Eliminar el único corte? Esto cancelará la pre-venta completa.'
      : '¿Eliminar este corte del pedido y liberar su stock?';
    if (!confirm(msg)) return;
    setEliminandoItem(itemId);
    try {
      await eliminarItemPreventa(itemId);
      cargar();
    } catch (e: any) { alert(e.message); }
    finally { setEliminandoItem(null); }
  };

  const abrirPdf = (proveedorId?: number) => {
    const url = proveedorId ? getPdfUrl(fecha, proveedorId) : getFrigorificoPdfUrl(fecha);
    window.open(url, '_blank');
  };

  const proveedores = proveedoresEnPreventa(preventas);
  const cajasMap = cajasPorProveedor(preventas);
  const totalCajas = Array.from(cajasMap.values()).reduce((s, v) => s + v.cajas, 0);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Pre-Ventas de Cajas</h1>
          <p className="text-slate-400 text-sm">Pedidos al frigorifico por corte y proveedor</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm"
          />
          <Link
            href="/admin/pedidos/cajas/nueva"
            className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
          >
            + Nueva Pre-Venta
          </Link>

        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-900/40 border border-emerald-700 text-emerald-300 rounded-lg px-4 py-3 mb-4">
          Pre-venta {successMsg} creada correctamente
        </div>
      )}
      {error && (
        <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-lg px-4 py-3 mb-4">{error}</div>
      )}

      {preventas.length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-semibold">
              {preventas.length} pedidos &mdash; {totalCajas} cajas totales
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {proveedores.map((prov) => {
              const info = cajasMap.get(prov.id);
              return (
                <div key={prov.id} className="bg-slate-700/50 rounded-lg p-3">
                  <div className="text-white text-sm font-medium truncate">{prov.nombre}</div>
                  <div className="text-cyan-400 font-bold text-2xl my-1">{info?.cajas ?? 0}</div>
                  <div className="text-slate-400 text-xs mb-2">cajas</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-400" />
        </div>
      ) : preventas.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <div className="text-4xl mb-3">📋</div>
          <div>No hay pre-ventas para el {fecha}</div>
          <Link href="/admin/pedidos/cajas/nueva" className="inline-block mt-4 text-cyan-400 text-sm">
            Crear primera pre-venta
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {preventas.map((p) => {
            const totalCaj = p.items.reduce((s, i) => s + i.cantidad, 0);
            const totalAsig = p.items.reduce((s, i) => s + i.asignaciones_count, 0);
            const pct = totalCaj > 0 ? Math.round((totalAsig / totalCaj) * 100) : 0;
            const isExpanded = expandido === p.id;
            return (
              <div key={p.id} className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandido(isExpanded ? null : p.id)}
                  className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-slate-700/40"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-white font-mono font-bold">{p.numero_pedido}</span>
                      <span className="text-slate-300 text-sm">{p.cliente_nombre}</span>
                      <span className="text-slate-500 text-xs">{formatFecha(p.fecha_pedido)}</span>
                      {esAdmin && p.vendedor_nombre && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-violet-900/40 border border-violet-700 text-violet-300">
                          👤 {p.vendedor_nombre}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {p.items.map((i) => (
                        <span key={i.id} className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">
                          {i.cantidad}x {i.producto_nombre}{i.proveedor_nombre ? ` (${i.proveedor_nombre})` : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs text-slate-400">{totalAsig}/{totalCaj}</span>
                    {p.monto_total > 0 && (
                      <span className="text-sm font-semibold text-emerald-400">
                        ${p.monto_total.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                      </span>
                    )}
                    <div className="w-20 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={pct === 100 ? 'h-full bg-emerald-500 rounded-full' : 'h-full bg-cyan-500 rounded-full'}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-slate-500 text-sm ml-2">{isExpanded ? '▲' : '▼'}</span>
                </button>
                {isExpanded && (
                  <div className="border-t border-slate-700 px-5 py-4">
                    <table className="w-full text-sm mb-3">
                      <thead>
                        <tr className="text-slate-400 text-xs border-b border-slate-700">
                          <th className="text-left py-1">Corte</th>
                          <th className="text-left py-1">Proveedor</th>
                          <th className="text-right py-1">Pedidas</th>
                          <th className="text-right py-1">Asignadas</th>
                          <th className="text-right py-1">Monto</th>
                          <th className="py-1" />
                        </tr>
                      </thead>
                      <tbody>
                        {p.items.map((item) => {
                          const monto = item.asignaciones.reduce((s, a) => s + a.monto_real, 0);
                          return (
                            <tr key={item.id} className="border-b border-slate-700/40">
                              <td className="py-2 text-white">{item.producto_nombre}</td>
                              <td className="py-2 text-slate-300">{item.proveedor_nombre || '—'}</td>
                              <td className="py-2 text-right text-slate-300">{item.cantidad}</td>
                              <td className="py-2 text-right">
                                <span className={item.asignaciones_count >= item.cantidad ? 'text-emerald-400' : 'text-yellow-400'}>
                                  {item.asignaciones_count}
                                </span>
                              </td>
                              <td className="py-2 text-right text-slate-300">
                                {monto > 0 ? `$${monto.toLocaleString('es-CL', { maximumFractionDigits: 0 })}` : '—'}
                              </td>
                              <td className="py-2 pl-3">
                                <button
                                  onClick={() => handleEliminarItem(item.id, p.id)}
                                  disabled={eliminandoItem === item.id}
                                  className="text-xs text-red-400 hover:text-red-300 disabled:opacity-40 px-1.5 py-0.5 rounded border border-red-900 hover:border-red-700 transition-colors"
                                  title={p.items.length === 1 ? 'Eliminar corte (cancela la pre-venta)' : 'Eliminar este corte y liberar stock'}
                                >
                                  {eliminandoItem === item.id ? '...' : '×'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {p.notas && <div className="text-xs text-slate-400 mb-3">Notas: {p.notas}</div>}
                    <button
                      onClick={() => handleCancelar(p.id)}
                      disabled={cancelando === p.id}
                      className="text-xs text-red-400 border border-red-800 px-3 py-1 rounded-lg disabled:opacity-50"
                    >
                      {cancelando === p.id ? 'Cancelando...' : 'Cancelar Preventa'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Historial de pedidos confirmados del día ── */}
      {(() => {
        const historicoFiltrado = esAdmin ? historico : historico.filter(p => p.usuario_id === currentUserId);
        return historicoFiltrado.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-white font-semibold text-lg">Historial confirmados</h2>
            <span className="text-xs bg-emerald-900/50 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full">
              {historicoFiltrado.length} pedido{historicoFiltrado.length !== 1 ? 's' : ''}
            </span>
            <span className="text-xs text-slate-500">Solo lectura</span>
          </div>
          <div className="space-y-2">
            {historicoFiltrado.map((p) => {
              const isExp = expandidoHistorico === p.id;
              const totalCaj = p.items?.reduce((s, i) => s + i.cantidad, 0) ?? 0;
              const totalKg = p.items?.reduce((s, i) => s + (i.peso_total_kg ?? 0), 0) ?? 0;
              return (
                <div key={p.id} className="bg-slate-800/60 border border-emerald-900/50 rounded-xl overflow-hidden opacity-90">
                  <button
                    onClick={() => setExpandidoHistorico(isExp ? null : p.id)}
                    className="w-full text-left px-5 py-3.5 flex items-center gap-4 hover:bg-slate-700/30"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-white font-mono font-semibold">{p.numero_pedido}</span>
                        <span className="text-slate-300 text-sm">{p.cliente?.nombre || ''}</span>
                        {esAdmin && p.usuario_nombre && (
                          <span className="text-xs bg-slate-700 text-cyan-400 border border-slate-600 px-2 py-0.5 rounded-full">
                            {p.usuario_nombre}
                          </span>
                        )}
                        <span className="text-slate-500 text-xs">{formatFecha(p.fecha_pedido)}</span>
                        <span className="text-xs bg-emerald-900/60 text-emerald-400 border border-emerald-800 px-1.5 py-0.5 rounded">
                          ✓ CONFIRMADO
                        </span>
                      </div>
                      {p.items && p.items.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {p.items.map((i) => (
                            <span key={i.id} className="text-xs bg-slate-700/60 text-slate-400 px-2 py-0.5 rounded-full">
                              {i.cantidad}x {i.producto?.nombre ?? i.producto_nombre ?? `Producto #${i.producto_id}`}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs text-slate-500">{totalCaj} caja{totalCaj !== 1 ? 's' : ''}</span>
                      {totalKg > 0 && (
                        <span className="text-xs text-cyan-400 font-medium">
                          {totalKg.toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 3 })} kg
                        </span>
                      )}
                      {(p.total ?? 0) > 0 && (
                        <span className="text-sm font-semibold text-emerald-500">
                          ${(p.total ?? 0).toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                        </span>
                      )}
                    </div>
                    <span className="text-slate-600 text-sm ml-2">{isExp ? '▲' : '▼'}</span>
                  </button>
                  {isExp && (
                    <div className="border-t border-slate-700/50 px-5 py-4">
                      <table className="w-full text-sm mb-3">
                        <thead>
                          <tr className="text-slate-500 text-xs border-b border-slate-700/50">
                            <th className="text-left py-1">Corte</th>
                            <th className="text-right py-1">Cajas</th>
                            <th className="text-right py-1">Kg total</th>
                            <th className="text-right py-1">Precio unit.</th>
                            <th className="text-right py-1">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(p.items ?? []).map((item) => {
                            const subtotal = item.cantidad * item.precio_unitario_venta;
                            return (
                              <tr key={item.id} className="border-b border-slate-700/30">
                                <td className="py-2 text-slate-300">{item.producto?.nombre ?? item.producto_nombre ?? `Prod #${item.producto_id}`}</td>
                                <td className="py-2 text-right text-slate-300">{item.cantidad}</td>
                                <td className="py-2 text-right text-cyan-400 font-medium">
                                  {item.peso_total_kg != null ? `${item.peso_total_kg.toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 3 })} kg` : '—'}
                                </td>
                                <td className="py-2 text-right text-slate-400">
                                  {item.precio_unitario_venta > 0 ? `$${item.precio_unitario_venta.toLocaleString('es-CL', { maximumFractionDigits: 0 })}` : '—'}
                                </td>
                                <td className="py-2 text-right text-slate-300">
                                  {subtotal > 0 ? `$${subtotal.toLocaleString('es-CL', { maximumFractionDigits: 0 })}` : '—'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {p.notas && <div className="text-xs text-slate-500">Notas: {p.notas}</div>}
                      <div className="mt-3 text-xs text-slate-600 italic">Pedido confirmado — sin acciones disponibles</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
      })()}
    </div>
  );
}
