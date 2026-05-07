'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { misHojas, type HojaRuta } from '@/lib/api/hojas_ruta';

const ESTADO_CONFIG: Record<string, { label: string; cls: string; dot: string }> = {
  PENDIENTE: {
    label: 'Pendiente',
    cls: 'bg-yellow-900/40 text-yellow-300 border-yellow-700',
    dot: 'bg-yellow-400',
  },
  EN_RUTA: {
    label: 'En Ruta',
    cls: 'bg-blue-900/40 text-blue-300 border-blue-700',
    dot: 'bg-blue-400',
  },
  COMPLETADA: {
    label: 'Completada',
    cls: 'bg-emerald-900/40 text-emerald-300 border-emerald-700',
    dot: 'bg-emerald-400',
  },
};

function formatCLP(n: number) {
  return n.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
}

export default function DespachadorHomePage() {
  const [hojas, setHojas] = useState<HojaRuta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await misHojas();
      setHojas(data);
    } catch (e: any) {
      setError(e.message || 'Error al cargar hojas de ruta');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const totalPendiente = hojas.reduce((acc, h) => acc + (h.monto_cobro_chofer ?? 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 text-red-300 text-sm">
        {error}
        <button onClick={cargar} className="block mt-2 text-amber-400 underline text-xs">Reintentar</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Resumen pago pendiente al despachador */}
      {totalPendiente > 0 && (
        <div className="bg-amber-900/30 border border-amber-700 rounded-xl p-4">
          <p className="text-xs text-amber-400 font-semibold uppercase tracking-wide mb-1">
            Pago pendiente por rutas
          </p>
          <p className="text-2xl font-bold text-amber-300">{formatCLP(totalPendiente)}</p>
          <p className="text-xs text-amber-500 mt-1">Total que tienes pendiente de cobrar por tus rutas</p>
        </div>
      )}

      {/* Lista de hojas */}
      {hojas.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="font-medium">Sin rutas asignadas</p>
          <p className="text-sm mt-1">No tienes hojas de ruta pendientes</p>
        </div>
      ) : (
        hojas.map(hoja => {
          const cfg = ESTADO_CONFIG[hoja.estado] ?? ESTADO_CONFIG.PENDIENTE;
          const pendientes = hoja.total_pedidos - hoja.pedidos_entregados;

          const montoPendiente = hoja.monto_cobro_chofer ?? 0;

          return (
            <Link
              key={hoja.id}
              href={`/despachador/${hoja.id}`}
              className="block bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-amber-600 active:scale-[0.98] transition-all"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Hoja #{hoja.id}</p>
                  <p className="font-semibold text-white">{hoja.vehiculo?.label ?? hoja.patente ?? 'Sin vehículo'}</p>
                </div>
                <span className={`shrink-0 flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.cls}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                  {cfg.label}
                </span>
              </div>

              {/* Progreso entregas */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>{hoja.pedidos_entregados} de {hoja.total_pedidos} entregados</span>
                  <span className="text-slate-500">{pendientes} pendiente{pendientes !== 1 ? 's' : ''}</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: hoja.total_pedidos > 0 ? `${(hoja.pedidos_entregados / hoja.total_pedidos) * 100}%` : '0%' }}
                  />
                </div>
              </div>

              {/* Pago pendiente al despachador */}
              {montoPendiente > 0 && (
                <div className="bg-amber-900/20 border border-amber-800/50 rounded-lg px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-amber-400">
                      {hoja.estado === 'COMPLETADA' ? 'Pago pendiente por ruta' : 'Pago acordado por ruta'}
                    </span>
                    <span className="text-sm font-bold text-amber-300">{formatCLP(montoPendiente)}</span>
                  </div>
                </div>
              )}

              {/* Fecha salida */}
              {hoja.fecha_salida && (
                <p className="text-xs text-slate-500 mt-2">
                  Salida: {new Date(hoja.fecha_salida).toLocaleString('es-CL', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                </p>
              )}
            </Link>
          );
        })
      )}
    </div>
  );
}
