# 🐳 Guía: Subir Imagen del Backoffice a Docker Hub

## 📋 Prerrequisitos

1. Cuenta en Docker Hub (https://hub.docker.com/)
2. Docker Desktop instalado y corriendo
3. Imagen construida localmente (opcional)

---

## 🔐 Paso 1: Login en Docker Hub

```bash
# Iniciar sesión en Docker Hub
docker login

# Te pedirá:
# Username: tu-usuario-dockerhub
# Password: tu-password o token
```

---

## 🏗️ Paso 2: Construir la Imagen

### Opción A: Build manual
```bash
cd D:\ProyectosAI\Masas_Estacion\fme-backoffice

# Construir con tag latest (siempre usar latest)
docker build -t mmoyac/masas-estacion-backoffice:latest -f Dockerfile.prod .
```

### Opción B: Usar script automatizado (recomendado)
```powershell
# Ejecutar el script (usa latest por defecto)
.\docker-build-push.ps1
```

---

## 📤 Paso 3: Subir la Imagen

```bash
# Push con tag latest (siempre usar este)
docker push mmoyac/masas-estacion-backoffice:latest
```

---

## 🔧 Paso 4: Configurar docker-compose.prod.yml

Una vez subida la imagen, actualizar el `docker-compose.prod.yml`:

```yaml
services:
  backoffice:
    image: mmoyac/masas-estacion-backoffice:latest
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
```

---

## 🚀 Despliegue en VPS

### En el VPS (168.231.96.205):

```bash
# Pull de la imagen
docker pull mmoyac/masas-estacion-backoffice:latest

# Reiniciar servicio
docker-compose -f docker-compose.prod.yml up -d backoffice
```

---

## 📝 Comandos Útiles

### Verificar imagen local:
```bash
docker images | grep backoffice
```

### Ver tags disponibles en Docker Hub:
Visitar: `https://hub.docker.com/r/mmoyac/masas-estacion-backoffice/tags`

### Eliminar imagen local:
```bash
docker rmi mmoyac/masas-estacion-backoffice:latest
```

### Ver logs del contenedor:
```bash
docker logs masas_estacion_backoffice -f
```

---

## 🔄 Flujo de Actualización

1. **Hacer cambios en el código**
2. **Construir nueva imagen (siempre con latest):**
   ```bash
   docker build -t mmoyac/masas-estacion-backoffice:latest -f Dockerfile.prod .
   ```
3. **Subir nueva versión:**
   ```bash
   docker push mmoyac/masas-estacion-backoffice:latest
   ```
4. **En VPS, actualizar:**
   ```bash
   docker-compose -f docker-compose.prod.yml pull backoffice
   docker-compose -f docker-compose.prod.yml up -d backoffice
   ```

---

## 🏷️ Estrategia de Tags

```bash
# Latest (SIEMPRE usar este tag)
mmoyac/masas-estacion-backoffice:latest
```

**Nota:** Se utiliza únicamente el tag `latest` para simplificar el despliegue y mantener una única versión en producción.

---

## ⚠️ Consideraciones de Seguridad

### Variables de entorno sensibles:
- No incluir `.env` en la imagen
- Pasar variables en `docker-compose.yml` o en runtime
- Usar Docker secrets para producción

### Ejemplo con secrets:
```yaml
services:
  backoffice:
    image: mmoyac/masas-estacion-backoffice:latest
    environment:
      NEXT_PUBLIC_API_URL: ${API_URL}
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
```

---

## 📊 Verificación Post-Deploy

```bash
# Verificar contenedor corriendo
docker ps | grep backoffice

# Ver logs
docker logs masas_estacion_backoffice --tail 50

# Verificar conectividad
curl http://localhost:3001

# Health check
docker inspect masas_estacion_backoffice | grep -A 5 Health
```

---

## 🐛 Troubleshooting

### Error: "denied: requested access to the resource is denied"
- Verificar que hiciste `docker login`
- Verificar que el nombre del repositorio es correcto

### Error: "Error response from daemon: Get https://registry-1.docker.io/v2/: unauthorized"
- Token o password incorrecto
- Reintentar login: `docker logout && docker login`

### Imagen muy pesada:
- Verificar que estás usando multi-stage build
- Usar `.dockerignore` para excluir archivos innecesarios

---

## 📚 Recursos

- Docker Hub: https://hub.docker.com/
- Docker Docs: https://docs.docker.com/
- Next.js Deployment: https://nextjs.org/docs/deployment

---

**Última actualización:** 2025-11-24
