import { AuthService } from '../auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface ProductoSimple {
  id: number;
  nombre: string;
  sku: string;
}

export interface ItemPedido {
  id: number;
  pedido_id: number;
  producto_id: number;
  cantidad: number;
  precio_unitario_venta: number;
  producto?: ProductoSimple;
}

export interface Cliente {
  id: number;
  nombre: string;
  email: string;
  telefono?: string;
  direccion?: string;
  comuna?: string;
}

export interface Pedido {
  id: number;
  numero_pedido: string;
  cliente_id: number;
  local_id: number;
  local_despacho_id?: number;
  fecha_pedido: string;
  estado: string;
  total: number;
  pagado: boolean;
  inventario_descontado: boolean;
  notas?: string;
  notas_admin?: string;
  cliente?: Cliente;
  items?: ItemPedido[];
}

export interface PedidoUpdate {
  estado?: string;
  pagado?: boolean;
  notas_admin?: string;
  local_despacho_id?: number;
}

export async function listarPedidos(estado?: string): Promise<Pedido[]> {
  const url = new URL(`${API_URL}/api/pedidos/`);
  if (estado) {
    url.searchParams.append('estado', estado);
  }

  const response = await fetch(url.toString(), {
    headers: AuthService.getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Error al cargar pedidos');
  }
  return response.json();
}

export async function obtenerPedido(id: number): Promise<Pedido> {
  const response = await fetch(`${API_URL}/api/pedidos/${id}`, {
    headers: AuthService.getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Error al cargar el pedido');
  }
  return response.json();
}

export async function actualizarPedido(id: number, data: PedidoUpdate): Promise<Pedido> {
  const response = await fetch(`${API_URL}/api/pedidos/${id}`, {
    method: 'PUT',
    headers: AuthService.getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Error al actualizar el pedido');
  }
  return response.json();
}
