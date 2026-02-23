'use client';

import { useState, useEffect } from 'react';
import { getProductos, type Producto } from '@/lib/api/productos';
import { getLocales, type Local } from '@/lib/api/locales';
import { getInventarios, type Inventario } from '@/lib/api/inventario';

export function ExistenciasTab() {
    const [soloNoVerde, setSoloNoVerde] = useState(false);

    // Determina si un producto tiene al menos un local en amarillo o rojo
    function productoTieneNoVerde(producto: Producto): boolean {
      return localesActivos.some(local => {
        const esTiendaOnline = local.codigo === 'WEB';
        const stock = getStock(producto.id, local.id);
        const displayStock = esTiendaOnline
          ? localesActivos.filter(l => l.codigo !== 'WEB').reduce((sum, l) => sum + getStock(producto.id, l.id), 0)
          : stock;
        if (displayStock <= (producto.stock_critico || 0)) return true;
        if (displayStock <= (producto.stock_minimo || 0)) return true;
        return false;
      });
    }

  const [productos, setProductos] = useState<Producto[]>([]);
  const [locales, setLocales] = useState<Local[]>([]);
  // Solo mostrar locales activos
  const localesActivos = locales.filter(l => l.activo !== false);
  const [inventarios, setInventarios] = useState<Inventario[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('');

  // Filtrar productos por nombre o SKU
  // Ordenar productos alfabéticamente por nombre
  const productosOrdenados = [...productos].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
  const productosFiltrados = filtro.trim().length === 0
    ? productosOrdenados
    : productosOrdenados.filter(p =>
        p.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
        (p.sku || '').toLowerCase().includes(filtro.toLowerCase())
      );

  const productosFiltradosFinal = soloNoVerde
    ? productosFiltrados.filter(productoTieneNoVerde)
    : productosFiltrados;

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [prodData, locData, invData] = await Promise.all([
        getProductos(),
        getLocales(),
        getInventarios()
      ]);
      setProductos(prodData);
      setLocales(locData);
      setInventarios(invData);
    } catch (err) {
      console.error('Error al cargar datos', err);
    } finally {
      setLoading(false);
    }
  }

  function getStock(productoId: number, localId: number): number {
    const inv = inventarios.find(i => i.producto_id === productoId && i.local_id === localId);
    return inv?.cantidad_stock ?? 0;
  }

  if (loading) {
    return <div className="text-gray-400">Cargando...</div>;
  }

  if (productos.length === 0 || locales.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg p-8 text-center text-gray-400">
        Necesitas crear productos y locales primero.
      </div>
    );
  }

  return (
    <div>
      {/* Leyenda de semáforo y filtros */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-green-500 border border-slate-700"></span>
            <span className="text-sm text-gray-300">Stock OK</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-yellow-400 border border-slate-700"></span>
            <span className="text-sm text-gray-300">Stock Mínimo</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-red-500 border border-slate-700"></span>
            <span className="text-sm text-gray-300">Stock Crítico</span>
          </div>
        </div>
        <div className="flex gap-3 items-center">
          <input
            type="text"
            className="px-4 py-2 rounded-lg bg-slate-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary w-full max-w-xs"
            placeholder="Buscar producto o SKU..."
            value={filtro}
            onChange={e => setFiltro(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={soloNoVerde}
              onChange={e => setSoloNoVerde(e.target.checked)}
              className="accent-yellow-400 w-4 h-4"
            />
            Solo mostrar alertas
          </label>
        </div>
      </div>
      <div className="space-y-6">
        {productosFiltradosFinal.length === 0 ? (
          <div className="text-gray-400 text-center py-8">No se encontraron productos.</div>
        ) : (
          productosFiltradosFinal.map(producto => (
            <div key={producto.id} className="bg-slate-800 rounded-lg p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2 gap-2">
                <h3 className="text-xl font-bold text-white">{producto.nombre}</h3>
                <div className="flex gap-4 items-center text-sm text-gray-400">
                  <span>SKU: <span className="font-mono text-gray-300">{producto.sku}</span></span>
                  <span className="border-l border-slate-600 pl-4">Stock mínimo: <span className="font-semibold text-yellow-400">{producto.stock_minimo ?? 0}</span></span>
                  <span>Stock crítico: <span className="font-semibold text-red-400">{producto.stock_critico ?? 0}</span></span>
                </div>
              </div>
              <ul className="divide-y divide-slate-700">
                {localesActivos.map(local => {
                  const esTiendaOnline = local.codigo === 'WEB';
                  const stock = getStock(producto.id, local.id);
                  const displayStock = esTiendaOnline
                    ? locales
                        .filter(l => l.codigo !== 'WEB')
                        .reduce((sum, l) => sum + getStock(producto.id, l.id), 0)
                    : stock;
                  // Semáforo: rojo = crítico, amarillo = mínimo, verde = ok
                  let semaforoColor = '';
                  if (displayStock <= (producto.stock_critico || 0)) {
                    semaforoColor = 'bg-red-500';
                  } else if (displayStock <= (producto.stock_minimo || 0)) {
                    semaforoColor = 'bg-yellow-400';
                  } else {
                    semaforoColor = 'bg-green-500';
                  }
                  return (
                    <li key={local.id} className="flex justify-between items-center py-2">
                      <span className="text-gray-300 font-medium flex items-center">
                        <span
                          className={`inline-block w-3 h-3 rounded-full mr-2 border border-slate-700 ${semaforoColor}`}
                        ></span>
                        {local.nombre}
                        {esTiendaOnline && (
                          <span className="ml-2 text-xs text-blue-400">(WEB / Global)</span>
                        )}
                      </span>
                      <span className={`font-semibold text-lg`}>
                        {displayStock}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
