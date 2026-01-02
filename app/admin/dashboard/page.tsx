'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { getEstadisticasDashboard, getMetricasCaja } from '@/lib/api/dashboard';

export default function DashboardPage() {
  const router = useRouter();
  const [ventas, setVentas] = useState<any>(null);
  const [cajas, setCajas] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarResumenes();
  }, []);

  const cargarResumenes = async () => {
    try {
      setLoading(true);
      const [ventasData, cajasData] = await Promise.all([
        getEstadisticasDashboard().catch(() => null),
        getMetricasCaja().catch(() => null)
      ]);
      setVentas(ventasData);
      setCajas(cajasData);
    } catch (err) {
      console.error('Error cargando resúmenes:', err);
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

  const tableros = [
    {
      id: 'ventas',
      titulo: 'Tablero de Ventas',
      descripcion: 'Análisis de ventas, pedidos, productos y clientes',
      icono: '📊',
      ruta: '/admin/dashboard/ventas',
      color: 'from-blue-500 to-cyan-500',
      metricas: ventas ? [
        { label: 'Ventas Hoy', valor: formatCurrency(ventas.ventas.hoy), icon: '💰' },
        { label: 'Ventas Mes', valor: formatCurrency(ventas.ventas.mes), icon: '📈' },
        { label: 'Pedidos Totales', valor: ventas.pedidos.total.toString(), icon: '📦' },
        { label: 'Por Cobrar', valor: formatCurrency(ventas.por_cobrar.monto), icon: '⏰' }
      ] : []
    },
    {
      id: 'cajas',
      titulo: 'Tablero de Cajas',
      descripcion: 'Estado de cajas, turnos y operaciones de todos los locales',
      icono: '💰',
      ruta: '/admin/dashboard/cajas',
      color: 'from-green-500 to-emerald-500',
      metricas: cajas ? [
        { label: 'Turnos Abiertos', valor: cajas.turnos_abiertos.total.toString(), icon: '🔓' },
        { label: 'Vendedores Activos', valor: cajas.ventas_por_vendedor_hoy.total_vendedores_activos.toString(), icon: '👥' },
        { label: 'Diferencias Pendientes', valor: cajas.diferencias_cuadre_recientes.total_con_diferencia.toString(), icon: '⚠️' },
        { label: 'Operaciones (30d)', valor: cajas.resumen_operaciones_30d.total_operaciones.toString(), icon: '🔄' }
      ] : []
    }
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-transparent bg-gradient-to-r from-teal-300 to-cyan-300 bg-clip-text mb-2">
            Dashboard Principal
          </h1>
          <p className="text-slate-400 text-lg">
            Selecciona el tablero que deseas consultar
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div key={i} className="bg-slate-800 rounded-xl p-8 animate-pulse">
                <div className="h-6 bg-slate-700 rounded mb-4"></div>
                <div className="h-4 bg-slate-700 rounded mb-6 w-3/4"></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-16 bg-slate-700 rounded"></div>
                  <div className="h-16 bg-slate-700 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {tableros.map((tablero) => (
              <div
                key={tablero.id}
                onClick={() => router.push(tablero.ruta)}
                className="bg-slate-800 rounded-xl p-8 cursor-pointer transform transition-all duration-200 hover:scale-105 hover:bg-slate-750 group"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div className={`text-4xl p-3 rounded-lg bg-gradient-to-r ${tablero.color} bg-opacity-20`}>
                      {tablero.icono}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-teal-300 group-hover:to-cyan-300 group-hover:bg-clip-text transition-all">
                        {tablero.titulo}
                      </h2>
                      <p className="text-slate-400">
                        {tablero.descripcion}
                      </p>
                    </div>
                  </div>
                  <div className="text-slate-400 group-hover:text-teal-400 transition-colors">
                    →
                  </div>
                </div>

                {/* Métricas Rápidas */}
                {tablero.metricas.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4">
                    {tablero.metricas.slice(0, 4).map((metrica, idx) => (
                      <div key={idx} className="bg-slate-700 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-lg">{metrica.icon}</span>
                          <span className="text-slate-300 text-sm">{metrica.label}</span>
                        </div>
                        <div className="text-white font-bold text-lg">
                          {metrica.valor}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-700 rounded-lg p-4 text-center">
                    <span className="text-slate-400">Cargando métricas...</span>
                  </div>
                )}

                {/* Footer */}
                <div className="mt-6 pt-4 border-t border-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-sm">
                      Haz clic para ver el tablero completo
                    </span>
                    <div className="bg-teal-600 group-hover:bg-teal-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                      Abrir
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Acciones Rápidas */}
        <div className="mt-8 bg-slate-800 rounded-xl p-6">
          <h3 className="text-xl font-bold text-cyan-300 mb-4">Acciones Rápidas</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => router.push('/admin/pedidos')}
              className="bg-slate-700 hover:bg-slate-600 p-4 rounded-lg transition-colors text-left"
            >
              <div className="text-2xl mb-2">📦</div>
              <div className="font-semibold">Pedidos</div>
              <div className="text-slate-400 text-sm">Gestionar órdenes</div>
            </button>
            
            <button
              onClick={() => router.push('/admin/caja')}
              className="bg-slate-700 hover:bg-slate-600 p-4 rounded-lg transition-colors text-left"
            >
              <div className="text-2xl mb-2">🏪</div>
              <div className="font-semibold">Caja</div>
              <div className="text-slate-400 text-sm">Abrir turno</div>
            </button>
            
            <button
              onClick={() => router.push('/admin/productos')}
              className="bg-slate-700 hover:bg-slate-600 p-4 rounded-lg transition-colors text-left"
            >
              <div className="text-2xl mb-2">🍞</div>
              <div className="font-semibold">Productos</div>
              <div className="text-slate-400 text-sm">Catálogo</div>
            </button>
            
            <button
              onClick={() => router.push('/admin/clientes')}
              className="bg-slate-700 hover:bg-slate-600 p-4 rounded-lg transition-colors text-left"
            >
              <div className="text-2xl mb-2">👥</div>
              <div className="font-semibold">Clientes</div>
              <div className="text-slate-400 text-sm">Base de datos</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
