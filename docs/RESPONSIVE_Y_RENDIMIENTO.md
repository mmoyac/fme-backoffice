# Backoffice: escritorio/móvil y rendimiento (2026-11-17 / 18)

Resumen técnico del change OpenSpec `improve-backoffice-responsive-performance` (este repo) y de los arreglos de rendimiento de la API (`fix-n1-listados`, en fme-backend). Pensado para quien mantenga o agregue pantallas.

## 1. Problema de origen

- **Scroll horizontal** en casi todas las pantallas: el `<main>` del layout era un hijo flex sin `min-w-0`, así que cualquier tabla ancha ensanchaba la página entera (los `overflow-x-auto` internos no servían).
- **Lentitud al navegar:** cada cambio de ruta pedía `users/me` y hasta 3 veces `menu`; sin `loading.tsx`; el service worker cacheaba todas las respuestas de la API (y podía devolver datos de otra sesión/tenant); librerías pesadas en el bundle.
- **Mismo diseño en escritorio y móvil:** cada pantalla armaba su tabla a mano.

Referencia de diseño: EffiCoop (`D:\ProyectosAI\EffiCoop\frontend`): shell que no se ensancha, `DataList` tabla/tarjetas, sesión cargada una vez, React Query, prueba de ancho en 320 px.

## 2. Qué se hizo

| Fase | Contenido | Estado |
|---|---|---|
| 1 | `min-w-0` en `<main>`, `MenuProvider`, AuthProvider por token, `loading.tsx`, SW con API en `NetworkOnly`, imports dinámicos | En prod (1fd4e77) |
| 2 | `DataList`, `PageHeader`, caché SWR de catálogos, Productos y Existencias optimizadas | En prod (1ebfbaa) |
| 3 | ~53 pantallas migradas (prioridades 1–4), `<Link>` en vez de `<a>`, gráficos con `next/dynamic`, pruebas e2e | Con este push |

Reglas resultantes: `AGENTS.md` §7.3 (breakpoint `lg`, `DataList`, `PageHeader`), §8 (pruebas) y sección "Estructura de la app, caché y service worker".

**Breakpoint:** tarjetas hasta 1023 px y tabla desde 1024 px (`lg`). Con `md` los Android de ≥768 px verían la tabla, y entre 768 y 1023 px el menú lateral deja ~500 px para el contenido.

**Quedó fuera a propósito:** carga masiva de enrolamiento (planilla de 9 inputs, mantiene su scroll propio) e impresión de OP (debe seguir siendo tabla).

**Correcciones de errores previos encontradas en el camino:** enlaces `/admin/cobranzas` → `/admin/cobranza` en el detalle de pedido; textos blanco sobre blanco en Ubicaciones; encabezados corridos en Precios por proveedor; título invisible en Resumen de cajas.

## 3. Mediciones en producción (2026-11-18, antes de la fase 3 y de los arreglos de API)

| Pantalla | Abrir desde cero | Navegar desde el menú |
|---|---|---|
| Pedidos, Clientes, Solicitudes | 1,1 s | 0,5–0,8 s |
| Productos, Inventario | 1,3 s | 0,6 s |
| Caja, Cobranza, Compras, Facturas | 2,2–2,3 s | 0,7 s |
| Dashboard (11 llamadas) | 2,4 s | — |
| POS (13 llamadas) | 2,6 s | 0,9 s |
| Producción | **6,5 s** | 0,7 s |

- HTML del backoffice: ~0,25 s. Piso por llamada a la API: ~250 ms (ida y vuelta al VPS).
- Cuello de botella: `GET /api/productos/?limit=1000` (0,3–4,5 s) por consultas N+1. Corregido en fme-backend junto con pedidos, cobranza, clientes y dashboard (ver `fme-backend/openspec/changes/fix-n1-listados/`).
- Bundles: `/admin/solicitudes` 277 → 104 kB; `/admin/recepcion/lotes/nuevo` 216 → 107 kB.

Pendiente para más velocidad: endpoint de resumen para el Dashboard; extender la caché SWR a clientes, locales, pedidos y precios; paginación en backend de pedidos/productos/inventario.

## 4. Cómo verificar

- Prueba de ancho y de Capacitación: ver `AGENTS.md` §8.1.
- Para medir tiempos en prod se usó un script Playwright con el usuario admin de solo lectura que registra: TTFB, FCP, momento en que desaparecen los "Cargando", llamadas a la API (cantidad, KB, más lentas) y navegación interna con `window.next.router.push`.
