import React, { useState, useRef, useEffect } from "react";

interface Producto {
  id: number;
  nombre: string;
}

interface Props {
  productos: Producto[];
  value: number;
  onChange: (id: number) => void;
  disabled?: boolean;
  excludeIds?: number[];
}

const ProductCombobox: React.FC<Props> = ({ productos, value, onChange, disabled, excludeIds = [] }) => {
  const selected = productos.find(p => p.id === value);
  const [query, setQuery] = useState(selected?.nombre || "");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync display when value changes from outside
  useEffect(() => {
    const p = productos.find(p => p.id === value);
    setQuery(p?.nombre || "");
  }, [value, productos]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        // Reset to selected name if user left input without choosing
        const p = productos.find(p => p.id === value);
        setQuery(p?.nombre || "");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [value, productos]);

  const filtered = productos
    .filter(p => !excludeIds.includes(p.id))
    .filter(p => p.nombre.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  return (
    <div ref={containerRef} className="relative flex-1 min-w-0">
      <input
        type="text"
        className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-gray-200 focus:outline-none focus:ring-1 focus:ring-primary"
        placeholder="Buscar producto..."
        value={query}
        disabled={disabled}
        onChange={e => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setQuery("");
          setOpen(true);
        }}
        autoComplete="off"
      />
      {open && !disabled && filtered.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 top-full mt-1 bg-slate-800 border border-slate-600 rounded shadow-lg max-h-52 overflow-y-auto text-sm">
          {filtered.map(p => (
            <li
              key={p.id}
              className={`px-3 py-1.5 cursor-pointer hover:bg-slate-600 ${p.id === value ? "text-primary font-semibold" : "text-gray-200"}`}
              onMouseDown={() => {
                onChange(p.id);
                setQuery(p.nombre);
                setOpen(false);
              }}
            >
              {p.nombre}
            </li>
          ))}
        </ul>
      )}
      {open && !disabled && filtered.length === 0 && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-gray-400 text-sm">
          Sin resultados
        </div>
      )}
    </div>
  );
};

export default ProductCombobox;
