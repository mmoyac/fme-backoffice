import { AuthService } from '../auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ===========================
// Tipos
// ===========================

export interface SelloAdvertencia {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  color: string;
  icono: string | null;
  orden: number;
  activo: boolean;
}

export interface InformacionNutricional {
  id: number;
  producto_id: number;
  porcion_referencia: string;
  energia_kcal: number | null;
  proteinas_g: number | null;
  carbohidratos_g: number | null;
  azucares_g: number | null;
  grasas_totales_g: number | null;
  grasas_saturadas_g: number | null;
  grasas_trans_g: number | null;
  fibra_g: number | null;
  sodio_mg: number | null;
  colesterol_mg: number | null;
  calcio_mg: number | null;
  hierro_mg: number | null;
  vitamina_a_mcg: number | null;
  vitamina_c_mg: number | null;
  fecha_actualizacion: string | null;
}

export interface EtiquetaCompleta {
  producto_id: number;
  producto_nombre: string;
  producto_sku: string;
  codigo_barra: string | null;
  informacion_nutricional: InformacionNutricional | null;
  sellos: SelloAdvertencia[];
}

export interface InformacionNutricionalUpdate {
  porcion_referencia?: string;
  energia_kcal?: number;
  proteinas_g?: number;
  carbohidratos_g?: number;
  azucares_g?: number;
  grasas_totales_g?: number;
  grasas_saturadas_g?: number;
  grasas_trans_g?: number;
  fibra_g?: number;
  sodio_mg?: number;
  colesterol_mg?: number;
  calcio_mg?: number;
  hierro_mg?: number;
  vitamina_a_mcg?: number;
  vitamina_c_mg?: number;
}

// ===========================
// Funciones de API
// ===========================

export async function getSellos(): Promise<SelloAdvertencia[]> {
  const response = await fetch(`${API_URL}/api/etiquetas/sellos`, {
    headers: AuthService.getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Error al cargar sellos');
  return response.json();
}

export async function getEtiquetaCompleta(productoId: number): Promise<EtiquetaCompleta> {
  const response = await fetch(`${API_URL}/api/etiquetas/producto/${productoId}/completa`, {
    headers: AuthService.getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Error al cargar etiqueta');
  return response.json();
}

export async function getInformacionNutricional(productoId: number): Promise<InformacionNutricional> {
  const response = await fetch(`${API_URL}/api/etiquetas/producto/${productoId}/nutricional`, {
    headers: AuthService.getAuthHeaders(),
  });
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('NOT_FOUND');
    }
    throw new Error('Error al cargar información nutricional');
  }
  return response.json();
}

export async function createInformacionNutricional(
  productoId: number,
  data: InformacionNutricionalUpdate
): Promise<InformacionNutricional> {
  const response = await fetch(`${API_URL}/api/etiquetas/producto/${productoId}/nutricional`, {
    method: 'POST',
    headers: AuthService.getAuthHeaders(),
    body: JSON.stringify({ producto_id: productoId, ...data }),
  });
  if (!response.ok) throw new Error('Error al crear información nutricional');
  return response.json();
}

export async function updateInformacionNutricional(
  productoId: number,
  data: InformacionNutricionalUpdate
): Promise<InformacionNutricional> {
  const response = await fetch(`${API_URL}/api/etiquetas/producto/${productoId}/nutricional`, {
    method: 'PUT',
    headers: AuthService.getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Error al actualizar información nutricional');
  return response.json();
}

export async function asignarSellos(productoId: number, selloIds: number[]): Promise<void> {
  const response = await fetch(`${API_URL}/api/etiquetas/producto/${productoId}/sellos`, {
    method: 'POST',
    headers: AuthService.getAuthHeaders(),
    body: JSON.stringify({ sello_ids: selloIds }),
  });
  if (!response.ok) throw new Error('Error al asignar sellos');
}

export async function getSellosProducto(productoId: number): Promise<SelloAdvertencia[]> {
  const response = await fetch(`${API_URL}/api/etiquetas/producto/${productoId}/sellos`, {
    headers: AuthService.getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Error al cargar sellos del producto');
  return response.json();
}
