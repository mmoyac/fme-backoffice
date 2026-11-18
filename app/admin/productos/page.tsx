'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import Link from 'next/link';
import { deleteProducto, type Producto } from '@/lib/api/productos';
import DataList, { type Columna } from '@/components/ui/DataList';
import PageHeader from '@/components/ui/PageHeader';
import {
  revalidarProductos,
  stockPorProducto,
  useCategorias,
  useInventarios,
  useLocales,
  useProductos,
} from '@/lib/hooks/catalogos';

const inputCls =
  'px-4 py-2 rounded-lg bg-slate-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-auto';

export default function ProductosPage() {
  const productosQ = useProductos();
  const categoriasQ = useCategorias();
  const localesQ = useLocales();
  const inventariosQ = useInventarios();
  const [filtroNombre, setFiltroNombre] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState<number | 'all'>('all');
  const busqueda = useDeferredValue(filtroNombre.trim().toLowerCase());

  const categorias = useMemo(
    () => (categoriasQ.data ?? []).filter((c) => (c as { activo?: boolean }).activo !== false),
    [categoriasQ.data],
  );

  // Stock actual = suma de locales físicos activos (sin WEB); un mapa en vez de buscar por fila
  const stock = useMemo(
    () => stockPorProducto(inventariosQ.data ?? [], (localesQ.data ?? []).filter((l) => l.activo !== false)),
    [inventariosQ.data, localesQ.data],
  );

  const ordenados = useMemo(
    () => [...(productosQ.data ?? [])].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })),
    [productosQ.data],
  );

  const filtrados = useMemo(
    () =>
      ordenados.filter((p) => {
        const coincideNombre =
          !busqueda || p.nombre.toLowerCase().includes(busqueda) || (p.sku || '').toLowerCase().includes(busqueda);
        const coincideCategoria = filtroCategoria === 'all' || p.categoria_id === filtroCategoria;
        return coincideNombre && coincideCategoria;
      }),
    [ordenados, busqueda, filtroCategoria],
  );

  async function handleDelete(id: number) {
    if (!confirm('¿Eliminar este producto?')) return;
    try {
      await deleteProducto(id);
      await revalidarProductos();
    } catch (err) {
      alert('Error al eliminar producto');
      console.error(err);
    }
  }

  const error = productosQ.error || categoriasQ.error || localesQ.error || inventariosQ.error;
  if (error && !productosQ.data) {
    return (
      <div className="bg-red-900/20 border border-red-500 text-red-200 px-4 py-3 rounded">
        Error al cargar productos, categorías o inventarios
      </div>
    );
  }

  const stockDe = (p: Producto) => stock.get(p.id) ?? 0;
  const enUnidadCompra = (p: Producto) =>
    p.unidad_compra_descripcion && p.factor_conversion_compra && p.factor_conversion_compra > 1
      ? `${(stockDe(p) / p.factor_conversion_compra).toLocaleString('es-CL', { maximumFractionDigits: 2 })} ${p.unidad_compra_descripcion}`
      : null;

  const acciones = (p: Producto) => (
    <div className="flex flex-wrap gap-x-2.5 gap-y-1">
      <Link href={`/admin/productos/${p.id}`} className="text-primary hover:text-primary-dark">
        Editar
      </Link>
      <Link href={`/admin/productos/${p.id}/receta`} className="text-blue-400 hover:text-blue-300">
        Receta
      </Link>
      <button onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-300">
        Eliminar
      </button>
    </div>
  );

  const columnas: Columna<Producto>[] = [
    { header: 'SKU', className: 'w-[9%]', cell: (p) => <span className="font-mono text-gray-300">{p.sku}</span> },
    {
      header: 'Nombre',
      className: 'w-[24%]',
      cell: (p) => (
        <span className="text-white font-medium" title={p.nombre}>
          {p.nombre}
          {p.tiene_receta && <span className="ml-1" title="Tiene receta">📋</span>}
        </span>
      ),
    },
    { header: 'Categoría', className: 'w-[12%]', cell: (p) => <span className="text-gray-400">{p.categoria_nombre || '-'}</span> },
    { header: 'Mín.', className: 'w-[7%] text-center', sinTruncar: true, cell: (p) => <span className="text-yellow-400 font-semibold">{p.stock_minimo ?? 0}</span> },
    { header: 'Crít.', className: 'w-[7%] text-center', sinTruncar: true, cell: (p) => <span className="text-red-400 font-semibold">{p.stock_critico ?? 0}</span> },
    {
      header: 'Stock',
      className: 'w-[10%] text-center',
      sinTruncar: true,
      cell: (p) => (
        <>
          <span className="font-bold text-white">{stockDe(p)}</span>
          {enUnidadCompra(p) && <div className="text-xs text-yellow-400">{enUnidadCompra(p)}</div>}
        </>
      ),
    },
    { header: 'Unid.', className: 'w-[8%] text-center', cell: (p) => <span className="text-gray-400">{p.unidad_medida_simbolo || '-'}</span> },
    { header: 'Acciones', className: 'w-[23%]', sinTruncar: true, cell: acciones },
  ];

  return (
    <div>
      <PageHeader
        title="Productos"
        actions={
          <Link
            href="/admin/productos/nuevo"
            className="bg-primary hover:bg-primary-dark text-slate-900 font-semibold px-6 py-2 rounded-lg transition-colors text-center"
          >
            + Nuevo Producto
          </Link>
        }
        filtros={
          <>
            <input
              type="text"
              className={`${inputCls} sm:max-w-xs`}
              placeholder="Buscar producto o SKU..."
              value={filtroNombre}
              onChange={(e) => setFiltroNombre(e.target.value)}
            />
            <select
              className={inputCls}
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            >
              <option value="all">Todas las categorías</option>
              {categorias.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nombre}
                </option>
              ))}
            </select>
          </>
        }
      />

      <DataList
        items={filtrados}
        loading={productosQ.isLoading}
        getKey={(p) => p.id}
        columns={columnas}
        empty="No hay productos. Crea uno nuevo para comenzar."
        card={(p) => (
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-white font-medium break-words">{p.nombre}</div>
                <div className="text-xs text-gray-400 font-mono">{p.sku}</div>
                {p.categoria_nombre && <div className="text-xs text-gray-400">{p.categoria_nombre}</div>}
              </div>
              <div className="text-right shrink-0">
                <div className="text-lg font-bold text-white">
                  {stockDe(p)} <span className="text-sm font-normal text-gray-400">{p.unidad_medida_simbolo || ''}</span>
                </div>
                {enUnidadCompra(p) && <div className="text-xs text-yellow-400">{enUnidadCompra(p)}</div>}
              </div>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
              <span className="text-yellow-400">Mínimo: {p.stock_minimo ?? 0}</span>
              <span className="text-red-400">Crítico: {p.stock_critico ?? 0}</span>
              {p.tiene_receta && <span className="text-blue-400">📋 Con receta</span>}
            </div>
            <div className="pt-2 border-t border-slate-700 text-sm">{acciones(p)}</div>
          </div>
        )}
      />
    </div>
  );
}
