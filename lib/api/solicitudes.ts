
import { SolicitudTransferencia, SolicitudTransferenciaCreate, SolicitudTransferenciaUpdate } from "@/types/solicitud";
import { AuthService } from "../auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";


export async function getSolicitudes(): Promise<SolicitudTransferencia[]> {
  const res = await fetch(`${API_URL}/api/solicitudes-transferencia/`, {
    headers: AuthService.getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Error al obtener solicitudes');
  return res.json();
}


export async function createSolicitud(data: SolicitudTransferenciaCreate): Promise<SolicitudTransferencia> {
  const res = await fetch(`${API_URL}/api/solicitudes-transferencia/`, {
    method: 'POST',
    headers: AuthService.getAuthHeaders(),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Error al crear solicitud');
  return res.json();
}


export async function updateSolicitud(id: number, data: SolicitudTransferenciaUpdate): Promise<SolicitudTransferencia> {
  const res = await fetch(`${API_URL}/api/solicitudes-transferencia/${id}`, {
    method: 'PUT',
    headers: AuthService.getAuthHeaders(),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Error al actualizar solicitud');
  return res.json();
}


export async function deleteSolicitud(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/api/solicitudes-transferencia/${id}`, {
    method: 'DELETE',
    headers: AuthService.getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Error al eliminar solicitud');
}


export async function getSolicitud(id: number): Promise<SolicitudTransferencia> {
  const res = await fetch(`${API_URL}/api/solicitudes-transferencia/${id}`, {
    headers: AuthService.getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Error al obtener solicitud');
  return res.json();
}
