import { AuthService } from '../auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface Cliente {
  id: number;
  nombre: string;
  apellido?: string;
  rut?: string;
  es_empresa?: boolean;
  razon_social?: string;
  giro?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  comuna?: string;
  limite_credito?: number;
  credito_usado?: number;
  // Campos de puntos
  puntos_disponibles?: number;
  puntos_totales_ganados?: number;
  puntos_totales_usados?: number;
}

export interface ClienteCreate {
  nombre: string;
  apellido?: string;
  rut?: string;
  es_empresa?: boolean;
  razon_social?: string;
  giro?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  comuna?: string;
  limite_credito?: number;
}

export interface ClienteUpdate {
  nombre?: string;
  apellido?: string;
  rut?: string;
  es_empresa?: boolean;
  razon_social?: string;
  giro?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  comuna?: string;
  limite_credito?: number;
}

export async function getClientes(): Promise<Cliente[]> {
  const response = await fetch(`${API_URL}/api/clientes/`, {
    headers: AuthService.getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Error al obtener clientes');
  return response.json();
}

export async function getCliente(id: number): Promise<Cliente> {
  const response = await fetch(`${API_URL}/api/clientes/${id}`, {
    headers: AuthService.getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Error al obtener cliente');
  return response.json();
}

export async function createCliente(data: ClienteCreate): Promise<Cliente> {
  console.log('🤝 Creando cliente:', data);
  
  const response = await fetch(`${API_URL}/api/clientes/`, {
    method: 'POST',
    headers: AuthService.getAuthHeaders(),
    body: JSON.stringify(data),
  });

  console.log('📡 Respuesta creación cliente:', response.status, response.statusText);

  if (!response.ok) {
    const errorData = await response.json();
    console.error('❌ Error al crear cliente:', errorData);
    
    let mensajeError = `Error ${response.status}: `;
    
    if (errorData.detail) {
      if (Array.isArray(errorData.detail)) {
        mensajeError += errorData.detail.map((err: any) => 
          `Campo '${err.loc?.join('.')}': ${err.msg}`
        ).join(', ');
      } else {
        mensajeError += errorData.detail;
      }
    } else {
      mensajeError += response.statusText;
    }
    
    throw new Error(mensajeError);
  }
  
  const cliente = await response.json();
  console.log('✅ Cliente creado:', cliente);
  return cliente;
}

export async function updateCliente(id: number, data: ClienteUpdate): Promise<Cliente> {
  const response = await fetch(`${API_URL}/api/clientes/${id}`, {
    method: 'PUT',
    headers: AuthService.getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Error al actualizar cliente');
  }
  return response.json();
}

export async function deleteCliente(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/api/clientes/${id}`, {
    method: 'DELETE',
    headers: AuthService.getAuthHeaders(),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Error al eliminar cliente');
  }
}

// Interfaces para reportes de crédito
export interface ClienteCredito extends Cliente {
  credito_disponible: number;
  porcentaje_uso: number;
}

export interface ReporteCredito {
  clientes_con_credito: ClienteCredito[];
  total_limite_otorgado: number;
  total_credito_usado: number;
  total_credito_disponible: number;
  clientes_cerca_limite: ClienteCredito[];
  clientes_sin_limite: Cliente[];
}

// Funciones para manejo de crédito
export async function getReporteCredito(): Promise<ReporteCredito> {
  const clientes = await getClientes();
  
  const clientesConCredito = clientes
    .filter(c => c.limite_credito && c.limite_credito > 0)
    .map(cliente => {
      const limite = cliente.limite_credito || 0;
      const usado = cliente.credito_usado || 0;
      const disponible = limite - usado;
      const porcentajeUso = limite > 0 ? (usado / limite) * 100 : 0;
      
      return {
        ...cliente,
        credito_disponible: disponible,
        porcentaje_uso: porcentajeUso
      };
    });

  const totalLimiteOtorgado = clientesConCredito.reduce((sum, c) => sum + (c.limite_credito || 0), 0);
  const totalCreditoUsado = clientesConCredito.reduce((sum, c) => sum + (c.credito_usado || 0), 0);
  const totalCreditoDisponible = totalLimiteOtorgado - totalCreditoUsado;
  
  // Clientes cerca del límite (uso > 80%)
  const clientesCercaLimite = clientesConCredito.filter(c => c.porcentaje_uso > 80);
  
  // Clientes sin límite de crédito
  const clientesSinLimite = clientes.filter(c => !c.limite_credito || c.limite_credito <= 0);

  return {
    clientes_con_credito: clientesConCredito,
    total_limite_otorgado: totalLimiteOtorgado,
    total_credito_usado: totalCreditoUsado,
    total_credito_disponible: totalCreditoDisponible,
    clientes_cerca_limite: clientesCercaLimite,
    clientes_sin_limite: clientesSinLimite
  };
}

export async function getClientesCercaLimite(): Promise<ClienteCredito[]> {
  const reporte = await getReporteCredito();
  return reporte.clientes_cerca_limite;
}

