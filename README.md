# 🔧 Backoffice Admin Panel - Masas Estación

Panel administrativo para gestionar productos, locales, inventario, costos de producción y precios del e-commerce.

## 🚀 Stack Tecnológico

- **Framework:** Next.js 14.2.33 (App Router)
- **Lenguaje:** TypeScript
- **Estilos:** Tailwind CSS (Sin dependencias externas pesadas)
- **Autenticación:** JWT (JSON Web Tokens)
- **API:** Fetch API con manejo centralizado de auth
- **Puerto:** 3001 (desarrollo) / 3000 (producción en Docker)

## 📂 Estructura del Proyecto

```
fme-backoffice/
├── app/
│   ├── login/              # Página de inicio de sesión
│   ├── admin/
│   │   ├── dashboard/      # Dashboard con estadísticas
│   │   ├── mantenedores/   # Gestión de datos maestros (Admin only)
│   │   ├── productos/      # CRUD de productos y Recetas
│   │   ├── locales/        # CRUD de locales
│   │   ├── inventario/     # Gestión de stock
│   │   └── precios/        # Gestión de precios
│   └── page.tsx
├── components/
│   └── layout/
│       └── Sidebar.tsx     # Navegación lateral dinámica por rol
├── lib/
│   ├── api/                # Clientes API (recetas, productos, maestras...)
│   ├── auth.ts             # Servicio de autenticación JWT
│   └── AuthProvider.tsx    # Contexto de autenticación
├── public/
├── .env.local              # Variables de entorno (desarrollo)
├── .env.production         # Variables de entorno (producción)
├── Dockerfile.prod         # Dockerfile para producción
└── package.json
```

## 🛠️ Desarrollo Local

### Prerequisitos

- Node.js 18+
- Backend FastAPI corriendo en `http://localhost:8000`

### Instalación

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.local.example .env.local

# Iniciar servidor de desarrollo
npm run dev
```

El backoffice estará disponible en: `http://localhost:3001`

## 🔐 Autenticación y Seguridad

El sistema utiliza autenticación basada en JWT:
- **Login:** `/login` valida credenciales contra el backend.
- **Roles:** El menú lateral se adapta según el rol (`admin` ve todo, otros roles tienen acceso limitado).
- **Protección:** Middleware y componentes de orden superior protegen las rutas.
- **Persistencia:** Token almacenado en localStorage con manejo de expiración.

## 📋 Funcionalidades

### ✅ Productos y Producción
- Listado completo con filtros
- **Gestión de Recetas:**
  - Creación y edición de recetas por producto.
  - Agregado de ingredientes con autocompletado inteligente.
  - **Cálculo Automático de Costos:** Costo total y unitario basado en ingredientes.
  - Actualización automática del `costo_fabricacion` del producto.
- Campos extendidos: Categoría, Tipo, Unidad, Flags (vendible, ingrediente, receta).

### ✅ Mantenedores (Admin)
- **Categorías:** Gestión de familias de productos.
- **Tipos de Producto:** Clasificación (Materia Prima, Producto Terminado, etc.).
- **Unidades de Medida:** Gestión de unidades (kg, g, lt, un).

### ✅ Locales
- Gestión de sucursales/locales
- Código auto-generado
- Estado activo/inactivo

### ✅ Inventario (Refactorizado)
- **Gestión Centralizada:** Tabs para Existencias, Transferencias e Historial.
- **Existencias:** Vista de solo lectura con alertas de stock (Mínimo/Crítico).
- **Transferencias:** Movimiento de stock entre bodegas.
- **Historial:** Bitácora completa de movimientos (Kardex).

### ✅ Compras
- **Flujo de Estados:** Pendiente (Editable) -> Recibida (Inmutable, afecta Stock).
- **Gestión de Proveedores.**
- **Tipos de Documento Tributario.**

### ✅ Precios
- Vista matricial: Productos × Locales
- Configuración de precios por local

## 📊 Endpoints de API Principales

| Recurso | Métodos | Descripción |
|---------|---------|-------------|
| **Autenticación** | POST | Login y obtención de token |
| **Productos** | CRUD | Gestión completa de productos |
| **Recetas** | CRUD | Gestión de recetas e ingredientes |
| **Maestras** | CRUD | Categorías, Tipos, Unidades, Tipos Doc. |
| **Locales** | CRUD | Gestión de sucursales |
| **Inventario** | GET | Consulta de existencias, transferencias, historial |
| **Compras** | CRUD | Flujo completo de compras y recepción |
| **Precios** | GET/PUT | Matriz de precios |

## 🔄 Workflow de Producción (Recetas)

1. Crear/Seleccionar un producto.
2. Ir a la pestaña **"Receta"**.
3. Agregar ingredientes buscando por nombre o SKU.
4. Definir cantidades y unidades.
5. El sistema calcula automáticamente:
   - Costo de cada ingrediente.
   - Costo total de la receta.
   - Costo unitario (según rendimiento).

## 🚦 Estado del Proyecto

✅ **Completado:**
- Estructura base y Docker
- Sistema de Autenticación JWT completo
- Roles y Permisos (Admin)
- CRUD Productos, Locales
- **Sistema de Recetas y Costos**
- Mantenedores de Datos Maestros
- **Gestión de Inventario (Existencias, Movimientos, Historial)**
- **Módulo de Compras y Proveedores**
- Interfaz moderna con Tailwind CSS

⏳ **Pendiente:**
- Auditoría de cambios avanzada
- Reportes y exportación (PDF/Excel)
- Notificaciones en tiempo real
- Dashboard con gráficos de ventas (integración futura)

## 📞 Soporte

Para detalles técnicos de la implementación, ver `FEATURE_INVENTORY_PURCHASE.md` y `AGENTS.md`.

---

**Última actualización:** 16 de Diciembre, 2025
