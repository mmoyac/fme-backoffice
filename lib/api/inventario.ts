import { AuthService } from '../auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface Inventario {
  id: number;
  producto_id: number;
  local_id: number;
  cantidad_stock: number;
}

export interface InventarioUpdate {
  cantidad: number;
}

export async function getInventarios(): Promise<Inventario[]> {
  const response = await fetch(`${API_URL}/api/inventario/`, {
    headers: AuthService.getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Error al obtener inventarios');
  return response.json();
}

export async function updateInventario(
  productoId: number,
  localId: number,
  cantidad: number
): Promise<Inventario> {
  const response = await fetch(
    `${API_URL}/api/inventario/producto/${productoId}/local/${localId}`,
    {
      method: 'PUT',
      headers: AuthService.getAuthHeaders(),
      body: JSON.stringify({ cantidad_stock: cantidad }),
    }
  );
  if (!response.ok) throw new Error('Error al actualizar inventario');
  return response.json();
}

