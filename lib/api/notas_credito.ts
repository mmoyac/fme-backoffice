import { AuthService } from '../auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface NotaCredito {
  id: number;
  tenant_id: number;
  pedido_id: number;
  tipo_documento_id: number;
  monto: number;
  motivo: string | null;
  folio_sii: string | null;
  fecha_emision: string;
  estado_sii: string;
  pedido?: { numero_pedido: string };
  tipo_documento?: { id: number; codigo: string; nombre: string };
  items_devolucion?: { producto: string; cantidad_devuelta: number; local_destino: string | null }[];
}

export interface ListaNotasCredito {
  total: number;
  items: NotaCredito[];
}

export async function listarNotasCredito(params?: {
  tenant_id?: number;
  tipo_documento_id?: number;
  estado_sii?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  skip?: number;
  limit?: number;
}): Promise<ListaNotasCredito> {
  const url = new URL(`${API_URL}/api/notas-credito/`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.append(k, String(v));
    });
  }
  const response = await fetch(url.toString(), { headers: AuthService.getAuthHeaders() });
  if (!response.ok) throw new Error('Error al cargar notas de crédito');
  return response.json();
}

export async function actualizarNotaCredito(
  notaId: number,
  body: { folio_sii?: string; estado_sii?: string }
): Promise<NotaCredito> {
  const response = await fetch(`${API_URL}/api/notas-credito/${notaId}`, {
    method: 'PATCH',
    headers: { ...AuthService.getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error('Error al actualizar la nota de crédito');
  return response.json();
}

export async function obtenerNotaCreditoPorPedido(pedidoId: number): Promise<NotaCredito | null> {
  const response = await fetch(`${API_URL}/api/notas-credito/pedido/${pedidoId}`, {
    headers: AuthService.getAuthHeaders(),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Error al cargar la nota de crédito');
  return response.json();
}
