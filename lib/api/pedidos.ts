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
  
  // Campos tributarios
  rut?: string;
  razon_social?: string;
  giro?: string;
  es_empresa?: boolean;
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
  // Información de tipo de pedido
  tipo_pedido_id?: number;
  tipo_pedido_codigo?: string;
  tipo_pedido_nombre?: string;
  
  // Control SII (Facturación Electrónica)
  tipo_documento_tributario_id?: number;
  tipo_documento_codigo?: string;
  tipo_documento_nombre?: string;
  estado_sii?: string;
  folio_sii?: string;
  numero_dte?: string;
  fecha_envio_sii?: string;
  fecha_respuesta_sii?: string;
  observaciones_sii?: string;
  // Información de puntos
  puntos_ganados?: number;
  puntos_usados?: number;
  descuento_puntos?: number;
  // Información del usuario que creó el pedido
  usuario_id?: number;
  usuario_nombre?: string;
  usuario_email?: string;
  cliente?: Cliente;
  items?: ItemPedido[];
}

export interface PedidoUpdate {
  estado?: string;
  pagado?: boolean;
  notas_admin?: string;
  local_despacho_id?: number;
  medio_pago_id?: number;
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
  tipo_documento_tributario_id?: number;
  notas?: string;
  items: ItemPedidoCreate[];
  cheques?: ChequeCreate[];
  // Campos para sistema de puntos
  puntos_usar?: number;
  
  // Campos tributarios del cliente
  cliente_rut?: string;
  cliente_razon_social?: string;
  cliente_giro?: string;
  cliente_es_empresa?: boolean;
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
  console.log(`[API] Actualizando pedido ${id}`, data);
  
  const response = await fetch(`${API_URL}/api/pedidos/${id}`, {
    method: 'PUT',
    headers: AuthService.getAuthHeaders(),
    body: JSON.stringify(data),
  });

  console.log(`[API] Response status: ${response.status}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[API] Error response:', errorText);
    
    try {
      const error = JSON.parse(errorText);
      throw new Error(error.detail || 'Error al actualizar el pedido');
    } catch {
      throw new Error(`Error ${response.status}: ${errorText || 'Error al actualizar el pedido'}`);
    }
  }
  
  const result = await response.json();
  console.log('[API] Pedido actualizado exitosamente:', result);
  return result;
}

export async function crearPedido(data: PedidoCreate): Promise<PedidoCreateResponse> {
  console.log('🚀 Enviando pedido:', data);
  
  const response = await fetch(`${API_URL}/api/pedidos/backoffice`, {
    method: 'POST',
    headers: AuthService.getAuthHeaders(),
    body: JSON.stringify(data),
  });

  console.log('📡 Respuesta del servidor:', response.status, response.statusText);

  if (!response.ok) {
    const errorData = await response.json();
    console.error('❌ Error del servidor:', errorData);
    
    // Crear un error más descriptivo
    let mensajeError = `Error ${response.status}: `;
    
    if (errorData.detail) {
      if (Array.isArray(errorData.detail)) {
        // Error de validación de Pydantic
        mensajeError += errorData.detail.map((err: any) => 
          `Campo '${err.loc?.join('.')}': ${err.msg}`
        ).join(', ');
      } else {
        mensajeError += errorData.detail;
      }
    } else {
      mensajeError += response.statusText;
    }
    
    throw new Error(mensajeError);
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

export async function actualizarEstadoSII(
  pedidoId: number, 
  estadoSii: string, 
  observaciones: string = ''
): Promise<any> {
  const token = await AuthService.getToken();
  
  const response = await fetch(`${API_URL}/api/pedidos/${pedidoId}/estado-sii?estado_sii=${encodeURIComponent(estadoSii)}&observaciones=${encodeURIComponent(observaciones)}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Error al actualizar estado SII');
  }

  return response.json();
}
