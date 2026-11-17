import { AuthService } from '../auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface Precio {
  id: number;
  producto_id: number;
  local_id: number;
  unidad_medida_id: number;
  monto_precio: number;
  fecha_vigencia: string;
}

export interface PrecioCreate {
  producto_id: number;
  local_id: number;
  unidad_medida_id: number;
  monto_precio: number;
}

export interface PrecioUpdate {
  unidad_medida_id?: number;
  monto_precio?: number;
}

export async function getPrecios(): Promise<Precio[]> {
  const response = await fetch(`${API_URL}/api/precios/?limit=1000`, {
    headers: AuthService.getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Error al obtener precios');
  return response.json();
}

export async function crearPrecio(precio: PrecioCreate): Promise<Precio> {
  const response = await fetch(`${API_URL}/api/precios/`, {
    method: 'POST',
    headers: AuthService.getAuthHeaders(),
    body: JSON.stringify(precio),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Error al crear precio');
  }
  return response.json();
}

export async function updatePrecio(
  productoId: number,
  localId: number,
  unidadMedidaId: number,
  montoPrecio: number
): Promise<Precio> {
  const response = await fetch(
    `${API_URL}/api/precios/producto/${productoId}/local/${localId}/unidad/${unidadMedidaId}`,
    {
      method: 'PUT',
      headers: AuthService.getAuthHeaders(),
      body: JSON.stringify({ monto_precio: montoPrecio }),
    }
  );
  if (!response.ok) throw new Error('Error al actualizar precio');
  return response.json();
}

export async function getPrecioProductoLocal(
  productoId: number,
  localId: number
): Promise<Precio[]> {
  const response = await fetch(
    `${API_URL}/api/precios/producto/${productoId}/local/${localId}`,
    {
      headers: AuthService.getAuthHeaders(),
    }
  );
  if (!response.ok) {
    // Si no existen precios, retornamos array vacío
    if (response.status === 404) return [];
    throw new Error('Error al obtener precios del producto');
  }
  return response.json();
}

export async function eliminarPrecio(precioId: number): Promise<void> {
  const response = await fetch(`${API_URL}/api/precios/${precioId}`, {
    method: 'DELETE',
    headers: AuthService.getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Error al eliminar precio');
}
// Exportar precios a Excel con los filtros de la pantalla (reunión cliente 16-11-26, punto 1.6.1)
export async function descargarPreciosExcel(f: { q?: string; local_id?: number; categoria_id?: number } = {}): Promise<void> {
  const params = new URLSearchParams();
  if (f.q?.trim()) params.set('q', f.q.trim());
  if (f.local_id) params.set('local_id', String(f.local_id));
  if (f.categoria_id) params.set('categoria_id', String(f.categoria_id));
  const res = await fetch(`${API_URL}/api/precios/excel?${params}`, { headers: AuthService.getAuthHeaders() });
  if (!res.ok) throw new Error('Error al exportar precios a Excel');
  const disp = res.headers.get('Content-Disposition') || '';
  const nombre = /filename="?([^"]+)"?/.exec(disp)?.[1] || 'precios.xlsx';
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
