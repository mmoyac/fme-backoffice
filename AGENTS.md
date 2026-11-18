# 🔧 AGENTS.MD: Backoffice Admin Panel - Guía Operacional (Next.js & Docker)

Este documento es el manual de operaciones y contexto esencial para el **Backoffice Admin Panel** del e-commerce. La aplicación es un **Next.js** que consume la API REST de FastAPI (`fme-backend`) y **se despliega usando Docker**.

---

## 1. ⚙️ Arquitectura y Stack Tecnológico

El Backoffice está diseñado para ser una aplicación administrativa independiente, con autenticación y permisos para gestionar productos, inventario, precios y locales.

| Componente | Tecnología | Rol |
| :--- | :--- | :--- |
| **Framework** | **Next.js (React)** | Construcción de la interfaz administrativa con App Router. |
| **Estilos** | **Tailwind CSS** | Framework CSS utilitario para diseño rápido y responsivo. |
| **Consumo de API** | **Fetch API / Axios** | Conexión a los endpoints CRUD de FastAPI. |
| **Autenticación** | **JWT / Next-Auth** | Sistema de login para proteger rutas administrativas. |
| **Orquestación** | **Docker / Docker Compose** | Despliegue y ejecución en producción/staging. |

---

## 2. 🔌 Integración con la API (Backend FastAPI)

### 2.1. URL Base de la API

La comunicación entre contenedores utiliza el **nombre del servicio Docker** (`backend`) como *hostname* para la producción.

| Contexto | Variable de Entorno | Valor a Usar |
| :--- | :--- | :--- |
| **Local (Desarrollo)** | `NEXT_PUBLIC_API_URL` | `http://localhost:8000` |
| **Docker (Producción)** | `NEXT_PUBLIC_API_URL` | `http://backend:8000` |

### 2.2. Consumo de Endpoints CRUD

Todas las operaciones CRUD deben estar centralizadas en el directorio **`services/`** o **`lib/api/`**.

| **Funcionalidad** | **Método** | **Endpoint (Backend)** | **Propósito en Backoffice** |
| :--- | :--- | :--- | :--- |
| **Listar Productos** | `GET` | `/api/productos/` | Vista de tabla con todos los productos. |
| **Crear Producto** | `POST` | `/api/productos/` | Formulario de alta de producto. |
| **Editar Producto** | `PUT` | `/api/productos/{id}` | Formulario de edición. |
| **Eliminar Producto** | `DELETE` | `/api/productos/{id}` | Borrado lógico o físico. |
| **Upload Imagen** | `POST` | `/api/productos/{id}/imagen` | Subir imagen de producto. |
| **Upload Logo/Favicon** | `POST` | `/api/admin/configuracion-landing/upload-imagen` | Subir logo o favicon de la landing. |
| **Listar Locales** | `GET` | `/api/locales/` | Gestión de sucursales. |
| **Crear Local** | `POST` | `/api/locales/` | Alta de nueva sucursal. |
| **Editar Local** | `PUT` | `/api/locales/{id}` | Actualización de datos. |
| **Gestionar Inventario** | `GET/PUT` | `/api/inventario/` | Ajustar stock por producto/local. |
| **Gestionar Precios** | `GET/PUT` | `/api/precios/` | Asignar precios por local. |

### 2.3. Directrices de Implementación

* **Autenticación:** Todas las rutas del backoffice deben estar protegidas con middleware de autenticación.
* **Validación:** Validar formularios en frontend antes de enviar a la API.
* **Feedback:** Mostrar notificaciones de éxito/error en todas las operaciones CRUD.
* **Tipado:** Los *schemas* de datos del frontend deben coincidir con los *schemas* Pydantic del backend.

---

## 3. 📄 Estructura y Funcionalidades

### 3.1. Estructura del Backoffice

El backoffice debe tener una estructura modular con navegación lateral o superior para acceder a las diferentes secciones administrativas.

**Secciones principales:**
- **Dashboard:** Navegación jerárquica a diferentes tableros
  - **Tablero de Ventas:** Estadísticas, pedidos, productos más vendidos
  - **Tablero de Cajas:** Estado de cajas, turnos abiertos, métricas financieras
- **Productos:** CRUD completo de productos con upload de imágenes
- **Locales:** Gestión de sucursales/locales
- **Inventario:** Ajuste de stock por producto y local
- **Precios:** Configuración de precios por local
- **Pedidos:** Gestión completa con sistema de puntos integrado
- **Clientes:** CRUD con información de puntos de fidelización
- **Caja:** Control completo de flujo de efectivo por vendedor (NUEVO)
- **Despacho:** Sistema completo de delivery y picking (NUEVO)
  - **Asignar Despachos:** Interface para asignar pedidos a despachadores
  - **Centro de Picking:** Interface móvil para recolección de productos
  - **Dashboard Despachos:** Métricas y estadísticas de entregas
  - **Lista de Despachos:** Vista general con filtros por estado
  - **Detalle de Despacho:** Vista completa con timeline y edición
- **Usuarios:** (Futuro) Gestión de usuarios admin

### 3.2. Reglas de Negocio en Backoffice

* **Permisos:** Solo usuarios autenticados pueden acceder al backoffice.
* **Restricción por Local:** Vendedores solo pueden abrir caja en su local asignado.
* **Control de Caja:** Un vendedor solo puede tener un turno abierto a la vez.
* **Sistema de Despachos (NUEVO):**
  - Estados del flujo: ASIGNADO → EN_PICKING → LISTO_EMPAQUE → EN_RUTA → ENTREGADO
  - Asignación automática de despachadores a pedidos confirmados
  - Interface de picking con cantidades solicitadas vs recogidas
  - Tracking completo con timestamps por estado
  - Dashboard con métricas de performance
* **Cajas Variables (NUEVO):**
  - Modal de confirmación obligatorio para pedidos tipo CAJAS_VARIABLES
  - Muestra lotes específicos que se asignarán (FIFO)
  - Comparación precio estimado vs precio real
  - Detalles: código lote, peso, precio/kg, vencimiento, proveedor
  - Confirmación actualiza precio total automáticamente
* **Validaciones:** 
  - SKU debe ser único al crear productos
  - Stock no puede ser negativo
  - Precios deben ser mayores a cero
  - Lotes suficientes disponibles para cajas variables
  - Efectivo real debe coincidir con esperado en cierre de caja
* **Upload de Imágenes:** Validar formato (JPG, PNG, WEBP) y tamaño máximo (2MB).
* **PDFs de Cierre:** Solo se generan para turnos cerrados.
* **Auditoría:** (Futuro) Registrar cambios con usuario y timestamp.

### 3.3. Pasarelas de pago y pedidos de la tienda (desde 2026-11-18)

Guía completa: `fme-backend/docs/PASARELAS_PAGO.md`. Especificación: change OpenSpec `add-pasarelas-pago` en fme-backend (capabilities `pasarelas-pago` y `pedidos-por-entregar`).

* **Mantenedores → Pasarelas de pago** (`app/admin/configuracion/pasarelas/page.tsx`, `lib/api/pasarelas.ts`, pestaña en `app/admin/mantenedores/page.tsx` restringida al módulo `tienda_online`):
  - crear pasarelas (Mercado Pago, Flow, Khipu; la Simulada solo en desarrollo) y cargar credenciales, que son de solo escritura;
  - probar la conexión y activar o desactivar; en Producción, activar exige una prueba exitosa posterior a las credenciales;
  - ver "Pagos en línea recientes", con los EN_REVISION destacados porque requieren acción manual.
  - API: `/api/admin/pasarelas/*`.
  - El **superadmin** configura las de cada tenant entrando a él (Superadmin → Operar en tenant).
* **Dashboard → tarjeta "Por entregar"** (`app/admin/dashboard/page.tsx`, `GET /api/dashboard/por-entregar`):
  - muestra Confirmados, En Preparación y En Ruta, más **Pagados sin confirmar** (en ámbar si hay alguno);
  - cada métrica abre Pedidos filtrado.
* **Pedidos** (`app/admin/pedidos/page.tsx`):
  - estado **En Ruta** y filtro **Pago** (pagados / por pagar);
  - filtros iniciales desde la URL (`?estado=`, `?pagado=si|no`);
  - "Creado por" muestra **🛒 Tienda online** en pedidos hechos por el cliente en la landing (canal LANDING).
* **Confirmación automática:** un pedido pagado en línea se confirma solo y descuenta inventario del local de despacho por defecto de su tipo. Si no hay stock ahí, queda pagado y PENDIENTE y los admins reciben una notificación en la campana para confirmarlo a mano eligiendo otro local.

---

## 4. 🐳 Despliegue y Comandos de Docker

El despliegue del Backoffice se realiza creando una imagen optimizada de Next.js mediante un *build* multi-etapa, definida en su propio **`Dockerfile.prod`**.

### 4.1. Configuración del Servicio en `docker-compose.prod.yml`

El servicio `backoffice` debe ser configurado en el `docker-compose.yml` principal para su orquestación.

```yaml
  backoffice:
    build: ./fme-backoffice
    container_name: masas_estacion_backoffice
    restart: always
    ports:
      - "3001:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://backend:8000
      NODE_ENV: production
    depends_on:
      - backend
    networks:
      - general-net
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### 4.2. Variables de Entorno Requeridas

```bash
# .env.local (Desarrollo)
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3001

# .env.production (Producción)
NEXT_PUBLIC_API_URL=http://backend:8000
NEXTAUTH_SECRET=production-secret-key
NEXTAUTH_URL=https://admin.masasestacion.cl
```

### 4.3. Comandos Docker

```bash
# Desarrollo local
npm run dev

# Build para producción
docker build -t mmoyac/masas-estacion-backoffice:latest -f Dockerfile.prod .

# Push a Docker Hub
docker push mmoyac/masas-estacion-backoffice:latest

# Desplegar en VPS
ssh root@168.231.96.205 "cd docker/masas-estacion && \
  docker compose -f docker-compose.prod.yml pull backoffice && \
  docker compose -f docker-compose.prod.yml up -d backoffice"

# Ver logs en producción
ssh root@168.231.96.205 "docker logs masas_estacion_backoffice --tail 50"
```

### 4.4. Configuración de Producción

**Docker Hub:**
- Imagen: `mmoyac/masas-estacion-backoffice:latest`
- Puerto: 3001 (público) → 3000 (interno)

**VPS:**
- URL: http://168.231.96.205:3001
- Estado: ✅ Operativo

**Configuración docker-compose.prod.yml:**
```yaml
backoffice:
  image: mmoyac/masas-estacion-backoffice:latest
  container_name: masas_estacion_backoffice
  restart: always
  ports:
    - "3001:3000"
  environment:
    NEXT_PUBLIC_API_URL: http://168.231.96.205:8001
    NODE_ENV: production
  healthcheck:
    test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 40s
```

---

## 5. 🔐 Autenticación y Seguridad

### 5.1. Sistema de Autenticación

- **Librería:** NextAuth.js o implementación JWT custom
- **Flujo:** Login → JWT Token → Middleware protege rutas `/admin/*`
- **Almacenamiento:** Token en cookies HTTP-only

### 5.2. Protección de Rutas

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token')
  
  if (!token && request.nextUrl.pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: '/admin/:path*'
}
```

---

## 6. 📊 Convenciones de Código

### 6.1. Estructura de Directorios

```
fme-backoffice/
├── app/
│   ├── login/
│   │   └── page.tsx
│   ├── admin/
│   │   ├── layout.tsx          # Layout con sidebar/navbar
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── productos/
│   │   │   ├── page.tsx        # Lista de productos
│   │   │   ├── nuevo/
│   │   │   │   └── page.tsx    # Crear producto
│   │   │   └── [id]/
│   │   │       └── page.tsx    # Editar producto
│   │   ├── locales/
│   │   ├── inventario/
│   │   └── precios/
├── components/
│   ├── ui/                     # Componentes reutilizables (Button, Input, Table)
│   ├── forms/                  # Formularios específicos
│   └── layout/                 # Sidebar, Navbar
├── lib/
│   ├── api/                    # Funciones para consumir API
│   └── utils/                  # Utilidades generales
├── services/                   # Lógica de negocio
└── types/                      # TypeScript types/interfaces
```

### 6.2. Nomenclatura

- **Componentes:** PascalCase (`ProductForm.tsx`)
- **Funciones API:** camelCase (`fetchProducts()`, `createProduct()`)
- **Rutas:** kebab-case (`/admin/productos/nuevo`)

---

## 7. 🎨 Diseño y UX

### 7.1. Paleta de Colores

- **Modo:** Dark mode por defecto (consistente con landing)
- **Primario:** Turquesa `rgb(94, 200, 242)`
- **Secundario:** Teal `rgb(69, 162, 154)`
- **Fondo:** `slate-900`
- **Acentos:** `slate-800`, `slate-700`

### 7.2. Componentes UI

Utilizar componentes de **shadcn/ui** o **Headless UI** para:
- Tablas con paginación
- Formularios con validación
- Modales de confirmación
- Notificaciones (toast)
- Upload de archivos

### 7.3. Breakpoints para listas/tablas (OBLIGATORIO)

- Usar siempre `lg:` (1024px) como breakpoint para alternar entre vista cards y tabla.
- **Nunca usar `md:`** para este propósito: los Android reportan ≥ 768px y verían la tabla con scroll horizontal en lugar de cards.
- Patrón estándar:
  ```tsx
  {/* Vista Mobile: Cards */}
  <div className="lg:hidden space-y-4">...</div>

  {/* Vista Desktop: Tabla */}
  <div className="hidden lg:block ...">...</div>
  ```
- **Para listas usar `components/ui/DataList.tsx`** (ya aplica `lg`): tabla `table-fixed` desde 1024 px y tarjetas debajo.
  - `columns`: `{ header, cell, className, sinTruncar }`. Los anchos van en % en `className` (`w-[24%]`) y **deben sumar 100**.
  - `sinTruncar` en números, badges, acciones e identificadores largos (estos con `break-all`).
  - `card(item)`: lo principal arriba (nombre/número + estado o monto a la derecha), acciones abajo.
  - `onItemClick` si la fila abre un detalle; los botones/enlaces internos llevan `e.stopPropagation()`.
  - `itemClassName(item)` para atenuar o resaltar filas/tarjetas.
  - Más de ~8 columnas: agruparlas (p. ej. "Pedido + fecha", "Estado + pago").
- **Reportes numéricos densos o tablas con edición en línea** (Valorización, Notas de crédito, ítems de compra/receta): tabla en `hidden lg:block overflow-x-auto` + tarjetas `lg:hidden` que reutilicen **los mismos** handlers/inputs.
- **Encabezados:** `components/ui/PageHeader.tsx` (título, subtítulo, acciones, filtros; se apila en móvil). Filas de botones/filtros siempre con `flex-wrap` o `flex-col sm:flex-row`; inputs/selects dentro de flex con `min-w-0`.
- **Nunca** `overflow-x: hidden` global: el desborde se corrige en su origen. El `<main>` del layout lleva `min-w-0` (sin él, cualquier tabla ancha ensancha toda la página).
- **Prueba obligatoria:** toda pantalla nueva se agrega a `e2e/ancho.spec.ts` (ver §8).

---

## 8. 🧪 Tests

### 8.1. Pruebas e2e de ancho y de Capacitación (Playwright, desde 2026-11-18)

- `e2e/ancho.spec.ts`: ninguna pantalla puede tener scroll horizontal de página en 320, 390, 768, 1024 y 1280 px (63 pantallas + detalles `/[id]`).
- `e2e/capacitacion.spec.ts`: índice, visor aislado (sandbox), quiz, `localStorage` bloqueado, 403/404, acceso 🎓 y redirección sin sesión (solo en escritorio).
- Usan el Chrome instalado (`channel: 'chrome'`), no descargan navegadores. `retries: 1` por cargas lentas ocasionales.

```bash
# 1) Backoffice en localhost:3000 (la API local solo acepta CORS desde ese origen)
npm run dev -- -p 3000
# 2) Token de la API local (sin contraseña)
docker exec fme-backend python -c "from datetime import timedelta; from utils.security import create_access_token; print(create_access_token({'sub':'admin@fme.cl','role':'admin','tenant_id':1}, timedelta(hours=4)))"
# 3) Correr (E2E_TOKEN_ROL = token de un rol no admin, opcional; E2E_IDS = ids reales para pantallas de detalle)
E2E_TOKEN=<jwt> E2E_TOKEN_ROL=<jwt> E2E_IDS='{"pedido":332,"producto":1671,"productoReceta":1664,"cliente":79,"local":1,"cotizacion":17,"compra":26,"ot":28,"ruta":17}' npm run test:ancho
# Un solo ancho o archivo:
npm run test:ancho -- --project=movil-320 e2e/ancho.spec.ts
```

- **No correr `next build` en este repo mientras hay un `next dev` levantado**: comparten `.next` y se rompen mutuamente. Para probar un build de producción sin tocar el dev, copiar el repo a una carpeta del mismo disco (D:) con `node_modules` enlazado por junction.

### 8.2. Pendiente

- Tests de componentes/flujos (crear producto, pedido, despacho). El backend tiene sus propios tests.

---

## 9. 🚀 Roadmap de Desarrollo

### Fase 1: MVP (Completado ✅)
- ✅ Estructura del proyecto
- ✅ CRUD de productos
- ✅ CRUD de locales
- ✅ Gestión de inventario (con stock calculado para Tienda Online)
- ✅ Gestión de precios
- ✅ Gestión de pedidos (todos los estados)
- ✅ Transferencias de inventario
- ✅ Gestión de clientes
- ✅ Dashboard con estructura jerárquica
- ✅ **Tablero de Ventas** con todas las estadísticas
- ✅ **Tablero de Cajas** con supervisión en tiempo real
- ✅ **Sistema completo de Caja** con turnos y operaciones
- ✅ **Control de flujo de efectivo** por vendedor
- ✅ **Generación de PDFs** para cierre de caja
- ✅ **Restricciones por local asignado**
- ✅ **Sistema de Cajas Variables con Modal de Confirmación** (NUEVO)
- ✅ **Asignación Visual de Lotes Específicos** (NUEVO)
- ✅ **Comparación Precio Estimado vs Real** (NUEVO)
- ✅ **Detalles de Lotes: Peso, Precio/kg, Vencimiento** (NUEVO)
- ✅ **Sistema Completo de Despachos** (NUEVO)
- ✅ **Asignar Despachos:** Interface para asignar pedidos a despachadores
- ✅ **Centro de Picking:** Interface móvil para recolección de productos  
- ✅ **Dashboard Despachos:** Métricas y estadísticas de entregas
- ✅ **Lista de Despachos:** Vista general con filtros por estado
- ✅ **Detalle de Despacho:** Vista completa con timeline y edición
- ✅ Sistema de Puntos de Fidelización integrado
- ✅ Despliegue en Docker Hub
- ✅ Configuración de producción en VPS

### Fase 2: Testing y Calidad (Pendiente)
- ⏳ Tests de componentes React
- ⏳ Tests E2E con Playwright
- ⏳ Sistema de login con autenticación JWT
- ⏳ Gestión de usuarios admin con roles

### Fase 3: Mejoras y Avanzado
- Auditoría de cambios (log de modificaciones)
- Reportes y exportación (Excel, PDF)
- Notificaciones en tiempo real (WebSockets)
- Análisis avanzado de ventas
- Integración con pasarelas de pago

---

**Última Actualización:** 2026-02-17  
**Cambios Recientes:**
- ✅ **Sistema de Upload de Imágenes implementado** (NUEVO)
- ✅ **Endpoint `/api/admin/configuracion-landing/upload-imagen`** para logo y favicon
- ✅ **Componente ImageUpload** con preview en tiempo real
- ✅ **Validaciones de formato y tamaño:** JPG, PNG, WEBP, SVG, ICO (máx. 2MB)
- ✅ **Nombres únicos con tenant_id** para evitar conflictos
- ✅ **Almacenamiento en `/static/uploads/landing/`** con acceso público
- ✅ **Integración completa** en página de configuración de landing
- ✅ **Documentación completa** en UPLOAD_IMAGES.md
- ✅ Sistema Completo de Despachos implementado
- ✅ Frontend completo con 6 páginas: Principal, Lista, Asignar, Picking, Dashboard, Detalle
- ✅ Estados de flujo: ASIGNADO → EN_PICKING → LISTO_EMPAQUE → EN_RUTA → ENTREGADO
- ✅ Interface de Asignación: Selección de pedidos y despachadores
- ✅ Centro de Picking: Proceso de recolección con cantidades en tiempo real
- ✅ Dashboard de Métricas: Estadísticas completas de despachos
- ✅ Vista de Detalle: Timeline completo con edición de estado
- ✅ Integración con Backend: Todos los endpoints funcionando
- ✅ Responsive Design: Mobile-first con Tailwind CSS
- ✅ Autenticación JWT: Protección en todas las páginas
- ✅ Manejo de Estados: Loading, error, success en todas las operaciones
- ✅ Sistema completo de Cajas Variables implementado
- ✅ Modal de Confirmación de Lotes Específicos en pedidos tipo 2
- ✅ Visualización detallada de lotes: código, peso, precio/kg, vencimiento
- ✅ Comparación automática precio estimado vs precio real
- ✅ Cálculo dinámico de incrementos/descuentos por lotes asignados
- ✅ Integración con endpoint lotes-disponibles con autenticación Bearer
- ✅ Función obtenerCajasParaPedido con cálculos de precios
- ✅ Modal responsive para mostrar información completa de asignación
- ✅ Correción campo pedido.total para resumen de precios
- ✅ Manejo de errores para lotes insuficientes con mensajes claros
- ✅ Sistema completo de Puntos de Fidelización integrado
- ✅ Creación de pedidos con calculadora de puntos y canje
- ✅ Lista de pedidos con columna de puntos ganados
- ✅ Gestión de clientes con información de puntos
- ✅ Despliegue completo en producción (VPS 168.231.96.205:3001)
- ✅ Imagen Docker publicada en Docker Hub
- ✅ Configuración de producción con puertos mapeados
- ✅ Healthcheck implementado
- ✅ NEXT_PUBLIC_API_URL configurado con IP pública

**Docker Hub:** `https://hub.docker.com/r/mmoyac/masas-estacion-backoffice`
**Estado MVP:** ✅ **Desplegado y operativo en producción**

---

## Módulo: Notas de Crédito y Devoluciones — Backoffice (implementado 2026-03-25)

### Páginas y componentes relevantes

| Ruta / Archivo | Descripción |
|---|---|
| `app/admin/pedidos/[id]/page.tsx` | Detalle del pedido. Muestra sección de devoluciones, NC emitidas y botón para registrar nueva devolución. |
| `app/admin/dashboard/facturacion/page.tsx` | Tablero de facturación. Todos los montos descuentan `total_notas_credito`. |
| `lib/api/pedidos.ts` | Interface `Pedido` incluye `total_notas_credito?: number` (suma de NC del pedido). |
| `lib/api/facturas.ts` | `listarFacturas()` usa `/api/pedidos/?tipo_documento_tributario_id=1`. |
| `app/admin/mantenedores/components/CanalesVentaList.tsx` | Mantenedor de canales de venta con campos `entrega_inmediata` y `visible_en_pos`. |
| `components/pos/EtapaProductos.tsx` | Botón `+` limitado al `stock_local` del producto seleccionado. |
| `components/pos/EtapaFinalizacion.tsx` | Selector de canal de venta filtrado por `visible_en_pos=true`. |
| `app/admin/pedidos/pos/page.tsx` | Carga canales de venta y pasa `canalVentaId` al crear el pedido. |

### Interface Pedido (campos relevantes nuevos)

```typescript
interface Pedido {
  // ... campos existentes ...
  total_notas_credito?: number;  // Suma de NC emitidas. Usar para calcular monto neto.
  tipo_documento_tributario_id?: number;
  tipo_documento_codigo?: string;  // "BOL" | "FAC"
  estado_sii?: string;  // "PENDIENTE" | "ANULADO" | "APROBADO" | "RECHAZADO" | "REGISTRADO"
  folio_sii?: string;
}
```

### Monto neto en el tablero de facturación

```typescript
// app/admin/dashboard/facturacion/page.tsx
const neto = (f: Pedido) => Math.max(0, (f.total ?? 0) - (f.total_notas_credito ?? 0));

// Se usa en TODOS los cálculos: totalFacturado, totalCobrado, totalPorCobrar,
// gráfico mensual, ranking de clientes, cobranza de cheques, alertas.
```

### Devolución modal en detalle de pedido

- Solo disponible en pedidos con estado `ENTREGADO`.
- Permite seleccionar items y cantidad a devolver (máx = cantidad original).
- El campo de cantidad tiene `Math.min` para no exceder el máximo.
- Los errores del modal usan estado separado `errorDevolucion` (no reemplaza la página).
- Después de crear la devolución, recarga el pedido para mostrar la NC generada.

### POS — control de stock

```typescript
// components/pos/EtapaProductos.tsx
const incrementarCantidad = () => {
  const stockDisponible = productoSeleccionado?.stock_local ?? productoSeleccionado?.stock_total ?? Infinity;
  if (actual + incremento > stockDisponible) return;
  // ...
};
// El botón "+" también tiene disabled cuando cantidad >= stock
// El input onChange hace Math.min(val, stock) para bloquear ingreso manual
```

Los productos en el POS se cargan desde `/api/productos/catalogo-local/{localId}` y ya incluyen `stock_local`. Solo se muestran productos con `stock_local > 0`.

### Canales de venta en POS

```typescript
// app/admin/pedidos/pos/page.tsx
// Se cargan desde /api/canales-venta/
// canalVentaId por defecto = el canal con codigo "POS"
// Se pasa al crear el pedido como canal_venta_id

// components/pos/EtapaFinalizacion.tsx
// Selector filtrado: canalesVenta.filter(c => c.visible_en_pos)
// Muestra etiqueta "(entrega inmediata)" para canales con entrega_inmediata=true
```

## Módulo: Delivery en POS (implementado 2026-03-25)

### Flujo general

El operador activa el toggle "Requiere delivery" en `EtapaFinalizacion`. El componente calcula la ruta usando la API de Mapbox (Directions API) y muestra el costo estimado. El costo se guarda en `costo_delivery` del pedido pero **no se suma al `monto_total`** — es un cobro informativo aparte.

### Pasos del cálculo

1. Se geocodifican las direcciones del local (origen) y del cliente (destino) con `geocodeAddress()` usando Mapbox Geocoding v5, filtrado a Chile (`country=cl`).
2. Se obtiene la ruta de conducción entre ambos puntos con `calcularRuta()` usando Mapbox Directions v5.
3. Se extrae `distanciaKm` y `tiempoMinutos` de la respuesta.
4. Si la distancia supera `max_km_delivery` configurado en el tenant, se muestra error y **el botón "Crear Pedido" queda deshabilitado**.
5. Si no hay límite (`max_km_delivery = null`), se acepta cualquier distancia.
6. `costoTotal = costo_fijo + round(distanciaKm * costo_por_km)`

### Delivery gratis

Si `totalCarrito >= monto_minimo_gratis` (y `monto_minimo_gratis != null`), el costo se fija en 0 sin llamar a Mapbox.

### Configuración por tenant (`configuracion_landing`)

| Campo | Descripción | Fallback en POS |
|---|---|---|
| `costo_fijo_delivery` | Costo base fijo (CLP) | 2000 |
| `costo_por_km_delivery` | Costo adicional por km (CLP) | 150 |
| `monto_minimo_delivery_gratis` | Monto mínimo para delivery gratis (CLP) | `null` (nunca gratis) |
| `max_km_delivery` | Distancia máxima para aceptar delivery (km) | `null` (sin límite) |

Estos valores llegan al frontend desde `/api/config/landing` bajo la clave `delivery`:

```json
{
  "delivery": {
    "costo_fijo": 2000,
    "costo_por_km": 150,
    "monto_minimo_gratis": 50000,
    "max_km": 15
  }
}
```

### Componentes y archivos relevantes

- `components/pos/EtapaFinalizacion.tsx` — lógica completa de delivery (cálculo, validación, UI)
- `lib/TenantContext.tsx` — provee `tenantConfig` con el objeto `delivery`
- `app/admin/configuracion/landing/page.tsx` — formulario para configurar los 4 parámetros

### Validación de max_km en el botón

```typescript
// EtapaFinalizacion.tsx
disabled={procesando || !localId || !medioPagoId || (requiereDelivery && !!errorDelivery)}
```

Si `errorDelivery` tiene contenido (incluido el error de km superado), el botón queda deshabilitado. El error se genera dentro del useEffect que calcula la ruta:

```typescript
if (maxKmDelivery !== null && distanciaKm > maxKmDelivery) {
  setErrorDelivery(`La dirección está a X km, superando el límite de Y km para delivery`);
  // no se llama a onCostoDeliveryCalculado con valor — queda null
  return;
}
```

### Prerrequisitos

- Variable de entorno `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` configurada en el backoffice.
- El local debe tener `direccion` registrada (si no, se muestra error sin calcular).
- El cliente debe tener `direccion` registrada (idem).

---

## Módulo: App del Despachador (implementado 2026-04-06)

### Concepto

Vista mobile-first aislada para los choferes/despachadores. Separada del panel admin (`/admin/*`), sin sidebar, diseñada para uso desde celular. Acceso controlado por rol.

### Rutas

```
app/despachador/
  layout.tsx        — Layout limpio, sin sidebar, header fijo con nombre del usuario y logout
  page.tsx          — Lista de hojas de ruta asignadas al despachador autenticado
  [id]/page.tsx     — Detalle de hoja: gestión de entregas y tracking de ruta
```

### Autenticación y control de acceso

- Login compartido con el backoffice (`/login`)
- **Post-login**: `AuthService.getCurrentUser()` verifica `user.role.nombre`
  - Si el rol es `despachador` (case-insensitive) → redirige a `/despachador`
  - Cualquier otro rol → redirige a `/admin/dashboard`
- El layout de `/despachador` verifica el rol y redirige si no corresponde
- Los roles `admin` también pueden acceder a `/despachador` (para pruebas)

### Rol DESPACHADOR

- Se crea desde `/admin/usuarios` como cualquier otro rol
- El selector de chofer en `/admin/despacho/rutas` **solo muestra usuarios con rol `despachador`**
- Si no hay usuarios con ese rol, aparece una nota con link a Gestión de Usuarios

### Página principal `/despachador`

- Consume `GET /api/hojas-ruta/mis-hojas` (filtra por `chofer_id = usuario autenticado`)
- Muestra hojas con estado `PENDIENTE` o `EN_RUTA` (desaparece cuando `cobro_chofer_pagado = true`)
- **Banner superior**: total de pagos pendientes al despachador (suma de `monto_cobro_chofer`)
- **Por cada hoja**:
  - Patente / label del vehículo
  - Badge de estado (Pendiente / En Ruta / Completada)
  - Barra de progreso de entregas
  - Monto pendiente de cobrar al despachador (`monto_cobro_chofer`)

> ⚠️ `monto_cobro_chofer` es lo que la **empresa le debe al despachador** por hacer la ruta.
> No confundir con `costo_delivery` que es lo que el **cliente paga por el envío**.

### Página detalle `/despachador/[id]`

**Secciones:**
1. **Header**: número de hoja, vehículo, badge de estado
2. **Progreso**: barra X/N entregados + monto pendiente de cobro al despachador
3. **Botón "Confirmar Salida"**: visible solo si estado `PENDIENTE`, llama a `marcarEnRuta()`
4. **Pedidos por entregar**: cards grandes con:
   - Nombre del cliente y número de pedido
   - Dirección (con ícono)
   - Teléfono clicable (`tel:` link)
   - Estado de pago del pedido
   - Botón "Marcar Entregado" (deshabilitado si la hoja está PENDIENTE)
5. **Pedidos entregados**: lista compacta con hora de entrega
6. **Timeline de ruta**: visible solo si `fecha_salida` existe
7. **Modal de confirmación**: se abre al tocar "Marcar Entregado", permite agregar notas

### Timeline de ruta

Presente en **ambas vistas** (admin y despachador):

| Evento | Dato fuente | Color |
|---|---|---|
| Salida del camión | `hoja.fecha_salida` | Azul |
| Entrega (por cada ítem) | `item.fecha_entrega` | Verde |
| Pendientes en curso | items sin `fecha_entrega` | Gris pulsante (solo admin) |
| Retorno | `hoja.fecha_retorno` | Gris (solo si existe) |

- Los ítems se ordenan por `fecha_entrega` ascendente
- Se muestra `+N min` desde el evento anterior
- En la vista admin también muestra el número de pedido, notas de entrega y duración total

### API client (`lib/api/hojas_ruta.ts`)

```typescript
// Nuevas funciones
export const misHojas = (): Promise<HojaRuta[]>
  // GET /api/hojas-ruta/mis-hojas

// Campos nuevos en HojaRuta
delivery_cobrable?: number;       // No usar — se quedó por legado, no refleja el cobro al chofer
delivery_total?: number;
delivery_cobros_detalle?: number[];
// El campo correcto para el pago al despachador es:
monto_cobro_chofer: number | null  // Lo que la empresa le debe al despachador
cobro_chofer_pagado: boolean       // Cuando es true, la hoja desaparece de /despachador
```

### Lógica de desaparición de hojas

Una hoja desaparece de la vista del despachador cuando `cobro_chofer_pagado = true`.
El admin la marca como pagada desde `/admin/despacho/rutas/[id]` con el botón "💰 Marcar como pagado".

---

## Estructura de la app, caché y service worker (change `improve-backoffice-responsive-performance`, 2026-11-18)

Detalle completo en `openspec/changes/improve-backoffice-responsive-performance/` y en `docs/RESPONSIVE_Y_RENDIMIENTO.md`.

- **Sesión:** `lib/AuthProvider.tsx` pide `/api/auth/users/me` solo cuando cambia el token (detecta el login al navegar), no en cada navegación. El `value` del contexto está memoizado.
- **Menú:** `lib/MenuContext.tsx` (`MenuProvider` dentro de `app/admin/layout.tsx`) lo pide una vez por usuario/tenant y lo comparten el layout (autorización de rutas) y el `Sidebar`. Caché en localStorage (`fme_menu_cache`, ítems completos) para operar si la API no responde. `/admin/capacitacion` está permitido para todos los roles.
- **`app/admin/loading.tsx`:** skeleton inmediato al navegar.
- **Catálogos con caché (SWR):** `lib/hooks/catalogos.ts` (`useProductos`, `useInventarios`, `useLocales`, `useCategorias`, `stockPorProducto`). Muestra al instante lo cacheado y revalida en segundo plano. Las funciones de `lib/api/*` que crean/editan productos o mueven stock (merma, transferencia, conteo finalizado, solicitud) invalidan la caché con `revalidar(CLAVE.x)` de `lib/hooks/claves.ts`. Pantallas nuevas que necesiten esos catálogos deben usar los hooks, no `getProductos()` directo.
- **Service worker (`next.config.js`):** solo estáticos. Toda ruta `/api/` va en `NetworkOnly` (la caché por URL no distingue sesión ni tenant). `cacheOnFrontEndNav` y `aggressiveFrontEndNavCaching` en `false`. Las ventas offline usan su propia cola (IndexedDB), no esta caché.
- **Librerías pesadas bajo demanda:** jspdf/html2canvas con `await import()` dentro de la función; componentes con lector QR, código de barras o gráficos con `next/dynamic` + `{ ssr: false }`.
- **Navegación interna:** siempre `<Link>` / `router.push`. `<a href="/admin...">` o `window.location.href` recargan toda la app; solo se permiten donde se recarga a propósito (login, cambio de tenant del superadmin).
