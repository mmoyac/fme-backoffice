import { AuthService } from '../auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export type TipoCobranza = 'CHEQUE' | 'TRANSFERENCIA';
export type EstadoCobranza = 'PENDIENTE' | 'RECIBIDO' | 'VENCIDO' | 'ANULADO' | 'SIN_CHEQUES';

export interface ItemCobranza {
    tipo: TipoCobranza;
    referencia_id: number;      // pedido_id para CHEQUE, cobro_pendiente_id para TRANSFERENCIA
    pedido_id: number;
    numero_pedido: string;
    cliente_id: number;
    cliente_nombre: string | null;
    local_id: number;
    local_nombre: string | null;
    monto_total: number;
    monto_pendiente: number;
    cantidad_cheques: number | null;
    sin_cheques?: boolean;
    tipo_documento: string | null;
    fecha_vencimiento: string;
    dias_vencimiento: number;
    estado: EstadoCobranza;
    medio_pago_nombre: string | null;
    fecha_creacion: string | null;
    observaciones?: string | null;
    entregado?: boolean;
    estado_pedido_nombre?: string | null;
    estado_pedido_color?: string | null;
}

export interface ResumenCobranza {
    cheques: {
        monto_pendiente: number;
        cantidad_pedidos: number;
    };
    transferencias: {
        monto_pendiente: number;
        monto_vencido: number;
        cantidad_cobros: number;
    };
    total_por_cobrar: number;
}

export async function getCobranza(params?: {
    estado?: string;
    tipo?: string;
    cliente_id?: number;
    local_id?: number;
}): Promise<ItemCobranza[]> {
    const url = new URL(`${API_URL}/api/cobranza/`);
    if (params?.estado) url.searchParams.set('estado', params.estado);
    if (params?.tipo) url.searchParams.set('tipo', params.tipo);
    if (params?.cliente_id) url.searchParams.set('cliente_id', String(params.cliente_id));
    if (params?.local_id) url.searchParams.set('local_id', String(params.local_id));

    const response = await fetch(url.toString(), {
        headers: AuthService.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Error al cargar cobranza');
    return response.json();
}

export async function getResumenCobranza(): Promise<ResumenCobranza> {
    const response = await fetch(`${API_URL}/api/cobranza/resumen`, {
        headers: AuthService.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Error al cargar resumen de cobranza');
    return response.json();
}

export async function confirmarCobro(cobroId: number, observaciones?: string): Promise<void> {
    const url = new URL(`${API_URL}/api/cobranza/${cobroId}/confirmar`);
    if (observaciones) url.searchParams.set('observaciones', observaciones);

    const response = await fetch(url.toString(), {
        method: 'PATCH',
        headers: AuthService.getAuthHeaders(),
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || 'Error al confirmar cobro');
    }
}

export async function anularCobro(cobroId: number, observaciones?: string): Promise<void> {
    const url = new URL(`${API_URL}/api/cobranza/${cobroId}/anular`);
    if (observaciones) url.searchParams.set('observaciones', observaciones);

    const response = await fetch(url.toString(), {
        method: 'PATCH',
        headers: AuthService.getAuthHeaders(),
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || 'Error al anular cobro');
    }
}
