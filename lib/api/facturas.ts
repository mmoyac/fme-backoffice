import { AuthService } from '../auth';
import { Pedido } from './pedidos';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Lista todos los pedidos que son facturas (tipo_documento_tributario_id = 1).
 */
export async function listarFacturas(estadoSii?: string): Promise<Pedido[]> {
  const url = new URL(`${API_URL}/api/pedidos/`);
  url.searchParams.append('tipo_documento_tributario_id', '1');
  if (estadoSii) {
    url.searchParams.append('estado_sii', estadoSii);
  }

  const response = await fetch(url.toString(), {
    headers: AuthService.getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Error al cargar las facturas');
  }

  const pedidos: Pedido[] = await response.json();
  // Filter client-side in case the backend doesn't support the query param yet
  return pedidos.filter(p => p.tipo_documento_tributario_id === 1);
}

export interface RegistrarFolioPayload {
  folio_sii: string;
  numero_dte?: string;
  observaciones?: string;
}

export interface RegistrarFolioResponse {
  pedido_id: number;
  folio_sii: string;
  numero_dte?: string;
  estado_sii: string;
  fecha_envio_sii?: string;
  mensaje: string;
}

/**
 * Registra el folio SII de una factura emitida manualmente en el portal del SII.
 */
export async function registrarFolio(
  pedidoId: number,
  payload: RegistrarFolioPayload
): Promise<RegistrarFolioResponse> {
  const params = new URLSearchParams({ folio_sii: payload.folio_sii });
  if (payload.numero_dte) params.append('numero_dte', payload.numero_dte);
  if (payload.observaciones) params.append('observaciones', payload.observaciones);

  const response = await fetch(
    `${API_URL}/api/pedidos/${pedidoId}/registrar-folio?${params.toString()}`,
    {
      method: 'PUT',
      headers: AuthService.getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Error al registrar el folio SII');
  }

  return response.json();
}

export interface RegistrarPagoResponse {
  pedido_id: number;
  medio_pago: string;
  medio_pago_codigo: string;
  es_pagado: boolean;
  permite_cheque: boolean;
  mensaje: string;
}

/**
 * Registra el medio de pago de una factura.
 * - CHEQUE: es_pagado=false (pendiente acreditación)
 * - Resto: es_pagado=true (pago inmediato)
 */
export async function registrarPago(pedidoId: number, medioPagoId: number): Promise<RegistrarPagoResponse> {
  const response = await fetch(
    `${API_URL}/api/pedidos/${pedidoId}/registrar-pago?medio_pago_id=${medioPagoId}`,
    {
      method: 'PATCH',
      headers: AuthService.getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Error al registrar el pago');
  }

  return response.json();
}

/**
 * Descarga la factura en PDF de un pedido.
 */
export async function descargarFactura(pedidoId: number, numeroPedido?: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/pedidos/${pedidoId}/factura`, {
    headers: AuthService.getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Error al generar la factura');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Factura_${numeroPedido || pedidoId}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
