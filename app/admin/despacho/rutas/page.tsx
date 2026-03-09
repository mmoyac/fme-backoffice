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
      });
      setModalCrear(false);
      setVehiculoId(''); setChoferId(''); setNotas('');
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
        <button
          onClick={() => setModalCrear(true)}
          className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold px-4 py-2 rounded-lg text-sm"
        >
          + Nueva Hoja de Ruta
        </button>
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
