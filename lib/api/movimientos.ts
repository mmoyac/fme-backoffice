import { AuthService } from '../auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface TransferenciaInventario {
  producto_id: number;
  local_origen_id: number;
  local_destino_id: number;
  cantidad: number;
  notas?: string;
}

export interface MovimientoInventario {
  id: number;
  producto_id: number;
  local_origen_id?: number;
  local_destino_id?: number;
  cantidad: number;
  tipo_movimiento: string;
  referencia_id?: number;
  notas?: string;
  usuario: string;
  fecha_movimiento: string;
  producto?: {
    id: number;
    nombre: string;
    sku: string;
  };
  local_origen?: {
    id: number;
    nombre: string;
  };
  local_destino?: {
    id: number;
    nombre: string;
  };
}

export async function transferirInventario(data: TransferenciaInventario): Promise<any> {
  const response = await fetch(`${API_URL}/api/movimientos/transferencia`, {
    method: 'POST',
    headers: AuthService.getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Error al transferir inventario');
  }
  return response.json();
}

export async function listarMovimientos(
  productoId?: number,
  localId?: number,
  tipoMovimiento?: string
): Promise<MovimientoInventario[]> {
  const params = new URLSearchParams();
  if (productoId) params.append('producto_id', productoId.toString());
  if (localId) params.append('local_id', localId.toString());
  if (tipoMovimiento) params.append('tipo_movimiento', tipoMovimiento);

  const response = await fetch(`${API_URL}/api/movimientos/historial?${params}`, {
    headers: AuthService.getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Error al cargar historial de movimientos');
  return response.json();
}

