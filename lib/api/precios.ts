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
  const response = await fetch(`${API_URL}/api/precios/`, {
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