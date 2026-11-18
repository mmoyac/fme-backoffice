'use client';

/**
 * Catálogos compartidos con caché en memoria (SWR) — change improve-backoffice-responsive-performance, D7.
 *
 * Antes cada pantalla volvía a descargar productos (1000), inventario (10000), locales y categorías.
 * Ahora: al volver a una pantalla se muestra al instante lo que ya está en caché y se revalida en
 * segundo plano (stale-while-revalidate). Tras crear/editar/eliminar, llamar a `revalidar...()`.
 *
 * La caché vive solo en memoria de la pestaña: se borra al recargar, al cerrar sesión y al cambiar
 * de tenant (ambos recargan la página), así que no mezcla datos de distintas sesiones.
 */
import useSWR, { mutate } from 'swr';
import { CLAVE } from '@/lib/hooks/claves';
import { getProductos, type Producto } from '@/lib/api/productos';
import { getInventarios, type Inventario } from '@/lib/api/inventario';
import { getLocales, type Local } from '@/lib/api/locales';
import { getCategorias, type CategoriaProducto } from '@/lib/api/maestras';

export { CLAVE };

const OPCIONES = {
  revalidateOnFocus: false,
  dedupingInterval: 10_000, // pantallas que se montan juntas comparten una sola petición
  keepPreviousData: true,
};

export function useProductos() {
  return useSWR<Producto[]>(CLAVE.productos, getProductos, OPCIONES);
}

/** Stock de todos los productos en todos los locales (lo que el usuario puede ver). */
export function useInventarios() {
  return useSWR<Inventario[]>(CLAVE.inventario, getInventarios, OPCIONES);
}

export function useLocales() {
  return useSWR<Local[]>(CLAVE.locales, getLocales, OPCIONES);
}

export function useCategorias() {
  return useSWR<CategoriaProducto[]>(CLAVE.categorias, getCategorias, OPCIONES);
}

export const revalidarProductos = () => mutate(CLAVE.productos);
export const revalidarInventario = () => mutate(CLAVE.inventario);
export const revalidarLocales = () => mutate(CLAVE.locales);
export const revalidarCategorias = () => mutate(CLAVE.categorias);

/** Stock por producto: suma de los locales físicos (excluye WEB). O(n) en vez de buscar por fila. */
export function stockPorProducto(inventarios: Inventario[], locales: Local[]): Map<number, number> {
  const fisicos = new Set(locales.filter((l) => l.codigo !== 'WEB').map((l) => l.id));
  const mapa = new Map<number, number>();
  for (const inv of inventarios) {
    if (!fisicos.has(inv.local_id)) continue;
    mapa.set(inv.producto_id, (mapa.get(inv.producto_id) ?? 0) + (inv.cantidad_stock ?? 0));
  }
  return mapa;
}
