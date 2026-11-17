import type { User } from './auth';

/**
 * Regla de alcance por local del módulo Inventario (change OpenSpec fme-backend: add-inventario-alcance-por-local).
 * Debe coincidir con `utils/alcance_local.py` del backend.
 *
 * Devuelve null si el usuario tiene alcance total (superadmin, rol admin o sin local asignado);
 * si no, el id del único local sobre el que puede operar.
 */
export function localDeAlcance(user: User | null | undefined): number | null {
  if (!user) return null;
  const esAdmin = !!user.is_superadmin || user.role?.nombre?.toLowerCase() === 'admin';
  if (esAdmin || !user.local_defecto_id) return null;
  return user.local_defecto_id;
}
