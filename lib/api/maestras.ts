import { AuthService } from '../auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface CategoriaProducto {
    id: number;
    codigo: string;
    nombre: string;
    descripcion: string | null;
    puntos_fidelidad: number;
    activo: boolean;
}

export interface TipoProducto {
    id: number;
    codigo: string;
    nombre: string;
    descripcion: string | null;
    activo: boolean;
}
// ============================================
// TIPOS DE DOCUMENTO
// ============================================

export interface TipoDocumento {
    id: number;
    codigo: string;
    nombre: string;
    activo: boolean;
}

export interface TipoDocumentoCreate {
    codigo: string;
    nombre: string;
    activo: boolean;
}

export async function getTiposDocumento(): Promise<TipoDocumento[]> {
    const response = await fetch(`${API_URL}/api/maestras/tipos-documento`, {
        headers: AuthService.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Error al cargar tipos de documento');
    return response.json();
}

export async function createTipoDocumento(tipo: TipoDocumentoCreate): Promise<TipoDocumento> {
    const response = await fetch(`${API_URL}/api/maestras/tipos-documento`, {
        method: 'POST',
        headers: AuthService.getAuthHeaders(),
        body: JSON.stringify(tipo),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al crear tipo de documento');
    }
    return response.json();
}

export async function updateTipoDocumento(id: number, tipo: Partial<TipoDocumentoCreate>): Promise<TipoDocumento> {
    const response = await fetch(`${API_URL}/api/maestras/tipos-documento/${id}`, {
        method: 'PUT',
        headers: AuthService.getAuthHeaders(),
        body: JSON.stringify(tipo),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al actualizar tipo de documento');
    }
    return response.json();
}

export async function deleteTipoDocumento(id: number): Promise<void> {
    const response = await fetch(`${API_URL}/api/maestras/tipos-documento/${id}`, {
        method: 'DELETE',
        headers: AuthService.getAuthHeaders(),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al eliminar tipo de documento');
    }
}

// ============================================
// UNIDADES DE MEDIDA
// ============================================

export interface UnidadMedida {
    id: number;
    codigo: string;
    nombre: string;
    simbolo: string;
    tipo: string | null;
    factor_conversion?: number | null;
    unidad_base_id?: number | null;
    unidad_base_nombre?: string | null;
    activo: boolean;
}

export interface CategoriaCreate {
    codigo: string;
    nombre: string;
    descripcion?: string;
    puntos_fidelidad: number;
    activo: boolean;
}

export interface TipoCreate {
    codigo: string;
    nombre: string;
    descripcion?: string;
    activo: boolean;
}

export interface UnidadCreate {
    codigo: string;
    nombre: string;
    simbolo: string;
    tipo?: string;
    factor_conversion?: number | null;
    unidad_base_id?: number | null;
    activo: boolean;
}

// --- Categorías ---

export async function getCategorias(): Promise<CategoriaProducto[]> {
    const response = await fetch(`${API_URL}/api/maestras/categorias`, {
        headers: AuthService.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Error al cargar categorías');
    return response.json();
}

export async function createCategoria(data: CategoriaCreate): Promise<CategoriaProducto> {
    const response = await fetch(`${API_URL}/api/maestras/categorias`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...AuthService.getAuthHeaders(),
        },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al crear categoría');
    }
    return response.json();
}

export async function updateCategoria(id: number, data: CategoriaCreate): Promise<CategoriaProducto> {
    const response = await fetch(`${API_URL}/api/maestras/categorias/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            ...AuthService.getAuthHeaders(),
        },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al actualizar categoría');
    }
    return response.json();
}

export async function deleteCategoria(id: number): Promise<void> {
    const response = await fetch(`${API_URL}/api/maestras/categorias/${id}`, {
        method: 'DELETE',
        headers: AuthService.getAuthHeaders(),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al eliminar categoría');
    }
}

// --- Tipos de Producto ---

export async function getTipos(): Promise<TipoProducto[]> {
    const response = await fetch(`${API_URL}/api/maestras/tipos`, {
        headers: AuthService.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Error al cargar tipos');
    return response.json();
}

export async function createTipo(data: TipoCreate): Promise<TipoProducto> {
    const response = await fetch(`${API_URL}/api/maestras/tipos`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...AuthService.getAuthHeaders(),
        },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al crear tipo');
    }
    return response.json();
}

export async function updateTipo(id: number, data: TipoCreate): Promise<TipoProducto> {
    const response = await fetch(`${API_URL}/api/maestras/tipos/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            ...AuthService.getAuthHeaders(),
        },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al actualizar tipo');
    }
    return response.json();
}

export async function deleteTipo(id: number): Promise<void> {
    const response = await fetch(`${API_URL}/api/maestras/tipos/${id}`, {
        method: 'DELETE',
        headers: AuthService.getAuthHeaders(),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al eliminar tipo');
    }
}

// --- Unidades de Medida ---

export async function getUnidades(): Promise<UnidadMedida[]> {
    const response = await fetch(`${API_URL}/api/maestras/unidades`, {
        headers: AuthService.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Error al cargar unidades');
    return response.json();
}

export async function createUnidad(data: UnidadCreate): Promise<UnidadMedida> {
    const response = await fetch(`${API_URL}/api/maestras/unidades`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...AuthService.getAuthHeaders(),
        },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al crear unidad');
    }
    return response.json();
}

export async function updateUnidad(id: number, data: UnidadCreate): Promise<UnidadMedida> {
    const response = await fetch(`${API_URL}/api/maestras/unidades/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            ...AuthService.getAuthHeaders(),
        },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al actualizar unidad');
    }
    return response.json();
}

export async function deleteUnidad(id: number): Promise<void> {
    const response = await fetch(`${API_URL}/api/maestras/unidades/${id}`, {
        method: 'DELETE',
        headers: AuthService.getAuthHeaders(),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al eliminar unidad');
    }
}

// ============================================
// MEDIOS DE PAGO
// ============================================

export interface MedioPago {
    id: number;
    codigo: string;
    nombre: string;
    permite_cheque: boolean;
    activo: boolean;
}

export async function getMediosPago(): Promise<MedioPago[]> {
    const response = await fetch(`${API_URL}/api/maestras/medios-pago`, {
        headers: AuthService.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Error al cargar medios de pago');
    return response.json();
}

// ============================================
// ESTADOS DE CHEQUE
// ============================================

export interface EstadoCheque {
    id: number;
    codigo: string;
    nombre: string;
    es_final: boolean;
    activo: boolean;
}

export async function getEstadosCheque(): Promise<EstadoCheque[]> {
    const response = await fetch(`${API_URL}/api/maestras/estados-cheque`, {
        headers: AuthService.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Error al cargar estados de cheque');
    return response.json();
}

// ============================================
// BANCOS
// ============================================

export interface Banco {
    id: number;
    codigo: string;
    nombre: string;
    nombre_corto?: string;
    activo: boolean;
}

export async function getBancos(): Promise<Banco[]> {
    const response = await fetch(`${API_URL}/api/maestras/bancos`, {
        headers: AuthService.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Error al cargar bancos');
    return response.json();
}
