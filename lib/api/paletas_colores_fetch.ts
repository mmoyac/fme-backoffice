import { AuthService } from '../auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface PaletaColor {
  id: number;
  nombre: string;
  descripcion?: string;
  primario: string;
  primario_light?: string;
  primario_dark?: string;
  secundario: string;
  secundario_light?: string;
  secundario_dark?: string;
  acento?: string;
  fondo_hero_inicio?: string;
  fondo_hero_fin?: string;
  fondo_seccion?: string;
  es_publica?: boolean;
  creado_por?: number;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
}


export async function getPaletasColores(): Promise<PaletaColor[]> {
  const response = await fetch(`${API_URL}/api/paleta-colores/`, {
    headers: AuthService.getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Error al cargar paletas de colores');
  return response.json();
}


export async function createPaletaColor(data: Omit<PaletaColor, "id" | "creado_por" | "fecha_creacion" | "fecha_actualizacion">): Promise<PaletaColor> {
  const response = await fetch(`${API_URL}/api/paleta-colores/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...AuthService.getAuthHeaders(),
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Error al crear paleta de colores');
  }
  return response.json();
}


export async function updatePaletaColor(id: number, data: Partial<PaletaColor>): Promise<PaletaColor> {
  const response = await fetch(`${API_URL}/api/paleta-colores/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...AuthService.getAuthHeaders(),
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Error al actualizar paleta de colores');
  }
  return response.json();
}


export async function deletePaletaColor(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/api/paleta-colores/${id}`, {
    method: 'DELETE',
    headers: AuthService.getAuthHeaders(),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Error al eliminar paleta de colores');
  }
}
