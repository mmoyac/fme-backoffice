import { AuthService } from '../auth';

// Valorización de inventario (change OpenSpec fme-backend: add-valorizacion-inventario)
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const BASE = `${API_URL}/api/inventario/valorizacion`;

export interface ValorizacionItem {
  producto_id: number;
  sku: string;
  producto_nombre: string;
  categoria_id: number | null;
  categoria_nombre: string | null;
  local_id: number;
  local_nombre: string;
  unidad: string | null;
  stock: number;
  costo_unitario: number | null;
  valor_inventario: number | null;
  precio_venta_neto: number | null;
  precio_venta_con_iva: number | null;
  precio_incluye_iva: boolean;
  valor_venta: number | null;
  ganancia_potencial: number | null;
  margen_pct: number | null;
  sin_costo: boolean;
  sin_precio: boolean;
  stock_negativo: boolean;
}

export interface ValorizacionTotales {
  valor_inventario: number;
  valor_venta: number;
  ganancia_potencial: number;
  margen_pct: number | null;
  productos: number;
  sin_costo: number;
  sin_precio: number;
}

export interface Valorizacion {
  items: ValorizacionItem[];
  totales: ValorizacionTotales;
}

export interface FiltrosValorizacion {
  local_id?: number;
  categoria_id?: number;
  q?: string;
}

function params(f: FiltrosValorizacion): string {
  const p = new URLSearchParams();
  if (f.local_id) p.set('local_id', String(f.local_id));
  if (f.categoria_id) p.set('categoria_id', String(f.categoria_id));
  if (f.q?.trim()) p.set('q', f.q.trim());
  return p.toString();
}

async function errorDe(res: Response, fallback: string): Promise<Error> {
  try {
    const err = await res.json();
    return new Error(typeof err.detail === 'string' ? err.detail : fallback);
  } catch {
    return new Error(fallback);
  }
}

export async function obtenerValorizacion(f: FiltrosValorizacion = {}): Promise<Valorizacion> {
  const res = await fetch(`${BASE}?${params(f)}`, { headers: AuthService.getAuthHeaders() });
  if (!res.ok) throw await errorDe(res, 'Error al obtener la valorización');
  return res.json();
}

export async function descargarValorizacionExcel(f: FiltrosValorizacion = {}): Promise<void> {
  const res = await fetch(`${BASE}/excel?${params(f)}`, { headers: AuthService.getAuthHeaders() });
  if (!res.ok) throw await errorDe(res, 'Error al exportar a Excel');
  const disp = res.headers.get('Content-Disposition') || '';
  const nombre = /filename="?([^"]+)"?/.exec(disp)?.[1] || 'valorizacion_inventario.xlsx';
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
