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
  const response = await fetch(`${API_URL}/api/inventario/?limit=10000`, {
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

export async function getStockProductoLocal(productoId: number, localId: number): Promise<number> {
  const response = await fetch(
    `${API_URL}/api/inventario/producto/${productoId}/local/${localId}`,
    {
      headers: AuthService.getAuthHeaders(),
    }
  );
  if (!response.ok) {
    // Si no existe el inventario, retornamos 0
    if (response.status === 404) return 0;
    throw new Error('Error al obtener stock del producto');
  }
  const inventario = await response.json();
  return inventario.cantidad_stock || 0;
}

export async function ajusteMerma(
  productoId: number,
  localId: number,
  cantidad: number,
  motivo: string
): Promise<{ stock_anterior: number; cantidad_descontada: number; stock_nuevo: number; usuario: string }> {
  const params = new URLSearchParams({
    producto_id: String(productoId),
    local_id: String(localId),
    cantidad: String(cantidad),
    motivo,
  });
  const response = await fetch(`${API_URL}/api/inventario/ajuste-merma?${params}`, {
    method: 'POST',
    headers: AuthService.getAuthHeaders(),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Error al registrar la merma');
  }
  return response.json();
}

