import { AuthService } from '../auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface IngredienteReceta {
    id?: number;
    receta_id?: number;
    producto_ingrediente_id: number;
    cantidad: number;
    unidad_medida_id: number;
    orden: number;
    notas?: string;
    costo_unitario_referencia?: number;
    costo_total_calculado?: number;
}

export interface Receta {
    id?: number;
    producto_id: number;
    nombre: string;
    rendimiento: number;
    unidad_rendimiento_id: number;
    version?: number;
    costo_total_calculado?: number;
    costo_unitario_calculado?: number;
    fecha_creacion?: string;
    fecha_actualizacion?: string;
    activa?: boolean;
    notas?: string;
    ingredientes: IngredienteReceta[];
}

export interface RecetaCreate {
    nombre: string;
    rendimiento: number;
    unidad_rendimiento_id: number;
    notas?: string;
    activa?: boolean;
    ingredientes: Omit<IngredienteReceta, 'id' | 'receta_id' | 'costo_unitario_referencia' | 'costo_total_calculado'>[];
}

export async function getRecetaProducto(productoId: number): Promise<Receta> {
    const response = await fetch(`${API_URL}/api/recetas/productos/${productoId}/receta`, {
        headers: AuthService.getAuthHeaders(),
        cache: 'no-store',
    });
    if (!response.ok) {
        if (response.status === 404) {
            throw new Error('NOT_FOUND');
        }
        throw new Error('Error al cargar receta');
    }
    return response.json();
}

export async function createReceta(productoId: number, receta: RecetaCreate): Promise<Receta> {
    const response = await fetch(`${API_URL}/api/recetas/productos/${productoId}/receta`, {
        method: 'POST',
        headers: AuthService.getAuthHeaders(),
        body: JSON.stringify(receta),
    });
    if (!response.ok) {
        const error = await response.json();
        console.error('Error del servidor:', error);
        throw new Error(error.detail || JSON.stringify(error) || 'Error al crear receta');
    }
    return response.json();
}

export async function deleteReceta(recetaId: number): Promise<void> {
    const response = await fetch(`${API_URL}/api/recetas/recetas/${recetaId}`, {
        method: 'DELETE',
        headers: AuthService.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Error al eliminar receta');
}

export async function recalcularCostos(recetaId: number): Promise<Receta> {
    const response = await fetch(`${API_URL}/api/recetas/recetas/${recetaId}/recalcular`, {
        method: 'POST',
        headers: AuthService.getAuthHeaders(),
        cache: 'no-store',
    });
    if (!response.ok) throw new Error('Error al recalcular costos');
    return response.json();
}

export async function crearIngredienteAPI(
    recetaId: number,
    ingrediente: Omit<IngredienteReceta, 'id' | 'receta_id' | 'costo_unitario_referencia' | 'costo_total_calculado'>
): Promise<IngredienteReceta> {
    console.log('Enviando ingrediente:', ingrediente);
    const response = await fetch(`${API_URL}/api/recetas/recetas/${recetaId}/ingredientes`, {
        method: 'POST',
        headers: AuthService.getAuthHeaders(),
        body: JSON.stringify(ingrediente),
    });

    console.log('Status respuesta:', response.status);

    if (!response.ok) {
        const text = await response.text();
        console.error('Error body:', text);
        try {
            const error = JSON.parse(text);
            throw new Error(error.detail || 'Error al agregar ingrediente');
        } catch (e) {
            throw new Error(`Error ${response.status}: ${text}`);
        }
    }

    const data = await response.json();
    console.log('Datos respuesta:', data);
    return data;
}

export async function borrarIngredienteAPI(ingredienteId: number): Promise<void> {
    console.log('Eliminando ingrediente ID:', ingredienteId);
    const response = await fetch(`${API_URL}/api/recetas/ingredientes/${ingredienteId}`, {
        method: 'DELETE',
        headers: AuthService.getAuthHeaders(),
        cache: 'no-store', // Asegurar que no use caché
    });

    console.log('Status eliminación:', response.status);

    if (!response.ok) {
        const text = await response.text();
        console.error('Error body:', text);
        try {
            const error = JSON.parse(text);
            throw new Error(error.detail || 'Error al eliminar ingrediente');
        } catch (e) {
            throw new Error(`Error ${response.status}: ${text}`);
        }
    }
}
