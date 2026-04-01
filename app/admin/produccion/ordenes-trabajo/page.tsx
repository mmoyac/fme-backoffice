'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthProvider';

interface TipoOT { id: number; codigo: string; nombre: string; }
interface EstadoOT { id: number; codigo: string; nombre: string; color: string; }
interface OtEtapa { id: number; nombre: string; color?: string; }
interface Local { id: number; nombre: string; }

interface OT {
  id: number;
  numero_ot: string;
  tipo_ot: TipoOT;
  estado_ot: EstadoOT;
  etapa_actual?: OtEtapa;
  local: Local;
  pedido_id?: number;
  cotizacion_id?: number;
  fecha_programada?: string;
  fecha_cierre?: string;
  created_at: string;
}

const ESTADO_COLORS: Record<string, string> = {
  PENDIENTE:   'bg-gray-600 text-gray-200',
  EN_PROCESO:  'bg-blue-900 text-blue-200',
  TERMINADA:   'bg-yellow-900 text-yellow-200',
  CERRADA:     'bg-green-900 text-green-200',
  CANCELADA:   'bg-red-900 text-red-200',
};

export default function OrdenesTrabajoPage() {
  const { user } = useAuth();
  const [ots, setOts] = useState<OT[]>([]);
  const [tipos, setTipos] = useState<TipoOT[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [busqueda, setBusqueda] = useState('');

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${user?.access_token}`,
  };

  const cargar = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtroTipo) params.set('tipo_ot_id', filtroTipo);
      if (filtroEstado) params.set('estado_codigo', filtroEstado);

      const [otsRes, tiposRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ordenes-trabajo/?${params}`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ordenes-trabajo/tipos`, { headers }),
      ]);
      if (!otsRes.ok) throw new Error();
      setOts(await otsRes.json());
      if (tiposRes.ok) setTipos(await tiposRes.json());
      setError('');
    } catch {
      setError('Error al cargar órdenes de trabajo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, [filtroTipo, filtroEstado]);

  const otsFiltradas = ots.filter(o =>
    !busqueda ||
    o.numero_ot.toLowerCase().includes(busqueda.toLowerCase()) ||
    o.tipo_ot.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const fmt = (d?: string) => d
    ? new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Órdenes de Trabajo</h1>
          <p className="text-gray-400 text-sm mt-1">Producción y servicios con seguimiento por etapas</p>
        </div>
        <Link
          href="/admin/produccion/ordenes-trabajo/nueva"
          className="bg-primary hover:bg-primary-dark text-slate-900 px-4 py-2 rounded-lg font-semibold transition-colors text-sm"
        >
          + Nueva OT
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Buscar por número..."
          className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm w-56"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
        <select
          className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm"
          value={filtroTipo}
          onChange={e => setFiltroTipo(e.target.value)}
        >
          <option value="">Todos los tipos</option>
          {tipos.map(t => (
            <option key={t.id} value={t.id}>{t.nombre}</option>
          ))}
        </select>
        <select
          className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm"
          value={filtroEstado}
          onChange={e => setFiltroEstado(e.target.value)}
        >
          <option value="">Todos los estados</option>
          <option value="PENDIENTE">Pendiente</option>
          <option value="EN_PROCESO">En proceso</option>
          <option value="TERMINADA">Terminada</option>
          <option value="CERRADA">Cerrada</option>
          <option value="CANCELADA">Cancelada</option>
        </select>
        <button onClick={cargar} className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded text-sm">
          ↺ Actualizar
        </button>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-100 px-4 py-3 rounded text-sm">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando órdenes de trabajo...</div>
      ) : otsFiltradas.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">No hay órdenes de trabajo</p>
          <p className="text-sm mt-1">Crea la primera OT con el botón de arriba</p>
        </div>
      ) : (
        <div className="bg-slate-800 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-slate-700">
            <thead className="bg-slate-700">
              <tr>
                {['Número', 'Tipo', 'Local', 'Etapa actual', 'Prog.', 'Estado', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {otsFiltradas.map(ot => (
                <tr key={ot.id} className="hover:bg-slate-700/50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-sm font-mono font-bold text-primary">{ot.numero_ot}</span>
                    <p className="text-xs text-gray-500 mt-0.5">{fmt(ot.created_at)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono bg-slate-700 text-gray-300 px-2 py-0.5 rounded">
                      {ot.tipo_ot.codigo}
                    </span>
                    <p className="text-xs text-gray-400 mt-0.5">{ot.tipo_ot.nombre}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-300">{ot.local.nombre}</td>
                  <td className="px-4 py-3">
                    {ot.etapa_actual ? (
                      <span
                        className="text-xs px-2 py-1 rounded-full font-medium"
                        style={{ backgroundColor: ot.etapa_actual.color ? `${ot.etapa_actual.color}33` : undefined, color: ot.etapa_actual.color || undefined }}
                      >
                        {ot.etapa_actual.nombre}
                      </span>
                    ) : (
                      <span className="text-gray-600 italic text-xs">Sin etapa</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">{fmt(ot.fecha_programada)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${ESTADO_COLORS[ot.estado_ot.codigo] ?? 'bg-gray-700 text-gray-300'}`}>
                      {ot.estado_ot.nombre}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/produccion/ordenes-trabajo/${ot.id}`}
                      className="text-primary hover:text-primary-dark text-sm font-medium"
                    >
                      Ver →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
