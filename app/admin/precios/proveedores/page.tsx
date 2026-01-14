'use client';

import { useState, useEffect } from 'react';
import { AuthService } from '@/lib/auth';

// Tipos TypeScript
interface PrecioProveedorConDetalles {
  id: number;
  producto_id: number;
  proveedor_id: number;
  precio_kg: number;
  fecha_vigencia: string;
  activo: boolean;
  notas?: string;
  producto_nombre: string;
  producto_sku: string;
  proveedor_nombre: string;
  proveedor_rut: string;
}

interface Producto {
  id: number;
  nombre: string;
  sku: string;
}

interface Proveedor {
  id: number;
  nombre: string;
  rut: string;
}

interface PrecioProveedorCreate {
  producto_id: number;
  proveedor_id: number;
  precio_kg: number;
  notas?: string;
}

export default function PreciosProveedorPage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  
  const [precios, setPrecios] = useState<PrecioProveedorConDetalles[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estado para modal de creación/edición
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [formData, setFormData] = useState<PrecioProveedorCreate>({
    producto_id: 0,
    proveedor_id: 0,
    precio_kg: 0,
    notas: ''
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = AuthService.getToken();
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const [preciosRes, productosRes, proveedoresRes] = await Promise.all([
        fetch(`${API_URL}/api/precios-proveedor/`, { headers }),
        fetch(`${API_URL}/api/productos/`, { headers }),
        fetch(`${API_URL}/api/enrolamiento/proveedores-carne`, { headers })
      ]);

      if (!preciosRes.ok || !productosRes.ok || !proveedoresRes.ok) {
        throw new Error('Error al cargar datos');
      }

      const [preciosData, productosData, proveedoresData] = await Promise.all([
        preciosRes.json(),
        productosRes.json(),
        proveedoresRes.json()
      ]);

      setPrecios(preciosData);
      setProductos(productosData);
      setProveedores(proveedoresData);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = AuthService.getToken();
      const url = editandoId 
        ? `${API_URL}/api/precios-proveedor/${editandoId}` 
        : `${API_URL}/api/precios-proveedor/`;
      
      const method = editandoId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al guardar precio');
      }

      setModalAbierto(false);
      setEditandoId(null);
      setFormData({ producto_id: 0, proveedor_id: 0, precio_kg: 0, notas: '' });
      cargarDatos();

    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al guardar');
    }
  };

  const eliminarPrecio = async (id: number) => {
    if (!confirm('¿Está seguro de desactivar este precio?')) return;

    try {
      const token = AuthService.getToken();
      const response = await fetch(`${API_URL}/api/precios-proveedor/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error al eliminar precio');
      }

      cargarDatos();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar');
    }
  };

  const abrirModal = (precio?: PrecioProveedorConDetalles) => {
    if (precio) {
      setEditandoId(precio.id);
      setFormData({
        producto_id: precio.producto_id,
        proveedor_id: precio.proveedor_id,
        precio_kg: precio.precio_kg,
        notas: precio.notas || ''
      });
    } else {
      setEditandoId(null);
      setFormData({ producto_id: 0, proveedor_id: 0, precio_kg: 0, notas: '' });
    }
    setModalAbierto(true);
  };

  if (loading) return <div className="p-6 text-white">Cargando precios...</div>;
  if (error) return <div className="p-6 text-red-400">Error: {error}</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white">Precios por Proveedor</h1>
          <p className="text-gray-400">Gestión de precios por kilogramo para cajas variables</p>
        </div>
        <button
          onClick={() => abrirModal()}
          className="bg-primary hover:bg-primary-dark text-slate-900 font-semibold px-6 py-2 rounded-lg transition-colors"
        >
          + Nuevo Precio
        </button>
      </div>

      {/* Información */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
        <h4 className="font-semibold text-white mb-2">💰 Gestión de Precios por Proveedor</h4>
        <p className="text-sm text-gray-300">
          Configure los precios por kilogramo para cada producto según el proveedor. 
          Estos precios se usarán para calcular automáticamente el valor de las cajas variables.
        </p>
      </div>

      {/* Tabla de precios */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700">
          <h3 className="text-lg font-semibold text-white">Precios Configurados ({precios.length})</h3>
        </div>

        {precios.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-400 mb-4">No hay precios configurados</div>
            <button
              onClick={() => abrirModal()}
              className="text-primary hover:text-primary-dark"
            >
              Crear el primer precio
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700">
              <thead className="bg-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Proveedor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Precio/kg
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Fecha Vigencia
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-slate-800 divide-y divide-slate-700">
                {precios.map((precio) => (
                  <tr key={precio.id} className="hover:bg-slate-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">{precio.producto_nombre}</div>
                      <div className="text-sm text-gray-400">{precio.producto_sku}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">{precio.proveedor_nombre}</div>
                      <div className="text-sm text-gray-400">{precio.proveedor_rut}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-lg font-bold text-primary">
                        ${precio.precio_kg.toLocaleString('es-CL')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">
                        {new Date(precio.fecha_vigencia).toLocaleDateString('es-CL')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        precio.activo 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {precio.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => abrirModal(precio)}
                        className="text-blue-400 hover:text-blue-300 mr-3"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => eliminarPrecio(precio.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        Desactivar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de creación/edición */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">
              {editandoId ? 'Editar Precio' : 'Nuevo Precio'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Producto *
                </label>
                <select
                  value={formData.producto_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, producto_id: Number(e.target.value) }))}
                  required
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 focus:ring-2 focus:ring-primary"
                >
                  <option value={0}>Seleccionar producto...</option>
                  {productos.map(producto => (
                    <option key={producto.id} value={producto.id}>
                      {producto.nombre} ({producto.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Proveedor *
                </label>
                <select
                  value={formData.proveedor_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, proveedor_id: Number(e.target.value) }))}
                  required
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 focus:ring-2 focus:ring-primary"
                >
                  <option value={0}>Seleccionar proveedor...</option>
                  {proveedores.map(proveedor => (
                    <option key={proveedor.id} value={proveedor.id}>
                      {proveedor.nombre} ({proveedor.rut})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Precio por kg *
                </label>
                <input
                  type="number"
                  value={formData.precio_kg}
                  onChange={(e) => setFormData(prev => ({ ...prev, precio_kg: Number(e.target.value) }))}
                  step="0.01"
                  min="0"
                  required
                  placeholder="Ej: 5500"
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Notas
                </label>
                <textarea
                  value={formData.notas}
                  onChange={(e) => setFormData(prev => ({ ...prev, notas: e.target.value }))}
                  rows={3}
                  placeholder="Notas opcionales sobre este precio..."
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="px-4 py-2 text-gray-300 border border-gray-600 rounded hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-slate-900 font-semibold rounded hover:bg-primary-dark"
                >
                  {editandoId ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}