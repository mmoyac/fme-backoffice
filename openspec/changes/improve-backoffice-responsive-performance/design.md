# Design

## Context

Diagnóstico del 2026-11-17, comparado con EffiCoop (`D:\ProyectosAI\EffiCoop\frontend`):
- `app/admin/layout.tsx`: `<main className="flex-1 flex flex-col w-full relative">`. Como hijo flex tiene `min-width: auto`, así que una tabla ancha lo ensancha y los `overflow-x-auto` internos no sirven.
- `lib/AuthProvider.tsx`: el efecto depende de `pathname` → `GET /users/me` en cada navegación, y un objeto `user` nuevo vuelve a disparar el fetch de menú del layout y del Sidebar.
- No hay `loading.tsx`. Además `app/layout.tsx` usa `headers()`, así que todas las rutas son dinámicas y cada clic espera al servidor.
- `next.config.js`: `cacheOnFrontEndNav` + `aggressiveFrontEndNavCaching`. El SW generado aplica `NetworkFirst` a todo GET cross-origin (la API), con caché por URL sin distinguir token ni tenant.
- Imports estáticos de jspdf/html2canvas (solicitudes, 277 kB), html5-qrcode (recepción), react-barcode (productos) y recharts (dashboard de facturación).

## Goals / Non-Goals

**Goals:** sin scroll horizontal de página en ningún ancho ≥320 px; navegación con respuesta inmediata; una carga de usuario y menú por sesión; listas distintas en escritorio (tabla) y móvil (tarjetas).

**Non-Goals:** migrar de Next a Vite; cambiar endpoints del backend (el resumen del dashboard queda para un change aparte); rediseño visual.

## Decisions

### D1. El desborde se corrige en su origen, no con `overflow-x: hidden` global
`min-w-0` en `<main>` y `shrink-0` en el sidebar; las tablas anchas hacen scroll en su propio contenedor. Igual que EffiCoop (D7 de su change `fundacion-frontend`): un `overflow-x: hidden` en body esconde contenido en vez de arreglarlo.

### D2. Sesión y menú: una carga, un contexto
- `AuthProvider` carga el usuario una vez (al montar y al hacer login). La redirección entre rutas públicas y privadas va en un efecto sin fetch. El `value` se memoiza.
- Nuevo `MenuProvider` dentro del layout `/admin`: pide `/api/auth/menu` una vez por usuario (clave `user.id`), guarda la caché en `localStorage` como hoy lo hace el layout, y lo consumen el layout (autorización de ruta) y el Sidebar. La validación de ruta al navegar usa los hrefs ya cargados, sin red.

### D3. `app/admin/loading.tsx`
Skeleton liviano dentro del shell. Next lo muestra al instante y puede precargar hasta ese límite.

### D4. Service worker: estáticos sí, API no
`workboxOptions.runtimeCaching` con la API (`NEXT_PUBLIC_API_URL` y `/api/`) en `NetworkOnly`, y `cacheOnFrontEndNav`/`aggressiveFrontEndNavCaching` en `false`. Las ventas offline (add-ventas-offline-backoffice) usan su propia cola en IndexedDB, no la caché del SW; se verifica en la tarea correspondiente.

### D5. Librerías pesadas bajo demanda
`await import('jspdf')` y `import('html2canvas')` dentro de las funciones que generan PDF; `next/dynamic` con `ssr: false` para `CapturaEtiquetaGemini`, `EtiquetaPreview` y los gráficos. Es el patrón que ya usa `dashboard/stock-alertas`.

### D6. `DataList`: tabla en escritorio, tarjetas en móvil (fase 2)
Props: `items`, `columns` (`header`, `cell`, `className` con el ancho), `card(item)`, `getKey`, `onRowClick?` y `empty`. Desde `md` (≥768 px) renderiza `<table class="w-full table-fixed">` con celdas truncadas; debajo, una lista de tarjetas. Las tablas que de verdad necesitan muchas columnas (reportes) usan un contenedor propio con `overflow-x-auto`.

### D7. Caché de catálogos con SWR (fase 2)
SWR, más liviano que React Query para este caso y sin provider obligatorio, para productos, locales e inventario, con `dedupingInterval` y revalidación con `mutate` después de cada mutación.

### D8. Prueba de ancho (fase 3)
Playwright con viewports de 320, 390, 768 y 1280 px. Para cada pantalla migrada: `document.documentElement.scrollWidth <= window.innerWidth`.

## Risks / Trade-offs

- [Quitar la caché de la API del SW cambia el comportamiento sin conexión] → Hoy esa caché devuelve datos posiblemente viejos o de otra sesión, y el offline real de ventas va por su cola. Se prueba el POS sin red antes de cerrar la fase 1.
- [El MenuProvider cambia la autorización de rutas] → Es la misma lógica de hoy (`startsWith` sobre los hrefs + `/admin/capacitacion`); solo cambia de dónde salen los hrefs. Se prueba con los roles admin, produccion y vendedor.
- [La migración pantalla por pantalla es larga] → Se hace por prioridad de uso, y cada pantalla migrada entra a la prueba de ancho.

## Migration Plan

Cada fase se despliega por separado (push a main). Rollback: revertir el commit de la fase.
