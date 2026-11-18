# Tasks

## 1. Fase 1: shell y rendimiento

- [x] 1.1 `app/admin/layout.tsx`: `<main>` con `min-w-0` (sin `w-full`) y `components/layout/Sidebar.tsx` con `md:shrink-0`. Verificar en 390 px y 1280 px que pedidos, productos e inventario no tienen scroll horizontal de página. Hecho: sin el arreglo, a 1280 px Pedidos medía 1536 px, Productos 1376 y Usuarios 1323; con el arreglo, todas 1280. A 390 px, sin scroll
- [x] 1.2 `lib/AuthProvider.tsx`: cargar el usuario una vez (sin `pathname` en las dependencias del fetch), redirección en un efecto aparte, `value` memoizado y sin `console.log`. Hecho; además `TenantSwitcher` usa el usuario del AuthProvider en vez de su propio `GET /users/me`. Build de producción: 1 `users/me` y 1 `menu` por sesión
- [x] 1.3 `MenuProvider` compartido por layout y Sidebar: un fetch de `/api/auth/menu` por usuario, caché en localStorage como hoy, autorización de ruta con los hrefs cargados (incluye `/admin/capacitacion`). Verificar en la pestaña Red que navegar no repite `users/me` ni `menu`, y probar con los roles admin, produccion y vendedor. Hecho: `lib/MenuContext.tsx`. Prueba con Chrome headless (admin, produccion, vendedor; 390 y 1280 px): 0 llamadas a `users/me` y `menu` al navegar; las rutas fuera del menú redirigen al primer ítem como antes
- [x] 1.4 Crear `app/admin/loading.tsx` (skeleton dentro del shell). Hecho
- [x] 1.5 `next.config.js`: API en `NetworkOnly` (stream de notificaciones incluido), `cacheOnFrontEndNav` y `aggressiveFrontEndNavCaching` en `false`. Verificar el `sw.js` generado y que el POS offline sigue encolando ventas sin red. Configuración hecha y `sw.js` verificado (regla `NetworkOnly` para `/api/` antes de la de cross-origin). Probado con build de producción y SW activo (admin y vendedor): ninguna respuesta de la API en Cache Storage; con la API caída el POS y la navegación siguen con usuario y menú en caché; sin red, el POS recarga desde la caché de páginas. (El catálogo offline del POS sigue siendo la Fase 2 de add-ventas-offline-backoffice, vía IndexedDB)
- [x] 1.6 Imports bajo demanda: jspdf/html2canvas en `generarPDFSolicitudHTML.ts`, `next/dynamic` para `CapturaEtiquetaGemini`, `EtiquetaPreview` y los gráficos de facturación; quitar `tesseract.js` si no se usa. Comparar el First Load JS de `/admin/solicitudes` y `/admin/recepcion/lotes/nuevo` antes y después. Hecho: `/admin/solicitudes` 277 → 104 kB, `/admin/recepcion/lotes/nuevo` 216 → 107 kB. Los gráficos de facturación quedan para la fase 3 (requiere separar el componente)
- [x] 1.7 Agregar `flex-wrap` / `flex-col sm:flex-row` a los encabezados que desbordan (solicitudes, productos, inventario) y cambiar `overflow-hidden` por `overflow-x-auto` en los envoltorios de tablas listados en el diagnóstico. Hecho: 9 envoltorios con `overflow-x-auto` y 3 encabezados apilables
- [x] 1.8 `npm run build` sin errores y deploy

## 2. Fase 2: base responsiva

- [ ] 2.1 `components/ui/DataList.tsx` (tabla `table-fixed` ≥768 px, tarjetas debajo, estados vacío y de carga)
- [ ] 2.2 `components/ui/PageHeader.tsx` (título, acciones y filtros que se apilan en móvil)
- [ ] 2.3 SWR para productos, locales e inventario (`lib/hooks/`), con `mutate` después de crear o editar; reemplazar los `?limit=1000/10000` repetidos en las pantallas de la fase 3
- [ ] 2.4 `useMemo` con un mapa de stock por producto en Productos y Existencias, y búsqueda con `useDeferredValue`

## 3. Fase 3: migración por pantalla

- [ ] 3.1 Playwright con viewports de 320/390/768/1280 px y chequeo del ancho del documento
- [ ] 3.2 Prioridad 1: Pedidos, POS, Inventario (pestañas), Solicitudes, Productos
- [ ] 3.3 Prioridad 2: Despacho, Caja, Clientes, Compras, Producción y Órdenes de Trabajo
- [ ] 3.4 Prioridad 3: resto de pantallas (cotizaciones, usuarios, notas de crédito, tenants, mantenedores, recepción, precios)
- [ ] 3.5 Enlaces internos `<a href="/admin...">` y `window.location.href` a `<Link>` / `router.push`

## 4. Actualizar capacitación

- [ ] 4.1 Si al migrar una pantalla de inventario cambian nombres de botones, filtros o la ubicación de acciones, actualizar la lección afectada en `fme-backend/capacitacion/inventario/` y su fecha de "Última revisión"
