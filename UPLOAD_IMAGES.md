# 📤 Sistema de Upload de Imágenes para Landing Page

## 🎯 Descripción

Sistema completo de upload de imágenes para logo y favicon con preview, validaciones y almacenamiento en el backend.

## ✅ Características Implementadas

### Backend (FastAPI)
- **Endpoint**: `POST /api/admin/configuracion-landing/upload-imagen`
- **Parámetros**: 
  - `tipo`: 'logo' o 'favicon'
  - `file`: Archivo de imagen
- **Validaciones**:
  - ✅ Formatos permitidos: JPG, JPEG, PNG, WEBP, SVG, ICO
  - ✅ Tamaño máximo: 2MB
  - ✅ Nombres únicos: `{tipo}_{tenant_id}_{uuid}.{ext}`
- **Almacenamiento**: `static/uploads/landing/`
- **Autenticación**: Requiere JWT token

### Frontend (Next.js)
- **Componente**: `ImageUpload` (`components/ImageUpload.tsx`)
- **Características**:
  - 📸 Preview en tiempo real
  - 🔄 Spinner de carga durante upload
  - ❌ Botón para eliminar imagen
  - ✅ Validación de tamaño y formato
  - 🎨 Preview diferenciado (logo: 48x48, favicon: 16x16)
  - 📝 Mensajes de ayuda contextuales

### Integración
- **Página**: `/admin/configuracion/landing`
- **Estado**: Sincronizado con `formData.logo_url` y `formData.favicon_url`
- **Guardado**: Al hacer submit del formulario, las URLs se guardan en la BD

## 🚀 Uso

### 1. Navegar a la configuración
```
http://elolivo.local:3001/admin/configuracion/landing
```

### 2. Subir logo
1. Click en sección "Branding"
2. Click en "Subir imagen" bajo "Logo de la empresa"
3. Seleccionar archivo (PNG/SVG recomendado, fondo transparente)
4. Esperar a que aparezca el preview
5. Click en "Guardar Configuración"

### 3. Subir favicon
1. Click en "Subir imagen" bajo "Favicon (icono del navegador)"
2. Seleccionar archivo .ICO o .PNG de 32x32px
3. Esperar preview
4. Guardar

## 📁 Estructura de Archivos

```
fme-backend/
├── routers/
│   └── admin_configuracion_landing.py  # Endpoint de upload
├── static/
│   └── uploads/
│       └── landing/
│           ├── logo_1_abc123.png
│           └── favicon_1_def456.ico
│
fme-backoffice/
├── components/
│   └── ImageUpload.tsx  # Componente de upload
└── app/admin/configuracion/landing/
    └── page.tsx  # Integración
```

## 🔐 Seguridad

- ✅ Autenticación JWT requerida
- ✅ Validación de extensiones (whitelist)
- ✅ Validación de tamaño máximo
- ✅ Nombres únicos (evita sobrescritura)
- ✅ Tenant isolation (nombre incluye tenant_id)

## 📊 Ejemplo de Request

```bash
curl -X POST "http://localhost:8000/api/admin/configuracion-landing/upload-imagen?tipo=logo" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/logo.png"
```

**Response:**
```json
{
  "success": true,
  "url": "/static/uploads/landing/logo_2_abc123.png",
  "filename": "logo_2_abc123.png",
  "tipo": "logo"
}
```

## 🎨 Recomendaciones

### Logo
- Formato: PNG o SVG
- Fondo: Transparente
- Dimensiones: 200-400px de ancho
- Peso: < 500KB

### Favicon
- Formato: ICO o PNG
- Dimensiones: 32x32px o 64x64px
- Peso: < 100KB

## 🐛 Troubleshooting

### "No existe" - Placeholder con imagen tachada
- La URL está guardada en la base de datos pero el archivo físico no existe
- **Solución**: Sube una nueva imagen para reemplazarla
- Esto es normal en configuraciones nuevas o migradas

### Error: "Extensión no permitida"
- Verifica que el archivo sea JPG, PNG, WEBP, SVG o ICO
- Revisa la extensión del archivo

### Error: "Archivo demasiado grande"
- Comprime la imagen (usa TinyPNG u otras herramientas)
- Máximo 2MB

### No aparece el preview
- Verifica que el backend esté corriendo
- Revisa la consola del navegador para errores (F12 → Console)
- Busca logs con `[ImageUpload logo]` o `[ImageUpload favicon]`
- Verifica el token de autenticación

### Error 401 Unauthorized
- Token expirado o inválido
- Vuelve a hacer login

## 🔍 Debug

El componente incluye logs en la consola del navegador:
```
[ImageUpload logo] currentUrl recibida: /logo-elolivo.png
[ImageUpload logo] Error cargando imagen: /logo-elolivo.png
[ImageUpload logo] URL completa: http://localhost:8000/logo-elolivo.png
```

Abre las DevTools (F12) para ver estos logs y diagnosticar problemas.

## 📝 TODO / Mejoras Futuras

- [ ] Agregar crop/resize de imágenes
- [ ] Soporte para drag & drop
- [ ] Múltiples imágenes (galería)
- [ ] Compresión automática
- [ ] CDN integration
- [ ] Edición de imágenes (filtros, ajustes)

---

**Última actualización:** 2026-02-17  
**Estado:** ✅ Implementado y funcional
