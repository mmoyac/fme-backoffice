'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { listarPedidos, Pedido } from '@/lib/api/pedidos';

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('');

  const estados = [
    { value: '', label: 'Todos' },
    { value: 'PENDIENTE', label: 'Pendiente', color: 'bg-yellow-500' },
    { value: 'CONFIRMADO', label: 'Confirmado', color: 'bg-blue-500' },
    { value: 'EN_PREPARACION', label: 'En Preparación', color: 'bg-purple-500' },
    { value: 'ENTREGADO', label: 'Entregado', color: 'bg-green-500' },
    { value: 'CANCELADO', label: 'Cancelado', color: 'bg-red-500' },
  ];

  const cargarPedidos = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await listarPedidos(filtroEstado || undefined);
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
  }, [filtroEstado]);

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Pedidos</h1>
      </div>

      {/* Filtros */}
      <div className="bg-slate-800 rounded-lg p-4">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-gray-400 font-semibold">Filtrar por estado:</span>
          {estados.map(estado => (
            <button
              key={estado.value}
              onClick={() => setFiltroEstado(estado.value)}
              className={`px-4 py-2 rounded-lg transition-all ${
                filtroEstado === estado.value
                  ? 'bg-primary text-white'
                  : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
              }`}
            >
              {estado.label}
            </button>
          ))}
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-sm text-gray-400">Total Pedidos</p>
          <p className="text-2xl font-bold text-white">{pedidos.length}</p>
        </div>
        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-sm text-gray-400">Pendientes</p>
          <p className="text-2xl font-bold text-yellow-500">
            {pedidos.filter(p => p.estado === 'PENDIENTE').length}
          </p>
        </div>
        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-sm text-gray-400">En Preparación</p>
          <p className="text-2xl font-bold text-purple-500">
            {pedidos.filter(p => p.estado === 'EN_PREPARACION').length}
          </p>
        </div>
        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-sm text-gray-400">Total Ventas</p>
          <p className="text-2xl font-bold text-green-500">
            ${pedidos.reduce((sum, p) => sum + p.total, 0).toLocaleString('es-CL')}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-gray-400 mt-4">Cargando pedidos...</p>
        </div>
      ) : pedidos.length === 0 ? (
        <div className="text-center py-12 bg-slate-800 rounded-lg">
          <p className="text-gray-400 text-lg">No hay pedidos para mostrar</p>
        </div>
      ) : (
        <div className="bg-slate-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">
                    Pedido
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">
                    Cliente
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">
                    Fecha
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">
                    Total
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">
                    Pagado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {pedidos.map((pedido) => (
                  <tr key={pedido.id} className="hover:bg-slate-700/50 transition-colors">
                    <td className="px-4 py-4">
                      <span className="font-mono text-primary font-semibold">
                        #{pedido.numero_pedido}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-white font-medium">{pedido.cliente?.nombre}</div>
                      <div className="text-sm text-gray-400">{pedido.cliente?.email}</div>
                      {pedido.cliente?.telefono && (
                        <div className="text-sm text-gray-400">{pedido.cliente.telefono}</div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-gray-300">
                      {formatFecha(pedido.fecha_pedido)}
                    </td>
                    <td className="px-4 py-4">
                      {getEstadoBadge(pedido.estado)}
                    </td>
                    <td className="px-4 py-4 text-white font-semibold">
                      ${pedido.total.toLocaleString('es-CL')}
                    </td>
                    <td className="px-4 py-4">
                      {pedido.pagado ? (
                        <span className="text-green-500 font-semibold">✓ Pagado</span>
                      ) : (
                        <span className="text-yellow-500 font-semibold">⏳ Pendiente</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        href={`/admin/pedidos/${pedido.id}`}
                        className="bg-primary hover:bg-primary-light text-white px-4 py-2 rounded-lg transition-colors inline-flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Ver Detalle
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
