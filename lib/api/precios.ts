import { AuthService } from '../auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface Precio {
  id: number;
  producto_id: number;
  local_id: number;
  monto_precio: number;
}

export interface PrecioUpdate {
  monto_precio: number;
}

export async function getPrecios(): Promise<Precio[]> {
  const response = await fetch(`${API_URL}/api/precios/`, {
    headers: AuthService.getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Error al obtener precios');
  return response.json();
}

export async function updatePrecio(
  productoId: number,
  localId: number,
  montoPrecio: number
): Promise<Precio> {
  const response = await fetch(
    `${API_URL}/api/precios/producto/${productoId}/local/${localId}`,
    {
      method: 'PUT',
      headers: AuthService.getAuthHeaders(),
      body: JSON.stringify({ monto_precio: montoPrecio }),
    }
  );
  if (!response.ok) throw new Error('Error al actualizar precio');
  return response.json();
}

export async function getPrecioProductoLocal(productoId: number, localId: number): Promise<Precio | null> {
  const response = await fetch(
    `${API_URL}/api/precios/producto/${productoId}/local/${localId}`,
    {
      headers: AuthService.getAuthHeaders(),
    }
  );
  if (!response.ok) {
    // Si no existe el precio, retornamos null
    if (response.status === 404) return null;
    throw new Error('Error al obtener precio del producto');
  }
  const precio = await response.json();
  return precio;
}

