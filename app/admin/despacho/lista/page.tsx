'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import { Truck, Package, MapPin, Clock, Eye, User, Calendar } from 'lucide-react';

interface Despacho {
  id: number;
  pedido_id: number;
  despachador_user_id: number;
  estado_despacho: string;
  fecha_asignacion: string;
  fecha_inicio_picking?: string;
  fecha_fin_picking?: string;
  fecha_inicio_ruta?: string;
  fecha_entrega?: string;
  notas_despacho?: string;
  ubicacion_actual?: string;
  hora_estimada_entrega?: string;
  despachador_nombre?: string;
  pedido_numero?: string;
  pedido_total?: number;
  cliente_nombre?: string;
  direccion_entrega?: string;
}

const estadoConfig = {
  'ASIGNADO': { color: 'bg-gray-100 text-gray-800', label: 'Asignado', icon: Package },
  'EN_PICKING': { color: 'bg-blue-100 text-blue-800', label: 'En Picking', icon: Package },
  'LISTO_EMPAQUE': { color: 'bg-yellow-100 text-yellow-800', label: 'Listo para Empaque', icon: Package },
  'EN_RUTA': { color: 'bg-purple-100 text-purple-800', label: 'En Ruta', icon: Truck },
  'ENTREGADO': { color: 'bg-green-100 text-green-800', label: 'Entregado', icon: MapPin },
  'CANCELADO': { color: 'bg-red-100 text-red-800', label: 'Cancelado', icon: Package }
};

export default function ListaDespachos() {
  const { user } = useAuth();
  const [despachos, setDespachos] = useState<Despacho[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({
    estado: '',
    despachador_id: '',
    fecha_desde: '',
    fecha_hasta: ''
  });

  useEffect(() => {
    if (user?.access_token) {
      fetchDespachos();
    }
  }, [user, filtros]);

  const fetchDespachos = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filtros.estado) params.append('estado', filtros.estado);
      if (filtros.despachador_id) params.append('despachador_id', filtros.despachador_id);
      if (filtros.fecha_desde) params.append('fecha_desde', filtros.fecha_desde);
      if (filtros.fecha_hasta) params.append('fecha_hasta', filtros.fecha_hasta);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/despachos/?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${user?.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setDespachos(data);
      } else {
        console.error('Error al cargar despachos');
      }
    } catch (error) {
      console.error('Error:', error);
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

  const formatearMoneda = (monto: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(monto);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Lista de Despachos
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gestión y seguimiento de todos los despachos
          </p>
        </div>
        <button
          onClick={() => window.location.href = '/admin/despacho/asignar'}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
        >
          <Package className="h-4 w-4" />
          <span>Asignar Despacho</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Estado
            </label>
            <select
              value={filtros.estado}
              onChange={(e) => setFiltros({...filtros, estado: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Todos los estados</option>
              <option value="ASIGNADO">Asignado</option>
              <option value="EN_PICKING">En Picking</option>
              <option value="LISTO_EMPAQUE">Listo para Empaque</option>
              <option value="EN_RUTA">En Ruta</option>
              <option value="ENTREGADO">Entregado</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Fecha Desde
            </label>
            <input
              type="date"
              value={filtros.fecha_desde}
              onChange={(e) => setFiltros({...filtros, fecha_desde: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Fecha Hasta
            </label>
            <input
              type="date"
              value={filtros.fecha_hasta}
              onChange={(e) => setFiltros({...filtros, fecha_hasta: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={() => setFiltros({estado: '', despachador_id: '', fecha_desde: '', fecha_hasta: ''})}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md"
            >
              Limpiar Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Despachos */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        {despachos.length === 0 ? (
          <div className="p-8 text-center">
            <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No hay despachos registrados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Pedido
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
                    Fecha Asignación
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {despachos.map((despacho) => {
                  const estadoInfo = estadoConfig[despacho.estado_despacho as keyof typeof estadoConfig];
                  const IconoEstado = estadoInfo.icon;
                  
                  return (
                    <tr key={despacho.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {despacho.pedido_numero}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {despacho.cliente_nombre || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900 dark:text-white">
                            {despacho.despachador_nombre || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${estadoInfo.color}`}>
                          <IconoEstado className="h-3 w-3 mr-1" />
                          {estadoInfo.label}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900 dark:text-white">
                          <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                          {formatearFecha(despacho.fecha_asignacion)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {despacho.pedido_total ? formatearMoneda(despacho.pedido_total) : 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => window.location.href = `/admin/despacho/${despacho.id}`}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 inline-flex items-center"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver Detalle
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}