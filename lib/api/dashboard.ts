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
    por_canal: {
      web: {
        cantidad: number;
        ventas: number;
      };
      tienda: {
        cantidad: number;
        ventas: number;
        locales_detalle: Array<{
          local_id: number;
          nombre: string;
          codigo: string;
          cantidad_pedidos: number;
          total_ventas: number;
        }>;
      };
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
  ventas_por_vendedor: Array<{
    usuario_id: number;
    nombre: string;
    email: string;
    cantidad_pedidos: number;
    total_ventas: number;
  }>;
  ventas_por_medio_pago: Array<{
    medio_pago_id: number;
    nombre: string;
    codigo: string;
    cantidad_pedidos: number;
    total_ventas: number;
  }>;
  ultimos_pedidos: Array<{
    id: number;
    numero_pedido: string;
    cliente: string;
    monto: number;
    estado: string;
    fecha: string;
  }>;
  caja: {
    turnos_abiertos: number;
    ventas_hoy: number;
    diferencias_pendientes: number;
  };
}

export interface MetricasCaja {
  fecha_consulta: string;
  turnos_abiertos: {
    total: number;
    detalle: Array<{
      turno_id: number;
      local_id: number;
      local_nombre: string;
      vendedor_id: number;
      vendedor_nombre: string;
      fecha_apertura: string;
      monto_inicial: number;
      ventas_acumuladas: number;
      efectivo_esperado: number;
    }>;
  };
  ventas_por_vendedor_hoy: {
    total_vendedores_activos: number;
    detalle: Array<{
      vendedor_id: number;
      vendedor_nombre: string;
      num_ventas: number;
      total_ventas: number;
    }>;
  };
  diferencias_cuadre_recientes: {
    total_con_diferencia: number;
    detalle: Array<{
      turno_id: number;
      fecha_cierre: string;
      local_nombre: string;
      vendedor_nombre: string;
      efectivo_esperado: number;
      efectivo_real: number;
      diferencia: number;
      tipo_diferencia: string;
    }>;
  };
  resumen_operaciones_30d: {
    por_tipo: Array<{
      tipo: string;
      cantidad: number;
      total_monto: number;
    }>;
    total_operaciones: number;
  };
}

export async function getEstadisticasDashboard(): Promise<EstadisticasDashboard> {
  const response = await fetch(`${API_URL}/api/dashboard/estadisticas`, {
    headers: AuthService.getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Error al obtener estadísticas');
  return response.json();
}

export async function getMetricasCaja(): Promise<MetricasCaja> {
  const response = await fetch(`${API_URL}/api/dashboard/metricas-caja`, {
    headers: AuthService.getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Error al obtener métricas de caja');
  return response.json();
}
