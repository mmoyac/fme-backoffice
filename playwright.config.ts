/**
 * Prueba de ancho del backoffice (change improve-backoffice-responsive-performance, D8).
 *
 * Requiere el backoffice corriendo (por defecto http://localhost:3000, el único origen que la API
 * local acepta por CORS) y un token JWT válido de la API local:
 *
 *   E2E_TOKEN=<jwt> npm run test:ancho
 *   E2E_TOKEN=<jwt> E2E_BASE_URL=http://localhost:3000 npm run test:ancho
 *
 * Usa el Chrome instalado en el equipo (channel: 'chrome'), sin descargar navegadores.
 */
import { defineConfig } from '@playwright/test';

const VIEWPORTS = [
  { name: 'movil-320', width: 320, height: 640 },
  { name: 'movil-390', width: 390, height: 844 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'escritorio-1024', width: 1024, height: 768 }, // borde donde DataList pasa de tarjetas a tabla (lg)
  { name: 'escritorio-1280', width: 1280, height: 800 },
];

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  retries: 1, // cargas lentas ocasionales del servidor local: un reintento evita falsos negativos
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    channel: 'chrome',
    headless: true,
  },
  projects: VIEWPORTS.map((v) => ({ name: v.name, use: { viewport: { width: v.width, height: v.height } } })),
});
