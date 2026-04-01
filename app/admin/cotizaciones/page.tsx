'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthProvider';

interface EstadoCotizacion {
  id: number;
  codigo: string;
  nombre: string;
  color: string;
}

interface Cliente {
  id: number;
  nombre: string;
  email?: string;
}

interface Cotizacion {
  id: number;
  numero_cotizacion: string;
  cliente: Cliente;
  canal_venta?: { id: number; nombre: string };
  estado_cotizacion: EstadoCotizacion;
  fecha_vencimiento?: string;
  monto_total?: number;
  created_at: string;
}

const ESTADO_COLORS: Record<string, string> = {
  'BORRADOR':  'bg-gray-600 text-gray-200',
  'ENVIADA':   'bg-blue-900 text-blue-200',
  'ACEPTADA':  'bg-green-900 text-green-200',
  'RECHAZADA': 'bg-red-900 text-red-200',
  'VENCIDA':   'bg-orange-900 text-orange-200',
};

export default function CotizacionesPage() {
  const { user } = useAuth();
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
      if (filtroEstado) params.set('estado_codigo', filtroEstado);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/cotizaciones/?${params}`, { headers });
      if (!res.ok) throw new Error();
      setCotizaciones(await res.json());
      setError('');
    } catch {
      setError('Error al cargar cotizaciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, [filtroEstado]);

  const cotizacionesFiltradas = cotizaciones.filter(c =>
    !busqueda ||
    c.numero_cotizacion.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.cliente.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const formatFecha = (f?: string) => f
    ? new Date(f).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—';

  const formatMonto = (m?: number) => m != null
    ? `$${m.toLocaleString('es-CL')}`
    : '—';

  const esVencida = (f?: string) => f ? new Date(f) < new Date() : false;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Cotizaciones</h1>
          <p className="text-gray-400 text-sm mt-1">Gestión de cotizaciones y versiones</p>
        </div>
        <Link
          href="/admin/cotizaciones/nueva"
          className="bg-primary hover:bg-primary-dark text-slate-900 px-4 py-2 rounded-lg font-semibold transition-colors text-sm"
        >
          + Nueva Cotización
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Buscar por número o cliente..."
          className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm w-64"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
        <select
          className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm"
          value={filtroEstado}
          onChange={e => setFiltroEstado(e.target.value)}
        >
          <option value="">Todos los estados</option>
          <option value="BORRADOR">Borrador</option>
          <option value="ENVIADA">Enviada</option>
          <option value="ACEPTADA">Aceptada</option>
          <option value="RECHAZADA">Rechazada</option>
          <option value="VENCIDA">Vencida</option>
        </select>
        <button onClick={cargar} className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded text-sm">
          ↺ Actualizar
        </button>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-100 px-4 py-3 rounded text-sm">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando cotizaciones...</div>
      ) : cotizacionesFiltradas.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">No hay cotizaciones</p>
          <p className="text-sm mt-1">Crea la primera cotización con el botón de arriba</p>
        </div>
      ) : (
        <div className="bg-slate-800 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-slate-700">
            <thead className="bg-slate-700">
              <tr>
                {['Número', 'Cliente', 'Canal', 'Monto', 'Vencimiento', 'Estado', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {cotizacionesFiltradas.map(cot => (
                <tr key={cot.id} className="hover:bg-slate-700/50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-sm font-mono font-bold text-primary">{cot.numero_cotizacion}</span>
                    <p className="text-xs text-gray-500 mt-0.5">{formatFecha(cot.created_at)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-white">{cot.cliente.nombre}</p>
                    {cot.cliente.email && <p className="text-xs text-gray-500">{cot.cliente.email}</p>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">
                    {cot.canal_venta?.nombre ?? <span className="italic text-gray-600">—</span>}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-white">
                    {formatMonto(cot.monto_total)}
                  </td>
                  <td className="px-4 py-3">
                    {cot.fecha_vencimiento ? (
                      <span className={`text-sm ${esVencida(cot.fecha_vencimiento) ? 'text-orange-400 font-semibold' : 'text-gray-300'}`}>
                        {formatFecha(cot.fecha_vencimiento)}
                        {esVencida(cot.fecha_vencimiento) && <span className="ml-1 text-xs">⚠</span>}
                      </span>
                    ) : (
                      <span className="text-gray-600 italic text-sm">Sin vencimiento</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${ESTADO_COLORS[cot.estado_cotizacion.codigo] ?? 'bg-gray-700 text-gray-300'}`}>
                      {cot.estado_cotizacion.nombre}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/cotizaciones/${cot.id}`}
                      className="text-primary hover:text-primary-dark text-sm font-medium"
                    >
                      Ver detalle →
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
