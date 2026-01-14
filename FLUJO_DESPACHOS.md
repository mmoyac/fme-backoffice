# 🚚 Sistema de Despachos - Guía de Uso Completa

## 🎯 Resumen del Sistema

El **Sistema de Despachos** maneja todo el flujo de entrega desde que un pedido es confirmado hasta que llega al cliente. Incluye asignación de despachadores, proceso de picking (recolección) y tracking completo.

---

## 🔄 Estados del Sistema

```
ASIGNADO → EN_PICKING → LISTO_EMPAQUE → EN_RUTA → ENTREGADO
```

- **ASIGNADO** 🟡: Despacho asignado a despachador, pendiente de picking
- **EN_PICKING** 🔵: Proceso de recolección de productos activo  
- **LISTO_EMPAQUE** 🟣: Todos los items recogidos, listo para empacar
- **EN_RUTA** 🟠: Despachador en camino al cliente
- **ENTREGADO** 🟢: Pedido entregado exitosamente

---

## 🚀 Flujo de Uso Paso a Paso

### **Prerrequisitos**
1. **Docker funcionando**: `docker-compose up -d`
2. **Backend activo**: `http://localhost:8000`
3. **Backoffice activo**: `npm run dev` → `http://localhost:3001`
4. **Pedido confirmado**: Debe existir un pedido en estado `CONFIRMADO`

---

### **📋 Paso 1: Ver Dashboard**
**URL:** `http://localhost:3001/admin/despacho/dashboard`

**Qué hacer:**
- Revisar métricas generales
- Ver total de despachos del día
- Analizar tiempo promedio de picking
- Revisar despachos por estado

---

### **👤 Paso 2: Asignar Despacho**
**URL:** `http://localhost:3001/admin/despacho/asignar`

**Proceso:**
1. **Ver lista** de pedidos confirmados (izquierda)
2. **Seleccionar pedido** haciendo clic en la tarjeta
3. **Elegir despachador** del dropdown (derecha)
4. **Configurar hora estimada** (opcional)
5. **Agregar notas** del despacho (opcional)
6. **Clic en "Asignar Despacho"**

**Resultado:** Pedido → Despacho con estado `ASIGNADO`

---

### **📦 Paso 3: Proceso de Picking**
**URL:** `http://localhost:3001/admin/despacho/picking`

**Subproceso A: Iniciar Picking**
1. **Buscar despacho** en estado `ASIGNADO`
2. **Clic en "Iniciar Picking"**
3. **Estado cambia** a `EN_PICKING`
4. **Se crean automáticamente** picking_items

**Subproceso B: Recolectar Productos**
1. **Clic en "Continuar Picking"** en el despacho
2. **Ver lista** de productos a recoger
3. **Ajustar cantidades** recogidas por cada item
4. **Validar** que cada item esté completo
5. **Clic en "Completar Picking"** cuando todo esté listo

**Resultado:** Estado cambia a `LISTO_EMPAQUE`

---

### **🚛 Paso 4: Envío y Seguimiento**
**URL:** `http://localhost:3001/admin/despacho/lista`

**Proceso:**
1. **Ver lista** de todos los despachos
2. **Filtrar por estado** si es necesario
3. **Clic en "Ver"** para detalle completo
4. **Editar estado** a `EN_RUTA` cuando salga
5. **Cambiar a `ENTREGADO`** cuando complete la entrega

---

### **🔍 Paso 5: Detalle Completo**
**URL:** `http://localhost:3001/admin/despacho/[id]`

**Funciones disponibles:**
- **Timeline completo** con timestamps
- **Información del cliente** y despachador  
- **Items del pedido** con estado de picking
- **Editar estado, notas y hora estimada**
- **Ver historial** de cambios

---

## 🌐 URLs del Sistema

| Función | URL | Descripción |
|---------|-----|-------------|
| **Principal** | `/admin/despacho` | Página principal con navegación |
| **Dashboard** | `/admin/despacho/dashboard` | Métricas y estadísticas |
| **Lista** | `/admin/despacho/lista` | Todos los despachos con filtros |
| **Asignar** | `/admin/despacho/asignar` | Asignar pedidos a despachadores |
| **Picking** | `/admin/despacho/picking` | Centro de recolección de productos |
| **Detalle** | `/admin/despacho/[id]` | Vista completa de un despacho |

---

## 📱 Interfaces Implementadas

### **🏠 Página Principal** (`/admin/despacho/page.tsx`)
- 4 tarjetas de navegación
- Enlaces a: Lista, Asignar, Picking, Dashboard

### **📋 Lista de Despachos** (`/admin/despacho/lista/page.tsx`)  
- Tabla con todos los despachos
- Filtros por estado  
- Badges de colores
- Enlaces a detalle

### **👤 Asignar Despachos** (`/admin/despacho/asignar/page.tsx`)
- Panel izquierdo: Pedidos confirmados
- Panel derecho: Formulario de asignación
- Selección de despachador y configuración

### **📦 Centro de Picking** (`/admin/despacho/picking/page.tsx`)
- Lista de despachos para picking
- Interface detallada de recolección
- Actualización en tiempo real de cantidades

### **📊 Dashboard** (`/admin/despacho/dashboard/page.tsx`)
- Métricas principales
- Gráficos de estados
- Despachos recientes
- Eficiencia de entrega

### **🔍 Detalle** (`/admin/despacho/[id]/page.tsx`)
- Timeline completo
- Información del cliente/despachador
- Items con estado de picking
- Edición de datos

---

## 🔧 Comandos para Desarrollo

```bash
# Iniciar backend
cd fme-backend
docker-compose up -d

# Verificar backend
curl http://localhost:8000/health

# Iniciar backoffice  
cd fme-backoffice
npm run dev

# Acceder al sistema
http://localhost:3001/admin/despacho
```

---

## ✅ Checklist de Verificación

**Antes de probar:**
- [ ] Docker containers funcionando
- [ ] Backend responde en puerto 8000
- [ ] Backoffice funcionando en puerto 3001
- [ ] Usuario autenticado en backoffice
- [ ] Existe al menos un pedido CONFIRMADO

**Durante el flujo:**
- [ ] Dashboard carga métricas correctamente
- [ ] Lista de despachos muestra estados
- [ ] Asignación funciona sin errores
- [ ] Picking actualiza cantidades
- [ ] Detalle muestra timeline completo

**Después del flujo:**
- [ ] Estados cambian correctamente
- [ ] Timestamps se registran
- [ ] Items quedan marcados como completados
- [ ] Dashboard refleja nuevas métricas

---

## 🚨 Troubleshooting

**Problema: No aparecen pedidos para asignar**
- Verificar que existan pedidos en estado `CONFIRMADO`
- Revisar que no tengan despacho ya asignado

**Problema: Error de autenticación**
- Verificar login en backoffice
- Revisar token JWT válido

**Problema: No se pueden actualizar cantidades**
- Verificar que despacho esté en estado `EN_PICKING`
- Comprobar conexión con backend

---

**Creado:** 2026-01-07  
**Sistema:** Masas Estación - Despachos v1.0  
**Arquitectura:** Next.js (Frontend) + FastAPI (Backend) + PostgreSQL