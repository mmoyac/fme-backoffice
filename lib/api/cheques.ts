import { AuthService } from '../auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface EstadoCheque {
  id: number;
  codigo: string;
  nombre: string;
  activo: boolean;
}

export interface Cheque {
  id: number;
  pedido_id: number;
  numero_cheque: string;
  banco_id: number;
  monto: number;
  fecha_emision: string;
  fecha_vencimiento: string;
  fecha_deposito?: string;
  fecha_cobro?: string;
  librador_nombre: string;
  librador_rut?: string;
  estado_id: number;
  observaciones?: string;
  // Relaciones
  estado?: EstadoCheque;
  banco?: {
    id: number;
    nombre: string;
    codigo: string;
  };
}

export interface ChequeUpdate {
  estado_id?: number;
  fecha_deposito?: string;
  fecha_cobro?: string;
  observaciones?: string;
}

export interface ResumenChequesPedido {
  total_cheques: number;
  monto_total_cheques: number;
  cheques_pendientes: number;
  cheques_cobrados: number;
  cheques_rechazados: number;
  todos_cobrados: boolean;
}

export interface PedidoConCheques {
  pedido_id: number;
  numero_pedido: string;
  monto_total: number;
  es_pagado: boolean;
  medio_pago_codigo?: string;
  resumen_cheques?: ResumenChequesPedido;
  cheques: Cheque[];
}

// =============================================
// ENDPOINTS API
// =============================================

export async function obtenerPedidoConCheques(pedidoId: number): Promise<PedidoConCheques> {
  const response = await fetch(`${API_URL}/api/cheques/pedido/${pedidoId}`, {
    headers: AuthService.getAuthHeaders(),
  });
  
  if (!response.ok) {
    throw new Error('Error al obtener pedido con cheques');
  }
  return response.json();
}

export async function actualizarCheque(chequeId: number, data: ChequeUpdate): Promise<Cheque> {
  const response = await fetch(`${API_URL}/api/cheques/${chequeId}`, {
    method: 'PUT',
    headers: AuthService.getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Error al actualizar cheque');
  }
  return response.json();
}

export async function obtenerEstadosCheque(): Promise<EstadoCheque[]> {
  const response = await fetch(`${API_URL}/api/maestras/estados-cheque`, {
    headers: AuthService.getAuthHeaders(),
  });
  
  if (!response.ok) {
    throw new Error('Error al obtener estados de cheque');
  }
  return response.json();
}