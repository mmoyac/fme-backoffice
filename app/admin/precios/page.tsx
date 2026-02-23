'use client';

import { useState, useEffect } from 'react';
import { getProductos, type Producto } from '@/lib/api/productos';
import { getLocales, type Local } from '@/lib/api/locales';
import { getPrecios, crearPrecio, updatePrecio, eliminarPrecio, type Precio } from '@/lib/api/precios';
import { getUnidadesMedida, type UnidadMedida } from '@/lib/api/maestras';

export default function PreciosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  // Productos ordenados alfabéticamente por nombre
  const productosOrdenados = [...productos].sort((a, b) => a.nombre.localeCompare(b.nombre));
  const [locales, setLocales] = useState<Local[]>([]);
  const [unidades, setUnidades] = useState<UnidadMedida[]>([]);
  const [precios, setPrecios] = useState<Precio[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para el modal de crear/editar precio
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPrecio, setEditingPrecio] = useState<Precio | null>(null);
  const [formData, setFormData] = useState({
    producto_id: 0,
    local_id: 0,
    unidad_medida_id: 0,
    monto_precio: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [prodData, locData, unidadesData, precData] = await Promise.all([
        getProductos(),
        getLocales(),
        getUnidadesMedida(),
        getPrecios()
      ]);
      setProductos(prodData);
      setLocales(locData);
      setUnidades(unidadesData);
      setPrecios(precData);
    } catch (err) {
      alert('Error al cargar datos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function getPreciosPorProducto(productoId: number) {
    return precios.filter(p => p.producto_id === productoId);
  }

  function getLocalNombre(localId: number) {
    return locales.find(l => l.id === localId)?.nombre || 'Desconocido';
  }

  function getUnidadNombre(unidadId: number) {
    return unidades.find(u => u.id === unidadId)?.nombre || 'Desconocido';
  }

  function handleOpenModal(producto: Producto) {
    setFormData({
      producto_id: producto.id,
      local_id: locales[0]?.id || 0,
      unidad_medida_id: unidades[0]?.id || 0,
      monto_precio: 0
    });
    setEditingPrecio(null);
    setModalOpen(true);
  }

  function handleEditPrecio(precio: Precio) {
    setFormData({
      producto_id: precio.producto_id,
      local_id: precio.local_id,
      unidad_medida_id: precio.unidad_medida_id,
      monto_precio: precio.monto_precio
    });
    setEditingPrecio(precio);
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (formData.monto_precio <= 0) {
      alert('El precio debe ser mayor a 0');
      return;
    }

    try {
      if (editingPrecio) {
        // Actualizar precio existente
        await updatePrecio(
          formData.producto_id,
          formData.local_id,
          formData.unidad_medida_id,
          formData.monto_precio
        );
      } else {
        // Crear nuevo precio
        await crearPrecio(formData);
      }
      await loadData();
      setModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Error al guardar precio');
      console.error(err);
    }
  }

  async function handleEliminar(precioId: number) {
    if (!confirm('¿Está seguro de eliminar este precio?')) return;
    
    try {
      await eliminarPrecio(precioId);
      await loadData();
    } catch (err) {
      alert('Error al eliminar precio');
      console.error(err);
    }
  }

  if (loading) {
    return <div className="text-gray-400">Cargando...</div>;
  }

  if (productos.length === 0 || locales.length === 0 || unidades.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg p-8 text-center text-gray-400">
        Necesitas crear productos, locales y unidades de medida primero.
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Gestión de Precios por Unidad</h1>
          <p className="text-gray-400">Configure precios según unidad de medida (unidad, media docena, docena, etc.)</p>
        </div>
        <div className="space-x-3">
          <a
            href="/admin/precios/proveedores"
            className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors"
          >
            <span className="mr-2">🏷️</span>
            Precios por Proveedor
          </a>
        </div>
      </div>

      {/* Información */}
      <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-white mb-2">💡 Precios por Mayor</h4>
        <p className="text-sm text-gray-300">
          Ahora puedes configurar diferentes precios para el mismo producto según la unidad de venta.
          Por ejemplo: $1.000 por unidad, $900 por media docena, $800 por docena completa.
        </p>
      </div>

      {/* Lista de productos con sus precios */}
      <div className="space-y-6">
        {productosOrdenados.map(producto => {
          const preciosProducto = getPreciosPorProducto(producto.id);
          
          return (
            <div key={producto.id} className="bg-slate-800 rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">{producto.nombre}</h3>
                  <p className="text-sm text-gray-400">SKU: {producto.sku}</p>
                </div>
                <button
                  onClick={() => handleOpenModal(producto)}
                  className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors"
                >
                  + Agregar Precio
                </button>
              </div>

              {preciosProducto.length === 0 ? (
                <p className="text-gray-500 italic">No hay precios configurados</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-700">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-semibold text-gray-300">Local</th>
                        <th className="px-4 py-2 text-left text-sm font-semibold text-gray-300">Unidad de Medida</th>
                        <th className="px-4 py-2 text-right text-sm font-semibold text-gray-300">Precio</th>
                        <th className="px-4 py-2 text-center text-sm font-semibold text-gray-300">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {preciosProducto.map(precio => (
                        <tr key={precio.id} className="hover:bg-slate-700/50">
                          <td className="px-4 py-3 text-sm text-white">
                            {getLocalNombre(precio.local_id)}
                          </td>
                          <td className="px-4 py-3 text-sm text-white">
                            <span className="inline-flex items-center px-3 py-1 bg-blue-600/20 text-blue-400 rounded-full text-xs font-medium">
                              {getUnidadNombre(precio.unidad_medida_id)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-bold text-emerald-400">
                            ${precio.monto_precio.toLocaleString('es-CL')}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleEditPrecio(precio)}
                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition-colors"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => handleEliminar(precio.id)}
                                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs transition-colors"
                              >
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal para crear/editar precio */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">
              {editingPrecio ? 'Editar Precio' : 'Nuevo Precio'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Producto
                </label>
                <input
                  type="text"
                  value={productos.find(p => p.id === formData.producto_id)?.nombre || ''}
                  disabled
                  className="w-full bg-slate-700 text-gray-400 px-3 py-2 rounded border border-slate-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Local
                </label>
                <select
                  value={formData.local_id}
                  onChange={(e) => setFormData({ ...formData, local_id: Number(e.target.value) })}
                  disabled={!!editingPrecio}
                  className="w-full bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 focus:border-primary focus:outline-none disabled:opacity-50"
                  required
                >
                  {locales.map(local => (
                    <option key={local.id} value={local.id}>{local.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Unidad de Medida
                </label>
                <select
                  value={formData.unidad_medida_id}
                  onChange={(e) => setFormData({ ...formData, unidad_medida_id: Number(e.target.value) })}
                  disabled={!!editingPrecio}
                  className="w-full bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 focus:border-primary focus:outline-none disabled:opacity-50"
                  required
                >
                  {unidades.map(unidad => (
                    <option key={unidad.id} value={unidad.id}>
                      {unidad.nombre} ({unidad.simbolo})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Precio ($)
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={formData.monto_precio}
                  onChange={(e) => setFormData({ ...formData, monto_precio: Number(e.target.value) })}
                  className="w-full bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 focus:border-primary focus:outline-none"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors"
                >
                  {editingPrecio ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}