import { AuthService } from '../auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface Producto {
  id: number;
  nombre: string;
  descripcion: string | null;
  sku: string;
  imagen_url: string | null;
  codigo_barra: string | null;
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
  // Información de categoría
  categoria_nombre: string | null;
  categoria_puntos_fidelidad: number | null;
  // Información de tipo de venta (peso vs cantidad)
  tipo_venta_codigo: string | null; // UNITARIO, PESO_SUELTO
  tipo_venta_nombre: string | null;
}

export interface ProductoCreate {
  nombre: string;
  descripcion?: string;
  sku: string;
  imagen_url?: string;
  codigo_barra?: string;
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
  const response = await fetch(`${API_URL}/api/productos/?limit=1000`, {
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
  console.log(`[API] Actualizando producto ${id}`, producto);
  
  const response = await fetch(`${API_URL}/api/productos/${id}`, {
    method: 'PUT',
    headers: AuthService.getAuthHeaders(),
    body: JSON.stringify(producto),
  });
  
  console.log(`[API] Response status: ${response.status}`);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('[API] Error response:', errorText);
    
    try {
      const error = JSON.parse(errorText);
      throw new Error(error.detail || 'Error al actualizar producto');
    } catch {
      throw new Error(`Error ${response.status}: ${errorText || 'Error al actualizar producto'}`);
    }
  }
  
  const result = await response.json();
  console.log('[API] Producto actualizado exitosamente:', result);
  return result;
}

export async function deleteProducto(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/api/productos/${id}`, {
    method: 'DELETE',
    headers: AuthService.getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Error al eliminar producto');
}

export async function uploadImagen(productoId: number, file: File): Promise<Producto> {
  console.log(`[API] Subiendo imagen para producto ${productoId}`, file.name, `(${file.size} bytes)`);
  
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

  console.log(`[API] Upload response status: ${response.status}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[API] Error uploading image:', errorText);
    
    try {
      const error = JSON.parse(errorText);
      throw new Error(error.detail || 'Error al subir imagen');
    } catch {
      throw new Error(`Error ${response.status}: ${errorText || 'Error al subir imagen'}`);
    }
  }
  
  const result = await response.json();
  console.log('[API] Imagen subida exitosamente:', result);
  return result;
}

