/**
 * Ninguna pantalla puede tener scroll horizontal de página, en ningún ancho ≥320 px
 * (change improve-backoffice-responsive-performance, D8). Al crear una pantalla, agregarla aquí.
 *
 * Pantallas de detalle (/[id]): se prueban solo si E2E_IDS trae el id correspondiente, p. ej.
 *   E2E_IDS='{"pedido":332,"producto":1671,"productoReceta":1664,"cliente":79,"local":1,
 *             "cotizacion":17,"compra":26,"ot":28,"ruta":17}'
 */
import { expect, test, type Page } from '@playwright/test';

const TOKEN = process.env.E2E_TOKEN;
const IDS: Record<string, number> = process.env.E2E_IDS ? JSON.parse(process.env.E2E_IDS) : {};

// [nombre, ruta, pestaña de Inventario a abrir (opcional)]
const PANTALLAS: [string, string, string?][] = [
  ['Pedidos', '/admin/pedidos'],
  ['POS', '/admin/pedidos/pos'],
  ['Productos', '/admin/productos'],
  ['Inventario · Existencias', '/admin/inventario', 'Existencias'],
  ['Inventario · Conteo', '/admin/inventario', 'Conteo'],
  ['Inventario · Transferencias', '/admin/inventario', 'Transferencias'],
  ['Inventario · Historial', '/admin/inventario', 'Historial'],
  ['Inventario · Valorización', '/admin/inventario', 'Valorización'],
  ['Inventario · Stock de cajas', '/admin/inventario/stock-cajas'],
  ['Solicitudes', '/admin/solicitudes'],
  ['Capacitación', '/admin/capacitacion'],
  ['Capacitación · Lección', '/admin/capacitacion/inventario/existencias-y-alertas'],
  ['Clientes', '/admin/clientes'],
  ['Clientes · Reportes de crédito', '/admin/clientes/credito/reportes'],
  ['Clientes · Nuevo', '/admin/clientes/nuevo'],
  ['Caja', '/admin/caja'],
  ['Cobranza', '/admin/cobranza'],
  ['Comisiones', '/admin/comisiones'],
  ['Despacho', '/admin/despacho'],
  ['Despacho · Tablero', '/admin/despacho/tablero'],
  ['Despacho · Rutas', '/admin/despacho/rutas'],
  ['Despacho · Resumen de cajas', '/admin/despacho/resumen-cajas'],
  ['Despacho · Picking de cajas', '/admin/despacho/picking-cajas'],
  ['Despacho · Calculadora', '/admin/despacho/calculadora'],
  ['Vehículos', '/admin/vehiculos'],
  ['Compras', '/admin/compras'],
  ['Compras · Nueva', '/admin/compras/nuevo'],
  ['Compras · Proveedores', '/admin/compras/proveedores'],
  ['Producción', '/admin/produccion'],
  ['Producción · Nueva', '/admin/produccion/nuevo'],
  ['Órdenes de Trabajo', '/admin/produccion/ordenes-trabajo'],
  ['Órdenes de Trabajo · Nueva', '/admin/produccion/ordenes-trabajo/nueva'],
  ['Cotizaciones', '/admin/cotizaciones'],
  ['Cotizaciones · Nueva', '/admin/cotizaciones/nueva'],
  ['Pre-venta de cajas', '/admin/pedidos/cajas'],
  ['Pre-venta de cajas · Nueva', '/admin/pedidos/cajas/nueva'],
  ['Usuarios', '/admin/usuarios'],
  ['Notas de crédito', '/admin/notas-credito'],
  ['Tenants', '/admin/tenants'],
  ['Precios', '/admin/precios'],
  ['Precios · Proveedores', '/admin/precios/proveedores'],
  ['Productos · Nuevo', '/admin/productos/nuevo'],
  ['Locales', '/admin/locales'],
  ['Locales · Nuevo', '/admin/locales/nuevo'],
  ['Recepción', '/admin/recepcion'],
  ['Recepción · Enrolamientos', '/admin/recepcion/enrolamientos'],
  ['Recepción · Enrolamiento nuevo', '/admin/recepcion/enrolamientos/nuevo'],
  ['Recepción · Lotes', '/admin/recepcion/lotes'],
  ['Recepción · Lote nuevo', '/admin/recepcion/lotes/nuevo'],
  ['Recepción · Ubicaciones', '/admin/recepcion/ubicaciones'],
  ['Facturas', '/admin/facturas'],
  ['Dashboard', '/admin/dashboard'],
  ['Dashboard · Ventas', '/admin/dashboard/ventas'],
  ['Dashboard · Cajas', '/admin/dashboard/cajas'],
  ['Dashboard · Solicitudes', '/admin/dashboard/solicitudes'],
  ['Dashboard · Alertas de stock', '/admin/dashboard/stock-alertas'],
  ['Dashboard · Facturación', '/admin/dashboard/facturacion'],
  ['Alertas', '/admin/alertas'],
  ['Alertas · Productos sin precio', '/admin/alertas/productos-sin-precio'],
  ['Mantenedores', '/admin/mantenedores'],
  ['Configuración · Landing', '/admin/configuracion/landing'],
  ['Configuración · Pasarelas', '/admin/configuracion/pasarelas'],
  ['Superadmin', '/admin/superadmin'],
];

// [nombre, plantilla de ruta, clave en E2E_IDS]
const DETALLES: [string, string, string][] = [
  ['Pedido · Detalle', '/admin/pedidos/{id}', 'pedido'],
  ['Producto · Detalle', '/admin/productos/{id}', 'producto'],
  ['Producto · Receta', '/admin/productos/{id}/receta', 'productoReceta'],
  ['Cliente · Detalle', '/admin/clientes/{id}', 'cliente'],
  ['Local · Detalle', '/admin/locales/{id}', 'local'],
  ['Cotización · Detalle', '/admin/cotizaciones/{id}', 'cotizacion'],
  ['Compra · Edición', '/admin/compras/{id}', 'compra'],
  ['Compra · Detalle', '/admin/compras/{id}/detalle', 'compra'],
  ['Orden de Trabajo · Detalle', '/admin/produccion/ordenes-trabajo/{id}', 'ot'],
  ['Ruta de despacho · Detalle', '/admin/despacho/rutas/{id}', 'ruta'],
  ['Despacho · Detalle', '/admin/despacho/{id}', 'despacho'],
  ['Enrolamiento · Detalle', '/admin/recepcion/enrolamientos/{id}', 'enrolamiento'],
  ['Enrolamiento · Carga masiva', '/admin/recepcion/enrolamientos/{id}/carga-masiva', 'enrolamiento'],
];

test.beforeEach(async ({ context }) => {
  test.skip(!TOKEN, 'Definir E2E_TOKEN con un JWT de la API local');
  await context.addInitScript((t) => localStorage.setItem('fme_auth_token', t), TOKEN as string);
});

async function abrir(page: Page, ruta: string, pestana?: string) {
  await page.goto(ruta);
  await page.waitForSelector('main', { timeout: 60_000 });
  if (pestana) await page.getByRole('button', { name: pestana, exact: true }).click();
  // esperar a que termine de cargar datos (desaparecen los "Cargando...")
  await page.waitForFunction(() => !/Cargando/.test(document.querySelector('main')?.textContent || ''), null, { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(500);
}

async function sinScrollHorizontal(page: Page, nombre: string) {
  const { ancho, vista } = await page.evaluate(() => ({
    ancho: document.documentElement.scrollWidth,
    vista: window.innerWidth,
  }));
  expect(ancho, `${nombre}: el documento mide ${ancho}px y la pantalla ${vista}px`).toBeLessThanOrEqual(vista);
}

for (const [nombre, ruta, pestana] of PANTALLAS) {
  test(`${nombre} no tiene scroll horizontal`, async ({ page }) => {
    await abrir(page, ruta, pestana);
    await sinScrollHorizontal(page, nombre);
  });
}

for (const [nombre, plantilla, clave] of DETALLES) {
  test(`${nombre} no tiene scroll horizontal`, async ({ page }) => {
    test.skip(!IDS[clave], `Sin id "${clave}" en E2E_IDS`);
    await abrir(page, plantilla.replace('{id}', String(IDS[clave])));
    await sinScrollHorizontal(page, nombre);
  });
}
