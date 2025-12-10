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

export interface UnidadMedida {
    id: number;
    codigo: string;
    nombre: string;
    simbolo: string;
    tipo: string | null;
    activo: boolean;
}

export async function getCategorias(): Promise<CategoriaProducto[]> {
    const response = await fetch(`${API_URL}/api/maestras/categorias`, {
        headers: AuthService.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Error al cargar categorías');
    return response.json();
}

export async function getTipos(): Promise<TipoProducto[]> {
    const response = await fetch(`${API_URL}/api/maestras/tipos`, {
        headers: AuthService.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Error al cargar tipos');
    return response.json();
}

export async function getUnidades(): Promise<UnidadMedida[]> {
    const response = await fetch(`${API_URL}/api/maestras/unidades`, {
        headers: AuthService.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Error al cargar unidades');
    return response.json();
}
