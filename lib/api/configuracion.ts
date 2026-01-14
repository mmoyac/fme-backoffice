/**
 * API service para configuraciones del sistema
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface TipoDocumento {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
}

export interface MedioPago {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  permite_cheque: boolean;
  activo: boolean;
}

/**
 * Obtener tipos de documento disponibles
 */
export async function obtenerTiposDocumento(activo: boolean = true): Promise<TipoDocumento[]> {
  const url = `${API_URL}/api/config/tipos-documento${activo ? '?activo=true' : ''}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Error obteniendo tipos de documento: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Obtener medios de pago disponibles
 */
export async function obtenerMediosPago(activo: boolean = true): Promise<MedioPago[]> {
  const url = `${API_URL}/api/config/medios-pago${activo ? '?activo=true' : ''}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Error obteniendo medios de pago: ${response.statusText}`);
  }

  return response.json();
}