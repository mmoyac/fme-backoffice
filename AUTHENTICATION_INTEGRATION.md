# Integración de Autenticación en el Backoffice

## Resumen de Cambios

Se ha implementado un sistema completo de autenticación para el backoffice de Masas Estación, integrándolo con el backend que utiliza JWT (JSON Web Tokens).

## Archivos Creados

### 1. **lib/auth.ts**
- Servicio de autenticación centralizado
- Manejo de tokens JWT en localStorage
- Funciones para login, logout, y obtención de usuario actual
- Método `getAuthHeaders()` para incluir el token en todas las peticiones

### 2. **lib/AuthProvider.tsx**
- Context Provider de React para manejar el estado de autenticación globalmente
- Protección automática de rutas
- Redirección automática al login si no hay sesión

### 3. **app/login/page.tsx**
- Página de login con diseño moderno y atractivo
- Validación de formularios
- Estados de carga y manejo de errores
- Credenciales por defecto mostradas: `admin@fme.cl / admin`

## Archivos Modificados

### APIs (lib/api/*)
Todos los archivos de API fueron actualizados para incluir autenticación:
- ✅ `clientes.ts`
- ✅ `dashboard.ts`
- ✅ `inventario.ts`
- ✅ `locales.ts`
- ✅ `movimientos.ts`
- ✅ `pedidos.ts`
- ✅ `precios.ts`
- ✅ `productos.ts`

Cada función ahora incluye `headers: AuthService.getAuthHeaders()` en sus peticiones fetch.

### Layouts y Páginas
- **app/layout.tsx**: Envuelto con `AuthProvider`
- **app/page.tsx**: Redirección automática a login o dashboard
- **app/admin/layout.tsx**: Protección de rutas del admin
- **components/layout/Sidebar.tsx**: Agregado botón de logout y info del usuario

## Flujo de Autenticación

1. **Usuario no autenticado** → Redirigido a `/login`
2. **Login exitoso** → Token guardado en localStorage → Redirigido a `/admin/dashboard`
3. **Navegación en admin** → Token incluido automáticamente en todas las peticiones
4. **Token inválido/expirado** → Logout automático → Redirigido a `/login`
5. **Logout manual** → Token eliminado → Redirigido a `/login`

## Características Implementadas

✅ **Autenticación JWT** con el backend
✅ **Protección de rutas** del admin
✅ **Persistencia de sesión** con localStorage
✅ **Logout automático** si el token expira
✅ **Headers de autenticación** en todas las peticiones API
✅ **UI moderna** para la página de login
✅ **Información del usuario** en el sidebar
✅ **Estados de carga** durante autenticación

## Credenciales por Defecto

```
Email: admin@fme.cl
Password: admin
```

## Próximos Pasos

1. Probar el login en el navegador
2. Verificar que todas las páginas del admin funcionen correctamente
3. Confirmar que las peticiones API incluyen el token Bearer
4. Opcional: Implementar refresh token si es necesario
5. Opcional: Agregar manejo de roles/permisos

## Notas Técnicas

- El token se almacena en `localStorage` con la key `fme_auth_token`
- El backend espera el token en el header: `Authorization: Bearer <token>`
- El AuthProvider verifica la autenticación en cada cambio de ruta
- Las rutas `/login` y `/` son públicas, todo bajo `/admin/*` requiere autenticación
