import { AuthService } from '../auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface LocalCliente {
  id: number;
  cliente_id: number;
  nombre: string;
  direccion: string;
  telefono?: string;
  email?: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface LocalClienteCreate {
  nombre: string;
  direccion: string;
  telefono?: string;
  email?: string;
  activo?: boolean;
}

export interface LocalClienteUpdate {
  nombre?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  activo?: boolean;
}

export async function getLocalesCliente(clienteId: number): Promise<LocalCliente[]> {
  const response = await fetch(`${API_URL}/api/locales_cliente/cliente/${clienteId}`, {
    headers: AuthService.getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Error al obtener locales del cliente');
  return response.json();
}

function sanitizarLocal(data: LocalClienteCreate | LocalClienteUpdate) {
  return {
    ...data,
    telefono: data.telefono?.trim() || null,
    email: data.email?.trim() || null,
  };
}

export async function createLocalCliente(clienteId: number, data: LocalClienteCreate): Promise<LocalCliente> {
  const response = await fetch(`${API_URL}/api/locales_cliente/?cliente_id=${clienteId}`, {
    method: 'POST',
    headers: {
      ...AuthService.getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(sanitizarLocal(data)),
  });
  if (!response.ok) throw new Error('Error al crear local');
  return response.json();
}

export async function updateLocalCliente(localClienteId: number, data: LocalClienteUpdate): Promise<LocalCliente> {
  const response = await fetch(`${API_URL}/api/locales_cliente/${localClienteId}`, {
    method: 'PUT',
    headers: {
      ...AuthService.getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(sanitizarLocal(data)),
  });
  if (!response.ok) throw new Error('Error al actualizar local');
  return response.json();
}

export async function deleteLocalCliente(localClienteId: number): Promise<void> {
  const response = await fetch(`${API_URL}/api/locales_cliente/${localClienteId}`, {
    method: 'DELETE',
    headers: AuthService.getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Error al eliminar local');
}
