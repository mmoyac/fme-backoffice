'use client';

import { useState, useEffect } from 'react';
import { getProductos, type Producto } from '@/lib/api/productos';
import { getLocales, type Local } from '@/lib/api/locales';
import { getPrecios, updatePrecio, type Precio } from '@/lib/api/precios';

export default function PreciosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [locales, setLocales] = useState<Local[]>([]);
  const [precios, setPrecios] = useState<Precio[]>([]);
  const [loading, setLoading] = useState(true);
  const [editValues, setEditValues] = useState<Record<string, number>>({});

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [prodData, locData, precData] = await Promise.all([
        getProductos(),
        getLocales(),
        getPrecios()
      ]);
      setProductos(prodData);
      setLocales(locData);
      setPrecios(precData);
    } catch (err) {
      alert('Error al cargar datos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function getPrecio(productoId: number, localId: number): number {
    const prec = precios.find(p => p.producto_id === productoId && p.local_id === localId);
    return prec?.monto_precio ?? 0;
  }

  function getEditValue(productoId: number, localId: number): number {
    const key = `${productoId}-${localId}`;
    return editValues[key] ?? getPrecio(productoId, localId);
  }

  function handleChange(productoId: number, localId: number, value: number) {
    const key = `${productoId}-${localId}`;
    setEditValues(prev => ({ ...prev, [key]: value }));
  }

  async function handleBlur(productoId: number, localId: number) {
    const key = `${productoId}-${localId}`;
    const newValue = editValues[key];
    
    if (newValue === undefined) return;
    
    if (newValue <= 0) {
      alert('El precio debe ser mayor a 0');
      // Resetear al valor original
      setEditValues(prev => {
        const newValues = { ...prev };
        delete newValues[key];
        return newValues;
      });
      return;
    }
    
    try {
      await updatePrecio(productoId, localId, newValue);
      await loadData();
      // Limpiar el valor editado
      setEditValues(prev => {
        const newValues = { ...prev };
        delete newValues[key];
        return newValues;
      });
    } catch (err) {
      alert('Error al actualizar precio');
      console.error(err);
    }
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
      <h1 className="text-3xl font-bold text-white mb-6">Gestión de Precios</h1>

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
                  const value = getEditValue(producto.id, local.id);
                  return (
                    <td key={local.id} className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-gray-400 text-sm">$</span>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={value}
                          onChange={(e) => handleChange(producto.id, local.id, Number(e.target.value))}
                          onBlur={() => handleBlur(producto.id, local.id)}
                          className="w-24 bg-slate-700 text-white px-3 py-1 rounded border border-slate-600 focus:border-primary focus:outline-none text-center"
                        />
                      </div>
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
