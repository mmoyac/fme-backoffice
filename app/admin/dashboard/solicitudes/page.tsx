'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSolicitudes } from '@/lib/api/solicitudes';
import { getLocales, Local } from '@/lib/api/locales';
import { getEstadosEnrolamiento } from '@/lib/api/recepcion';
import { SolicitudTransferencia } from '@/types/solicitud';

interface EstadoMap {
  [id: number]: { id: number; nombre: string; codigo: string };
}
interface LocalMap {
  [id: number]: Local;
}

export default function TablSolicitudesPage() {
  const router = useRouter();
  const [solicitudes, setSolicitudes] = useState<SolicitudTransferencia[]>([]);
  const [localesMap, setLocalesMap] = useState<LocalMap>({});
  const [localesList, setLocalesList] = useState<Local[]>([]);
  const [estadosMap, setEstadosMap] = useState<EstadoMap>({});
  const [loading, setLoading] = useState(true);
  const [filtroLocal, setFiltroLocal] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('activo');

  useEffect(() => {
    cargar();
  }, []);

  const cargar = async () => {
    setLoading(true);
    try {
      const [sols, locales, estados] = await Promise.all([
        getSolicitudes(),
        getLocales(),
        getEstadosEnrolamiento(),
      ]);
      setSolicitudes(sols);
      const lm: LocalMap = {};
      locales.forEach((l) => { lm[l.id] = l; });
      setLocalesMap(lm);
      setLocalesList(locales);
      const em: EstadoMap = {};
      (estados as any[]).forEach((e) => { em[e.id] = e; });
      setEstadosMap(em);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // KPIs
  const pendientes = solicitudes.filter((s) => estadosMap[s.estado_id]?.codigo === 'PENDIENTE');
  const enProceso = solicitudes.filter((s) => estadosMap[s.estado_id]?.codigo === 'EN_PROCESO');
  const finalizadasHoy = solicitudes.filter((s) => {
    if (estadosMap[s.estado_id]?.codigo !== 'FINALIZADO') return false;
    return new Date(s.fecha_actualizacion).toDateString() === new Date().toDateString();
  });
  const totalActivas = pendientes.length + enProceso.length;

  // Filtrar tabla
  let filtradas = solicitudes;
  if (filtroEstado === 'activo') {
    filtradas = filtradas.filter((s) => estadosMap[s.estado_id]?.codigo !== 'FINALIZADO');
  } else if (filtroEstado !== '') {
    filtradas = filtradas.filter((s) => estadosMap[s.estado_id]?.codigo === filtroEstado);
  }
  if (filtroLocal) {
    filtradas = filtradas.filter(
      (s) => s.local_origen_id === Number(filtroLocal) || s.local_destino_id === Number(filtroLocal)
    );
  }

  // Resumen por local (solo activas)
  const activas = solicitudes.filter((s) => estadosMap[s.estado_id]?.codigo !== 'FINALIZADO');
  const resumenPorLocal: Record<number, { nombre: string; pendiente: number; enProceso: number }> = {};
  activas.forEach((s) => {
    const codigoEstado = estadosMap[s.estado_id]?.codigo;
    [s.local_origen_id, s.local_destino_id].forEach((lid) => {
      if (!resumenPorLocal[lid]) {
        resumenPorLocal[lid] = { nombre: localesMap[lid]?.nombre || `Local ${lid}`, pendiente: 0, enProceso: 0 };
      }
    });
    if (codigoEstado === 'PENDIENTE') resumenPorLocal[s.local_origen_id].pendiente++;
    if (codigoEstado === 'EN_PROCESO') resumenPorLocal[s.local_origen_id].enProceso++;
  });
  const resumenLocales = Object.values(resumenPorLocal).filter((r) => r.pendiente + r.enProceso > 0);

  const getEstadoBadge = (codigo: string) => {
    switch (codigo) {
      case 'PENDIENTE': return 'bg-yellow-900 text-yellow-300 border border-yellow-700';
      case 'EN_PROCESO': return 'bg-blue-900 text-blue-300 border border-blue-700';
      case 'FINALIZADO': return 'bg-green-900 text-green-300 border border-green-700';
      default: return 'bg-slate-700 text-gray-300';
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-white text-sm">
          ← Volver
        </button>
        <div>
          <h1 className="text-3xl font-bold text-white">Tablero de Solicitudes</h1>
          <p className="text-gray-400">Vista general de solicitudes de transferencia entre locales</p>
        </div>
        <button
          onClick={() => router.push('/admin/solicitudes')}
          className="ml-auto bg-primary hover:bg-primary-dark text-slate-900 font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
        >
          Gestionar Solicitudes →
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-800 rounded-xl p-5">
          <div className="text-yellow-400 text-2xl mb-2">⏳</div>
          <div className="text-3xl font-bold text-yellow-400">{loading ? '—' : pendientes.length}</div>
          <div className="text-gray-400 text-sm mt-1">Pendientes</div>
        </div>
        <div className="bg-slate-800 rounded-xl p-5">
          <div className="text-blue-400 text-2xl mb-2">🔄</div>
          <div className="text-3xl font-bold text-blue-400">{loading ? '—' : enProceso.length}</div>
          <div className="text-gray-400 text-sm mt-1">En Proceso</div>
        </div>
        <div className="bg-slate-800 rounded-xl p-5">
          <div className="text-green-400 text-2xl mb-2">✅</div>
          <div className="text-3xl font-bold text-green-400">{loading ? '—' : finalizadasHoy.length}</div>
          <div className="text-gray-400 text-sm mt-1">Finalizadas hoy</div>
        </div>
        <div className="bg-slate-800 rounded-xl p-5">
          <div className="text-primary text-2xl mb-2">📋</div>
          <div className="text-3xl font-bold text-white">{loading ? '—' : totalActivas}</div>
          <div className="text-gray-400 text-sm mt-1">Total activas</div>
        </div>
      </div>

      {/* Resumen por local */}
      {!loading && resumenLocales.length > 0 && (
        <div className="bg-slate-800 rounded-xl p-5 mb-6">
          <h2 className="text-white font-semibold mb-4">Actividad por local</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {resumenLocales.map((r, i) => (
              <div key={i} className="bg-slate-700 rounded-lg p-3">
                <div className="text-white text-sm font-medium mb-2 truncate">{r.nombre}</div>
                <div className="flex gap-2">
                  {r.pendiente > 0 && (
                    <span className="text-xs bg-yellow-900 text-yellow-300 border border-yellow-700 px-2 py-0.5 rounded-full">
                      {r.pendiente} pend.
                    </span>
                  )}
                  {r.enProceso > 0 && (
                    <span className="text-xs bg-blue-900 text-blue-300 border border-blue-700 px-2 py-0.5 rounded-full">
                      {r.enProceso} proc.
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="bg-slate-700 text-gray-300 border border-slate-600 rounded-lg px-3 py-2 text-sm"
        >
          <option value="activo">Activas (sin finalizadas)</option>
          <option value="">Todas</option>
          <option value="PENDIENTE">Pendientes</option>
          <option value="EN_PROCESO">En Proceso</option>
          <option value="FINALIZADO">Finalizadas</option>
        </select>
        <select
          value={filtroLocal}
          onChange={(e) => setFiltroLocal(e.target.value)}
          className="bg-slate-700 text-gray-300 border border-slate-600 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Todos los locales</option>
          {localesList.map((l) => (
            <option key={l.id} value={l.id}>{l.nombre}</option>
          ))}
        </select>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : filtradas.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-slate-800 rounded-xl">
          No hay solicitudes con los filtros aplicados
        </div>
      ) : (
        <>
          {/* Mobile: Cards */}
          <div className="lg:hidden space-y-3">
            {filtradas.map((s) => {
              const estado = estadosMap[s.estado_id];
              return (
                <div key={s.solicitud_id} className="bg-slate-800 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="font-mono text-gray-400 text-xs">#{s.solicitud_id}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getEstadoBadge(estado?.codigo)}`}>
                      {estado?.nombre || estado?.codigo}
                    </span>
                  </div>
                  <div className="text-sm text-gray-300">
                    <span className="text-gray-500">De:</span>{' '}
                    {localesMap[s.local_origen_id]?.nombre || `Local ${s.local_origen_id}`}
                    <span className="text-gray-500"> → </span>
                    {localesMap[s.local_destino_id]?.nombre || `Local ${s.local_destino_id}`}
                  </div>
                  <div className="text-xs text-gray-400">
                    {s.items.length} producto{s.items.length !== 1 ? 's' : ''} ·{' '}
                    {new Date(s.fecha_creacion).toLocaleDateString('es-CL')}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop: Tabla */}
          <div className="hidden lg:block overflow-x-auto bg-slate-800 rounded-xl">
            <table className="min-w-full divide-y divide-slate-700">
              <thead className="bg-slate-700">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">ID</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Origen</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Destino</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Productos</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Estado</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filtradas.map((s) => {
                  const estado = estadosMap[s.estado_id];
                  return (
                    <tr key={s.solicitud_id} className="hover:bg-slate-700/50">
                      <td className="px-5 py-3 text-sm font-mono text-gray-400">#{s.solicitud_id}</td>
                      <td className="px-5 py-3 text-sm text-gray-300">
                        {localesMap[s.local_origen_id]?.nombre || `Local ${s.local_origen_id}`}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-300">
                        {localesMap[s.local_destino_id]?.nombre || `Local ${s.local_destino_id}`}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-400">
                        {s.items.length} ítem{s.items.length !== 1 ? 's' : ''}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${getEstadoBadge(estado?.codigo)}`}>
                          {estado?.nombre || estado?.codigo || s.estado_id}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-400">
                        {new Date(s.fecha_creacion).toLocaleDateString('es-CL')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
