// Claves de caché SWR de los catálogos (ver lib/hooks/catalogos.ts). Archivo aparte para que
// lib/api/* pueda invalidar la caché tras una mutación sin importar los hooks (evita ciclos).
import { mutate } from 'swr';

export const CLAVE = {
  productos: 'catalogo:productos',
  inventario: 'catalogo:inventario',
  locales: 'catalogo:locales',
  categorias: 'catalogo:categorias',
} as const;

export const revalidar = (clave: (typeof CLAVE)[keyof typeof CLAVE]) => mutate(clave);
