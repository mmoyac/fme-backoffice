'use client';

import { useState, useRef, useEffect } from 'react';

interface Producto {
  id: number;
  nombre: string;
}

interface Props {
  productos: Producto[];
  value: number;          // producto_id seleccionado (0 = vacío)
  onSelect: (productoId: number, nombre: string, precioMaximo: number) => void;
  accessToken?: string;
  placeholder?: string;
}

export default function ProductoAutocomplete({ productos, value, onSelect, accessToken, placeholder = 'Buscar producto...' }: Props) {
  const [busqueda, setBusqueda] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [cargandoPrecio, setCargandoPrecio] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Sincronizar texto con el valor seleccionado
  useEffect(() => {
    if (value === 0) {
      setBusqueda('');
    } else {
      const prod = productos.find(p => p.id === value);
      if (prod) setBusqueda(prod.nombre);
    }
  }, [value, productos]);

  // Cerrar al hacer clic afuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const productosFiltrados = busqueda.length >= 1
    ? productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase())).slice(0, 15)
    : productos.slice(0, 15);

  const seleccionar = async (prod: Producto) => {
    setBusqueda(prod.nombre);
    setAbierto(false);
    setCargandoPrecio(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/precios/?producto_id=${prod.id}`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );
      let precioMax = 0;
      if (res.ok) {
        const precios: { monto_precio: number }[] = await res.json();
        if (precios.length > 0) {
          precioMax = Math.max(...precios.map(p => p.monto_precio));
        }
      }
      onSelect(prod.id, prod.nombre, precioMax);
    } finally {
      setCargandoPrecio(false);
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
        {cargandoPrecio && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 animate-pulse">$</span>
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
