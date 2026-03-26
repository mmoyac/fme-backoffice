import { AuthService } from '../auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface ItemDevolucionInput {
  item_pedido_id: number;
  cantidad_devuelta: number;
  local_destino_id: number;
}

export interface CrearDevolucionPayload {
  motivo?: string;
  items: ItemDevolucionInput[];
}

export interface ItemDevolucion {
  id: number;
  item_pedido_id: number;
  producto_id: number;
  cantidad_devuelta: number;
  local_destino_id: number;
}

export interface Devolucion {
  id: number;
  pedido_id: number;
  nota_credito_id: number | null;
  usuario_id: number | null;
  motivo: string | null;
  fecha_devolucion: string;
  estado: string;
  items: ItemDevolucion[];
}

export async function crearDevolucion(pedidoId: number, payload: CrearDevolucionPayload): Promise<Devolucion> {
  const response = await fetch(`${API_URL}/api/devoluciones/pedidos/${pedidoId}`, {
    method: 'POST',
    headers: { ...AuthService.getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Error al registrar la devolución');
  }
  return response.json();
}

export async function obtenerDevolucionesPedido(pedidoId: number): Promise<Devolucion[]> {
  const response = await fetch(`${API_URL}/api/devoluciones/pedidos/${pedidoId}`, {
    headers: AuthService.getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Error al cargar devoluciones');
  return response.json();
}
