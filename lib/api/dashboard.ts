import { AuthService } from '../auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface EstadisticasDashboard {
  ventas: {
    hoy: number;
    mes: number;
  };
  pedidos: {
    total: number;
    por_estado: {
      PENDIENTE: number;
      CONFIRMADO: number;
      EN_PREPARACION: number;
      ENTREGADO: number;
      CANCELADO: number;
    };
  };
  por_cobrar: {
    monto: number;
    cantidad: number;
  };
  ticket_promedio: number;
  top_productos: Array<{
    nombre: string;
    sku: string;
    cantidad_vendida: number;
  }>;
  stock_bajo: Array<{
    nombre: string;
    sku: string;
    stock: number;
  }>;
  total_clientes: number;
  ventas_por_dia: Array<{
    fecha: string;
    dia: string;
    ventas: number;
  }>;
  ultimos_pedidos: Array<{
    id: number;
    numero_pedido: string;
    cliente: string;
    monto: number;
    estado: string;
    fecha: string;
  }>;
}

export async function getEstadisticasDashboard(): Promise<EstadisticasDashboard> {
  const response = await fetch(`${API_URL}/api/dashboard/estadisticas`, {
    headers: AuthService.getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Error al obtener estadísticas');
  return response.json();
}

