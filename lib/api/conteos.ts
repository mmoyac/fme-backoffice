import { AuthService } from '../auth';

// Conteo de inventario (change OpenSpec fme-backend: add-conteo-inventario)
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const BASE = `${API_URL}/api/conteos-inventario`;

export type TipoConteo = 'COMPLETO' | 'PARCIAL';
export type EstadoConteo = 'EN_PROCESO' | 'FINALIZADO' | 'CANCELADO';

export interface ConteoItem {
  id: number;
  producto_id: number;
  sku?: string;
  producto_nombre?: string;
  categoria_id?: number;
  categoria_nombre?: string;
  unidad?: string;
  stock_sistema?: number | null;
  stock_actual?: number | null;
  cantidad_contada?: number | null;
  diferencia?: number | null;
  ajuste_aplicado?: number | null;
  usuario_captura?: string | null;
  fecha_captura?: string | null;
}

export interface ConteoResumen {
  id: number;
  local_id: number;
  local_nombre?: string;
  tipo: TipoConteo;
  estado: EstadoConteo;
  observacion?: string | null;
  usuario_creador?: string;
  fecha_inicio: string;
  usuario_cierre?: string | null;
  fecha_cierre?: string | null;
  total_items: number;
  items_contados: number;
  items_con_diferencia: number;
}

export interface ConteoDetalle extends ConteoResumen {
  items: ConteoItem[];
}

async function handle<T>(response: Response, fallback: string): Promise<T> {
  if (!response.ok) {
    let msg = fallback;
    try {
      const err = await response.json();
      msg = typeof err.detail === 'string' ? err.detail : err.detail?.mensaje || fallback;
    } catch { /* sin cuerpo */ }
    throw new Error(msg);
  }
  return response.status === 204 ? (undefined as T) : response.json();
}

export async function listarConteos(filtros: { local_id?: number; estado?: string } = {}): Promise<ConteoResumen[]> {
  const params = new URLSearchParams();
  if (filtros.local_id) params.append('local_id', String(filtros.local_id));
  if (filtros.estado) params.append('estado', filtros.estado);
  const res = await fetch(`${BASE}/?${params}`, { headers: AuthService.getAuthHeaders() });
  return handle(res, 'Error al listar conteos');
}

export async function obtenerConteo(id: number): Promise<ConteoDetalle> {
  const res = await fetch(`${BASE}/${id}`, { headers: AuthService.getAuthHeaders() });
  return handle(res, 'Error al obtener el conteo');
}

export async function iniciarConteo(data: { local_id: number; tipo: TipoConteo; observacion?: string }): Promise<ConteoDetalle> {
  const res = await fetch(`${BASE}/`, { method: 'POST', headers: AuthService.getAuthHeaders(), body: JSON.stringify(data) });
  return handle(res, 'Error al iniciar el conteo');
}

export async function agregarItems(id: number, data: { producto_ids?: number[]; categoria_id?: number }): Promise<ConteoDetalle> {
  const res = await fetch(`${BASE}/${id}/items`, {
    method: 'POST', headers: AuthService.getAuthHeaders(),
    body: JSON.stringify({ producto_ids: data.producto_ids || [], categoria_id: data.categoria_id ?? null }),
  });
  return handle(res, 'Error al agregar productos');
}

export async function quitarItem(id: number, itemId: number): Promise<void> {
  const res = await fetch(`${BASE}/${id}/items/${itemId}`, { method: 'DELETE', headers: AuthService.getAuthHeaders() });
  return handle(res, 'Error al quitar el producto');
}

export async function registrarCantidad(id: number, itemId: number, cantidad: number): Promise<ConteoItem> {
  const res = await fetch(`${BASE}/${id}/items/${itemId}`, {
    method: 'PUT', headers: AuthService.getAuthHeaders(), body: JSON.stringify({ cantidad_contada: cantidad }),
  });
  return handle(res, 'Error al guardar la cantidad');
}

export async function finalizarConteo(id: number): Promise<ConteoDetalle> {
  const res = await fetch(`${BASE}/${id}/finalizar`, { method: 'POST', headers: AuthService.getAuthHeaders() });
  return handle(res, 'Error al finalizar el conteo');
}

export async function cancelarConteo(id: number): Promise<ConteoDetalle> {
  const res = await fetch(`${BASE}/${id}/cancelar`, { method: 'POST', headers: AuthService.getAuthHeaders() });
  return handle(res, 'Error al cancelar el conteo');
}

export async function descargarExcelConteo(id: number): Promise<void> {
  const res = await fetch(`${BASE}/${id}/excel`, { headers: AuthService.getAuthHeaders() });
  if (!res.ok) throw new Error('Error al exportar el conteo');
  const blob = await res.blob();
  const disp = res.headers.get('content-disposition') || '';
  const nombre = /filename="([^"]+)"/.exec(disp)?.[1] || `conteo_${id}.xlsx`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
