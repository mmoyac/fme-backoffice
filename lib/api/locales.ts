import { AuthService } from '../auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface Local {
  id: number;
  codigo: string;
  nombre: string;
  direccion?: string;
  activo?: boolean;
}

export interface LocalCreate {
  nombre: string;
  direccion?: string;
  activo?: boolean;
}

export interface LocalUpdate {
  nombre?: string;
  direccion?: string;
  activo?: boolean;
}

export async function getLocales(): Promise<Local[]> {
  const response = await fetch(`${API_URL}/api/locales/`, {
    headers: AuthService.getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Error al obtener locales');
  return response.json();
}

export async function getLocal(id: number): Promise<Local> {
  const response = await fetch(`${API_URL}/api/locales/${id}`, {
    headers: AuthService.getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Error al obtener local');
  return response.json();
}

export async function createLocal(data: LocalCreate): Promise<Local> {
  const response = await fetch(`${API_URL}/api/locales/`, {
    method: 'POST',
    headers: AuthService.getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Error al crear local');
  return response.json();
}

export async function updateLocal(id: number, data: LocalUpdate): Promise<Local> {
  const response = await fetch(`${API_URL}/api/locales/${id}`, {
    method: 'PUT',
    headers: AuthService.getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Error al actualizar local');
  return response.json();
}

export async function deleteLocal(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/api/locales/${id}`, {
    method: 'DELETE',
    headers: AuthService.getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Error al eliminar local');
}

