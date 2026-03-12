import { AuthService } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface Comision {
  id: number;
  vendedor_id: number;
  vendedor_nombre: string | null;
  pedido_id: number;
  numero_pedido: string;
  porcentaje: number;
  monto_bruto: number;
  monto_neto: number;
  monto_comision: number;
  periodo: string;
  fecha_pedido: string | null;
  fecha_generacion: string;
  estado: 'PENDIENTE' | 'LIQUIDADA';
  liquidacion_id: number | null;
}

export interface LiquidacionComision {
  id: number;
  vendedor_id: number;
  vendedor_nombre: string | null;
  periodo: string;
  fecha_inicio: string;
  fecha_fin: string;
  fecha_pago_prevista: string;
  total_ventas_neto: number;
  total_comision: number;
  cantidad_pedidos: number;
  estado: 'PENDIENTE' | 'PAGADA';
  notas: string | null;
  fecha_creacion: string;
  fecha_pago_real: string | null;
}

export interface ResumenVendedorPeriodo {
  vendedor_id: number;
  vendedor_nombre: string | null;
  porcentaje_comision: number | null;
  periodo: string;
  total_ventas_neto: number;
  total_comision: number;
  cantidad_pedidos: number;
  tiene_liquidacion: boolean;
}

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { headers: AuthService.getAuthHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Error ${res.status}`);
  }
  return res.json();
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: AuthService.getAuthHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Error ${res.status}`);
  }
  return res.json();
}

async function apiPut<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'PUT',
    headers: AuthService.getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Error ${res.status}`);
  }
  return res.json();
}

export function getComisiones(params?: {
  periodo?: string;
  vendedor_id?: number;
  estado?: string;
}): Promise<Comision[]> {
  const q = new URLSearchParams();
  if (params?.periodo) q.set('periodo', params.periodo);
  if (params?.vendedor_id) q.set('vendedor_id', String(params.vendedor_id));
  if (params?.estado) q.set('estado', params.estado);
  return apiGet<Comision[]>(`/api/comisiones/?${q}`);
}

export function getPeriodos(): Promise<{ periodos: string[] }> {
  return apiGet('/api/comisiones/periodos');
}

export function getResumenComisiones(periodo?: string): Promise<ResumenVendedorPeriodo[]> {
  const q = periodo ? `?periodo=${periodo}` : '';
  return apiGet<ResumenVendedorPeriodo[]>(`/api/comisiones/resumen${q}`);
}

export function getLiquidaciones(params?: {
  vendedor_id?: number;
  periodo?: string;
  estado?: string;
}): Promise<LiquidacionComision[]> {
  const q = new URLSearchParams();
  if (params?.vendedor_id) q.set('vendedor_id', String(params.vendedor_id));
  if (params?.periodo) q.set('periodo', params.periodo);
  if (params?.estado) q.set('estado', params.estado);
  return apiGet<LiquidacionComision[]>(`/api/comisiones/liquidaciones?${q}`);
}

export function crearLiquidacion(data: {
  vendedor_id: number;
  periodo: string;
  notas?: string;
}): Promise<LiquidacionComision> {
  return apiPost('/api/comisiones/liquidaciones', data);
}

export function marcarLiquidacionPagada(id: number): Promise<LiquidacionComision> {
  return apiPut(`/api/comisiones/liquidaciones/${id}/pagar`);
}
