'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import { useParams } from 'next/navigation';
import { 
  Package, 
  User, 
  MapPin, 
  Clock, 
  CheckCircle, 
  Edit,
  ArrowLeft,
  Truck,
  Calendar,
  FileText,
  AlertCircle
} from 'lucide-react';

interface PickingItem {
  id: number;
  producto_nombre: string;
  producto_sku: string;
  cantidad_solicitada: number;
  cantidad_recogida: number;
  completado: boolean;
  notas?: string;
}

interface Despacho {
  id: number;
  pedido_id: number;
  pedido_numero?: string;
  estado_despacho: string;  // Corregido: era 'estado'
  cliente_nombre: string;
  cliente_telefono?: string;
  cliente_email?: string;
  direccion_entrega: string;
  despachador_nombre: string;
  despachador_email: string;
  fecha_asignacion: string;  // Corregido: era 'fecha_creacion'
  fecha_inicio_picking?: string;
  fecha_fin_picking?: string;
  fecha_inicio_ruta?: string;  // Agregado
  fecha_entrega?: string;
  hora_estimada_entrega?: string;
  notas_despacho?: string;
  picking_items: PickingItem[];
  pedido_monto_total: number;
  pedido_total?: number;  // Alias
  pedido_notas?: string;
}

export default function DetalleDespacho() {
  const { user } = useAuth();
  const params = useParams();
  const despachoId = params.id as string;
  
  const [despacho, setDespacho] = useState<Despacho | null>(null);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(false);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{tipo: 'success' | 'error', texto: string} | null>(null);
  
  const [formData, setFormData] = useState({
    estado: '',
    hora_estimada_entrega: '',
    notas_despacho: ''
  });

  useEffect(() => {
    if (user?.access_token && despachoId) {
      fetchDespacho();
    }
  }, [user, despachoId]);

  const fetchDespacho = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/despachos/${despachoId}`,
        {
          headers: {
            'Authorization': `Bearer ${user?.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setDespacho(data);
        setFormData({
          estado: data.estado_despacho,  // Corregido: era data.estado
          hora_estimada_entrega: data.hora_estimada_entrega 
            ? new Date(data.hora_estimada_entrega).toISOString().slice(0, 16)
            : '',
          notas_despacho: data.notas_despacho || ''
        });
      } else if (response.status === 404) {
        setError('Despacho no encontrado');
      } else {
        setError('Error al cargar el despacho');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const actualizarDespacho = async () => {
    try {
      setActualizando(true);
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/despachos/${despachoId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${user?.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            estado_despacho: formData.estado,  // Corregido: enviar como estado_despacho
            hora_estimada_entrega: formData.hora_estimada_entrega 
              ? new Date(formData.hora_estimada_entrega).toISOString()
              : null,
            notas_despacho: formData.notas_despacho
          })
        }
      );

      if (response.ok) {
        setMensaje({tipo: 'success', texto: 'Despacho actualizado correctamente'});
        setEditando(false);
        fetchDespacho(); // Recargar datos
      } else {
        const error = await response.json();
        setMensaje({tipo: 'error', texto: error.detail || 'Error al actualizar despacho'});
      }
    } catch (error) {
      console.error('Error:', error);
      setMensaje({tipo: 'error', texto: 'Error de conexión'});
    } finally {
      setActualizando(false);
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

  const calcularTiempoTranscurrido = (fechaInicio: string, fechaFin?: string) => {
    const inicio = new Date(fechaInicio);
    const fin = fechaFin ? new Date(fechaFin) : new Date();
    const diff = fin.getTime() - inicio.getTime();
    const minutos = Math.floor(diff / (1000 * 60));
    
    if (minutos < 60) {
      return `${minutos} min`;
    }
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
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
      <div className="space-y-4">
        <button
          onClick={() => window.location.href = '/admin/despacho/lista'}
          className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Volver a lista</span>
        </button>
        <div className="bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center space-x-2">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!despacho) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => window.location.href = '/admin/despacho/lista'}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Volver a lista</span>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Despacho #{despacho.id}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Pedido #{despacho.pedido_id} - {despacho.cliente_nombre}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          {!editando ? (
            <button
              onClick={() => setEditando(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
            >
              <Edit className="h-4 w-4" />
              <span>Editar</span>
            </button>
          ) : (
            <>
              <button
                onClick={() => setEditando(false)}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={actualizarDespacho}
                disabled={actualizando}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
              >
                {actualizando ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>Guardar</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Mensaje de estado */}
      {mensaje && (
        <div className={`p-4 rounded-lg flex items-center space-x-2 ${
          mensaje.tipo === 'success' 
            ? 'bg-green-100 text-green-800 border border-green-200' 
            : 'bg-red-100 text-red-800 border border-red-200'
        }`}>
          {mensaje.tipo === 'success' ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          <span>{mensaje.texto}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Información General */}
        <div className="lg:col-span-2 space-y-6">
          {/* Estado y Fechas */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Estado y Timeline
              </h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Estado Actual
                  </label>
                  {editando ? (
                    <select
                      value={formData.estado}
                      onChange={(e) => setFormData({...formData, estado: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="ASIGNADO">Asignado</option>
                      <option value="EN_PICKING">En Picking</option>
                      <option value="LISTO_EMPAQUE">Listo Empaque</option>
                      <option value="EN_RUTA">En Ruta</option>
                      <option value="ENTREGADO">Entregado</option>
                    </select>
                  ) : (
                    <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full border ${obtenerColorEstado(despacho.estado_despacho)}`}>
                      {despacho.estado_despacho.replace('_', ' ')}
                    </span>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Hora Estimada Entrega
                  </label>
                  {editando ? (
                    <input
                      type="datetime-local"
                      value={formData.hora_estimada_entrega}
                      onChange={(e) => setFormData({...formData, hora_estimada_entrega: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  ) : (
                    <p className="text-sm text-gray-900 dark:text-white">
                      {despacho.hora_estimada_entrega 
                        ? formatearFecha(despacho.hora_estimada_entrega)
                        : 'No definida'
                      }
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Asignado</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{formatearFecha(despacho.fecha_asignacion)}</p>
                  </div>
                </div>

                {despacho.fecha_asignacion && (
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-2 h-2 bg-yellow-600 rounded-full"></div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Asignado</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{formatearFecha(despacho.fecha_asignacion)}</p>
                    </div>
                  </div>
                )}

                {despacho.fecha_inicio_picking && (
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Inicio Picking</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{formatearFecha(despacho.fecha_inicio_picking)}</p>
                    </div>
                  </div>
                )}

                {despacho.fecha_fin_picking && (
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Fin Picking</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatearFecha(despacho.fecha_fin_picking)}
                        {despacho.fecha_inicio_picking && (
                          <span className="ml-2 text-xs text-blue-600">
                            ({calcularTiempoTranscurrido(despacho.fecha_inicio_picking, despacho.fecha_fin_picking)})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {despacho.fecha_entrega && (
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-2 h-2 bg-emerald-600 rounded-full"></div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Entregado</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{formatearFecha(despacho.fecha_entrega)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Items del Pedido */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Items del Despacho
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Producto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Solicitado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Recogido
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {despacho.picking_items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {item.producto_nombre}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            SKU: {item.producto_sku}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {item.cantidad_solicitada}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {item.cantidad_recogida}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.completado ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Completado
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <Clock className="h-3 w-3 mr-1" />
                            Pendiente
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Panel Lateral */}
        <div className="space-y-6">
          {/* Información del Cliente */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Cliente
              </h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-900 dark:text-white">{despacho.cliente_nombre}</span>
              </div>
              {despacho.cliente_telefono && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Tel:</span>
                  <span className="text-sm text-gray-900 dark:text-white">{despacho.cliente_telefono}</span>
                </div>
              )}
              {despacho.cliente_email && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Email:</span>
                  <span className="text-sm text-gray-900 dark:text-white">{despacho.cliente_email}</span>
                </div>
              )}
              <div className="flex items-start space-x-2">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                <span className="text-sm text-gray-900 dark:text-white">{despacho.direccion_entrega}</span>
              </div>
            </div>
          </div>

          {/* Información del Despachador */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Despachador
              </h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center space-x-2">
                <Truck className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-900 dark:text-white">{despacho.despachador_nombre}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">Email:</span>
                <span className="text-sm text-gray-900 dark:text-white">{despacho.despachador_email}</span>
              </div>
            </div>
          </div>

          {/* Información del Pedido */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Pedido
              </h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Número:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">#{despacho.pedido_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Total:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatearMoneda(despacho.pedido_monto_total)}
                </span>
              </div>
              {despacho.pedido_notas && (
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Notas:</span>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">{despacho.pedido_notas}</p>
                </div>
              )}
            </div>
          </div>

          {/* Notas del Despacho */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Notas del Despacho
              </h3>
            </div>
            <div className="p-4">
              {editando ? (
                <textarea
                  value={formData.notas_despacho}
                  onChange={(e) => setFormData({...formData, notas_despacho: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Agregar notas del despacho..."
                />
              ) : (
                <p className="text-sm text-gray-900 dark:text-white">
                  {despacho.notas_despacho || 'Sin notas adicionales'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}