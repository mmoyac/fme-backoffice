/**
 * Módulos contratables por tenant (change add-modulos-tenant en fme-backend).
 * El catálogo autoritativo vive en el backend (utils/modulos.py, GET /api/superadmin/modulos);
 * aquí solo están los nombres para mensajes y el helper de visibilidad.
 */
import type { User } from './auth';

export const NOMBRES_MODULO: Record<string, string> = {
    ventas: 'Ventas',
    cotizaciones: 'Cotizaciones',
    preventa: 'Pre-venta de cajas',
    tienda_online: 'Tienda online',
    inventario: 'Inventario',
    compras: 'Compras',
    produccion: 'Producción',
    etiquetado: 'Etiquetado nutricional',
    despacho: 'Despacho',
    cobranza: 'Cobranza',
    comisiones: 'Comisiones',
    fidelizacion: 'Fidelización',
};

/** Ruta del backoffice → módulo (gana el prefijo más largo). Rutas ausentes = núcleo. */
const MODULO_POR_RUTA: [string, string][] = [
    ['/admin/pedidos/cajas', 'preventa'],
    ['/admin/pedidos', 'ventas'],
    ['/admin/solicitudes', 'ventas'],
    ['/admin/caja', 'ventas'],
    ['/admin/cotizaciones', 'cotizaciones'],
    ['/admin/inventario', 'inventario'],
    ['/admin/transferencias', 'inventario'],
    ['/admin/compras', 'compras'],
    ['/admin/facturas', 'compras'],
    ['/admin/recepcion', 'compras'],
    ['/admin/precios/proveedores', 'compras'],
    ['/admin/produccion', 'produccion'],
    ['/admin/despacho', 'despacho'],
    ['/admin/vehiculos', 'despacho'],
    ['/admin/cobranza', 'cobranza'],
    ['/admin/notas-credito', 'cobranza'],
    ['/admin/comisiones', 'comisiones'],
];

/** Módulo al que pertenece una ruta, o null si es del núcleo. */
export function moduloDeRuta(pathname: string | null | undefined): string | null {
    if (!pathname) return null;
    let mejor: [string, string] | null = null;
    for (const par of MODULO_POR_RUTA) {
        if ((pathname === par[0] || pathname.startsWith(par[0] + '/')) && (!mejor || par[0].length > mejor[0].length)) {
            mejor = par;
        }
    }
    return mejor ? mejor[1] : null;
}

/**
 * true si el usuario puede ver algo que pertenece a `modulos` (basta con uno).
 * Sin módulos indicados = núcleo (siempre visible). Mientras el usuario no carga, no oculta.
 */
export function tieneModulo(user: User | null | undefined, ...modulos: string[]): boolean {
    if (modulos.length === 0) return true;
    if (!user || !user.modulos) return true;
    return modulos.some(m => user.modulos!.includes(m));
}

/**
 * Mensaje legible para un error de la API. Reconoce el 403 `modulo_no_contratado`.
 * Uso: `throw new Error(mensajeErrorApi(await res.json(), 'No se pudo guardar'))`.
 */
export function mensajeErrorApi(body: unknown, porDefecto = 'Ocurrió un error'): string {
    const detail = (body as { detail?: unknown })?.detail;
    if (detail && typeof detail === 'object' && (detail as { code?: string }).code === 'modulo_no_contratado') {
        const d = detail as { modulo?: string; mensaje?: string };
        return d.mensaje || `Tu plan no incluye el módulo ${NOMBRES_MODULO[d.modulo ?? ''] ?? d.modulo}`;
    }
    if (typeof detail === 'string') return detail;
    return porDefecto;
}
