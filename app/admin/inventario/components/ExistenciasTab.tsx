'use client';

import { useState, useEffect } from 'react';
import { getProductos, type Producto } from '@/lib/api/productos';
import { getLocales, type Local } from '@/lib/api/locales';
import { getInventarios, type Inventario } from '@/lib/api/inventario';

export function ExistenciasTab() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [locales, setLocales] = useState<Local[]>([]);
  const [inventarios, setInventarios] = useState<Inventario[]>([]);
  const [loading, setLoading] = useState(true);

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
      <div className="bg-slate-800 rounded-lg overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-700">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300 sticky left-0 bg-slate-700">
                Producto
              </th>
              {locales.map(local => (
                <th key={local.id} className="px-6 py-3 text-center text-sm font-semibold text-gray-300">
                  {local.nombre}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {productos.map(producto => (
              <tr key={producto.id} className="hover:bg-slate-700/50">
                <td className="px-6 py-4 text-sm text-white font-medium sticky left-0 bg-slate-800">
                  {producto.nombre}
                </td>
                {locales.map(local => {
                  const esTiendaOnline = local.codigo === 'WEB';
                  const stock = getStock(producto.id, local.id);
                  // Si es web, calculamos la suma de fisicos, O mostramos el stock fisico si es tienda fisica.
                  // REQUERIMIENTO: "Stock se controla solo".
                  // El stock web es virtual (suma de fisicos), segun definimos antes.

                  const displayStock = esTiendaOnline
                    ? locales
                      .filter(l => l.codigo !== 'WEB')
                      .reduce((sum, l) => sum + getStock(producto.id, l.id), 0)
                    : stock;

                  return (
                    <td key={local.id} className="px-6 py-4 text-center">
                      {esTiendaOnline ? (
                        <div className="text-center">
                          <span className="text-gray-400 text-sm font-bold">{displayStock}</span>
                          <p className="text-xs text-gray-500 mt-1">(Global)</p>
                        </div>
                      ) : (
                        <span className={`font-semibold ${stock <= (producto.stock_critico || 0) ? 'text-red-500' : stock <= (producto.stock_minimo || 0) ? 'text-yellow-500' : 'text-white'}`}>
                          {stock}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
