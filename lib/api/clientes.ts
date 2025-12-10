import { AuthService } from '../auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface Cliente {
  id: number;
  nombre: string;
  apellido?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  comuna?: string;
}

export interface ClienteCreate {
  nombre: string;
  apellido?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  comuna?: string;
}

export interface ClienteUpdate {
  nombre?: string;
  apellido?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  comuna?: string;
}

export async function getClientes(): Promise<Cliente[]> {
  const response = await fetch(`${API_URL}/api/clientes/`, {
    headers: AuthService.getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Error al obtener clientes');
  return response.json();
}

export async function getCliente(id: number): Promise<Cliente> {
  const response = await fetch(`${API_URL}/api/clientes/${id}`, {
    headers: AuthService.getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Error al obtener cliente');
  return response.json();
}

export async function createCliente(data: ClienteCreate): Promise<Cliente> {
  const response = await fetch(`${API_URL}/api/clientes/`, {
    method: 'POST',
    headers: AuthService.getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Error al crear cliente');
  }
  return response.json();
}

export async function updateCliente(id: number, data: ClienteUpdate): Promise<Cliente> {
  const response = await fetch(`${API_URL}/api/clientes/${id}`, {
    method: 'PUT',
    headers: AuthService.getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Error al actualizar cliente');
  }
  return response.json();
}

export async function deleteCliente(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/api/clientes/${id}`, {
    method: 'DELETE',
    headers: AuthService.getAuthHeaders(),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Error al eliminar cliente');
  }
}

