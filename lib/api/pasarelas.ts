import { AuthService } from '../auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const BASE = `${API_URL}/api/admin/pasarelas`;

export type Ambiente = 'INTEGRACION' | 'PRODUCCION';
export type EstadoPagoOnline = 'INICIADO' | 'CONFIRMADO' | 'RECHAZADO' | 'EXPIRADO' | 'EN_REVISION';

export interface CampoCredencial {
    codigo: string;
    etiqueta: string;
    secreto: boolean;
}

export interface ProveedorPago {
    codigo: string;
    nombre: string;
    requiere_email: boolean;
    monto_minimo: number | null;
    campos: CampoCredencial[];
}

export interface ProveedoresRespuesta {
    proveedores: ProveedorPago[];
    entorno: 'desarrollo' | 'produccion';
}

export interface PasarelaPago {
    id: number;
    proveedor: string;
    nombre_proveedor: string;
    nombre_visible: string;
    ambiente: Ambiente;
    orden: number;
    activo: boolean;
    credenciales_cargadas: boolean;
    credenciales_actualizadas_en?: string | null;
    ultima_prueba_en?: string | null;
    ultima_prueba_ok?: boolean | null;
    ultima_prueba_mensaje?: string | null;
    puede_cobrar: boolean;
}

export interface PasarelaCrear {
    proveedor: string;
    nombre_visible: string;
    ambiente: Ambiente;
    orden: number;
}

export interface PasarelaEditar {
    nombre_visible?: string;
    ambiente?: Ambiente;
    orden?: number;
}

export interface PagoOnline {
    id: string;
    pedido_id: number;
    numero_pedido: string | number | null;
    pasarela: string;
    monto: number;
    estado: EstadoPagoOnline;
    iniciado_en: string;
    confirmado_en?: string | null;
    id_transaccion?: string | null;
    motivo_revision?: string | null;
    medio?: string | null;
}

async function errorDe(response: Response, porDefecto: string): Promise<Error> {
    try {
        const error = await response.json();
        return new Error(error.detail || porDefecto);
    } catch {
        return new Error(porDefecto);
    }
}

export async function obtenerProveedores(): Promise<ProveedoresRespuesta> {
    const response = await fetch(`${BASE}/proveedores`, {
        headers: AuthService.getAuthHeaders(),
    });

    if (!response.ok) throw await errorDe(response, 'Error al obtener proveedores de pago');
    return response.json();
}

export async function listarPasarelas(): Promise<PasarelaPago[]> {
    const response = await fetch(BASE, {
        headers: AuthService.getAuthHeaders(),
    });

    if (!response.ok) throw await errorDe(response, 'Error al obtener pasarelas');
    return response.json();
}

export async function crearPasarela(data: PasarelaCrear): Promise<PasarelaPago> {
    const response = await fetch(BASE, {
        method: 'POST',
        headers: AuthService.getAuthHeaders(),
        body: JSON.stringify(data),
    });

    if (!response.ok) throw await errorDe(response, 'Error al crear pasarela');
    return response.json();
}

export async function editarPasarela(id: number, data: PasarelaEditar): Promise<PasarelaPago> {
    const response = await fetch(`${BASE}/${id}`, {
        method: 'PATCH',
        headers: AuthService.getAuthHeaders(),
        body: JSON.stringify(data),
    });

    if (!response.ok) throw await errorDe(response, 'Error al editar pasarela');
    return response.json();
}

export async function reemplazarCredenciales(id: number, credenciales: Record<string, string>): Promise<PasarelaPago> {
    const response = await fetch(`${BASE}/${id}/credenciales`, {
        method: 'PUT',
        headers: AuthService.getAuthHeaders(),
        body: JSON.stringify(credenciales),
    });

    if (!response.ok) throw await errorDe(response, 'Error al guardar credenciales');
    return response.json();
}

async function accion(id: number, nombre: 'probar' | 'activar' | 'desactivar', porDefecto: string): Promise<PasarelaPago> {
    const response = await fetch(`${BASE}/${id}/${nombre}`, {
        method: 'POST',
        headers: AuthService.getAuthHeaders(),
    });

    if (!response.ok) throw await errorDe(response, porDefecto);
    return response.json();
}

export const probarPasarela = (id: number) => accion(id, 'probar', 'Error al probar la conexión');
export const activarPasarela = (id: number) => accion(id, 'activar', 'Error al activar pasarela');
export const desactivarPasarela = (id: number) => accion(id, 'desactivar', 'Error al desactivar pasarela');

export async function eliminarPasarela(id: number): Promise<void> {
    const response = await fetch(`${BASE}/${id}`, {
        method: 'DELETE',
        headers: AuthService.getAuthHeaders(),
    });

    if (!response.ok) throw await errorDe(response, 'Error al eliminar pasarela');
}

export async function listarPagosOnline(estado?: string, limite = 100): Promise<PagoOnline[]> {
    const params = new URLSearchParams();
    if (estado) params.set('estado', estado);
    params.set('limite', String(limite));
    const response = await fetch(`${BASE}/pagos/lista?${params.toString()}`, {
        headers: AuthService.getAuthHeaders(),
    });

    if (!response.ok) throw await errorDe(response, 'Error al obtener pagos en línea');
    return response.json();
}
