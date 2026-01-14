'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { listarPedidos, Pedido, actualizarEstadoSII } from '@/lib/api/pedidos';

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

  const actualizarSII = async (pedidoId: number, nuevoEstado: string) => {
    try {
      await actualizarEstadoSII(pedidoId, nuevoEstado);
      // Recargar pedidos para mostrar el cambio
      await cargarPedidos();
    } catch (error) {
      console.error('Error actualizando estado SII:', error);
      alert('Error al actualizar el estado SII');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white">Pedidos</h1>
          <p className="text-gray-400">Gestión de pedidos regulares y cajas variables</p>
        </div>
        <div className="flex space-x-3">
          <Link 
            href="/admin/pedidos/pos"
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors font-semibold flex items-center"
          >
            <span className="mr-2">🛒</span>
            POS Tablet
          </Link>
          <Link 
            href="/admin/pedidos/nuevo"
            className="bg-primary hover:bg-teal-600 text-white px-6 py-2 rounded-lg transition-colors font-semibold"
          >
            + Nuevo Pedido
          </Link>
          <Link 
            href="/admin/pedidos/cajas"
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg transition-colors font-semibold flex items-center"
          >
            <span className="mr-2">📦</span>
            + Pedido Cajas
          </Link>
        </div>
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
                    Documento
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">
                    Tipo de Venta
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">
                    Medio de Pago
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">
                    Total
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">
                    Pagado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">
                    Puntos
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
                    <td className="px-4 py-4">
                      {pedido.tipo_documento_codigo === 'FAC' ? (
                        <div className="flex flex-col">
                          <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-semibold mb-2">
                            📄 Factura
                          </span>
                          <select
                            value={pedido.estado_sii || 'PENDIENTE'}
                            onChange={(e) => actualizarSII(pedido.id, e.target.value)}
                            className="bg-slate-700 text-white text-xs px-2 py-1 rounded border border-slate-600 focus:border-purple-400 focus:outline-none"
                          >
                            <option value="PENDIENTE">📋 Pendiente</option>
                            <option value="ENVIADO">📤 Enviado</option>
                            <option value="APROBADO">✅ Aprobado</option>
                            <option value="RECHAZADO">❌ Rechazado</option>
                          </select>
                        </div>
                      ) : (
                        <span className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                          📄 Boleta
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {pedido.tipo_pedido_codigo === 'CAJAS_VARIABLES' ? (
                        <span className="bg-orange-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                          📦 Cajas Variables
                        </span>
                      ) : (
                        <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                          📦 Productos
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">
                          {pedido.medio_pago_nombre || 'No definido'}
                        </span>
                        {pedido.permite_cheque && (
                          <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-semibold">
                            💰 CHEQUE
                          </span>
                        )}
                      </div>
                      {pedido.medio_pago_codigo && (
                        <div className="text-sm text-gray-400">
                          {pedido.medio_pago_codigo}
                        </div>
                      )}
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
                      <div className="text-center">
                        {pedido.puntos_ganados ? (
                          <div className="space-y-1">
                            <div className="text-green-400 font-semibold text-sm">
                              +{pedido.puntos_ganados} pts
                            </div>
                            {pedido.estado === 'CONFIRMADO' || pedido.estado === 'EN_PREPARACION' || pedido.estado === 'ENTREGADO' ? (
                              <div className="text-xs text-green-300">✓ Otorgados</div>
                            ) : (
                              <div className="text-xs text-gray-400">⏳ Pendientes</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-500 text-sm">Sin puntos</span>
                        )}
                        {pedido.puntos_usados && pedido.puntos_usados > 0 && (
                          <div className="text-yellow-400 text-xs mt-1">
                            -{pedido.puntos_usados} usados
                          </div>
                        )}
                      </div>
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
