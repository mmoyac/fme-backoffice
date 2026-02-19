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

---

## 8. 🧪 Tests (Pendiente)

### 8.1. Estado Actual

**⏳ Tests pendientes de implementación**

El backoffice está funcional y operativo, pero aún no cuenta con tests automatizados. Se recomienda implementar:

### 8.2. Tests Recomendados

#### Tests de Componentes (Jest + React Testing Library):
- [ ] Formulario de productos (validaciones)
- [ ] Formulario de locales
- [ ] Grid de inventario (edición inline)
- [ ] Tabla de pedidos con filtros
- [ ] Dashboard (carga de estadísticas)
- [ ] Formulario de clientes
- [ ] Sistema de despachos (asignar, picking, dashboard)

#### Tests de Integración:
- [ ] Flujo completo: Login → Crear producto → Configurar precio → Ajustar inventario
- [ ] Flujo de pedidos: Ver pedido → Cambiar estado → Confirmar
- [ ] Flujo de despachos: Asignar → Picking → Completar → Entregar
- [ ] Búsqueda y filtros en tablas

#### Configuración Sugerida:

```bash
# Instalar dependencias
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event jest jest-environment-jsdom

# Configurar jest.config.js
npx jest --init
```

**Nota:** El backend ya cuenta con 32 tests automatizados (100% pasando) que validan todos los endpoints consumidos por el backoffice.

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

