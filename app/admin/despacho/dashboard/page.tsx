'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import { 
  Package, 
  Clock, 
  CheckCircle, 
  Truck, 
  TrendingUp, 
  Users,
  Calendar,
  AlertCircle,
  BarChart3,
  PieChart
} from 'lucide-react';

interface DashboardStats {
  total_despachos: number;
  despachos_por_estado: Record<string, number>;
  despachos_hoy: number;
  tiempo_promedio_picking: number;
  eficiencia_entrega: number;
  despachadores_activos: number;
}

interface DespachoReciente {
  id: number;
  pedido_id: number;
  cliente_nombre: string;
  despachador_nombre: string;
  estado: string;
  fecha_creacion: string;
  fecha_entrega?: string;
}

export default function DashboardDespacho() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [despachosRecientes, setDespachosRecientes] = useState<DespachoReciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.access_token) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch estadísticas
      const statsResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/despachos/estadisticas`,
        {
          headers: {
            'Authorization': `Bearer ${user?.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Fetch despachos recientes
      const recientesResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/despachos/?limit=5&order_by=fecha_creacion&order_direction=desc`,
        {
          headers: {
            'Authorization': `Bearer ${user?.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (statsResponse.ok && recientesResponse.ok) {
        const [statsData, recientesData] = await Promise.all([
          statsResponse.json(),
          recientesResponse.json()
        ]);
        
        setStats(statsData);
        setDespachosRecientes(recientesData);
      } else {
        setError('Error al cargar datos del dashboard');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const obtenerColorEstado = (estado: string) => {
    switch (estado) {
      case 'ASIGNADO':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'EN_PICKING':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'LISTO_EMPAQUE':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'EN_RUTA':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'ENTREGADO':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatearTiempo = (minutos: number) => {
    if (minutos < 60) {
      return `${Math.round(minutos)} min`;
    }
    const horas = Math.floor(minutos / 60);
    const mins = Math.round(minutos % 60);
    return `${horas}h ${mins}m`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center space-x-2">
        <AlertCircle className="h-5 w-5" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard de Despachos
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Métricas y estadísticas del centro de distribución
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => window.location.href = '/admin/despacho/lista'}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Ver Lista
          </button>
          <button
            onClick={fetchDashboardData}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
          >
            Actualizar
          </button>
        </div>
      </div>

      {/* Métricas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Despachos</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.total_despachos || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Calendar className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Despachos Hoy</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.despachos_hoy || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <Clock className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Tiempo Promedio Picking</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatearTiempo(stats?.tiempo_promedio_picking || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
              <Users className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Despachadores Activos</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.despachadores_activos || 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Estados de Despacho */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <PieChart className="h-5 w-5 mr-2" />
              Estado de Despachos
            </h3>
          </div>
          <div className="p-4">
            {stats?.despachos_por_estado ? (
              <div className="space-y-3">
                {Object.entries(stats.despachos_por_estado).map(([estado, cantidad]) => (
                  <div key={estado} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${obtenerColorEstado(estado)}`}>
                        {estado.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{cantidad}</span>
                      <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ 
                            width: `${stats.total_despachos > 0 ? (cantidad / stats.total_despachos) * 100 : 0}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">No hay datos de estados disponibles</p>
              </div>
            )}
          </div>
        </div>

        {/* Eficiencia de Entrega */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Métricas de Rendimiento
            </h3>
          </div>
          <div className="p-4">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Eficiencia de Entrega</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{stats?.eficiencia_entrega || 0}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ width: `${stats?.eficiencia_entrega || 0}%` }}
                  ></div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Entregas</p>
                    <p className="text-lg font-bold text-green-600">
                      {stats?.despachos_por_estado?.ENTREGADO || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">En Proceso</p>
                    <p className="text-lg font-bold text-blue-600">
                      {Object.entries(stats?.despachos_por_estado || {})
                        .filter(([estado]) => estado !== 'ENTREGADO')
                        .reduce((sum, [, cantidad]) => sum + cantidad, 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Despachos Recientes */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Despachos Recientes
          </h3>
        </div>
        {despachosRecientes.length === 0 ? (
          <div className="p-8 text-center">
            <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No hay despachos recientes</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Despacho
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Despachador
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Fecha Creación
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {despachosRecientes.map((despacho) => (
                  <tr key={despacho.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Truck className="h-5 w-5 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            Despacho #{despacho.id}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Pedido #{despacho.pedido_id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">{despacho.cliente_nombre}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">{despacho.despachador_nombre}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${obtenerColorEstado(despacho.estado)}`}>
                        {despacho.estado.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatearFecha(despacho.fecha_creacion)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => window.location.href = `/admin/despacho/${despacho.id}`}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}