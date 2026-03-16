import { AuthService } from '../auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...AuthService.getAuthHeaders(), ...(options.headers || {}) },
  }).then(async (res) => {
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.detail || `HTTP ${res.status}`);
    }
    if (res.status === 204) return undefined as T;
    return res.json();
  });
}

// ─── Types ───────────────────────────────────────────────────────────

export interface PedidoResumen {
  id: number;
  numero_pedido: string;
  cliente_nombre: string;
  cliente_telefono?: string | null;
  direccion?: string | null;
  monto_total: number;
  estado?: string;
  es_pagado: boolean;
  kg_brutos: number;
  items_count: number;
  fecha_pedido?: string;
}

export interface HojaRutaItem {
  id: number;
  pedido_id: number;
  orden: number;
  entregado: boolean;
  fecha_entrega: string | null;
  notas_entrega: string | null;
  pedido: PedidoResumen;
}

export interface VehiculoResumen {
  id: number;
  patente: string;
  marca: string | null;
  modelo: string | null;
  capacidad_kg: number | null;
  tipo: string | null;
  label: string;
}

export interface ChoferResumen {
  id: number;
  nombre: string;
  email: string;
}

export interface HojaRuta {
  id: number;
  vehiculo_id: number | null;
  vehiculo: VehiculoResumen | null;
  chofer_id: number | null;
  chofer: ChoferResumen | null;
  // legacy
  chofer_nombre: string | null;
  patente: string | null;
  capacidad_kg: number | null;
  estado: 'PENDIENTE' | 'EN_RUTA' | 'COMPLETADA';
  fecha_creacion: string;
  fecha_salida: string | null;
  fecha_retorno: string | null;
  notas: string | null;
  total_kg: number;
  capacidad_disponible_kg: number | null;
  porcentaje_carga: number | null;
  total_pedidos: number;
  pedidos_entregados: number;
  items: HojaRutaItem[];
  // Cobro chofer
  tipo_cobro_chofer: 'FIJO' | 'POR_KG' | null;
  tarifa_chofer: number | null;
  monto_cobro_chofer: number | null;
  cobro_chofer_pagado: boolean;
  fecha_pago_chofer: string | null;
}

export interface HojaRutaCreate {
  vehiculo_id: number;
  chofer_id: number;
  capacidad_kg?: number;
  notas?: string;
  pedido_ids: number[];
  tipo_cobro_chofer?: 'FIJO' | 'POR_KG';
  tarifa_chofer?: number;
}

// ─── API functions ───────────────────────────────────────────────────

export const listarPedidosDisponibles = (): Promise<PedidoResumen[]> =>
  apiRequest('/api/hojas-ruta/pedidos-disponibles');

export const listarHojasRuta = (estado?: string): Promise<HojaRuta[]> => {
  const qs = estado ? `?estado=${estado}` : '';
  return apiRequest(`/api/hojas-ruta/${qs}`);
};

export const obtenerHojaRuta = (id: number): Promise<HojaRuta> =>
  apiRequest(`/api/hojas-ruta/${id}`);

export const crearHojaRuta = (data: HojaRutaCreate): Promise<HojaRuta> =>
  apiRequest('/api/hojas-ruta/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const marcarEnRuta = (id: number): Promise<{ ok: boolean; estado: string; fecha_salida: string }> =>
  apiRequest(`/api/hojas-ruta/${id}/salir`, { method: 'POST' });

export const marcarEntregado = (
  hojaId: number,
  itemId: number,
  notas?: string
): Promise<{ ok: boolean; hoja_completada: boolean }> =>
  apiRequest(`/api/hojas-ruta/${hojaId}/items/${itemId}/entregar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notas_entrega: notas || null }),
  });

export const eliminarHojaRuta = (id: number): Promise<{ ok: boolean }> =>
  apiRequest(`/api/hojas-ruta/${id}`, { method: 'DELETE' });

export const pagarChoferMasivo = (hoja_ids: number[]): Promise<{ ok: boolean; hojas_pagadas: number; total_pagado: number; fecha_pago: string }> =>
  apiRequest('/api/hojas-ruta/pagar-masivo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hoja_ids }),
  });

export const calcularCobrosChofer = (id: number): Promise<{ ok: boolean; monto_cobro_chofer: number; tipo_cobro_chofer: string }> =>
  apiRequest(`/api/hojas-ruta/${id}/calcular-cobro-chofer`, { method: 'POST' });

export const pagarChofer = (id: number, monto?: number): Promise<{ ok: boolean; monto_cobro_chofer: number; fecha_pago_chofer: string }> =>
  apiRequest(`/api/hojas-ruta/${id}/pagar-chofer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(monto !== undefined ? { monto } : {}),
  });
