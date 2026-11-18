'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { listarPedidos, Pedido } from '@/lib/api/pedidos';
import DataList, { type Columna } from '@/components/ui/DataList';
import PageHeader from '@/components/ui/PageHeader';

export default function PedidosPage() {
  const router = useRouter();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Filtro inicial desde la URL (?estado=CONFIRMADO), usado por la tarjeta "Por entregar" del dashboard
  const [filtroEstado, setFiltroEstado] = useState<string>(() =>
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('estado') || '' : ''
  );
  // Entrega (add-modalidad-entrega-pedido)
  const [filtroModalidad, setFiltroModalidad] = useState<'' | 'RETIRO' | 'DESPACHO'>('');
  const [filtroEntregado, setFiltroEntregado] = useState<'' | 'si' | 'no'>('');
  // Pago (add-pasarelas-pago). Desde la URL: ?pagado=si (tarjeta "Pagados sin confirmar" del dashboard)
  const [filtroPagado, setFiltroPagado] = useState<'' | 'si' | 'no'>(() => {
    const v = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('pagado') : null;
    return v === 'si' || v === 'no' ? v : '';
  });

  const estados = [
    { value: '', label: 'Todos' },
    { value: 'PENDIENTE', label: 'Pendiente', color: 'bg-yellow-500' },
    { value: 'CONFIRMADO', label: 'Confirmado', color: 'bg-blue-500' },
    { value: 'EN_PREPARACION', label: 'En Preparación', color: 'bg-purple-500' },
    { value: 'EN_RUTA', label: 'En Ruta', color: 'bg-indigo-500' },
    { value: 'ENTREGADO', label: 'Entregado', color: 'bg-green-500' },
    { value: 'CANCELADO', label: 'Cancelado', color: 'bg-red-500' },
  ];

  const cargarPedidos = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await listarPedidos(filtroEstado || undefined, undefined, undefined, {
        modalidad_entrega: filtroModalidad || undefined,
        entregado: filtroEntregado === '' ? undefined : filtroEntregado === 'si',
        pagado: filtroPagado === '' ? undefined : filtroPagado === 'si',
      });
      setPedidos(data);
    } catch (err) {
      setError('Error al cargar los pedidos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarPedidos();
  }, [filtroEstado, filtroModalidad, filtroEntregado, filtroPagado]);

  const getEstadoBadge = (estado: string) => {
    const estadoObj = estados.find(e => e.value === estado);
    return (
      <span className={`${estadoObj?.color || 'bg-gray-500'} text-white px-3 py-1 rounded-full text-xs font-semibold`}>
        {estadoObj?.label || estado}
      </span>
    );
  };

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const totalDe = (p: Pedido) => p.total + (p.costo_delivery || 0);
  const pesos = (n: number) => `$${n.toLocaleString('es-CL')}`;

  const entrega = (p: Pedido) => (
    <>
      <div className="text-white">{p.modalidad_entrega === 'DESPACHO' ? '🚚 Despacho' : '🏪 Retiro'}</div>
      {p.fecha_entrega ? (
        <div className="text-xs text-green-400 truncate" title={p.retirado_por_nombre ? `Retiró: ${p.retirado_por_nombre}` : undefined}>
          Entregado {formatFecha(p.fecha_entrega)}
          {p.entregado_por_nombre && <span className="text-gray-400"> · {p.entregado_por_nombre}</span>}
        </div>
      ) : p.estado === 'ENTREGADO' ? (
        <div className="text-xs text-green-400">Entregado</div>
      ) : p.estado !== 'CANCELADO' ? (
        <div className="text-xs text-amber-400">Pendiente de entrega</div>
      ) : null}
    </>
  );

  const chipsVenta = (p: Pedido) => (
    <div className="flex flex-wrap gap-1">
      {p.tipo_documento_codigo === 'FAC' ? (
        <span className="bg-purple-600 text-white px-2 py-0.5 rounded-full text-xs font-semibold">Factura</span>
      ) : (
        <span className="bg-green-600 text-white px-2 py-0.5 rounded-full text-xs font-semibold">Boleta</span>
      )}
      {p.tipo_pedido_codigo === 'CAJAS_VARIABLES' ? (
        <span className="bg-orange-600 text-white px-2 py-0.5 rounded-full text-xs font-semibold">📦 Cajas</span>
      ) : (
        <span className="bg-blue-600 text-white px-2 py-0.5 rounded-full text-xs font-semibold">📦 Productos</span>
      )}
      {p.permite_cheque && (
        <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-xs font-semibold">💰 CHEQUE</span>
      )}
    </div>
  );

  const pago = (p: Pedido) =>
    p.pagado ? (
      <span className="text-green-500 font-semibold text-xs">✓ Pagado</span>
    ) : (
      <span className="text-yellow-500 font-semibold text-xs">⏳ Pago pendiente</span>
    );

  const puntos = (p: Pedido) => (
    <>
      {p.puntos_ganados ? (
        <span className="text-green-400 text-xs">
          +{p.puntos_ganados} pts{' '}
          {p.estado === 'CONFIRMADO' || p.estado === 'EN_PREPARACION' || p.estado === 'ENTREGADO' ? '✓ otorgados' : '⏳ pendientes'}
        </span>
      ) : null}
      {p.puntos_usados && p.puntos_usados > 0 ? (
        <span className="text-yellow-400 text-xs ml-1">-{p.puntos_usados} usados</span>
      ) : null}
    </>
  );

  // Escritorio: 13 columnas agrupadas en 8 para que la tabla de ancho fijo quepa sin scroll
  const columnas: Columna<Pedido>[] = [
    {
      header: 'Pedido',
      className: 'w-[16%]',
      sinTruncar: true,
      cell: (p) => (
        <>
          <div className="font-mono text-primary font-semibold text-xs break-all">#{p.numero_pedido}</div>
          <div className="text-xs text-gray-400">{formatFecha(p.fecha_pedido)}</div>
        </>
      ),
    },
    {
      header: 'Cliente',
      className: 'w-[15%]',
      cell: (p) => (
        <>
          <div className="text-white font-medium truncate" title={p.cliente?.nombre}>
            {p.cliente?.nombre}
          </div>
          <div className="text-xs text-gray-400 truncate">{p.cliente?.email || p.cliente?.telefono}</div>
        </>
      ),
    },
    {
      header: 'Estado',
      className: 'w-[11%]',
      sinTruncar: true,
      cell: (p) => (
        <div className="space-y-1">
          {getEstadoBadge(p.estado)}
          <div>{pago(p)}</div>
        </div>
      ),
    },
    { header: 'Entrega', className: 'w-[13%]', cell: entrega },
    {
      header: 'Venta',
      className: 'w-[16%]',
      sinTruncar: true,
      cell: (p) => (
        <div className="space-y-1 min-w-0">
          {chipsVenta(p)}
          <div className="text-xs text-gray-300 truncate">{p.medio_pago_nombre || 'Medio de pago no definido'}</div>
        </div>
      ),
    },
    {
      header: 'Total',
      className: 'w-[11%]',
      sinTruncar: true,
      cell: (p) => (
        <>
          <div className="text-white font-semibold">{pesos(totalDe(p))}</div>
          {p.costo_delivery ? <div className="text-xs text-gray-400">incl. {pesos(p.costo_delivery)} delivery</div> : null}
          <div>{puntos(p)}</div>
        </>
      ),
    },
    {
      header: 'Creado por',
      className: 'w-[10%]',
      cell: (p) =>
        p.usuario_nombre || p.usuario_email ? (
          <span className="text-gray-300" title={p.usuario_email || undefined}>
            {p.usuario_nombre || p.usuario_email}
          </span>
        ) : p.canal_venta_codigo === 'LANDING' ? (
          <span className="text-cyan-300" title="Pedido hecho por el cliente en la tienda online">🛒 Tienda online</span>
        ) : p.canal_venta_nombre ? (
          <span className="text-gray-400">{p.canal_venta_nombre}</span>
        ) : (
          <span className="text-gray-500 italic">Sin registro</span>
        ),
    },
    {
      header: '',
      className: 'w-[8%] text-right',
      sinTruncar: true,
      cell: (p) => (
        <Link
          href={`/admin/pedidos/${p.id}`}
          className="text-primary hover:underline font-medium"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="whitespace-nowrap">Ver →</span>
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Pedidos" subtitle="Gestión de pedidos regulares y cajas variables" />

      {/* Filtros */}
      <div className="bg-slate-800 rounded-lg p-4 -mt-2">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-gray-400 font-semibold w-full sm:w-auto">Filtrar por estado:</span>
          {estados.map((estado) => (
            <button
              key={estado.value}
              onClick={() => setFiltroEstado(estado.value)}
              className={`px-3 sm:px-4 py-2 rounded-lg transition-all text-sm sm:text-base ${
                filtroEstado === estado.value ? 'bg-primary text-white' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
              }`}
            >
              {estado.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:items-center mt-3">
          <span className="text-gray-400 font-semibold">Entrega:</span>
          <select
            value={filtroModalidad}
            onChange={(e) => setFiltroModalidad(e.target.value as '' | 'RETIRO' | 'DESPACHO')}
            className="bg-slate-700 text-white rounded-lg px-3 py-2"
          >
            <option value="">Retiro y despacho</option>
            <option value="RETIRO">🏪 Retiro en local</option>
            <option value="DESPACHO">🚚 Despacho</option>
          </select>
          <select
            value={filtroEntregado}
            onChange={(e) => setFiltroEntregado(e.target.value as '' | 'si' | 'no')}
            className="bg-slate-700 text-white rounded-lg px-3 py-2"
          >
            <option value="">Entregados y pendientes</option>
            <option value="no">Pendientes de entrega</option>
            <option value="si">Entregados</option>
          </select>
          <select
            value={filtroPagado}
            onChange={(e) => setFiltroPagado(e.target.value as '' | 'si' | 'no')}
            className="bg-slate-700 text-white rounded-lg px-3 py-2"
          >
            <option value="">Pagados y por pagar</option>
            <option value="si">Pagados</option>
            <option value="no">Por pagar</option>
          </select>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-sm text-gray-400">Total Pedidos</p>
          <p className="text-2xl font-bold text-white">{pedidos.length}</p>
        </div>
        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-sm text-gray-400">Pendientes</p>
          <p className="text-2xl font-bold text-yellow-500">{pedidos.filter((p) => p.estado === 'PENDIENTE').length}</p>
        </div>
        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-sm text-gray-400">En Preparación</p>
          <p className="text-2xl font-bold text-purple-500">{pedidos.filter((p) => p.estado === 'EN_PREPARACION').length}</p>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 min-w-0">
          <p className="text-sm text-gray-400">Total Ventas</p>
          <p className="text-xl md:text-2xl font-bold text-green-500 break-all">
            {pesos(pedidos.reduce((sum, p) => sum + totalDe(p), 0))}
          </p>
        </div>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg">{error}</div>}

      <DataList
        items={pedidos}
        loading={loading}
        getKey={(p) => p.id}
        columns={columnas}
        onItemClick={(p) => router.push(`/admin/pedidos/${p.id}`)}
        empty="No hay pedidos para mostrar"
        card={(p) => (
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-mono text-primary font-semibold">#{p.numero_pedido}</div>
                <div className="text-xs text-gray-400">{formatFecha(p.fecha_pedido)}</div>
              </div>
              <div className="shrink-0">{getEstadoBadge(p.estado)}</div>
            </div>
            <div className="min-w-0">
              <div className="text-white font-medium break-words">{p.cliente?.nombre}</div>
              {(p.cliente?.telefono || p.cliente?.email) && (
                <div className="text-xs text-gray-400 break-all">{p.cliente?.telefono || p.cliente?.email}</div>
              )}
            </div>
            <div className="flex items-end justify-between gap-3">
              <div className="text-sm min-w-0">{entrega(p)}</div>
              <div className="text-right shrink-0">
                <div className="text-lg font-bold text-white">{pesos(totalDe(p))}</div>
                {pago(p)}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-700">
              {chipsVenta(p)}
              <span className="text-xs text-gray-300">{p.medio_pago_nombre || ''}</span>
              {puntos(p)}
            </div>
          </div>
        )}
      />
    </div>
  );
}
