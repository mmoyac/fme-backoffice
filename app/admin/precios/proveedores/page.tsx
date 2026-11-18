'use client';

import { useState, useEffect } from 'react';
import { AuthService } from '@/lib/auth';
import DataList from '@/components/ui/DataList';

// Tipos TypeScript
interface PrecioProveedorConDetalles {
  id: number;
  producto_id: number;
  proveedor_id: number;
  precio_kg: number;
  precio_minimo_kg: number | null;
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
  precio_minimo_kg?: number | null;
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
    precio_minimo_kg: null,
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
        fetch(`${API_URL}/api/maestras/productos-carnes`, { headers }),
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
      setFormData({ producto_id: 0, proveedor_id: 0, precio_kg: 0, precio_minimo_kg: null, notas: '' });
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
        precio_minimo_kg: precio.precio_minimo_kg ?? null,
        notas: precio.notas || ''
      });
    } else {
      setEditandoId(null);
      setFormData({ producto_id: 0, proveedor_id: 0, precio_kg: 0, precio_minimo_kg: null, notas: '' });
    }
    setModalAbierto(true);
  };

  if (loading) return <div className="p-6 text-white">Cargando precios...</div>;
  if (error) return <div className="p-6 text-red-400">Error: {error}</div>;

  const precioKg = (p: PrecioProveedorConDetalles) => (
    <div className="text-lg font-bold text-primary">${p.precio_kg.toLocaleString('es-CL')}</div>
  );
  const precioMinimo = (p: PrecioProveedorConDetalles) =>
    p.precio_minimo_kg !== null ? (
      <div className="text-base font-semibold text-amber-400">${p.precio_minimo_kg.toLocaleString('es-CL')}</div>
    ) : (
      <div className="text-sm text-gray-500">— sin límite</div>
    );
  const vigencia = (p: PrecioProveedorConDetalles) => new Date(p.fecha_vigencia).toLocaleDateString('es-CL');
  const estadoBadge = (p: PrecioProveedorConDetalles) => (
    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
      p.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
    }`}>
      {p.activo ? 'Activo' : 'Inactivo'}
    </span>
  );
  const accionesPrecio = (p: PrecioProveedorConDetalles) => (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm font-medium">
      <button onClick={() => abrirModal(p)} className="text-blue-400 hover:text-blue-300">
        Editar
      </button>
      <button onClick={() => eliminarPrecio(p.id)} className="text-red-400 hover:text-red-300">
        Desactivar
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold text-white">Precios por Proveedor</h1>
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
      <div>
        <div className="mb-3">
          <h3 className="text-lg font-semibold text-white">Precios Configurados ({precios.length})</h3>
        </div>

        {precios.length === 0 ? (
          <div className="p-8 text-center bg-slate-800 rounded-lg border border-slate-700">
            <div className="text-gray-400 mb-4">No hay precios configurados</div>
            <button
              onClick={() => abrirModal()}
              className="text-primary hover:text-primary-dark"
            >
              Crear el primer precio
            </button>
          </div>
        ) : (
          <DataList
            items={precios}
            getKey={(p) => p.id}
            columns={[
              {
                header: 'Producto',
                className: 'w-[22%]',
                cell: (p) => (
                  <>
                    <div className="font-medium text-white truncate" title={p.producto_nombre}>{p.producto_nombre}</div>
                    <div className="text-xs text-gray-400">{p.producto_sku}</div>
                  </>
                ),
              },
              {
                header: 'Proveedor',
                className: 'w-[20%]',
                cell: (p) => (
                  <>
                    <div className="font-medium text-white truncate" title={p.proveedor_nombre}>{p.proveedor_nombre}</div>
                    <div className="text-xs text-gray-400">{p.proveedor_rut}</div>
                  </>
                ),
              },
              { header: 'Precio/kg', className: 'w-[12%]', sinTruncar: true, cell: precioKg },
              { header: 'Mínimo/kg', className: 'w-[12%]', sinTruncar: true, cell: precioMinimo },
              { header: 'Vigencia', className: 'w-[10%]', sinTruncar: true, cell: (p) => <span className="text-gray-300">{vigencia(p)}</span> },
              { header: 'Estado', className: 'w-[9%]', sinTruncar: true, cell: estadoBadge },
              { header: 'Acciones', className: 'w-[15%]', sinTruncar: true, cell: accionesPrecio },
            ]}
            card={(p) => (
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-white break-words">{p.producto_nombre}</div>
                    <div className="text-xs text-gray-400">{p.producto_sku}</div>
                  </div>
                  <div className="shrink-0">{estadoBadge(p)}</div>
                </div>
                <div className="text-sm">
                  <span className="text-white">{p.proveedor_nombre}</span>{' '}
                  <span className="text-xs text-gray-400">{p.proveedor_rut}</span>
                </div>
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <div className="text-xs text-gray-400">Precio/kg</div>
                    {precioKg(p)}
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Precio Mínimo/kg</div>
                    {precioMinimo(p)}
                  </div>
                  <div className="text-xs text-gray-400">Vigencia {vigencia(p)}</div>
                </div>
                <div className="pt-2 border-t border-slate-700">{accionesPrecio(p)}</div>
              </div>
            )}
          />
        )}
      </div>

      {/* Modal de creación/edición */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 sm:p-6 w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto">
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
                  placeholder="Ej: 6850"
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Precio mínimo por kg{' '}
                  <span className="text-gray-500 font-normal">(opcional — habilita descuentos del vendedor)</span>
                </label>
                <input
                  type="number"
                  value={formData.precio_minimo_kg ?? ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, precio_minimo_kg: e.target.value === '' ? null : Number(e.target.value) }))}
                  step="0.01"
                  min="0"
                  max={formData.precio_kg || undefined}
                  placeholder="Ej: 6650 (dejar vacío para no permitir descuentos)"
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 focus:ring-2 focus:ring-amber-400"
                />
                {formData.precio_minimo_kg !== null && formData.precio_kg > 0 && (
                  <p className="text-xs text-amber-400 mt-1">
                    El vendedor podrá bajar hasta ${Number(formData.precio_minimo_kg).toLocaleString('es-CL')}/kg
                    (descuento máx. ${(formData.precio_kg - Number(formData.precio_minimo_kg)).toLocaleString('es-CL')}/kg)
                  </p>
                )}
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