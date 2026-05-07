'use client';

import { useState, useRef, useEffect } from 'react';

interface Producto {
  id: number;
  nombre: string;
  sku?: string;
}

interface PrecioInfo {
  local_id: number;
  monto_precio: number;
}

interface Props {
  productos: Producto[];
  value: number;
  onSelect: (productoId: number, nombre: string, precioMaximo: number, stockTotal: number, stockFab: number, precios: PrecioInfo[]) => void;
  localesFabIds?: number[];
  accessToken?: string;
  placeholder?: string;
}

export default function ProductoAutocomplete({ productos, value, onSelect, localesFabIds, accessToken, placeholder = 'Buscar producto...' }: Props) {
  const [busqueda, setBusqueda] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value === 0) {
      setBusqueda('');
    } else {
      const prod = productos.find(p => p.id === value);
      if (prod) setBusqueda(prod.sku ? `[${prod.sku}] ${prod.nombre}` : prod.nombre);
    }
  }, [value, productos]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const termino = busqueda.toLowerCase();
  const productosFiltrados = busqueda.length >= 1
    ? productos.filter(p =>
        p.nombre.toLowerCase().includes(termino) ||
        (p.sku && p.sku.toLowerCase().includes(termino))
      ).slice(0, 15)
    : productos.slice(0, 15);

  const seleccionar = async (prod: Producto) => {
    setBusqueda(prod.sku ? `[${prod.sku}] ${prod.nombre}` : prod.nombre);
    setAbierto(false);
    setCargando(true);
    try {
      const headers = { 'Authorization': `Bearer ${accessToken}` };
      const [preciosRes, invRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/precios/?producto_id=${prod.id}`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/inventario/?producto_id=${prod.id}`, { headers }),
      ]);

      let precios: PrecioInfo[] = [];
      let precioMax = 0;
      if (preciosRes.ok) {
        const data: { local_id: number; monto_precio: number }[] = await preciosRes.json();
        precios = data.map(p => ({ local_id: p.local_id, monto_precio: p.monto_precio }));
        if (precios.length > 0) precioMax = Math.max(...precios.map(p => p.monto_precio));
      }

      let stockTotal = 0;
      let stockFab = 0;
      if (invRes.ok) {
        const inv: { local_id: number; cantidad_stock: number }[] = await invRes.json();
        stockTotal = inv.reduce((sum, i) => sum + i.cantidad_stock, 0);
        stockFab = localesFabIds && localesFabIds.length > 0
          ? inv.filter(i => localesFabIds.includes(i.local_id)).reduce((sum, i) => sum + i.cantidad_stock, 0)
          : stockTotal;
      }

      onSelect(prod.id, prod.nombre, precioMax, stockTotal, stockFab, precios);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <input
          type="text"
          className="w-full bg-slate-600 border border-slate-500 rounded px-2 py-1.5 text-white text-sm pr-6"
          placeholder={placeholder}
          value={busqueda}
          onChange={e => { setBusqueda(e.target.value); setAbierto(true); }}
          onFocus={() => setAbierto(true)}
          autoComplete="off"
        />
        {cargando && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 animate-pulse">...</span>
        )}
      </div>

      {abierto && productosFiltrados.length > 0 && (
        <ul className="absolute z-50 w-full bg-slate-700 border border-slate-500 rounded-b shadow-lg max-h-48 overflow-y-auto mt-0.5">
          {productosFiltrados.map(prod => (
            <li
              key={prod.id}
              onMouseDown={() => seleccionar(prod)}
              className={`px-3 py-2 text-sm cursor-pointer hover:bg-slate-600 ${prod.id === value ? 'bg-slate-600 text-primary' : 'text-white'}`}
            >
              {prod.sku && <span className="text-xs text-gray-400 font-mono mr-1">[{prod.sku}]</span>}
              {prod.nombre}
            </li>
          ))}
        </ul>
      )}

      {abierto && busqueda.length >= 1 && productosFiltrados.length === 0 && (
        <div className="absolute z-50 w-full bg-slate-700 border border-slate-500 rounded-b px-3 py-2 text-sm text-gray-400 mt-0.5">
          Sin resultados para "{busqueda}"
        </div>
      )}
    </div>
  );
}
