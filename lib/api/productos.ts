import { AuthService } from '../auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface Producto {
  id: number;
  nombre: string;
  descripcion: string | null;
  sku: string;
  imagen_url: string | null;
  categoria_id: number;
  tipo_producto_id: number;
  unidad_medida_id: number;
  precio_compra: number | null;
  costo_fabricacion: number | null;
  es_vendible: boolean;
  es_vendible_web: boolean;
  es_ingrediente: boolean;
  tiene_receta: boolean;
  activo: boolean;
  stock_minimo: number;
  stock_critico: number;
  stock_actual: number; // Computed by backend
}

export interface ProductoCreate {
  nombre: string;
  descripcion?: string;
  sku: string;
  imagen_url?: string;
  categoria_id: number;
  tipo_producto_id: number;
  unidad_medida_id: number;
  precio_compra?: number;
  costo_fabricacion?: number;
  es_vendible?: boolean;
  es_vendible_web?: boolean;
  es_ingrediente?: boolean;
  tiene_receta?: boolean;
  activo?: boolean;
  stock_minimo?: number;
  stock_critico?: number;
}

export type ProductoUpdate = Partial<ProductoCreate>;

export async function getProductos(): Promise<Producto[]> {
  const response = await fetch(`${API_URL}/api/productos/`, {
    headers: AuthService.getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Error al cargar productos');
  return response.json();
}

export async function getProducto(id: number): Promise<Producto> {
  const response = await fetch(`${API_URL}/api/productos/${id}`, {
    headers: AuthService.getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Error al cargar producto');
  return response.json();
}

export async function createProducto(producto: ProductoCreate): Promise<Producto> {
  const response = await fetch(`${API_URL}/api/productos/`, {
    method: 'POST',
    headers: AuthService.getAuthHeaders(),
    body: JSON.stringify(producto),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Error al crear producto');
  }
  return response.json();
}

export async function updateProducto(id: number, producto: Partial<ProductoCreate>): Promise<Producto> {
  const response = await fetch(`${API_URL}/api/productos/${id}`, {
    method: 'PUT',
    headers: AuthService.getAuthHeaders(),
    body: JSON.stringify(producto),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Error al actualizar producto');
  }
  return response.json();
}

export async function deleteProducto(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/api/productos/${id}`, {
    method: 'DELETE',
    headers: AuthService.getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Error al eliminar producto');
}

export async function uploadImagen(productoId: number, file: File): Promise<Producto> {
  const formData = new FormData();
  formData.append('file', file);

  const token = AuthService.getToken();
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}/api/productos/${productoId}/imagen`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Error al subir imagen');
  }
  return response.json();
}

