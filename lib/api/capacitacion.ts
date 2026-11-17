import { AuthService } from '../auth';

// Centro de Capacitación (change OpenSpec fme-backend: add-centro-capacitacion)
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const BASE = `${API_URL}/api/capacitacion`;

export interface LeccionResumen {
  slug: string;
  titulo: string;
  descripcion: string;
}

export interface SeccionCapacitacion {
  modulo: string;
  nombre: string;
  lecciones: LeccionResumen[];
}

/** Error con el status HTTP, para que el visor distinga 403 (no contratado) de 404. */
export class ErrorCapacitacion extends Error {
  constructor(public status: number, mensaje: string) {
    super(mensaje);
  }
}

async function errorDe(res: Response, porDefecto: string): Promise<ErrorCapacitacion> {
  let mensaje = porDefecto;
  try {
    const body = await res.json();
    const d = body?.detail;
    mensaje = typeof d === 'string' ? d : d?.mensaje || porDefecto;
  } catch {
    /* respuesta sin JSON */
  }
  return new ErrorCapacitacion(res.status, mensaje);
}

export async function getIndice(): Promise<SeccionCapacitacion[]> {
  const res = await fetch(BASE, { headers: AuthService.getAuthHeaders() });
  if (!res.ok) throw await errorDe(res, 'Error al cargar la capacitación');
  const data = await res.json();
  return data.secciones ?? [];
}

/** Devuelve el HTML de la lección como texto (se muestra en un iframe sandbox con srcdoc). */
export async function getLeccion(modulo: string, slug: string): Promise<string> {
  const res = await fetch(`${BASE}/${encodeURIComponent(modulo)}/${encodeURIComponent(slug)}`, {
    headers: AuthService.getAuthHeaders(),
  });
  if (!res.ok) throw await errorDe(res, 'Error al cargar la lección');
  return res.text();
}
