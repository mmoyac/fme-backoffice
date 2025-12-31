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
  // Información del medio de pago
  medio_pago_id?: number;
  medio_pago_codigo?: string;
  medio_pago_nombre?: string;
  permite_cheque?: boolean;
  // Información de puntos
  puntos_ganados?: number;
  puntos_usados?: number;
  descuento_puntos?: number;
  cliente?: Cliente;
  items?: ItemPedido[];
}

export interface PedidoUpdate {
  estado?: string;
  pagado?: boolean;
  notas_admin?: string;
  local_despacho_id?: number;
}

export interface ItemPedidoCreate {
  sku: string;
  producto_id: number;
  cantidad: number;
  precio_unitario_venta: number;
}

export interface ChequeCreate {
  numero_cheque: string;
  banco_id: number;
  monto: number;
  fecha_emision: string;
  fecha_vencimiento: string;
  librador_nombre: string;
  librador_rut?: string;
  observaciones?: string;
}

export interface PedidoCreate {
  cliente_id: number;
  cliente_nombre: string;
  cliente_email: string;
  cliente_telefono: string;
  direccion_entrega: string;
  local_id: number;
  medio_pago_id: number;
  notas?: string;
  items: ItemPedidoCreate[];
  cheques?: ChequeCreate[];
  // Campos para sistema de puntos
  puntos_usar?: number;
}

export interface PedidoCreateResponse {
  pedido_id: number;
  numero_pedido: string;
  monto_total: number;
  estado: string;
  mensaje: string;
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

export async function crearPedido(data: PedidoCreate): Promise<PedidoCreateResponse> {
  const response = await fetch(`${API_URL}/api/pedidos/backoffice`, {
    method: 'POST',
    headers: AuthService.getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Error al crear el pedido');
  }
  return response.json();
}

export async function crearCheque(data: ChequeCreate & { pedido_id: number, estado_id: number }): Promise<any> {
  const response = await fetch(`${API_URL}/api/cheques/`, {
    method: 'POST',
    headers: AuthService.getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Error al crear el cheque');
  }
  return response.json();
}

export async function descargarBoleta(pedidoId: number): Promise<void> {
  const response = await fetch(`${API_URL}/api/pedidos/${pedidoId}/boleta`, {
    headers: AuthService.getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Error al generar la boleta');
  }

  // Crear blob y descargar archivo
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Boleta_PED-${pedidoId.toString().padStart(5, '0')}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
