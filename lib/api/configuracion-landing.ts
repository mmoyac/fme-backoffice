import { AuthService } from '../auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface ColorSchema {
    primario: string;
    secundario: string;
    acento?: string;
    primario_light?: string;
    primario_dark?: string;
    secundario_light?: string;
    secundario_dark?: string;
    fondo_hero_inicio?: string;
    fondo_hero_fin?: string;
    fondo_seccion?: string;
}

export interface Badge {
    icono: string;
    texto: string;
}

export interface Beneficio {
    icono: string;
    titulo: string;
    descripcion: string;
}

export interface RedesSociales {
    facebook?: string;
    instagram?: string;
    whatsapp?: string;
    twitter?: string;
    linkedin?: string;
}

export interface ConfiguracionLanding {
    id: number;
    tenant_id: number;
    
    // Branding
    logo_url?: string;
    favicon_url?: string;
    nombre_comercial?: string;
    
    // Colores
    colores: Record<string, string>;
    paleta_id?: number | null;
    
    // Hero Section
    hero_titulo?: string;
    hero_subtitulo?: string;
    hero_imagen_url?: string;
    hero_cta_texto?: string;
    hero_cta_link?: string;
    hero_badges: Badge[];
    
    // Beneficios
    beneficios: Beneficio[];
    
    // Footer / Contacto
    redes_sociales: RedesSociales;
    telefono?: string;
    email?: string;
    direccion?: string;
    texto_footer_descripcion?: string;
    texto_copyright?: string;
    
    // SEO Metadata
    meta_title?: string;
    meta_description?: string;
    
    // Opciones de Visualización (Modo Catálogo)
    mostrar_precios: boolean;
    mostrar_stock: boolean;
    habilitar_carrito: boolean;
    
    created_at: string;
    updated_at: string;
}

export interface ConfiguracionLandingCreate {
    tenant_id: number;
    logo_url?: string;
    favicon_url?: string;
    nombre_comercial?: string;
    colores?: Record<string, string>;
    paleta_id?: number | null;
    hero_titulo?: string;
    hero_subtitulo?: string;
    hero_imagen_url?: string;
    hero_cta_texto?: string;
    hero_cta_link?: string;
    hero_badges?: Badge[];
    beneficios?: Beneficio[];
    redes_sociales?: RedesSociales;
    telefono?: string;
    email?: string;
    direccion?: string;
    texto_footer_descripcion?: string;
    texto_copyright?: string;
    meta_title?: string;
    meta_description?: string;
    mostrar_precios?: boolean;
    mostrar_stock?: boolean;
    habilitar_carrito?: boolean;
}

export interface ConfiguracionLandingUpdate extends Partial<Omit<ConfiguracionLandingCreate, 'tenant_id'>> {
    paleta_id?: number | null;
}

export async function listarConfiguraciones(): Promise<ConfiguracionLanding[]> {
    const response = await fetch(`${API_URL}/api/admin/configuracion-landing/`, {
        headers: AuthService.getAuthHeaders(),
    });
    
    if (!response.ok) throw new Error('Error al obtener configuraciones');
    return response.json();
}

export async function obtenerConfiguracion(tenantId: number): Promise<ConfiguracionLanding> {
    const response = await fetch(`${API_URL}/api/admin/configuracion-landing/${tenantId}`, {
        headers: AuthService.getAuthHeaders(),
    });
    
    if (!response.ok) {
        if (response.status === 404) {
            throw new Error('Configuración no encontrada');
        }
        throw new Error('Error al obtener configuración');
    }
    
    return response.json();
}

export async function crearConfiguracion(data: ConfiguracionLandingCreate): Promise<ConfiguracionLanding> {
    const response = await fetch(`${API_URL}/api/admin/configuracion-landing/`, {
        method: 'POST',
        headers: AuthService.getAuthHeaders(),
        body: JSON.stringify(data),
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al crear configuración');
    }
    
    return response.json();
}

export async function actualizarConfiguracion(
    tenantId: number,
    data: ConfiguracionLandingUpdate
): Promise<ConfiguracionLanding> {
    const response = await fetch(`${API_URL}/api/admin/configuracion-landing/${tenantId}`, {
        method: 'PUT',
        headers: AuthService.getAuthHeaders(),
        body: JSON.stringify(data),
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al actualizar configuración');
    }
    
    return response.json();
}

export async function eliminarConfiguracion(tenantId: number): Promise<void> {
    const response = await fetch(`${API_URL}/api/admin/configuracion-landing/${tenantId}`, {
        method: 'DELETE',
        headers: AuthService.getAuthHeaders(),
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al eliminar configuración');
    }
}
