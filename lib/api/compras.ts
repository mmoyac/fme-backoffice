import { AuthService } from '../auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ============================================================================
// Tipos de Proveedor
// ============================================================================

export interface TipoProveedor {
    id: number;
    codigo: string;
    nombre: string;
    descripcion?: string;
    activo: boolean;
}

export interface TipoProveedorCreate {
    codigo: string;
    nombre: string;
    descripcion?: string;
    activo?: boolean;
}

export async function getTiposProveedor(): Promise<TipoProveedor[]> {
    const response = await fetch(`${API_URL}/api/maestras/tipos-proveedor`, {
        headers: AuthService.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Error al cargar tipos de proveedor');
    return response.json();
}

export async function createTipoProveedor(tipo: TipoProveedorCreate): Promise<TipoProveedor> {
    const response = await fetch(`${API_URL}/api/maestras/tipos-proveedor`, {
        method: 'POST',
        headers: AuthService.getAuthHeaders(),
        body: JSON.stringify(tipo),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al crear tipo de proveedor');
    }
    return response.json();
}

export async function updateTipoProveedor(id: number, tipo: Partial<TipoProveedorCreate>): Promise<TipoProveedor> {
    const response = await fetch(`${API_URL}/api/maestras/tipos-proveedor/${id}`, {
        method: 'PUT',
        headers: AuthService.getAuthHeaders(),
        body: JSON.stringify(tipo),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al actualizar tipo de proveedor');
    }
    return response.json();
}

export async function deleteTipoProveedor(id: number): Promise<void> {
    const response = await fetch(`${API_URL}/api/maestras/tipos-proveedor/${id}`, {
        method: 'DELETE',
        headers: AuthService.getAuthHeaders(),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al eliminar tipo de proveedor');
    }
}

// ============================================================================
// Proveedores
// ============================================================================

export interface Proveedor {
    id: number;
    nombre: string;
    rut?: string;
    contacto?: string;
    email?: string;
    telefono?: string;
    direccion?: string;
    tipo_proveedor_id?: number | null;
    tipo_proveedor?: TipoProveedor | null;
    activo: boolean;
}

export interface ProveedorCreate {
    nombre: string;
    rut?: string;
    contacto?: string;
    email?: string;
    telefono?: string;
    direccion?: string;
    tipo_proveedor_id?: number | null;
    activo?: boolean;
}

export async function getProveedores(): Promise<Proveedor[]> {
    const response = await fetch(`${API_URL}/api/compras/proveedores`, {
        headers: AuthService.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Error al cargar proveedores');
    return response.json();
}

export async function createProveedor(proveedor: ProveedorCreate): Promise<Proveedor> {
    const response = await fetch(`${API_URL}/api/compras/proveedores`, {
        method: 'POST',
        headers: AuthService.getAuthHeaders(),
        body: JSON.stringify(proveedor),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al crear proveedor');
    }
    return response.json();
}

export async function updateProveedor(id: number, proveedor: Partial<ProveedorCreate>): Promise<Proveedor> {
    const response = await fetch(`${API_URL}/api/compras/proveedores/${id}`, {
        method: 'PUT',
        headers: AuthService.getAuthHeaders(),
        body: JSON.stringify(proveedor),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al actualizar proveedor');
    }
    return response.json();
}

export async function deleteProveedor(id: number): Promise<void> {
    const response = await fetch(`${API_URL}/api/compras/proveedores/${id}`, {
        method: 'DELETE',
        headers: AuthService.getAuthHeaders(),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al eliminar proveedor');
    }
}

// ============================================================================
// Compras
// ============================================================================

export interface DetalleCompra {
    producto_id: number;
    cantidad: number;
    precio_unitario: number;
}

export interface DetalleCompraRead extends DetalleCompra {
    id: number;
    producto_nombre?: string;
}

export interface CompraCreate {
    proveedor_id: number;
    local_id: number;
    fecha_compra?: string;
    numero_documento?: string;
    tipo_documento_id: number;
    notas?: string;
    detalles: DetalleCompra[];
}

export interface Compra {
    id: number;
    proveedor_id: number;
    local_id: number;
    fecha_compra: string;
    numero_documento?: string;
    tipo_documento_id: number;
    tipo_documento_nombre?: string; // Para mostrar en UI si el backend lo incluye (requiere update en backend schema response si queremos nombre)
    monto_total: number;
    estado: string;
    notas?: string;
    detalles: DetalleCompraRead[];
}

export async function getCompras(): Promise<Compra[]> {
    const response = await fetch(`${API_URL}/api/compras/`, {
        headers: AuthService.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Error al cargar compras');
    return response.json();
}

export async function createCompra(compra: CompraCreate): Promise<Compra> {
    const response = await fetch(`${API_URL}/api/compras/`, {
        method: 'POST',
        headers: AuthService.getAuthHeaders(),
        body: JSON.stringify(compra),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al registrar compra');
    }
    return response.json();
}

export async function getCompra(id: number): Promise<Compra> {
    const response = await fetch(`${API_URL}/api/compras/${id}`, {
        headers: AuthService.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Error al obtener compra');
    return response.json();
}

export async function updateCompra(id: number, compra: CompraCreate): Promise<Compra> {
    const response = await fetch(`${API_URL}/api/compras/${id}`, {
        method: 'PUT',
        headers: AuthService.getAuthHeaders(),
        body: JSON.stringify(compra),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al actualizar compra');
    }
    return response.json();
}

export async function deleteCompra(id: number): Promise<void> {
    const response = await fetch(`${API_URL}/api/compras/${id}`, {
        method: 'DELETE',
        headers: AuthService.getAuthHeaders(),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al eliminar compra');
    }
}

export async function recibirCompra(id: number): Promise<Compra> {
    const response = await fetch(`${API_URL}/api/compras/${id}/recibir`, {
        method: 'POST',
        headers: AuthService.getAuthHeaders(),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al recibir compra');
    }
    return response.json();
}
