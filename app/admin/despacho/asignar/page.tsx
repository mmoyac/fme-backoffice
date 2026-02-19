'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import { Package, User, Calendar, AlertCircle, CheckCircle } from 'lucide-react';

interface Pedido {
  id: number;
  numero_pedido?: string;
  cliente_nombre: string;
  cliente?: {
    direccion?: string;
    comuna?: string;
    telefono?: string;
  };
  monto_total: number;
  fecha_pedido: string;
  notas: string;
  items: any[];
  estado: string;
}

interface Usuario {
  id: number;
  nombre_completo: string;
  email: string;
  local_defecto_id?: number;
}

export default function AsignarDespacho() {
  const { user } = useAuth();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [asignando, setAsignando] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    despachador_user_id: '',
    notas_despacho: '',
    hora_estimada_entrega: ''
  });
  const [mensaje, setMensaje] = useState<{tipo: 'success' | 'error', texto: string} | null>(null);

  useEffect(() => {
    if (user?.access_token) {
      fetchPedidosConfirmados();
      fetchUsuarios();
    }
  }, [user]);

  const fetchPedidosConfirmados = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/pedidos/?estado=CONFIRMADO`,
        {
          headers: {
            'Authorization': `Bearer ${user?.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Filtrar pedidos que no tienen despacho asignado
        setPedidos(data.filter((p: any) => !p.despacho));
      } else {
        console.error('Error al cargar pedidos confirmados');
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsuarios = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/users`,
        {
          headers: {
            'Authorization': `Bearer ${user?.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setUsuarios(data);
      } else {
        console.error('Error al cargar usuarios');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const asignarDespacho = async () => {
    if (!selectedPedido || !formData.despachador_user_id) {
      setMensaje({tipo: 'error', texto: 'Debe seleccionar un pedido y un despachador'});
      return;
    }

    try {
      setAsignando(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/despachos/asignar/${selectedPedido}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user?.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            despachador_user_id: parseInt(formData.despachador_user_id),
            notas_despacho: formData.notas_despacho,
            hora_estimada_entrega: formData.hora_estimada_entrega ? new Date(formData.hora_estimada_entrega).toISOString() : null
          })
        }
      );

      if (response.ok) {
        setMensaje({tipo: 'success', texto: 'Despacho asignado correctamente'});
        setSelectedPedido(null);
        setFormData({
          despachador_user_id: '',
          notas_despacho: '',
          hora_estimada_entrega: ''
        });
        fetchPedidosConfirmados(); // Recargar lista
      } else {
        const error = await response.json();
        setMensaje({tipo: 'error', texto: error.detail || 'Error al asignar despacho'});
      }
    } catch (error) {
      console.error('Error:', error);
      setMensaje({tipo: 'error', texto: 'Error de conexión'});
    } finally {
      setAsignando(false);
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
            Asignar Despacho
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Asignar pedidos confirmados a despachadores
          </p>
        </div>
        <button
          onClick={() => window.location.href = '/admin/despacho/lista'}
          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
        >
          Ver Lista
        </button>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lista de Pedidos Confirmados */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Pedidos Pendientes de Asignación
            </h2>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {pedidos.length === 0 ? (
              <div className="p-8 text-center">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  No hay pedidos confirmados pendientes de asignación
                </p>
              </div>
            ) : (
              <div className="space-y-2 p-4">
                {pedidos.map((pedido) => (
                  <div
                    key={pedido.id}
                    onClick={() => setSelectedPedido(pedido.id)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                      selectedPedido === pedido.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <Package className="h-4 w-4 text-gray-400" />
                          <span className="font-medium text-gray-900 dark:text-white">
                            #{pedido.numero_pedido}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Cliente: {pedido.cliente_nombre}
                        </p>
                        {pedido.cliente?.direccion && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            📍 {pedido.cliente.direccion}
                            {pedido.cliente.comuna && `, ${pedido.cliente.comuna}`}
                          </p>
                        )}
                        {pedido.cliente?.telefono && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            📞 {pedido.cliente.telefono}
                          </p>
                        )}
                        <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>{formatearFecha(pedido.fecha_pedido)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {formatearMoneda(pedido.monto_total)}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {pedido.items?.length || 0} items
                        </div>
                      </div>
                    </div>
                    
                    {pedido.notas && (
                      <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm text-gray-600 dark:text-gray-300">
                        <strong>Dirección:</strong> {pedido.notas}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Formulario de Asignación */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Detalles de Asignación
            </h2>
          </div>
          
          <div className="p-4 space-y-4">
            {/* Seleccionar Despachador */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Despachador *
              </label>
              <select
                value={formData.despachador_user_id}
                onChange={(e) => setFormData({...formData, despachador_user_id: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              >
                <option value="">Seleccionar despachador</option>
                {usuarios.map((usuario) => (
                  <option key={usuario.id} value={usuario.id}>
                    {usuario.nombre_completo} ({usuario.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Hora estimada de entrega */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Hora Estimada de Entrega
              </label>
              <input
                type="datetime-local"
                value={formData.hora_estimada_entrega}
                onChange={(e) => setFormData({...formData, hora_estimada_entrega: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* Notas del despacho */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notas del Despacho
              </label>
              <textarea
                value={formData.notas_despacho}
                onChange={(e) => setFormData({...formData, notas_despacho: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Instrucciones especiales para el despachador..."
              />
            </div>

            {/* Botón de asignación */}
            <button
              onClick={asignarDespacho}
              disabled={!selectedPedido || !formData.despachador_user_id || asignando}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2"
            >
              {asignando ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Asignando...</span>
                </>
              ) : (
                <>
                  <User className="h-4 w-4" />
                  <span>Asignar Despacho</span>
                </>
              )}
            </button>

            {!selectedPedido && (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                Seleccione un pedido de la lista para continuar
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}