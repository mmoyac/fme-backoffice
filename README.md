# 🔧 Backoffice Admin Panel - Masas Estación

Panel administrativo para gestionar productos, locales, inventario y precios del e-commerce.

## 🚀 Stack Tecnológico

- **Framework:** Next.js 14.2.33 (App Router)
- **Lenguaje:** TypeScript
- **Estilos:** Tailwind CSS
- **API:** Fetch API / Axios
- **Puerto:** 3001 (desarrollo) / 3000 (producción en Docker)

## 📂 Estructura del Proyecto

```
fme-backoffice/
├── app/
│   ├── admin/
│   │   ├── dashboard/      # Dashboard con estadísticas
│   │   ├── productos/      # CRUD de productos
│   │   ├── locales/        # CRUD de locales
│   │   ├── inventario/     # Gestión de stock
│   │   └── precios/        # Gestión de precios
│   └── page.tsx
├── components/
│   └── layout/
│       └── Sidebar.tsx     # Navegación lateral
├── lib/
│   └── api/                # Clientes API (productos, locales, etc.)
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

## 🐳 Despliegue en Producción

### 1. Build de la Imagen Docker

```bash
# Desde el directorio fme-backoffice
docker build -t mmoyac/masas-estacion-backoffice:latest -f Dockerfile.prod .
```

### 2. Push a Docker Hub

```bash
docker push mmoyac/masas-estacion-backoffice:latest
```

### 3. Desplegar en VPS

```bash
# SSH al VPS
ssh user@168.231.96.205

# Navegar al directorio del proyecto
cd /path/to/fme-backend

# Pull de la nueva imagen
docker pull mmoyac/masas-estacion-backoffice:latest

# Desplegar con docker-compose
docker-compose -f docker-compose.prod.yml up -d backoffice

# Verificar logs
docker logs -f masas_estacion_backoffice
```

### 4. Configurar Nginx (Reverse Proxy)

```nginx
# /etc/nginx/sites-available/masas-estacion-admin

server {
    listen 80;
    server_name admin.masasestacion.cl;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 🔐 Variables de Entorno

### Desarrollo (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NODE_ENV=development
```

### Producción (.env.production)

```env
NEXT_PUBLIC_API_URL=http://backend:8000
NODE_ENV=production
```

## 📋 Funcionalidades

### ✅ Productos
- Listado completo con tabla
- Crear nuevo producto con SKU único
- Editar información del producto
- Upload de imágenes (JPG, PNG, WEBP, máx 2MB)
- Eliminar producto

### ✅ Locales
- Gestión de sucursales/locales
- Código auto-generado (LOC_001, LOC_002, etc.)
- Estado activo/inactivo
- Dirección y datos de contacto

### ✅ Inventario
- Vista matricial: Productos × Locales
- Ajuste de stock por celda
- Actualización en tiempo real
- Validación de cantidades (no negativos)

### ✅ Precios
- Vista matricial: Productos × Locales
- Configuración de precios por local
- Formato CLP ($)
- Validación de montos positivos

### ✅ Dashboard
- Estadísticas generales (total productos, locales, etc.)
- Accesos rápidos a funciones principales
- Cards con enlaces a cada sección

## 🎨 Diseño

- **Modo:** Dark mode
- **Color Primario:** Turquesa `rgb(94, 200, 242)`
- **Color Secundario:** Teal `rgb(69, 162, 154)`
- **Fondo:** Slate-900
- **Framework CSS:** Tailwind CSS

## 🔄 Workflow de Desarrollo

1. **Crear funcionalidad en local**
2. **Probar con backend local** (`npm run dev`)
3. **Build de imagen Docker** (`docker build`)
4. **Push a Docker Hub** (`docker push`)
5. **Deploy en VPS** (`docker-compose up -d`)

## 📊 Endpoints de API Consumidos

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/productos/` | GET | Listar todos los productos |
| `/api/productos/` | POST | Crear nuevo producto |
| `/api/productos/{id}` | GET | Obtener producto por ID |
| `/api/productos/{id}` | PUT | Actualizar producto |
| `/api/productos/{id}` | DELETE | Eliminar producto |
| `/api/productos/{id}/imagen` | POST | Subir imagen de producto |
| `/api/locales/` | GET/POST | Gestión de locales |
| `/api/locales/{id}` | GET/PUT/DELETE | Operaciones por local |
| `/api/inventario/` | GET | Obtener todo el inventario |
| `/api/inventario/producto/{p_id}/local/{l_id}` | PUT | Actualizar stock |
| `/api/precios/` | GET | Obtener todos los precios |
| `/api/precios/producto/{p_id}/local/{l_id}` | PUT | Actualizar precio |

## 🚦 Estado del Proyecto

✅ **Completado:**
- Estructura base del proyecto
- CRUD completo de Productos
- CRUD completo de Locales
- Gestión de Inventario (matriz)
- Gestión de Precios (matriz)
- Dashboard con estadísticas
- Dockerfile de producción

⏳ **Pendiente:**
- Sistema de autenticación (login/logout)
- Gestión de usuarios admin
- Auditoría de cambios
- Reportes y exportación
- Notificaciones en tiempo real

## 📞 Soporte

Para problemas o consultas, revisar el archivo `AGENTS.md` en este directorio.

---

**Última actualización:** 24 de Noviembre, 2025
