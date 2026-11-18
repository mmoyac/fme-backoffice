/**
 * Encabezado de página (change improve-backoffice-responsive-performance):
 * en escritorio, título a la izquierda y acciones a la derecha; en móvil se apila y las acciones
 * ocupan todo el ancho. `filtros` va debajo, en una fila que se reacomoda.
 */
import { ReactNode } from 'react';

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Botones principales (p. ej. "+ Nuevo"). */
  actions?: ReactNode;
  /** Búsqueda y filtros. */
  filtros?: ReactNode;
}

export default function PageHeader({ title, subtitle, actions, filtros }: PageHeaderProps) {
  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold text-white break-words">{title}</h1>
          {subtitle && <p className="text-gray-400 mt-1">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">{actions}</div>}
      </div>
      {filtros && <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">{filtros}</div>}
    </div>
  );
}
