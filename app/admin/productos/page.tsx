'use client';

import { useState, useEffect } from 'react';
import { getProductos, deleteProducto, type Producto } from '@/lib/api/productos';
import Link from 'next/link';

export default function ProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProductos();
  }, []);

  async function loadProductos() {
    try {
      setLoading(true);
      const data = await getProductos();
      setProductos(data);
      setError(null);
    } catch (err) {
      setError('Error al cargar productos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('¿Eliminar este producto?')) return;

    try {
      await deleteProducto(id);
      await loadProductos();
    } catch (err) {
      alert('Error al eliminar producto');
      console.error(err);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Cargando...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500 text-red-200 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">Productos</h1>
        <Link
          href="/admin/productos/nuevo"
          className="bg-primary hover:bg-primary-dark text-slate-900 font-semibold px-6 py-2 rounded-lg transition-colors"
        >
          + Nuevo Producto
        </Link>
      </div>

      {productos.length === 0 ? (
        <div className="bg-slate-800 rounded-lg p-8 text-center text-gray-400">
          No hay productos. Crea uno nuevo para comenzar.
        </div>
      ) : (
        <div className="bg-slate-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">SKU</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Nombre</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Descripción</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Imagen</th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-gray-300">Stock Actual</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-300">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {productos.map((producto) => (
                <tr key={producto.id} className="hover:bg-slate-700/50">
                  <td className="px-6 py-4 text-sm text-gray-300 font-mono">{producto.sku}</td>
                  <td className="px-6 py-4 text-sm text-white font-medium">{producto.nombre}</td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {producto.descripcion || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {producto.imagen_url ? (
                      <span className="text-green-400">✓</span>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-center font-bold text-white">
                    {producto.stock_actual || 0}
                  </td>
                  <td className="px-6 py-4 text-sm text-right space-x-2">
                    <Link
                      href={`/admin/productos/${producto.id}`}
                      className="text-primary hover:text-primary-dark"
                    >
                      Editar
                    </Link>
                    <Link
                      href={`/admin/productos/${producto.id}/receta`}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      📋 Receta
                    </Link>
                    <button
                      onClick={() => handleDelete(producto.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
