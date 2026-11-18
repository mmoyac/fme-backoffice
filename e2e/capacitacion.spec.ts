/**
 * Centro de Capacitación (change OpenSpec fme-backend: add-centro-capacitacion).
 * Corre solo en el proyecto escritorio-1280.
 *
 *   E2E_TOKEN=<jwt admin> E2E_TOKEN_ROL=<jwt de un rol no admin, opcional> npm run test:ancho -- e2e/capacitacion.spec.ts
 */
import { expect, test, type BrowserContext } from '@playwright/test';

const TOKEN = process.env.E2E_TOKEN;
const TOKEN_ROL = process.env.E2E_TOKEN_ROL;
const LECCION = '/admin/capacitacion/inventario/existencias-y-alertas';

test.beforeEach(async ({}, info) => {
  test.skip(info.project.name !== 'escritorio-1280', 'Solo escritorio');
  test.skip(!TOKEN, 'Definir E2E_TOKEN');
});

async function conToken(context: BrowserContext, token: string) {
  await context.addInitScript((t) => localStorage.setItem('fme_auth_token', t), token);
}

test('índice: muestra General e Inventario con sus lecciones', async ({ page, context }) => {
  await conToken(context, TOKEN!);
  await page.goto('/admin/capacitacion');
  await expect(page.getByRole('heading', { name: 'General' })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole('heading', { name: 'Inventario' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Existencias y alertas de stock/ })).toBeVisible();
});

test('visor: iframe aislado, quiz funciona, localStorage bloqueado y alto ajustado', async ({ page, context }) => {
  await conToken(context, TOKEN!);
  await page.goto(LECCION);
  const iframe = page.locator('iframe');
  await expect(iframe).toBeVisible({ timeout: 60_000 });

  // Sandbox sin allow-same-origin: la lección no puede leer la sesión del backoffice
  await expect(iframe).toHaveAttribute('sandbox', 'allow-scripts');

  const frame = page.frameLocator('iframe');
  await expect(frame.getByRole('heading', { name: 'Existencias y alertas de stock' })).toBeVisible();

  // Quiz: responder la primera pregunta muestra el feedback
  await frame.getByRole('button', { name: '🔴 Rojo' }).click();
  await expect(frame.getByText(/✔ Correcto/).first()).toBeVisible();

  // localStorage y el DOM del padre son inaccesibles desde la lección
  const marco = page.frames().find((f) => f !== page.mainFrame());
  expect(marco).toBeTruthy();
  const acceso = await marco!.evaluate(() => {
    const r: Record<string, string> = {};
    try { r.storage = String(window.localStorage.getItem('fme_auth_token')); } catch (e) { r.storage = (e as Error).name; }
    try { r.padre = String(window.parent.document.title); } catch (e) { r.padre = (e as Error).name; }
    return r;
  });
  expect(acceso.storage).toBe('SecurityError');
  expect(acceso.padre).toBe('SecurityError');

  // El iframe toma el alto del contenido (más que el fijo de 800 px) y hay navegación a la siguiente
  await expect.poll(async () => (await iframe.boundingBox())?.height ?? 0).toBeGreaterThan(1000);
  await expect(page.getByRole('link', { name: /Registrar una merma →/ })).toBeVisible();
});

test('visor: 403 de la API muestra "no disponible en tu plan" sin contenido', async ({ page, context }) => {
  await conToken(context, TOKEN!);
  await page.route('**/api/capacitacion/inventario/**', (r) =>
    r.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ detail: { code: 'modulo_no_contratado', mensaje: 'Tu plan no incluye el módulo Inventario' } }) }),
  );
  await page.goto(LECCION);
  await expect(page.getByText('Esta capacitación no está disponible en tu plan')).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('iframe')).toHaveCount(0);
});

test('visor: lección inexistente muestra "No encontramos esta lección"', async ({ page, context }) => {
  await conToken(context, TOKEN!);
  await page.goto('/admin/capacitacion/inventario/no-existe');
  await expect(page.getByText('No encontramos esta lección')).toBeVisible({ timeout: 60_000 });
});

test('barra superior: 🎓 visible y lleva al índice', async ({ page, context }) => {
  await conToken(context, TOKEN!);
  await page.goto('/admin/dashboard');
  await page.locator('header').getByRole('link', { name: 'Capacitación', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/capacitacion$/);
});

test('rol no admin: ve 🎓 y puede abrir la capacitación sin ser redirigido', async ({ page, context }) => {
  test.skip(!TOKEN_ROL, 'Definir E2E_TOKEN_ROL');
  await conToken(context, TOKEN_ROL!);
  await page.goto('/admin/capacitacion');
  await expect(page.getByRole('heading', { name: 'General' })).toBeVisible({ timeout: 60_000 });
  await expect(page).toHaveURL(/\/admin\/capacitacion$/);
  await expect(page.locator('header').getByRole('link', { name: 'Capacitación', exact: true })).toBeVisible();
});

test('sin sesión: redirige al login', async ({ page }) => {
  await page.goto('/admin/capacitacion');
  await expect(page).toHaveURL(/\/login/, { timeout: 60_000 });
});
