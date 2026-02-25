// CRUD Estados de Enrolamiento
export const createEstadoEnrolamiento = async (data: Partial<EstadoEnrolamiento>): Promise<EstadoEnrolamiento> => {
  return apiRequest('/api/maestras/estados-enrolamiento', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: {
      'Content-Type': 'application/json',
      ...AuthService.getAuthHeaders(),
    },
  });
};

export const updateEstadoEnrolamiento = async (id: number, data: Partial<EstadoEnrolamiento>): Promise<EstadoEnrolamiento> => {
  return apiRequest(`/api/maestras/estados-enrolamiento/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
    headers: {
      'Content-Type': 'application/json',
      ...AuthService.getAuthHeaders(),
    },
  });
};

export const deleteEstadoEnrolamiento = async (id: number): Promise<void> => {
  return apiRequest(`/api/maestras/estados-enrolamiento/${id}`, {
    method: 'DELETE',
    headers: AuthService.getAuthHeaders(),
  });
};
// CRUD Tipos de Vehículo
export const createTipoVehiculo = async (data: Partial<TipoVehiculo>): Promise<TipoVehiculo> => {
  return apiRequest('/api/maestras/tipos-vehiculo', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: {
      'Content-Type': 'application/json',
      ...AuthService.getAuthHeaders(),
    },
  });
};

export const updateTipoVehiculo = async (id: number, data: Partial<TipoVehiculo>): Promise<TipoVehiculo> => {
  return apiRequest(`/api/maestras/tipos-vehiculo/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
    headers: {
      'Content-Type': 'application/json',
      ...AuthService.getAuthHeaders(),
    },
  });
};

export const deleteTipoVehiculo = async (id: number): Promise<void> => {
  return apiRequest(`/api/maestras/tipos-vehiculo/${id}`, {
    method: 'DELETE',
    headers: AuthService.getAuthHeaders(),
  });
};
/**
 * API functions para el módulo de Recepción de Mercancías (Sistema WMS)
 */
import { AuthService } from '../auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ============================================
// INTERFACES Y TIPOS
// ============================================

export interface TipoVehiculo {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
}

export interface EstadoEnrolamiento {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
}

export interface Ubicacion {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  capacidad_maxima: number;
  activo: boolean;
}

export interface ProveedorCarne {
  id: number;
  nombre: string;
  rut: string;
  telefono?: string;
  activo: boolean;
}

export interface EnrolamientoCreate {
  tipo_vehiculo_id: number;
  proveedor_id: number;
  estado_id: number;
  usuario_registro_id: number;
  patente: string;
  chofer: string;
  numero_documento: string;
  notas?: string;
}

export interface EnrolamientoList {
  id: number;
  patente: string;
  chofer: string;
  numero_documento: string;
  fecha_inicio: string;
  fecha_termino?: string;
  tipo_vehiculo_nombre: string;
  proveedor_nombre: string;
  estado_nombre: string;
  usuario_registro_nombre: string;
}

export interface EnrolamientoResponse {
  id: number;
  patente: string;
  chofer: string;
  numero_documento: string;
  tipo_vehiculo_id: number;
  proveedor_id: number;
  estado_id: number;
  usuario_registro_id: number;
  fecha_inicio: string;
  fecha_termino?: string;
  notas?: string;
  // Datos relacionados opcionales
  tipo_vehiculo?: TipoVehiculo;
  proveedor?: any;
  estado?: EstadoEnrolamiento;
  usuario_registro?: any;
}

export interface LoteCreate {
  enrolamiento_id: number;
  producto_id: number;
  ubicacion_id: number;
  codigo_lote: string;
  qr_propio: string;
  peso_original: number;
  peso_actual: number;
  fecha_vencimiento: string;
  fecha_fabricacion?: string;
  qr_original?: string;
  lote_proveedor?: string;
  foto_etiqueta?: string;
}

export interface LoteList {
  id: number;
  codigo_lote: string;
  qr_propio: string;
  qr_original?: string;  // QR de la etiqueta original
  lote_proveedor?: string;  // Lote del proveedor
  peso_original: number;
  peso_actual: number;
  fecha_vencimiento: string;
  disponible_venta: boolean;
  vendido: boolean;
  fecha_registro: string;
  producto_nombre: string;
  ubicacion_codigo: string;
  enrolamiento_patente: string;
}

export interface LoteResponse {
  id: number;
  codigo_lote: string;
  enrolamiento_id: number;
  producto_id: number;
  ubicacion_id: number;
  qr_original?: string;
  lote_proveedor?: string;
  qr_propio: string;
  peso_original: number;
  peso_actual: number;
  fecha_vencimiento: string;
  fecha_fabricacion?: string;
  fecha_registro: string;
  disponible_venta: boolean;
  vendido: boolean;
  foto_etiqueta?: string;
  // Datos relacionados
  producto_nombre?: string;
  ubicacion_nombre?: string;
  enrolamiento?: any;
}

export interface EstadisticasEnrolamiento {
  total_enrolamientos: number;
  pendientes: number;
  en_proceso: number;
  finalizados: number;
  total_lotes: number;
  lotes_disponibles: number;
  lotes_vendidos: number;
  cajas_por_mes: number;
}

// ============================================
// UTILIDADES
// ============================================

async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      ...AuthService.getAuthHeaders(),
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Error en la respuesta' }));
    throw new Error(error.detail || `Error ${response.status}`);
  }

  return response.json();
}

// ============================================
// TABLAS MAESTRAS
// ============================================

export const getTiposVehiculo = async (): Promise<TipoVehiculo[]> => {
  return apiRequest('/api/maestras/tipos-vehiculo');
};

export const getEstadosEnrolamiento = async (): Promise<EstadoEnrolamiento[]> => {
  return apiRequest('/api/maestras/estados-enrolamiento');
};

export const getUbicaciones = async (): Promise<Ubicacion[]> => {
  return apiRequest('/api/maestras/ubicaciones');
};

export const getProveedoresCarnes = async (): Promise<ProveedorCarne[]> => {
  return apiRequest('/api/enrolamiento/proveedores-carne');
};

// Productos (para lotes)
export const getProductos = async (): Promise<{ id: number; nombre: string; sku: string }[]> => {
  return apiRequest('/api/productos/');
};

// Productos de CARNES específicamente (para WMS)
export const getProductosCarnes = async (): Promise<{ id: number; nombre: string; sku: string; descripcion: string }[]> => {
  return apiRequest('/api/maestras/productos-carnes');
};

// ============================================
// ENROLAMIENTOS
// ============================================

export const getEnrolamientos = async (params?: {
  estado_id?: number;
  proveedor_id?: number;
  tipo_vehiculo_id?: number;
  skip?: number;
  limit?: number;
}): Promise<EnrolamientoList[]> => {
  const searchParams = new URLSearchParams();
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });
  }

  const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
  return apiRequest(`/api/enrolamiento/enrolamientos${queryString}`);
};

export const getEnrolamiento = async (id: number): Promise<EnrolamientoResponse> => {
  return apiRequest(`/api/enrolamiento/enrolamientos/${id}`);
};

// Alias para consistencia
export const getEnrolamientoById = getEnrolamiento;

export const createEnrolamiento = async (data: EnrolamientoCreate): Promise<EnrolamientoResponse> => {
  return apiRequest('/api/enrolamiento/enrolamientos', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateEnrolamiento = async (id: number, data: Partial<EnrolamientoCreate>): Promise<EnrolamientoResponse> => {
  return apiRequest(`/api/enrolamiento/enrolamientos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const deleteEnrolamiento = async (id: number): Promise<void> => {
  return apiRequest(`/api/enrolamiento/enrolamientos/${id}`, {
    method: 'DELETE',
  });
};

// ============================================
// LOTES / CAJAS
// ============================================

export const getLotes = async (params?: {
  enrolamiento_id?: number;
  producto_id?: number;
  ubicacion_id?: number;
  disponible_venta?: boolean;
  vendido?: boolean;
  skip?: number;
  limit?: number;
}): Promise<LoteList[]> => {
  const searchParams = new URLSearchParams();
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });
  }

  const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
  return apiRequest(`/api/enrolamiento/lotes${queryString}`);
};

export const getLote = async (id: number) => {
  return apiRequest(`/api/enrolamiento/lotes/${id}`);
};

export const createLote = async (data: LoteCreate) => {
  return apiRequest('/api/enrolamiento/lotes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateLote = async (id: number, data: Partial<LoteCreate>) => {
  return apiRequest(`/api/enrolamiento/lotes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const deleteLote = async (id: number): Promise<void> => {
  return apiRequest(`/api/enrolamiento/lotes/${id}`, {
    method: 'DELETE',
  });
};

export const descargarEtiquetaLote = async (id: number): Promise<Blob> => {
  const response = await fetch(`${API_BASE}/api/enrolamiento/lotes/${id}/etiqueta/pdf`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${AuthService.getToken()}`,
    },
  });
  
  if (!response.ok) {
    throw new Error('Error al descargar etiqueta');
  }
  
  return response.blob();
};

export const descargarEtiquetasMultiples = async (loteIds: number[]): Promise<Blob> => {
  const response = await fetch(`${API_BASE}/api/enrolamiento/lotes/etiquetas/pdf`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AuthService.getToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(loteIds),
  });
  
  if (!response.ok) {
    throw new Error('Error al descargar etiquetas');
  }
  
  return response.blob();
};

// ============================================
// ESTADÍSTICAS
// ============================================

export const getEstadisticasEnrolamiento = async (): Promise<EstadisticasEnrolamiento> => {
  return apiRequest('/api/enrolamiento/estadisticas');
};

// ============================================
// UTILIDADES PARA UI
// ============================================

export const generarCodigoLote = (enrolamientoId: number, numeroSecuencia: number): string => {
  const año = new Date().getFullYear();
  const mes = String(new Date().getMonth() + 1).padStart(2, '0');
  const secuencia = String(numeroSecuencia).padStart(3, '0');
  return `L-${año}${mes}-${String(enrolamientoId).padStart(3, '0')}-${secuencia}`;
};

export const generarQRPropio = (): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `QR-${timestamp}-${random}`.toUpperCase();
};

export const formatearFecha = (fecha: string): string => {
  return new Date(fecha).toLocaleString('es-CL');
};

export const formatearFechaSolo = (fecha: string): string => {
  return new Date(fecha).toLocaleDateString('es-CL');
};

export const obtenerColorEstado = (estado: string): string => {
  const estadoUpper = estado.toUpperCase();
  switch (estadoUpper) {
    case 'PENDIENTE': return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
    case 'EN_PROCESO': return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
    case 'FINALIZADO': return 'bg-green-500/20 text-green-400 border border-green-500/30';
    default: return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
  }
};