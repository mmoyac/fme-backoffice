'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getMetricasCaja, type MetricasCaja } from '@/lib/api/dashboard';

export default function ResumenCajasPage() {
  const router = useRouter();
  const [metricas, setMetricas] = useState<MetricasCaja | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    cargarMetricas();
    // Actualizar cada 30 segundos
    const interval = setInterval(cargarMetricas, 30000);
    return () => clearInterval(interval);
  }, []);

  const cargarMetricas = async () => {
    try {
      setLoading(true);
      const data = await getMetricasCaja();
      setMetricas(data);
    } catch (err) {
      setError('Error al cargar métricas de caja');
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

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTurnoDuration = (fechaApertura: string) => {
    const apertura = new Date(fechaApertura);
    const ahora = new Date();
    const diffMs = ahora.getTime() - apertura.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  if (loading && !metricas) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-xl">Cargando estado de cajas...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-xl text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-gradient-to-r from-teal-300 to-cyan-300 bg-clip-text">
              Estado de Cajas - Todos los Locales
            </h1>
            <p className="text-slate-400 mt-2">
              Última actualización: {formatDateTime(metricas?.fecha_consulta || '')}
            </p>
          </div>
          <button
            onClick={cargarMetricas}
            disabled={loading}
            className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors"
          >
            {loading ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>

        {/* Resumen General */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-2 text-cyan-300">Turnos Abiertos</h3>
            <div className="text-3xl font-bold text-white">
              {metricas?.turnos_abiertos.total || 0}
            </div>
            <p className="text-slate-400 text-sm mt-1">cajas activas</p>
          </div>

          <div className="bg-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-2 text-cyan-300">Vendedores Activos</h3>
            <div className="text-3xl font-bold text-white">
              {metricas?.ventas_por_vendedor_hoy.total_vendedores_activos || 0}
            </div>
            <p className="text-slate-400 text-sm mt-1">vendiendo hoy</p>
          </div>

          <div className="bg-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-2 text-cyan-300">Diferencias Pendientes</h3>
            <div className="text-3xl font-bold text-red-400">
              {metricas?.diferencias_cuadre_recientes.total_con_diferencia || 0}
            </div>
            <p className="text-slate-400 text-sm mt-1">últimos 7 días</p>
          </div>
        </div>

        {/* Turnos Abiertos */}
        {metricas?.turnos_abiertos && metricas.turnos_abiertos.total > 0 && (
          <div className="bg-slate-800 rounded-xl p-6 mb-8">
            <h2 className="text-2xl font-bold mb-6 text-cyan-300">
              Turnos Abiertos ({metricas.turnos_abiertos.total})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-600">
                    <th className="text-left py-3 px-4 text-slate-300">Local</th>
                    <th className="text-left py-3 px-4 text-slate-300">Vendedor</th>
                    <th className="text-left py-3 px-4 text-slate-300">Apertura</th>
                    <th className="text-left py-3 px-4 text-slate-300">Duración</th>
                    <th className="text-left py-3 px-4 text-slate-300">Monto Inicial</th>
                    <th className="text-left py-3 px-4 text-slate-300">Ventas</th>
                    <th className="text-left py-3 px-4 text-slate-300">Efectivo Esperado</th>
                    <th className="text-left py-3 px-4 text-slate-300">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {metricas.turnos_abiertos.detalle.map((turno) => (
                    <tr key={turno.turno_id} className="border-b border-slate-700 hover:bg-slate-700">
                      <td className="py-3 px-4">
                        <span className="font-semibold text-white">{turno.local_nombre}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{turno.vendedor_nombre}</td>
                      <td className="py-3 px-4 text-slate-300">
                        {formatDateTime(turno.fecha_apertura)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="bg-blue-900 text-blue-200 px-2 py-1 rounded text-sm">
                          {getTurnoDuration(turno.fecha_apertura)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {formatCurrency(turno.monto_inicial)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-green-400 font-semibold">
                          {formatCurrency(turno.ventas_acumuladas)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-cyan-400 font-semibold">
                          {formatCurrency(turno.efectivo_esperado)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => router.push(`/admin/caja?turno=${turno.turno_id}`)}
                          className="bg-teal-600 hover:bg-teal-700 px-3 py-1 rounded text-sm transition-colors"
                        >
                          Ver Detalle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Ventas por Vendedor Hoy */}
        {(metricas?.ventas_por_vendedor_hoy?.total_vendedores_activos || 0) > 0 && (
          <div className="bg-slate-800 rounded-xl p-6 mb-8">
            <h2 className="text-2xl font-bold mb-6 text-cyan-300">
              Ventas por Vendedor - Hoy ({metricas?.ventas_por_vendedor_hoy?.total_vendedores_activos || 0})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {metricas?.ventas_por_vendedor_hoy?.detalle?.map((vendedor) => (
                <div key={vendedor.vendedor_id} className="bg-slate-700 rounded-lg p-4">
                  <h3 className="font-semibold text-white mb-2">{vendedor.vendedor_nombre}</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-300">Ventas:</span>
                      <span className="text-green-400 font-semibold">
                        {formatCurrency(vendedor.total_ventas)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">Operaciones:</span>
                      <span className="text-cyan-400">{vendedor.num_ventas}</span>
                    </div>
                  </div>
                </div>
              )) || []}
            </div>
          </div>
        )}

        {/* Diferencias de Cuadre Recientes */}
        {(metricas?.diferencias_cuadre_recientes?.total_con_diferencia || 0) > 0 && (
          <div className="bg-slate-800 rounded-xl p-6 mb-8">
            <h2 className="text-2xl font-bold mb-6 text-red-300">
              Diferencias de Cuadre - Últimos 7 Días ({metricas?.diferencias_cuadre_recientes?.total_con_diferencia || 0})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-600">
                    <th className="text-left py-3 px-4 text-slate-300">Fecha Cierre</th>
                    <th className="text-left py-3 px-4 text-slate-300">Local</th>
                    <th className="text-left py-3 px-4 text-slate-300">Vendedor</th>
                    <th className="text-left py-3 px-4 text-slate-300">Esperado</th>
                    <th className="text-left py-3 px-4 text-slate-300">Real</th>
                    <th className="text-left py-3 px-4 text-slate-300">Diferencia</th>
                  </tr>
                </thead>
                <tbody>
                  {metricas?.diferencias_cuadre_recientes?.detalle?.map((diferencia) => (
                    <tr key={diferencia.turno_id} className="border-b border-slate-700">
                      <td className="py-3 px-4 text-slate-300">
                        {formatDateTime(diferencia.fecha_cierre)}
                      </td>
                      <td className="py-3 px-4 text-white">{diferencia.local_nombre}</td>
                      <td className="py-3 px-4 text-slate-300">{diferencia.vendedor_nombre}</td>
                      <td className="py-3 px-4 text-slate-300">
                        {formatCurrency(diferencia.efectivo_esperado)}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {formatCurrency(diferencia.efectivo_real)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`font-semibold ${
                          diferencia.diferencia > 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {formatCurrency(diferencia.diferencia)}
                          {diferencia.diferencia > 0 ? ' (sobrante)' : ' (faltante)'}
                        </span>
                      </td>
                    </tr>
                  )) || []}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Resumen de Operaciones (30 días) */}
        {(metricas?.resumen_operaciones_30d?.por_tipo?.length || 0) > 0 && (
          <div className="bg-slate-800 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-6 text-cyan-300">
              Resumen de Operaciones - Últimos 30 Días
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {metricas?.resumen_operaciones_30d?.por_tipo?.map((operacion) => (
                <div key={operacion.tipo} className="bg-slate-700 rounded-lg p-4">
                  <h3 className="font-semibold text-white mb-2 capitalize">
                    {operacion.tipo.toLowerCase()}
                  </h3>
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-cyan-400">
                      {operacion.cantidad}
                    </div>
                    <div className="text-slate-300 text-sm">
                      {formatCurrency(operacion.total_monto)}
                    </div>
                  </div>
                </div>
              )) || []}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-600">
              <p className="text-slate-300">
                Total de operaciones: <span className="text-white font-semibold">
                  {metricas?.resumen_operaciones_30d?.total_operaciones || 0}
                </span>
              </p>
            </div>
          </div>
        )}

        {/* Estado Vacío */}
        {(metricas?.turnos_abiertos?.total || 0) === 0 && (
          <div className="bg-slate-800 rounded-xl p-8 text-center">
            <div className="text-slate-400 text-xl mb-4">
              No hay turnos de caja abiertos actualmente
            </div>
            <button
              onClick={() => router.push('/admin/caja')}
              className="bg-teal-600 hover:bg-teal-700 px-6 py-3 rounded-lg transition-colors"
            >
              Abrir Nueva Caja
            </button>
          </div>
        )}
      </div>
    </div>
  );
}