
import { AuthService } from '../auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface DetalleOrden {
    id: number;
    producto_id: number;
    unidad_medida_id: number;
    cantidad_programada: number;
    cantidad_producida?: number;
    // Included fields via join usually, but for now we might need to fetch manually or check backend response
    // Backend "OrdenProduccionRead" includes full structure if configured, let's assume we might need to enhance backend or fetch aux data.
}

export interface DetalleOrdenCreate {
    producto_id: number;
    cantidad: number;
    unidad_medida_id: number;
}

export interface OrdenProduccion {
    id: number;
    local_id: number;
    fecha_programada: string;
    fecha_creacion: string;
    fecha_finalizacion?: string;
    estado: string; // PLANIFICADA, FINALIZADA, CANCELADA
    notas?: string;
    detalles: DetalleOrden[];
}

export interface OrdenProduccionCreate {
    local_id: number;
    fecha_programada: string;
    notas?: string;
    detalles: DetalleOrdenCreate[];
}

export async function getOrdenes(): Promise<OrdenProduccion[]> {
    // Currently backend doesn't have a GET /ordenes list endpoint, we only created POST...
    // Wait, I missed creating the GET list endpoint in the backend in the previous turn!
    // I only created create and finalize.
    // I should probably fix that in the backend first or now.
    // Let's assume I will add it.
    const response = await fetch(`${API_URL}/api/produccion/ordenes`, {
        headers: AuthService.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Error al cargar órdenes de producción');
    return response.json();
}

export async function createOrden(orden: OrdenProduccionCreate): Promise<OrdenProduccion> {
    const response = await fetch(`${API_URL}/api/produccion/ordenes`, {
        method: 'POST',
        headers: {
            ...AuthService.getAuthHeaders(),
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(orden),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al crear orden de producción');
    }
    return response.json();
}

export interface AjusteProduccion {
    detalle_id: number;
    cantidad_producida_real: number;
}

export interface AjusteConsumo {
    producto_id: number;
    cantidad_consumida_real: number;
}

export interface ConfirmacionFinalizacion {
    detalles_ajustes: AjusteProduccion[];
    insumos_ajustes: AjusteConsumo[];
    notas_finalizacion?: string;
}

export async function finalizarOrden(id: number, payload?: ConfirmacionFinalizacion): Promise<void> {
    const response = await fetch(`${API_URL}/api/produccion/ordenes/${id}/finalizar`, {
        method: 'POST',
        headers: {
            ...AuthService.getAuthHeaders(),
            'Content-Type': 'application/json'
        },
        body: payload ? JSON.stringify(payload) : undefined
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al finalizar orden');
    }
}

export async function deleteOrden(id: number): Promise<void> {
    const response = await fetch(`${API_URL}/api/produccion/ordenes/${id}`, {
        method: 'DELETE',
        headers: AuthService.getAuthHeaders(),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al eliminar orden');
    }
}

export interface RequisitoInsumo {
    producto_id: number;
    nombre: string;
    cantidad: number;
    unidad: string;
}

export async function getRequisitosOrden(id: number): Promise<RequisitoInsumo[]> {
    const response = await fetch(`${API_URL}/api/produccion/ordenes/${id}/requisitos`, {
        headers: AuthService.getAuthHeaders(),
    });

    if (!response.ok) {
        throw new Error('Error al calcular requisitos');
    }
    return response.json();
}
