import { AuthService } from '../auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface EstimacionPuntos {
  total_puntos: number;
  detalle_por_categoria: Array<{
    categoria_nombre: string;
    puntos_por_unidad: number;
    cantidad: number;
    puntos_subtotal: number;
  }>;
}

export interface ItemParaPuntos {
  producto_id: number;
  cantidad: number;
}

/**
 * Estima los puntos que ganaría un cliente por una lista de productos
 */
export async function estimarPuntosPorItems(items: ItemParaPuntos[]): Promise<EstimacionPuntos> {
  const response = await fetch(`${API_URL}/api/puntos/estimar`, {
    method: 'POST',
    headers: AuthService.getAuthHeaders(),
    body: JSON.stringify({ items }),
  });

  if (!response.ok) {
    throw new Error('Error al estimar puntos');
  }

  return response.json();
}

/**
 * Obtiene información de puntos de un cliente
 */
export async function obtenerPuntosCliente(clienteId: number) {
  const response = await fetch(`${API_URL}/api/clientes/${clienteId}`, {
    headers: AuthService.getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Error al obtener puntos del cliente');
  }

  return response.json();
}