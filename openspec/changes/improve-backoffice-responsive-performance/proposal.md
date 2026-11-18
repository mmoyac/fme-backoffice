# Proposal

## Why

El backoffice se siente lento al navegar y casi todas las pantallas muestran scroll horizontal, en escritorio y sobre todo en el celular. El diagnóstico (2026-11-17) encontró causas de arquitectura, no de pantallas puntuales: el `<main>` del layout puede ensancharse con su contenido, el usuario y el menú se vuelven a pedir en cada navegación (hasta 3 veces el menú), no hay `loading.tsx`, el service worker cachea todas las llamadas a la API (además con riesgo de mezclar sesiones y tenants), y librerías pesadas se cargan siempre. Las pantallas tampoco distinguen escritorio de móvil: cada una arma su tabla a mano.

EffiCoop ya resolvió lo mismo con un shell que no se ensancha, un componente de lista que es tabla en escritorio y tarjetas en móvil, una sola carga de sesión y caché de datos. Este change lleva ese modelo al backoffice.

## What Changes

- **Fase 1 (shell y rendimiento):** el área de contenido no puede ensancharse (`min-w-0`) y el sidebar no se encoge; usuario y menú se cargan una vez por sesión y se comparten entre layout y sidebar; `app/admin/loading.tsx` para respuesta inmediata al navegar; el service worker deja de cachear la API y de precargar agresivamente; jspdf, html2canvas, html5-qrcode y recharts se cargan solo al usarse.
- **Fase 2 (base responsiva):** componente `DataList` (tabla en ≥768 px, tarjetas debajo), encabezado de página que se apila en móvil, y caché de catálogos (productos, locales, inventario) con SWR.
- **Fase 3 (migración):** pantallas migradas a `DataList` y al encabezado responsivo, por prioridad de uso; enlaces internos con `<Link>`; prueba automática de ancho en 320 px.

## Capabilities

### New Capabilities
- `backoffice-shell`: estructura de pantalla del backoffice (layout, carga de sesión y menú, navegación, caché del service worker) y comportamiento responsivo escritorio/móvil de listas y encabezados.

### Modified Capabilities
(ninguna)

## Impact

- **fme-backoffice**: `app/admin/layout.tsx`, `components/layout/Sidebar.tsx`, `lib/AuthProvider.tsx`, `next.config.js` (PWA), nuevos `app/admin/loading.tsx`, `components/ui/DataList.tsx`, `components/ui/PageHeader.tsx` y contexto de menú; imports dinámicos en solicitudes, recepción, productos y dashboard; luego las pantallas de la fase 3.
- **Dependencias:** `swr` (fase 2), `@playwright/test` como dependencia de desarrollo (fase 3).
- **fme-backend:** sin cambios.
- **Capacitación:** no cambian flujos ni textos de inventario. Si al migrar una pantalla cambia un nombre de botón o la ubicación de un filtro, se actualiza la lección afectada en `fme-backend/capacitacion/inventario/`.
