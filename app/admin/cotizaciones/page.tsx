'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthProvider';
import DataList, { type Columna } from '@/components/ui/DataList';
import PageHeader from '@/components/ui/PageHeader';

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
  const router = useRouter();
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

  const estadoBadge = (cot: Cotizacion) => (
    <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${ESTADO_COLORS[cot.estado_cotizacion.codigo] ?? 'bg-gray-700 text-gray-300'}`}>
      {cot.estado_cotizacion.nombre}
    </span>
  );

  const vencimiento = (cot: Cotizacion) =>
    cot.fecha_vencimiento ? (
      <span className={`text-sm ${esVencida(cot.fecha_vencimiento) ? 'text-orange-400 font-semibold' : 'text-gray-300'}`}>
        {formatFecha(cot.fecha_vencimiento)}
        {esVencida(cot.fecha_vencimiento) && <span className="ml-1 text-xs">⚠</span>}
      </span>
    ) : (
      <span className="text-gray-600 italic text-sm">Sin vencimiento</span>
    );

  const columnas: Columna<Cotizacion>[] = [
    {
      header: 'Número',
      className: 'w-[17%]',
      sinTruncar: true,
      cell: (cot) => (
        <>
          <span className="text-sm font-mono font-bold text-primary break-all">{cot.numero_cotizacion}</span>
          <p className="text-xs text-gray-500 mt-0.5">{formatFecha(cot.created_at)}</p>
        </>
      ),
    },
    {
      header: 'Cliente',
      className: 'w-[20%]',
      cell: (cot) => (
        <>
          <p className="text-sm font-medium text-white truncate" title={cot.cliente.nombre}>{cot.cliente.nombre}</p>
          {cot.cliente.email && <p className="text-xs text-gray-500 truncate">{cot.cliente.email}</p>}
        </>
      ),
    },
    {
      header: 'Canal',
      className: 'w-[13%]',
      cell: (cot) => <span className="text-sm text-gray-400">{cot.canal_venta?.nombre ?? <span className="italic text-gray-600">—</span>}</span>,
    },
    { header: 'Monto', className: 'w-[12%]', sinTruncar: true, cell: (cot) => <span className="text-sm font-semibold text-white">{formatMonto(cot.monto_total)}</span> },
    { header: 'Vencimiento', className: 'w-[13%]', sinTruncar: true, cell: vencimiento },
    { header: 'Estado', className: 'w-[11%]', sinTruncar: true, cell: estadoBadge },
    {
      header: '',
      className: 'w-[14%] text-right',
      sinTruncar: true,
      cell: (cot) => (
        <Link
          href={`/admin/cotizaciones/${cot.id}`}
          className="text-primary hover:text-primary-dark text-sm font-medium whitespace-nowrap"
          onClick={(e) => e.stopPropagation()}
        >
          Ver detalle →
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cotizaciones"
        subtitle="Gestión de cotizaciones y versiones"
        actions={
          <Link
            href="/admin/cotizaciones/nueva"
            className="bg-primary hover:bg-primary-dark text-slate-900 px-4 py-2 rounded-lg font-semibold transition-colors text-sm text-center"
          >
            + Nueva Cotización
          </Link>
        }
        filtros={
          <>
            <input
              type="text"
              placeholder="Buscar por número o cliente..."
              className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm w-full sm:w-64"
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
          </>
        }
      />

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
        <DataList
          items={cotizacionesFiltradas}
          getKey={(cot) => cot.id}
          columns={columnas}
          onItemClick={(cot) => router.push(`/admin/cotizaciones/${cot.id}`)}
          card={(cot) => (
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-mono font-bold text-primary break-all">{cot.numero_cotizacion}</div>
                  <div className="text-xs text-gray-500">{formatFecha(cot.created_at)}</div>
                </div>
                <div className="shrink-0">{estadoBadge(cot)}</div>
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-white break-words">{cot.cliente.nombre}</div>
                {cot.cliente.email && <div className="text-xs text-gray-500 break-all">{cot.cliente.email}</div>}
                {cot.canal_venta?.nombre && <div className="text-xs text-gray-400">Canal: {cot.canal_venta.nombre}</div>}
              </div>
              <div className="flex items-end justify-between gap-3 pt-2 border-t border-slate-700">
                <div className="text-xs text-gray-400">
                  Vence: {vencimiento(cot)}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-lg font-bold text-white">{formatMonto(cot.monto_total)}</div>
                  <Link
                    href={`/admin/cotizaciones/${cot.id}`}
                    className="text-primary hover:text-primary-dark text-sm font-medium"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Ver detalle →
                  </Link>
                </div>
              </div>
            </div>
          )}
        />
      )}
    </div>
  );
}
