'use client';

/**
 * Lista de registros con dos presentaciones (change improve-backoffice-responsive-performance, D6):
 * - Escritorio (≥1024 px, `lg`): tabla de columnas con ancho fijo y texto truncado. No se ensancha.
 * - Móvil y tablet (<1024 px): tarjetas apiladas, definidas por `card`.
 *   Breakpoint `lg` obligatorio (AGENTS.md §7.3): con `md` los Android de ≥768 px verían la tabla.
 * Basado en el DataList de EffiCoop. Para reportes con muchas columnas numéricas, usar una tabla
 * propia dentro de un contenedor `overflow-x-auto` en vez de este componente.
 */
import { ReactNode } from 'react';

export interface Columna<T> {
  /** Encabezado de la columna (escritorio). */
  header: ReactNode;
  /** Contenido de la celda. */
  cell: (item: T) => ReactNode;
  /** Clases de la columna: ancho (`w-[30%]`, `w-24`) y alineación (`text-right`). */
  className?: string;
  /** No truncar (p. ej. columnas de acciones con botones). */
  sinTruncar?: boolean;
}

interface DataListProps<T> {
  items: T[];
  columns: Columna<T>[];
  /** Tarjeta para móvil. */
  card: (item: T) => ReactNode;
  getKey: (item: T) => string | number;
  /** Acción al tocar una fila o tarjeta (opcional). */
  onItemClick?: (item: T) => void;
  /** Clases extra por registro, aplicadas a la fila y a la tarjeta (p. ej. atenuar anulados). */
  itemClassName?: (item: T) => string;
  loading?: boolean;
  /** Contenido cuando no hay registros. */
  empty?: ReactNode;
}

export default function DataList<T>({ items, columns, card, getKey, onItemClick, itemClassName, loading, empty }: DataListProps<T>) {
  if (loading && items.length === 0) return <ListSkeleton />;
  if (items.length === 0) {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 text-center text-gray-400">
        {empty ?? 'No hay registros.'}
      </div>
    );
  }

  const clickable = onItemClick ? 'cursor-pointer' : '';

  return (
    <>
      {/* Escritorio: tabla */}
      <div className="hidden lg:block bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full table-fixed text-sm">
          <thead className="bg-slate-700/60">
            <tr>
              {columns.map((c, i) => (
                <th key={i} className={`px-4 py-3 text-left font-semibold text-gray-300 ${c.className ?? ''}`}>
                  <div className="truncate">{c.header}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {items.map((item) => (
              <tr
                key={getKey(item)}
                className={`hover:bg-slate-700/40 ${clickable} ${itemClassName?.(item) ?? ''}`}
                onClick={onItemClick ? () => onItemClick(item) : undefined}
              >
                {columns.map((c, i) => (
                  <td key={i} className={`px-4 py-3 align-top text-gray-200 ${c.className ?? ''}`}>
                    <div className={c.sinTruncar ? 'min-w-0' : 'min-w-0 truncate'}>{c.cell(item)}</div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Móvil: tarjetas */}
      <ul className="lg:hidden space-y-3">
        {items.map((item) => (
          <li
            key={getKey(item)}
            className={`bg-slate-800 rounded-xl border border-slate-700 p-4 min-w-0 ${clickable} ${itemClassName?.(item) ?? ''}`}
            onClick={onItemClick ? () => onItemClick(item) : undefined}
          >
            {card(item)}
          </li>
        ))}
      </ul>
    </>
  );
}

export function ListSkeleton({ filas = 5 }: { filas?: number }) {
  return (
    <div className="space-y-3 animate-pulse" aria-busy="true" aria-label="Cargando">
      {Array.from({ length: filas }).map((_, i) => (
        <div key={i} className="h-14 rounded-xl bg-slate-800" />
      ))}
    </div>
  );
}
