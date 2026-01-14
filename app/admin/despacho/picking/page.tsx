'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import { 
  Package, 
  CheckCircle, 
  Clock, 
  QrCode, 
  ShoppingCart, 
  AlertCircle,
  Play,
  CheckSquare,
  Truck
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
  estado: string;
  cliente_nombre: string;
  despachador_nombre: string;
  fecha_creacion: string;
  hora_estimada_entrega: string | null;
  notas_despacho: string | null;
  picking_items: PickingItem[];
}

export default function Picking() {
  const { user } = useAuth();
  const [despachos, setDespachos] = useState<Despacho[]>([]);
  const [selectedDespacho, setSelectedDespacho] = useState<Despacho | null>(null);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState<{tipo: 'success' | 'error', texto: string} | null>(null);

  useEffect(() => {
    if (user?.access_token) {
      fetchDespachosEnPicking();
    }
  }, [user]);

  const fetchDespachosEnPicking = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/despachos/?estado=ASIGNADO,EN_PICKING`,
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

  const iniciarPicking = async (despachoId: number) => {
    try {
      setProcesando(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/despachos/${despachoId}/iniciar-picking`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user?.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        setMensaje({tipo: 'success', texto: 'Picking iniciado correctamente'});
        fetchDespachosEnPicking();
        // Recargar el despacho seleccionado si es el mismo
        if (selectedDespacho?.id === despachoId) {
          const updatedDespacho = await response.json();
          setSelectedDespacho(updatedDespacho);
        }
      } else {
        const error = await response.json();
        setMensaje({tipo: 'error', texto: error.detail || 'Error al iniciar picking'});
      }
    } catch (error) {
      console.error('Error:', error);
      setMensaje({tipo: 'error', texto: 'Error de conexión'});
    } finally {
      setProcesando(false);
    }
  };

  const actualizarPickingItem = async (itemId: number, cantidadRecogida: number) => {
    if (!selectedDespacho) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/despachos/picking-item/${itemId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${user?.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ cantidad_recogida: cantidadRecogida })
        }
      );

      if (response.ok) {
        // Actualizar el estado local
        setSelectedDespacho(prev => {
          if (!prev) return null;
          return {
            ...prev,
            picking_items: prev.picking_items.map(item => 
              item.id === itemId 
                ? { ...item, cantidad_recogida: cantidadRecogida, completado: cantidadRecogida >= item.cantidad_solicitada }
                : item
            )
          };
        });
      } else {
        const error = await response.json();
        setMensaje({tipo: 'error', texto: error.detail || 'Error al actualizar item'});
      }
    } catch (error) {
      console.error('Error:', error);
      setMensaje({tipo: 'error', texto: 'Error de conexión'});
    }
  };

  const completarPicking = async () => {
    if (!selectedDespacho) return;

    try {
      setProcesando(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/despachos/${selectedDespacho.id}/completar-picking`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user?.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        setMensaje({tipo: 'success', texto: 'Picking completado correctamente'});
        setSelectedDespacho(null);
        fetchDespachosEnPicking();
      } else {
        const error = await response.json();
        setMensaje({tipo: 'error', texto: error.detail || 'Error al completar picking'});
      }
    } catch (error) {
      console.error('Error:', error);
      setMensaje({tipo: 'error', texto: 'Error de conexión'});
    } finally {
      setProcesando(false);
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
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const todosLosItemsCompletos = selectedDespacho?.picking_items.every(item => item.completado) || false;

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
            Centro de Picking
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gestión de recolección de productos para despachos
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => window.location.href = '/admin/despacho/lista'}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
          >
            Ver Lista
          </button>
          {selectedDespacho && (
            <button
              onClick={() => setSelectedDespacho(null)}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
            >
              Volver a Lista
            </button>
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

      {!selectedDespacho ? (
        /* Lista de Despachos */
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Despachos Disponibles para Picking
            </h2>
          </div>
          
          {despachos.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                No hay despachos disponibles para picking
              </p>
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
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {despachos.map((despacho) => (
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        {despacho.estado === 'ASIGNADO' ? (
                          <button
                            onClick={() => iniciarPicking(despacho.id)}
                            disabled={procesando}
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-xs flex items-center space-x-1"
                          >
                            <Play className="h-3 w-3" />
                            <span>Iniciar Picking</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => setSelectedDespacho(despacho)}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs flex items-center space-x-1"
                          >
                            <ShoppingCart className="h-3 w-3" />
                            <span>Continuar Picking</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Interface de Picking Detallado */
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Información del Despacho */}
          <div className="xl:col-span-1 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Despacho #{selectedDespacho.id}
              </h3>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Cliente</label>
                <p className="text-sm text-gray-900 dark:text-white">{selectedDespacho.cliente_nombre}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Despachador</label>
                <p className="text-sm text-gray-900 dark:text-white">{selectedDespacho.despachador_nombre}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Estado</label>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${obtenerColorEstado(selectedDespacho.estado)}`}>
                  {selectedDespacho.estado.replace('_', ' ')}
                </span>
              </div>
              {selectedDespacho.hora_estimada_entrega && (
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Entrega Estimada</label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {formatearFecha(selectedDespacho.hora_estimada_entrega)}
                  </p>
                </div>
              )}
              {selectedDespacho.notas_despacho && (
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Notas</label>
                  <p className="text-sm text-gray-900 dark:text-white">{selectedDespacho.notas_despacho}</p>
                </div>
              )}
            </div>
          </div>

          {/* Lista de Items para Picking */}
          <div className="xl:col-span-3 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Items para Recoger
              </h3>
              {selectedDespacho.estado === 'EN_PICKING' && (
                <button
                  onClick={completarPicking}
                  disabled={!todosLosItemsCompletos || procesando}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                >
                  {procesando ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Completando...</span>
                    </>
                  ) : (
                    <>
                      <CheckSquare className="h-4 w-4" />
                      <span>Completar Picking</span>
                    </>
                  )}
                </button>
              )}
            </div>
            
            <div className="p-4">
              <div className="space-y-4">
                {selectedDespacho.picking_items.map((item) => (
                  <div
                    key={item.id}
                    className={`p-4 rounded-lg border-2 ${
                      item.completado
                        ? 'border-green-200 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          {item.completado ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <Clock className="h-5 w-5 text-gray-400" />
                          )}
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {item.producto_nombre}
                            </h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              SKU: {item.producto_sku}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="text-center">
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                            Solicitado
                          </label>
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            {item.cantidad_solicitada}
                          </span>
                        </div>
                        
                        <div className="text-center">
                          <label htmlFor={`cantidad-${item.id}`} className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                            Recogido
                          </label>
                          <input
                            id={`cantidad-${item.id}`}
                            type="number"
                            min="0"
                            max={item.cantidad_solicitada}
                            value={item.cantidad_recogida}
                            onChange={(e) => actualizarPickingItem(item.id, parseInt(e.target.value) || 0)}
                            className="w-16 px-2 py-1 text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            disabled={selectedDespacho.estado !== 'EN_PICKING'}
                          />
                        </div>

                        <QrCode className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {!todosLosItemsCompletos && selectedDespacho.estado === 'EN_PICKING' && (
                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    Complete todos los items para finalizar el picking
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}