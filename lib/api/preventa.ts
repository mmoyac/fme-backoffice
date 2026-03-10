import { AuthService } from '../auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  return fetch(`${API_URL}${path}`, options).then(async (res) => {
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.detail || `HTTP ${res.status}`);
    }
    if (res.status === 204) return undefined as T;
    return res.json();
  });
}

// --------------------------------------------------
// Types
// --------------------------------------------------

export interface ItemPreventaCreate {
  producto_id: number;
  proveedor_id: number;
  cantidad: number;
  local_cliente_id?: number | null;
  precio_acordado_kg?: number | null;
}

export interface PreventaCreate {
  cliente_id: number;
  local_id: number;
  notas?: string;
  tipo_documento_tributario_id?: number;
  items: ItemPreventaCreate[];
}

export interface AsignacionOut {
  id: number;
  lote_id: number;
  codigo_lote: string | null;
  qr_original: string | null;
  peso_real: number;
  precio_kg: number;
  monto_real: number;
  fecha_asignacion: string | null;
}

export interface ItemPreventaOut {
  id: number;
  producto_id: number;
  producto_nombre: string;
  proveedor_id: number | null;
  proveedor_nombre: string | null;
  cantidad: number;
  precio_unitario_venta: number;
  local_cliente_id: number | null;
  asignaciones_count: number;
  asignaciones: AsignacionOut[];
}

export interface PreventaOut {
  id: number;
  numero_pedido: string;
  cliente_id: number;
  cliente_nombre: string;
  local_id: number;
  estado: string;
  fecha_pedido: string;
  notas: string | null;
  monto_total: number;
  items: ItemPreventaOut[];
}

export interface LoteCandidato {
  id: number;
  codigo_lote: string;
  producto_nombre: string;
  proveedor_nombre: string;
  peso_actual: number;
  fecha_vencimiento: string | null;
  estado: 'disponible' | 'vendido' | 'no_disponible';
}

export interface ScanResultOut {
  qr_original: string;
  // Cuando múltiples lotes comparten el mismo QR
  multiples_lotes: boolean;
  lotes_candidatos: LoteCandidato[];
  // Cuando se resuelve a un único lote
  lote_id?: number;
  codigo_lote?: string;
  producto_id?: number;
  producto_nombre?: string;
  proveedor_id?: number;
  proveedor_nombre?: string;
  peso_actual?: number;
  precio_kg?: number;
  sugerencias: {
    item_pedido_id: number;
    pedido_id: number;
    numero_pedido: string;
    cliente: string;
    cajas_pedidas: number;
    cajas_asignadas: number;
    cajas_faltantes: number;
    fecha_pedido: string;
  }[];
}

export interface AsignacionResult {
  asignacion_id: number;
  lote_id: number;
  item_pedido_id: number;
  peso_real: number;
  precio_kg: number;
  monto_real: number;
  monto_total_pedido: number;
  picking_completo: boolean;
  mensaje: string;
}

// --------------------------------------------------
// API functions
// --------------------------------------------------

export const crearPreventa = async (data: PreventaCreate): Promise<PreventaOut> => {
  return apiRequest('/api/preventa/', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: {
      'Content-Type': 'application/json',
      ...AuthService.getAuthHeaders(),
    },
  });
};

export const listarPreventas = async (fecha?: string): Promise<PreventaOut[]> => {
  const params = fecha ? `?fecha=${fecha}` : '';
  return apiRequest(`/api/preventa/${params}`, {
    headers: AuthService.getAuthHeaders(),
  });
};

export const obtenerPreventa = async (id: number): Promise<PreventaOut> => {
  return apiRequest(`/api/preventa/${id}`, {
    headers: AuthService.getAuthHeaders(),
  });
};

export const cancelarPreventa = async (id: number): Promise<void> => {
  return apiRequest(`/api/preventa/${id}`, {
    method: 'DELETE',
    headers: AuthService.getAuthHeaders(),
  });
};

export const eliminarItemPreventa = async (itemId: number): Promise<void> => {
  return apiRequest(`/api/preventa/item/${itemId}`, {
    method: 'DELETE',
    headers: AuthService.getAuthHeaders(),
  });
};

export const getPdfUrl = (fecha?: string, proveedor_id?: number): string => {
  const params = new URLSearchParams();
  if (fecha) params.set('fecha', fecha);
  if (proveedor_id) params.set('proveedor_id', String(proveedor_id));
  // Pasar el token como query param para que funcione al abrir en nueva pestaña del navegador
  const token = typeof window !== 'undefined' ? localStorage.getItem('fme_auth_token') : null;
  if (token) params.set('token', token);
  return `${API_URL}/api/preventa/pdf/proveedor?${params.toString()}`;
};

/** PDF para el frigorifico: solo corte + total cajas del día (sin detalle de cliente ni precio) */
export const getFrigorificoPdfUrl = (fecha?: string): string => {
  const params = new URLSearchParams();
  if (fecha) params.set('fecha', fecha);
  const token = typeof window !== 'undefined' ? localStorage.getItem('fme_auth_token') : null;
  if (token) params.set('token', token);
  return `${API_URL}/api/preventa/pdf/frigorifico?${params.toString()}`;
};

export const escanearCaja = async (qr_original: string, lote_id?: number): Promise<ScanResultOut> => {
  const params = new URLSearchParams({ qr_original: encodeURIComponent(qr_original) });
  if (lote_id !== undefined) params.set('lote_id', String(lote_id));
  return apiRequest(`/api/preventa/picking/scan?${params.toString()}`, {
    method: 'POST',
    headers: AuthService.getAuthHeaders(),
  });
};

export const asignarCajaAPedido = async (lote_id: number, item_pedido_id: number): Promise<AsignacionResult> => {
  return apiRequest('/api/preventa/picking/asignar', {
    method: 'POST',
    body: JSON.stringify({ lote_id, item_pedido_id }),
    headers: {
      'Content-Type': 'application/json',
      ...AuthService.getAuthHeaders(),
    },
  });
};

export const desasignarCaja = async (asignacion_id: number): Promise<void> => {
  return apiRequest(`/api/preventa/picking/asignacion/${asignacion_id}`, {
    method: 'DELETE',
    headers: AuthService.getAuthHeaders(),
  });
};

export interface ResumenCajasPedido {
  pedido_id: number;
  numero_pedido: string;
  cliente: string;
  cajas: number;
  monto_total: number;
  estado: string;
}

export interface ResumenCajasVendedor {
  vendedor_id: number;
  vendedor_nombre: string;
  cantidad_cajas: number;
  cantidad_pedidos: number;
  pedidos: ResumenCajasPedido[];
}

export interface ResumenCajasCorte {
  producto_id: number;
  corte: string;
  total_cajas: number;
}

export interface ResumenCajasPorFecha {
  fecha: string;
  total_cajas: number;
  total_pedidos: number;
  por_vendedor: ResumenCajasVendedor[];
  por_corte: ResumenCajasCorte[];
}

export const getResumenCajas = async (fecha?: string): Promise<ResumenCajasPorFecha> => {
  const params = fecha ? `?fecha=${fecha}` : '';
  return apiRequest(`/api/preventa/resumen-cajas${params}`, {
    headers: AuthService.getAuthHeaders(),
  });
};
