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

export interface TipoVehiculo {
  id: number;
  codigo: string;
  nombre: string;
}

export interface Vehiculo {
  id: number;
  patente: string;
  marca: string | null;
  modelo: string | null;
  anio: number | null;
  capacidad_kg: number | null;
  activo: boolean;
  tipo_vehiculo_id: number | null;
  tipo_vehiculo: TipoVehiculo | null;
  label: string;
}

export interface VehiculoCreate {
  patente: string;
  marca?: string;
  modelo?: string;
  anio?: number;
  capacidad_kg?: number;
  tipo_vehiculo_id?: number;
}

export interface VehiculoUpdate extends Partial<VehiculoCreate> {
  activo?: boolean;
}

// ─── API functions ────────────────────────────────────────────────────

export const listarTiposVehiculo = (): Promise<TipoVehiculo[]> =>
  apiRequest('/api/vehiculos/tipos');

export const listarVehiculos = (soloActivos = true): Promise<Vehiculo[]> =>
  apiRequest(`/api/vehiculos/?solo_activos=${soloActivos}`);

export const crearVehiculo = (data: VehiculoCreate): Promise<Vehiculo> =>
  apiRequest('/api/vehiculos/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const actualizarVehiculo = (id: number, data: VehiculoUpdate): Promise<Vehiculo> =>
  apiRequest(`/api/vehiculos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const desactivarVehiculo = (id: number): Promise<void> =>
  apiRequest(`/api/vehiculos/${id}`, { method: 'DELETE' });

// ─── Usuarios (choferes) ──────────────────────────────────────────────

export interface UsuarioChofer {
  id: number;
  nombre_completo: string;
  email: string;
  is_active: boolean;
}

export const listarUsuarios = (): Promise<UsuarioChofer[]> =>
  apiRequest('/api/vehiculos/choferes');
