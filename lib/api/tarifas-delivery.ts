import { AuthService } from '../auth';

// Tarifas de delivery por comuna de la tienda online (change add-delivery-por-comuna, fme-backend).
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const BASE = `${API_URL}/api/admin/tarifas-delivery`;

export interface TarifaDelivery {
    id: number;
    comuna: string;
    costo: number;
    activo: boolean;
    updated_at?: string | null;
}

export interface TarifaDeliveryIn {
    comuna: string;
    costo: number;
    activo: boolean;
}

async function errorDe(response: Response, porDefecto: string): Promise<Error> {
    try {
        const error = await response.json();
        const detalle = Array.isArray(error.detail) ? error.detail[0]?.msg : error.detail;
        return new Error(detalle || porDefecto);
    } catch {
        return new Error(porDefecto);
    }
}

export async function listarTarifas(): Promise<TarifaDelivery[]> {
    const response = await fetch(BASE, { headers: AuthService.getAuthHeaders() });
    if (!response.ok) throw await errorDe(response, 'Error al obtener tarifas de delivery');
    return response.json();
}

export async function crearTarifa(data: TarifaDeliveryIn): Promise<TarifaDelivery> {
    const response = await fetch(BASE, {
        method: 'POST',
        headers: AuthService.getAuthHeaders(),
        body: JSON.stringify(data),
    });
    if (!response.ok) throw await errorDe(response, 'Error al crear la tarifa');
    return response.json();
}

export async function editarTarifa(id: number, data: TarifaDeliveryIn): Promise<TarifaDelivery> {
    const response = await fetch(`${BASE}/${id}`, {
        method: 'PUT',
        headers: AuthService.getAuthHeaders(),
        body: JSON.stringify(data),
    });
    if (!response.ok) throw await errorDe(response, 'Error al editar la tarifa');
    return response.json();
}

export async function eliminarTarifa(id: number): Promise<void> {
    const response = await fetch(`${BASE}/${id}`, {
        method: 'DELETE',
        headers: AuthService.getAuthHeaders(),
    });
    if (!response.ok) throw await errorDe(response, 'Error al eliminar la tarifa');
}
