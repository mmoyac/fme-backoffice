import { AuthService } from '../auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface InsumoCheck {
  producto_id: number;
  nombre: string;
  cantidad_requerida: number;
  stock_actual: number;
  unidad: string;
}

export interface ChequeoInsumosResult {
  ok: boolean;
  insumos: InsumoCheck[];
  errores: string[];
}

export async function chequearInsumos(producto_id: number, cantidad: number, local_id: number): Promise<ChequeoInsumosResult> {
  const url = `${API_URL}/api/produccion/chequear-insumos?producto_id=${producto_id}&cantidad=${cantidad}&local_id=${local_id}`;
  const response = await fetch(url, {
    headers: AuthService.getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Error al chequear insumos');
  return response.json();
}
