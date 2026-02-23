'use client';

import { useState, useEffect } from 'react';
import { getProductos, deleteProducto, type Producto } from '@/lib/api/productos';
import { type Inventario } from '@/lib/api/inventario';
import { type Local } from '@/lib/api/locales';
import Link from 'next/link';

export default function ProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<{ id: number; nombre: string }[]>([]);
  const [locales, setLocales] = useState<Local[]>([]);
  const [inventarios, setInventarios] = useState<Inventario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroNombre, setFiltroNombre] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState<number | 'all'>('all');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [prodData, catData, locData, invData] = await Promise.all([
        getProductos(),
        import('@/lib/api/maestras').then(m => m.getCategorias()),
        import('@/lib/api/locales').then(m => m.getLocales()),
        import('@/lib/api/inventario').then(m => m.getInventarios()),
      ]);
      setProductos(prodData);
      setCategorias(catData.filter((c: any) => c.activo !== false));
      setLocales(locData.filter((l: any) => l.activo !== false));
      setInventarios(invData);
      setError(null);
    } catch (err) {
      setError('Error al cargar productos, categorías o inventarios');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('¿Eliminar este producto?')) return;

    try {
      await deleteProducto(id);
      await loadData();
    } catch (err) {
      alert('Error al eliminar producto');
      console.error(err);
    }
  }

  // Ordenar productos alfabéticamente por nombre
  const productosOrdenados = [...productos].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));

  // Filtrar productos por nombre y categoría
  const productosFiltrados = productosOrdenados.filter(p => {
    const coincideNombre = filtroNombre.trim().length === 0 ||
      p.nombre.toLowerCase().includes(filtroNombre.toLowerCase()) ||
      (p.sku || '').toLowerCase().includes(filtroNombre.toLowerCase());
    const coincideCategoria = filtroCategoria === 'all' || p.categoria_id === filtroCategoria;
    return coincideNombre && coincideCategoria;
  });

  // Calcular stock actual como suma de inventarios de locales activos (excluyendo WEB)
  function getStockActual(productoId: number): number {
    return locales
      .filter(l => l.codigo !== 'WEB')
      .map(l => {
        const inv = inventarios.find(i => i.producto_id === productoId && i.local_id === l.id);
        return inv?.cantidad_stock ?? 0;
      })
      .reduce((sum, val) => sum + val, 0);
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold text-white">Productos</h1>
        <div className="flex gap-3 items-center">
          <input
            type="text"
            className="px-4 py-2 rounded-lg bg-slate-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary w-full max-w-xs"
            placeholder="Buscar producto o SKU..."
            value={filtroNombre}
            onChange={e => setFiltroNombre(e.target.value)}
          />
          <select
            className="px-4 py-2 rounded-lg bg-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-primary"
            value={filtroCategoria}
            onChange={e => setFiltroCategoria(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          >
            <option value="all">Todas las categorías</option>
            {categorias.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.nombre}</option>
            ))}
          </select>
          <Link
            href="/admin/productos/nuevo"
            className="bg-primary hover:bg-primary-dark text-slate-900 font-semibold px-6 py-2 rounded-lg transition-colors"
          >
            + Nuevo Producto
          </Link>
        </div>
      </div>

      {productosFiltrados.length === 0 ? (
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
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Categoría</th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-gray-300">Stock Mínimo</th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-gray-300">Stock Crítico</th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-gray-300">Stock Actual</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-300">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {productosFiltrados.map((producto) => (
                <tr key={producto.id} className="hover:bg-slate-700/50">
                  <td className="px-6 py-4 text-sm text-gray-300 font-mono">{producto.sku}</td>
                  <td className="px-6 py-4 text-sm text-white font-medium">{producto.nombre}</td>
                  <td className="px-6 py-4 text-sm text-gray-400">{producto.categoria_nombre || '-'}</td>
                  <td className="px-6 py-4 text-sm text-center text-yellow-400 font-semibold">{producto.stock_minimo ?? 0}</td>
                  <td className="px-6 py-4 text-sm text-center text-red-400 font-semibold">{producto.stock_critico ?? 0}</td>
                  <td className="px-6 py-4 text-sm text-center font-bold text-white">
                    {getStockActual(producto.id)}
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
