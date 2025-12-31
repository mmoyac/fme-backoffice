'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getReporteCredito, type ReporteCredito } from '@/lib/api/clientes';

export default function ReportesCreditoPage() {
  const router = useRouter();
  const [reporte, setReporte] = useState<ReporteCredito | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    cargarReporte();
  }, []);

  const cargarReporte = async () => {
    try {
      setLoading(true);
      const data = await getReporteCredito();
      setReporte(data);
    } catch (err) {
      setError('Error al cargar reporte de crédito');
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

  const getAlertLevel = (porcentaje: number) => {
    if (porcentaje >= 90) return { color: 'bg-red-500', text: 'Crítico' };
    if (porcentaje >= 80) return { color: 'bg-orange-500', text: 'Alerta' };
    if (porcentaje >= 60) return { color: 'bg-yellow-500', text: 'Atención' };
    return { color: 'bg-green-500', text: 'Normal' };
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-gray-400 mt-4">Cargando reporte...</p>
      </div>
    );
  }

  if (error || !reporte) {
    return (
      <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg">
        {error || 'Error al cargar datos'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={() => router.push('/admin/clientes')}
          className="text-gray-400 hover:text-white mb-4 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver a Clientes
        </button>
        <h1 className="text-3xl font-bold text-white">Reportes de Crédito</h1>
      </div>

      {/* Resumen General */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-sm text-gray-400">Total Límites Otorgados</p>
          <p className="text-2xl font-bold text-primary">
            {formatCurrency(reporte.total_limite_otorgado)}
          </p>
        </div>
        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-sm text-gray-400">Crédito Usado</p>
          <p className="text-2xl font-bold text-orange-500">
            {formatCurrency(reporte.total_credito_usado)}
          </p>
        </div>
        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-sm text-gray-400">Crédito Disponible</p>
          <p className="text-2xl font-bold text-green-500">
            {formatCurrency(reporte.total_credito_disponible)}
          </p>
        </div>
        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-sm text-gray-400">Clientes con Crédito</p>
          <p className="text-2xl font-bold text-blue-500">
            {reporte.clientes_con_credito.length}
          </p>
        </div>
      </div>

      {/* Alertas Críticas */}
      {reporte.clientes_cerca_limite.length > 0 && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6">
          <h2 className="text-xl font-bold text-red-400 mb-4">
            ⚠️ Clientes Cerca del Límite (Uso &gt; 80%)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Límite</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Usado</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Disponible</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Estado</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {reporte.clientes_cerca_limite.map((cliente) => {
                  const alert = getAlertLevel(cliente.porcentaje_uso);
                  return (
                    <tr key={cliente.id} className="hover:bg-slate-700/50">
                      <td className="px-4 py-4">
                        <div className="text-white font-semibold">
                          {cliente.nombre} {cliente.apellido}
                        </div>
                        {cliente.email && (
                          <div className="text-sm text-gray-400">{cliente.email}</div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-gray-300">
                        {formatCurrency(cliente.limite_credito || 0)}
                      </td>
                      <td className="px-4 py-4 text-orange-300">
                        {formatCurrency(cliente.credito_usado || 0)}
                      </td>
                      <td className="px-4 py-4 text-green-300">
                        {formatCurrency(cliente.credito_disponible)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${alert.color}`}></div>
                          <span className="text-sm text-white">{cliente.porcentaje_uso.toFixed(1)}%</span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            alert.color.replace('bg-', 'bg-') + '/20 ' + alert.color.replace('bg-', 'text-')
                          }`}>
                            {alert.text}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => router.push(`/admin/clientes/${cliente.id}`)}
                          className="text-blue-400 hover:text-blue-300 font-medium"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Todos los Clientes con Crédito */}
      <div className="bg-slate-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">
          Todos los Clientes con Crédito ({reporte.clientes_con_credito.length})
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Cliente</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Límite</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Usado</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Disponible</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">% Uso</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {reporte.clientes_con_credito
                .sort((a, b) => b.porcentaje_uso - a.porcentaje_uso)
                .map((cliente) => {
                  const alert = getAlertLevel(cliente.porcentaje_uso);
                  const isAlert = cliente.porcentaje_uso > 80;
                  
                  return (
                    <tr key={cliente.id} className={`hover:bg-slate-700/50 ${isAlert ? 'bg-red-900/10' : ''}`}>
                      <td className="px-4 py-4 text-gray-400">#{cliente.id}</td>
                      <td className="px-4 py-4">
                        <div className="text-white font-semibold">
                          {cliente.nombre} {cliente.apellido}
                        </div>
                        {cliente.email && (
                          <div className="text-sm text-gray-400">{cliente.email}</div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-gray-300">
                        {formatCurrency(cliente.limite_credito || 0)}
                      </td>
                      <td className="px-4 py-4 text-orange-300">
                        {formatCurrency(cliente.credito_usado || 0)}
                      </td>
                      <td className="px-4 py-4 text-green-300">
                        {formatCurrency(cliente.credito_disponible)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${alert.color}`}></div>
                          <span className="text-white font-medium">{cliente.porcentaje_uso.toFixed(1)}%</span>
                          {/* Barra de progreso */}
                          <div className="w-16 bg-gray-600 rounded-full h-2 ml-2">
                            <div 
                              className={`h-2 rounded-full ${alert.color}`}
                              style={{ width: `${Math.min(100, cliente.porcentaje_uso)}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => router.push(`/admin/clientes/${cliente.id}`)}
                          className="text-blue-400 hover:text-blue-300 font-medium"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Clientes sin Crédito */}
      {reporte.clientes_sin_limite.length > 0 && (
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">
            Clientes sin Límite de Crédito ({reporte.clientes_sin_limite.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {reporte.clientes_sin_limite.slice(0, 12).map((cliente) => (
              <div key={cliente.id} className="bg-slate-700 rounded-lg p-3">
                <div className="text-white font-semibold text-sm">
                  {cliente.nombre} {cliente.apellido}
                </div>
                {cliente.email && (
                  <div className="text-xs text-gray-400">{cliente.email}</div>
                )}
                <button
                  onClick={() => router.push(`/admin/clientes/${cliente.id}`)}
                  className="text-xs text-blue-400 hover:text-blue-300 mt-1"
                >
                  Asignar crédito →
                </button>
              </div>
            ))}
          </div>
          {reporte.clientes_sin_limite.length > 12 && (
            <div className="mt-4 text-center text-gray-400">
              Y {reporte.clientes_sin_limite.length - 12} más...
            </div>
          )}
        </div>
      )}
    </div>
  );
}