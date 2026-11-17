/**
 * Utilidades de red resilientes (change OpenSpec add-ventas-offline-backoffice, Fase 1).
 *
 * - fetchConTimeout: fetch que no se queda colgado si la API no responde.
 * - ErrorDeRed: el servidor no está disponible (sin red, timeout o 5xx). NO implica
 *   que la sesión sea inválida: nunca debe provocar logout.
 * - ErrorSesion: el servidor respondió 401 (token inválido/vencido).
 */

export const TIMEOUT_DEFAULT_MS = 8000;

export class ErrorDeRed extends Error {
  constructor(message = 'Sin conexión con el servidor') {
    super(message);
    this.name = 'ErrorDeRed';
  }
}

export class ErrorSesion extends Error {
  constructor(message = 'Sesión expirada') {
    super(message);
    this.name = 'ErrorSesion';
  }
}

export function esErrorDeRed(error: unknown): error is ErrorDeRed {
  return error instanceof ErrorDeRed;
}

/** fetch con timeout. Lanza ErrorDeRed si no hay conexión o el servidor no responde a tiempo. */
export async function fetchConTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs: number = TIMEOUT_DEFAULT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') {
      throw new ErrorDeRed('El servidor no respondió a tiempo');
    }
    throw new ErrorDeRed('Sin conexión con el servidor');
  } finally {
    clearTimeout(timer);
  }
}

/** UUID v4. Usa crypto.randomUUID cuando existe (contexto seguro) y si no, getRandomValues. */
export function generarUUID(): string {
  const c: Crypto | undefined = typeof crypto !== 'undefined' ? crypto : undefined;
  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (c && typeof c.getRandomValues === 'function') {
    c.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // versión 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variante RFC 4122
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Espera ms milisegundos. */
export function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
