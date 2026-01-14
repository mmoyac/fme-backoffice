'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthProvider';
import { AuthService } from '@/lib/auth';

interface ProductoSinPrecio {
  producto_id: number;
  producto_nombre: string;
  producto_sku: string;
  proveedor_id: number;
  proveedor_nombre: string;
  enrolamientos_pendientes: EnrolamientoPendiente[];
  total_cajas: number;
  peso_total_kg: number;
}

interface EnrolamientoPendiente {
  enrolamiento_id: number;
  patente: string;
  estado: string;
  cajas_producto: number;
  peso_kg: number;
}

export default function ProductosSinPrecioPage() {
  const { user } = useAuth();
  const [productos, setProductos] = useState<ProductoSinPrecio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const getHeaders = () => AuthService.getAuthHeaders();

  useEffect(() => {
    cargarProductosSinPrecio();
  }, []);

  const cargarProductosSinPrecio = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/api/alertas/productos-sin-precio`, {
        headers: getHeaders(),
      });

      if (!response.ok) {
        throw new Error('Error al cargar productos sin precio');
      }

      const data = await response.json();
      setProductos(data);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-xl text-gray-300">Cargando productos sin precio...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-600/20 border border-red-600/30 rounded-lg p-4">
          <div className="text-red-400 font-semibold">Error</div>
          <div className="text-red-300">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center space-x-4 mb-2">
            <Link
              href="/admin/alertas"
              className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
            >
              <span>←</span>
              <span>Volver a Alertas</span>
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-white">Productos sin Precio Configurado</h1>
          <p className="text-gray-400 mt-2">
            Productos que han llegado en enrolamientos pero no tienen precio configurado por proveedor
          </p>
        </div>
        
        <Link
          href="/admin/precios/proveedores"
          className="bg-primary hover:bg-primary-dark text-slate-900 font-semibold px-6 py-3 rounded-lg transition-colors"
        >
          Configurar Precios
        </Link>
      </div>

      {/* Estado */}
      {productos.length === 0 ? (
        <div className="bg-slate-800 rounded-lg p-8 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-lg font-semibold text-white mb-2">Todos los productos tienen precios configurados</h3>
          <p className="text-gray-400">
            No hay productos pendientes de configuración de precios.
          </p>
        </div>
      ) : (
        <>
          {/* Resumen */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-orange-600/20 border border-orange-600/30 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-orange-400">{productos.length}</div>
              <div className="text-orange-300">Productos sin Precio</div>
            </div>
            
            <div className="bg-slate-700 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-blue-400">
                {productos.reduce((sum, p) => sum + p.total_cajas, 0)}
              </div>
              <div className="text-gray-300">Cajas Afectadas</div>
            </div>
            
            <div className="bg-slate-700 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-green-400">
                {productos.reduce((sum, p) => sum + p.peso_total_kg, 0).toLocaleString('es-CL', { maximumFractionDigits: 1 })}kg
              </div>
              <div className="text-gray-300">Peso Total</div>
            </div>
          </div>

          {/* Alerta */}
          <div className="bg-orange-600/20 border border-orange-600/30 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="text-2xl">⚠️</div>
              <div>
                <div className="text-orange-400 font-semibold">Acción Requerida</div>
                <div className="text-orange-300 mt-1">
                  Los siguientes productos necesitan configuración de precios para poder ser incluidos en pedidos de cajas.
                  El stock se creará automáticamente al finalizar los enrolamientos, pero no podrán ser pedidos hasta configurar los precios.
                </div>
              </div>
            </div>
          </div>

          {/* Lista de productos */}
          <div className="space-y-4">
            {productos.map((producto) => (
              <div key={`${producto.producto_id}-${producto.proveedor_id}`} className="bg-slate-800 rounded-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-white">{producto.producto_nombre}</h3>
                    <div className="text-gray-400">{producto.producto_sku} • {producto.proveedor_nombre}</div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-2xl font-bold text-orange-400">{producto.total_cajas}</div>
                    <div className="text-sm text-gray-400">cajas</div>
                  </div>
                </div>

                {/* Enrolamientos afectados */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-300">Enrolamientos afectados:</h4>
                  {producto.enrolamientos_pendientes.map((enr) => (
                    <div key={enr.enrolamiento_id} className="bg-slate-700 p-3 rounded flex justify-between items-center">
                      <div>
                        <div className="text-white font-medium">Enrolamiento #{enr.enrolamiento_id}</div>
                        <div className="text-gray-400 text-sm">{enr.patente} • {enr.estado}</div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-white">{enr.cajas_producto} cajas</div>
                        <div className="text-gray-400 text-sm">{enr.peso_kg.toLocaleString('es-CL', { maximumFractionDigits: 1 })}kg</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Acción */}
                <div className="mt-4 pt-4 border-t border-slate-700 flex justify-between items-center">
                  <div className="text-sm text-gray-400">
                    Configure el precio por kilogramo para este proveedor
                  </div>
                  
                  <Link
                    href={`/admin/precios/proveedores?producto=${producto.producto_id}&proveedor=${producto.proveedor_id}`}
                    className="bg-primary hover:bg-primary-dark text-slate-900 font-semibold px-4 py-2 rounded transition-colors"
                  >
                    Configurar Precio
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}