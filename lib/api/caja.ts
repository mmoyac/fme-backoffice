import { AuthService } from '../auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface TurnoCaja {
  id: number;
  vendedor_id: number;
  local_id: number;
  fecha_apertura: string;
  fecha_cierre?: string;
  estado: 'ABIERTO' | 'CERRADO';
  monto_inicial: number;
  efectivo_esperado?: number;
  efectivo_real?: number;
  diferencia?: number;
  observaciones_apertura?: string;
  observaciones_cierre?: string;
  vendedor_nombre?: string;
  vendedor_email?: string;
  local_nombre?: string;
}

export interface TurnoCajaCreate {
  local_id: number;
  monto_inicial: number;
  observaciones_apertura?: string;
}

export interface TurnoCajaClose {
  efectivo_real: number;
  observaciones_cierre?: string;
}

export interface OperacionCaja {
  id: number;
  turno_caja_id: number;
  tipo_operacion: 'APERTURA' | 'VENTA' | 'INGRESO' | 'EGRESO' | 'DEVOLUCION' | 'CIERRE';
  fecha_operacion: string;
  monto: number;
  descripcion: string;
  observaciones?: string;
  pedido_id?: number;
  medio_pago_id?: number;
  medio_pago_codigo?: string;
  medio_pago_nombre?: string;
}

export interface OperacionCajaCreate {
  tipo_operacion: 'INGRESO' | 'EGRESO' | 'DEVOLUCION';
  monto: number;
  descripcion: string;
  observaciones?: string;
  medio_pago_id?: number;
}

export interface TurnoCajaConOperaciones extends TurnoCaja {
  operaciones: OperacionCaja[];
}

export interface EstadoCajaVendedor {
  vendedor_id: number;
  vendedor_nombre: string;
  tiene_caja_abierta: boolean;
  turno_activo?: TurnoCaja;
  total_ventas: number;
  total_ingresos: number;
  total_egresos: number;
  efectivo_esperado: number;
}

export interface ResumenCajaLocal {
  local_id: number;
  local_nombre: string;
  turnos_abiertos: number;
  vendedores_activos: string[];
  total_efectivo_esperado: number;
  total_ventas_dia: number;
}

// =============================================
// ENDPOINTS API
// =============================================

const getHeaders = () => ({
  'Authorization': `Bearer ${AuthService.getToken()}`,
  'Content-Type': 'application/json'
});

export async function abrirCaja(data: TurnoCajaCreate): Promise<TurnoCaja> {
  const response = await fetch(`${API_URL}/api/caja/turno/abrir`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Error al abrir caja');
  }

  return response.json();
}

export async function cerrarCaja(turnoId: number, data: TurnoCajaClose): Promise<TurnoCaja> {
  const response = await fetch(`${API_URL}/api/caja/turno/${turnoId}/cerrar`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Error al cerrar caja');
  }

  return response.json();
}

export async function obtenerTurnoActual(): Promise<TurnoCaja> {
  const response = await fetch(`${API_URL}/api/caja/turno/actual`, {
    headers: getHeaders()
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Error al obtener turno actual');
  }

  return response.json();
}

export async function obtenerTurnoDetalle(turnoId: number): Promise<TurnoCajaConOperaciones> {
  const response = await fetch(`${API_URL}/api/caja/turno/${turnoId}`, {
    headers: getHeaders()
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Error al obtener detalle del turno');
  }

  return response.json();
}

export async function registrarOperacion(data: OperacionCajaCreate): Promise<OperacionCaja> {
  const response = await fetch(`${API_URL}/api/caja/operacion`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Error al registrar operación');
  }

  return response.json();
}

export async function obtenerEstadoCaja(): Promise<EstadoCajaVendedor> {
  const response = await fetch(`${API_URL}/api/caja/estado`, {
    headers: getHeaders()
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Error al obtener estado de caja');
  }

  return response.json();
}

export async function obtenerHistorialTurnos(
  fechaDesde?: string,
  fechaHasta?: string,
  skip: number = 0,
  limit: number = 50
): Promise<TurnoCaja[]> {
  const params = new URLSearchParams();
  if (fechaDesde) params.append('fecha_desde', fechaDesde);
  if (fechaHasta) params.append('fecha_hasta', fechaHasta);
  params.append('skip', skip.toString());
  params.append('limit', limit.toString());

  const response = await fetch(`${API_URL}/api/caja/turnos/historial?${params}`, {
    headers: getHeaders()
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Error al obtener historial de turnos');
  }

  return response.json();
}

// =============================================
// UTILIDADES
// =============================================

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0
  }).format(amount);
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('es-CL');
}

export function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function getTipoOperacionColor(tipo: string): string {
  switch (tipo) {
    case 'VENTA':
      return 'bg-green-600';
    case 'INGRESO':
      return 'bg-blue-600';
    case 'EGRESO':
      return 'bg-red-600';
    case 'DEVOLUCION':
      return 'bg-orange-600';
    case 'APERTURA':
      return 'bg-purple-600';
    case 'CIERRE':
      return 'bg-gray-600';
    default:
      return 'bg-gray-600';
  }
}

export function getTipoOperacionIcon(tipo: string): string {
  switch (tipo) {
    case 'VENTA':
      return '💰';
    case 'INGRESO':
      return '💵';
    case 'EGRESO':
      return '💸';
    case 'DEVOLUCION':
      return '🔄';
    case 'APERTURA':
      return '🔓';
    case 'CIERRE':
      return '🔒';
    default:
      return '📝';
  }
}