'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getEstadisticasDashboard, type EstadisticasDashboard } from '@/lib/api/dashboard';

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<EstadisticasDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    cargarEstadisticas();
  }, []);

  const cargarEstadisticas = async () => {
    try {
      setLoading(true);
      const data = await getEstadisticasDashboard();
      setStats(data);
    } catch (err) {
      setError('Error al cargar estadísticas');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(amount);
  };

  const getEstadoColor = (estado: string) => {
    const colores: { [key: string]: string } = {
      'PENDIENTE': 'bg-yellow-500',
      'CONFIRMADO': 'bg-blue-500',
      'EN_PREPARACION': 'bg-purple-500',
      'ENTREGADO': 'bg-green-500',
      'CANCELADO': 'bg-red-500'
    };
    return colores[estado] || 'bg-gray-500';
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-gray-400 mt-4">Cargando dashboard...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg">
        {error || 'Error al cargar datos'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Dashboard de Ventas</h1>

      {/* KPIs Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Ventas del Día */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <p className="text-sm opacity-90">Ventas del Día</p>
          <p className="text-3xl font-bold mt-2">{formatCurrency(stats.ventas.hoy)}</p>
        </div>

        {/* Ventas del Mes */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
          <p className="text-sm opacity-90">Ventas del Mes</p>
          <p className="text-3xl font-bold mt-2">{formatCurrency(stats.ventas.mes)}</p>
        </div>

        {/* Por Cobrar */}
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-6 text-white">
          <p className="text-sm opacity-90">Por Cobrar</p>
          <p className="text-3xl font-bold mt-2">{formatCurrency(stats.por_cobrar.monto)}</p>
          <p className="text-xs opacity-75 mt-1">{stats.por_cobrar.cantidad} pedidos sin pagar</p>
        </div>

        {/* Ticket Promedio */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
          <p className="text-sm opacity-90">Ticket Promedio</p>
          <p className="text-3xl font-bold mt-2">{formatCurrency(stats.ticket_promedio)}</p>
        </div>

        {/* Total Pedidos */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-6 text-white">
          <p className="text-sm opacity-90">Total Pedidos</p>
          <p className="text-3xl font-bold mt-2">{stats.pedidos.total}</p>
        </div>
      </div>

      {/* Pedidos por Estado y Ventas por Día */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pedidos por Estado */}
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Pedidos por Estado</h2>
          <div className="space-y-3">
            {Object.entries(stats.pedidos.por_estado).map(([estado, cantidad]) => (
              <div key={estado} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${getEstadoColor(estado)}`}></div>
                  <span className="text-gray-300">{estado}</span>
                </div>
                <span className="text-white font-bold">{cantidad}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Ventas por Día */}
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Ventas Últimos 7 Días</h2>
          <div className="space-y-2">
            {stats.ventas_por_dia.map((dia) => {
              const maxVentas = Math.max(...stats.ventas_por_dia.map(d => d.ventas));
              return (
                <div key={dia.fecha} className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm w-12">{dia.dia}</span>
                  <div className="flex-1 mx-4">
                    <div className="bg-slate-700 rounded-full h-6 overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full transition-all"
                        style={{
                          width: `${maxVentas > 0 ? Math.min((dia.ventas / maxVentas) * 100, 100) : 0}%`
                        }}
                      ></div>
                    </div>
                  </div>
                  <span className="text-white font-semibold text-sm w-28 text-right">
                    {formatCurrency(dia.ventas)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top Productos y Stock Bajo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Productos Más Vendidos */}
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Productos Más Vendidos</h2>
          {stats.top_productos.length > 0 ? (
            <div className="space-y-3">
              {stats.top_productos.map((producto, index) => (
                <div key={producto.sku} className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-semibold">{producto.nombre}</p>
                    <p className="text-xs text-gray-400">SKU: {producto.sku}</p>
                  </div>
                  <span className="text-primary font-bold">{producto.cantidad_vendida} u.</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">No hay ventas registradas</p>
          )}
        </div>

        {/* Stock Bajo */}
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Alerta: Stock Bajo</h2>
          {stats.stock_bajo.length > 0 ? (
            <div className="space-y-3">
              {stats.stock_bajo.map((producto) => (
                <div key={producto.sku} className="flex items-center justify-between bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <div>
                    <p className="text-white font-semibold">{producto.nombre}</p>
                    <p className="text-xs text-gray-400">SKU: {producto.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-red-500 font-bold">{producto.stock} u.</p>
                    <p className="text-xs text-gray-400">disponibles</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">✓ Stock suficiente en todos los productos</p>
          )}
        </div>
      </div>

      {/* Últimos Pedidos */}
      <div className="bg-slate-800 rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Últimos Pedidos</h2>
          <button
            onClick={() => router.push('/admin/pedidos')}
            className="text-primary hover:text-primary-light text-sm font-semibold"
          >
            Ver todos →
          </button>
        </div>
        
        {stats.ultimos_pedidos.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Monto</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {stats.ultimos_pedidos.map((pedido) => (
                  <tr 
                    key={pedido.id} 
                    className="hover:bg-slate-700/50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/admin/pedidos/${pedido.id}`)}
                  >
                    <td className="px-4 py-3 text-gray-400">#{pedido.numero_pedido}</td>
                    <td className="px-4 py-3 text-white">{pedido.cliente}</td>
                    <td className="px-4 py-3 text-white font-semibold">{formatCurrency(pedido.monto)}</td>
                    <td className="px-4 py-3">
                      <span className={`${getEstadoColor(pedido.estado)} text-white px-2 py-1 rounded text-xs font-semibold`}>
                        {pedido.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm">{pedido.fecha}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400 text-center py-8">No hay pedidos registrados</p>
        )}
      </div>

      {/* Botón de Actualizar */}
      <div className="text-center">
        <button
          onClick={cargarEstadisticas}
          className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg transition-colors"
        >
          🔄 Actualizar Datos
        </button>
      </div>
    </div>
  );
}
