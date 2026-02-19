'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getEstadisticasDashboard, type EstadisticasDashboard } from '@/lib/api/dashboard';
import { getClientesCercaLimite, type ClienteCredito } from '@/lib/api/clientes';

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<EstadisticasDashboard | null>(null);
  const [clientesCredito, setClientesCredito] = useState<ClienteCredito[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    cargarEstadisticas();
    cargarAlertasCredito();
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

  const cargarAlertasCredito = async () => {
    try {
      const clientesCerca = await getClientesCercaLimite();
      setClientesCredito(clientesCerca);
    } catch (err) {
      console.error('Error al cargar alertas de crédito:', err);
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

      {/* Alertas de Crédito */}
      {clientesCredito.length > 0 && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-red-500">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-red-400 font-semibold text-lg mb-2">
                ⚠️ Clientes cerca del límite de crédito
              </h3>
              <div className="space-y-2">
                {clientesCredito.slice(0, 5).map((cliente) => (
                  <div key={cliente.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-white font-medium">
                        {cliente.nombre} {cliente.apellido}
                      </span>
                      <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full">
                        {cliente.porcentaje_uso.toFixed(1)}% usado
                      </span>
                    </div>
                    <div className="text-right text-sm">
                      <div className="text-red-300">
                        Usado: {formatCurrency(cliente.credito_usado || 0)}
                      </div>
                      <div className="text-gray-400">
                        de {formatCurrency(cliente.limite_credito || 0)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {clientesCredito.length > 5 && (
                <button
                  onClick={() => router.push('/admin/clientes/credito/reportes')}
                  className="mt-3 text-red-400 hover:text-red-300 text-sm font-medium"
                >
                  Ver todos ({clientesCredito.length} clientes) →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

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

      {/* Pedidos por Canal: Web vs Tiendas */}
      <div className="bg-slate-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">📊 Pedidos por Canal de Venta</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pedidos Web (Landing) */}
          <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-cyan-500 rounded-lg flex items-center justify-center text-2xl">
                🌐
              </div>
              <div>
                <h3 className="text-cyan-400 font-semibold text-lg">Landing Web</h3>
                <p className="text-gray-400 text-sm">Pedidos desde internet</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Cantidad de Pedidos:</span>
                <span className="text-white text-2xl font-bold">{stats.pedidos.por_canal.web.cantidad}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Total Ventas:</span>
                <span className="text-cyan-400 text-2xl font-bold">{formatCurrency(stats.pedidos.por_canal.web.ventas)}</span>
              </div>
              {stats.pedidos.por_canal.web.cantidad > 0 && (
                <div className="pt-3 border-t border-slate-700">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">Ticket Promedio Web:</span>
                    <span className="text-cyan-300 font-semibold">
                      {formatCurrency(stats.pedidos.por_canal.web.ventas / stats.pedidos.por_canal.web.cantidad)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Pedidos Tiendas (POS) */}
          <div className="bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/30 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-emerald-500 rounded-lg flex items-center justify-center text-2xl">
                🏪
              </div>
              <div>
                <h3 className="text-emerald-400 font-semibold text-lg">Tiendas Físicas</h3>
                <p className="text-gray-400 text-sm">Pedidos desde POS</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Cantidad de Pedidos:</span>
                <span className="text-white text-2xl font-bold">{stats.pedidos.por_canal.tienda.cantidad}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Total Ventas:</span>
                <span className="text-emerald-400 text-2xl font-bold">{formatCurrency(stats.pedidos.por_canal.tienda.ventas)}</span>
              </div>
              {stats.pedidos.por_canal.tienda.cantidad > 0 && (
                <div className="pt-3 border-t border-slate-700">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">Ticket Promedio Tienda:</span>
                    <span className="text-emerald-300 font-semibold">
                      {formatCurrency(stats.pedidos.por_canal.tienda.ventas / stats.pedidos.por_canal.tienda.cantidad)}
                    </span>
                  </div>
                </div>
              )}
              
              {/* Desglose por local */}
              {stats.pedidos.por_canal.tienda.locales_detalle && stats.pedidos.por_canal.tienda.locales_detalle.length > 0 && (
                <div className="pt-4 border-t border-slate-700 mt-4">
                  <h4 className="text-emerald-300 font-semibold text-sm mb-3">📍 Desglose por Local:</h4>
                  <div className="space-y-2">
                    {stats.pedidos.por_canal.tienda.locales_detalle.map((local) => (
                      <div key={local.local_id} className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-semibold">{local.nombre}</span>
                          <span className="text-xs bg-emerald-600 text-white px-2 py-1 rounded-full">
                            {local.codigo}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <div className="text-gray-400">Pedidos:</div>
                            <div className="text-white font-bold">{local.cantidad_pedidos}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-gray-400">Ventas:</div>
                            <div className="text-emerald-300 font-bold">{formatCurrency(local.total_ventas)}</div>
                          </div>
                        </div>
                        {local.cantidad_pedidos > 0 && (
                          <div className="mt-2 pt-2 border-t border-slate-700 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Ticket Promedio:</span>
                              <span className="text-emerald-200 font-semibold">
                                {formatCurrency(local.total_ventas / local.cantidad_pedidos)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Barra comparativa */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Distribución de Ventas</span>
            <span className="text-gray-400 text-sm">
              Total: {formatCurrency(stats.pedidos.por_canal.web.ventas + stats.pedidos.por_canal.tienda.ventas)}
            </span>
          </div>
          <div className="flex h-6 rounded-full overflow-hidden">
            {stats.pedidos.por_canal.web.ventas + stats.pedidos.por_canal.tienda.ventas > 0 ? (
              <>
                <div
                  className="bg-cyan-500 flex items-center justify-center text-xs font-semibold text-white"
                  style={{
                    width: `${(stats.pedidos.por_canal.web.ventas / (stats.pedidos.por_canal.web.ventas + stats.pedidos.por_canal.tienda.ventas)) * 100}%`
                  }}
                >
                  {((stats.pedidos.por_canal.web.ventas / (stats.pedidos.por_canal.web.ventas + stats.pedidos.por_canal.tienda.ventas)) * 100).toFixed(0)}%
                </div>
                <div
                  className="bg-emerald-500 flex items-center justify-center text-xs font-semibold text-white"
                  style={{
                    width: `${(stats.pedidos.por_canal.tienda.ventas / (stats.pedidos.por_canal.web.ventas + stats.pedidos.por_canal.tienda.ventas)) * 100}%`
                  }}
                >
                  {((stats.pedidos.por_canal.tienda.ventas / (stats.pedidos.por_canal.web.ventas + stats.pedidos.por_canal.tienda.ventas)) * 100).toFixed(0)}%
                </div>
              </>
            ) : (
              <div className="bg-slate-700 flex-1 flex items-center justify-center text-xs text-gray-400">
                Sin ventas
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ventas por Vendedor */}
      {stats.ventas_por_vendedor && stats.ventas_por_vendedor.length > 0 && (
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">👥 Ranking de Vendedores</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.ventas_por_vendedor.map((vendedor, index) => (
              <div 
                key={vendedor.usuario_id} 
                className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg p-4 border border-slate-600 hover:border-primary transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                      index === 0 ? 'bg-yellow-500 text-yellow-900' :
                      index === 1 ? 'bg-gray-400 text-gray-900' :
                      index === 2 ? 'bg-amber-700 text-amber-100' :
                      'bg-primary text-white'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-sm">
                        {vendedor.nombre}
                      </h3>
                      <p className="text-gray-400 text-xs">{vendedor.email}</p>
                    </div>
                  </div>
                  {index < 3 && (
                    <span className="text-2xl">
                      {index === 0 ? '🏆' : index === 1 ? '🥈' : '🥉'}
                    </span>
                  )}
                </div>
                <div className="space-y-2 pt-3 border-t border-slate-600">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Pedidos:</span>
                    <span className="text-white font-bold">{vendedor.cantidad_pedidos}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Ventas:</span>
                    <span className="text-primary font-bold text-lg">
                      {formatCurrency(vendedor.total_ventas)}
                    </span>
                  </div>
                  {vendedor.cantidad_pedidos > 0 && (
                    <div className="flex justify-between items-center pt-2 border-t border-slate-700">
                      <span className="text-gray-400 text-xs">Ticket Promedio:</span>
                      <span className="text-emerald-400 font-semibold text-sm">
                        {formatCurrency(vendedor.total_ventas / vendedor.cantidad_pedidos)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ventas por Medio de Pago */}
      {stats.ventas_por_medio_pago && stats.ventas_por_medio_pago.length > 0 && (
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">💳 Ventas por Medio de Pago</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.ventas_por_medio_pago.map((medio) => {
              // Determinar icono y color según el medio de pago
              let icon = '💵';
              let colorClass = 'from-gray-500 to-gray-600';
              
              if (medio.codigo.includes('EFECTIVO')) {
                icon = '💵';
                colorClass = 'from-green-500 to-green-600';
              } else if (medio.codigo.includes('DEBITO') || medio.codigo.includes('CREDITO')) {
                icon = '💳';
                colorClass = 'from-blue-500 to-blue-600';
              } else if (medio.codigo.includes('TRANSFERENCIA')) {
                icon = '🏦';
                colorClass = 'from-purple-500 to-purple-600';
              } else if (medio.codigo.includes('CHEQUE')) {
                icon = '📝';
                colorClass = 'from-orange-500 to-orange-600';
              } else if (medio.codigo.includes('MERCADOPAGO') || medio.codigo.includes('WEBPAY')) {
                icon = '🛒';
                colorClass = 'from-cyan-500 to-cyan-600';
              }

              return (
                <div 
                  key={medio.medio_pago_id} 
                  className={`bg-gradient-to-br ${colorClass} rounded-lg p-5 text-white shadow-lg hover:shadow-xl transition-all`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-3xl">{icon}</div>
                    <div className="text-xs opacity-80 bg-white/20 px-2 py-1 rounded">
                      {medio.codigo}
                    </div>
                  </div>
                  <h3 className="font-semibold text-lg mb-3">{medio.nombre}</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm opacity-90">Pedidos:</span>
                      <span className="font-bold text-lg">{medio.cantidad_pedidos}</span>
                    </div>
                    <div className="pt-2 border-t border-white/20">
                      <div className="text-xs opacity-80">Total Ventas</div>
                      <div className="font-bold text-2xl">
                        {formatCurrency(medio.total_ventas)}
                      </div>
                    </div>
                    {medio.cantidad_pedidos > 0 && (
                      <div className="pt-2 border-t border-white/20">
                        <div className="text-xs opacity-80">Ticket Promedio</div>
                        <div className="font-semibold text-lg">
                          {formatCurrency(medio.total_ventas / medio.cantidad_pedidos)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Gráfico de distribución */}
          <div className="mt-6">
            <h3 className="text-white font-semibold mb-3">Distribución de Ventas</h3>
            <div className="flex h-8 rounded-lg overflow-hidden shadow-lg">
              {stats.ventas_por_medio_pago.map((medio, index) => {
                const totalVentas = stats.ventas_por_medio_pago.reduce((sum, m) => sum + m.total_ventas, 0);
                const porcentaje = totalVentas > 0 ? (medio.total_ventas / totalVentas) * 100 : 0;
                
                // Colores para la barra
                const colors = [
                  'bg-green-500',
                  'bg-blue-500',
                  'bg-purple-500',
                  'bg-orange-500',
                  'bg-cyan-500',
                  'bg-pink-500',
                  'bg-yellow-500',
                  'bg-indigo-500'
                ];
                
                return porcentaje > 0 ? (
                  <div
                    key={medio.medio_pago_id}
                    className={`${colors[index % colors.length]} flex items-center justify-center text-white text-xs font-semibold relative group`}
                    style={{ width: `${porcentaje}%` }}
                  >
                    {porcentaje > 8 && `${porcentaje.toFixed(0)}%`}
                    <div className="absolute bottom-full mb-2 hidden group-hover:block bg-slate-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                      {medio.nombre}: {formatCurrency(medio.total_ventas)} ({porcentaje.toFixed(1)}%)
                    </div>
                  </div>
                ) : null;
              })}
            </div>
          </div>
        </div>
      )}

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
