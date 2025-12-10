# 🚀 Quick Start - Docker Hub Deploy

## Para subir la imagen a Docker Hub:

### 1. Ejecutar el script (usa latest por defecto):

```powershell
cd D:\ProyectosAI\Masas_Estacion\fme-backoffice

# Forma simple (usa mmoyac/masas-estacion-backoffice:latest)
.\docker-build-push.ps1
```

### 2. O paso a paso manual:

```powershell
# Login
docker login

# Build (siempre con latest)
docker build -t mmoyac/masas-estacion-backoffice:latest -f Dockerfile.prod .

# Push
docker push mmoyac/masas-estacion-backoffice:latest
```

### 3. En el VPS:

```bash
# Pull
docker pull mmoyac/masas-estacion-backoffice:latest

# Actualizar docker-compose.prod.yml con tu imagen

# Deploy
docker-compose -f docker-compose.prod.yml up -d backoffice
```

---

## Opciones del script:

```powershell
# Build y push completo (usa latest por defecto)
.\docker-build-push.ps1

# Solo build (sin push)
.\docker-build-push.ps1 -SkipPush

# Solo push (si ya construiste)
.\docker-build-push.ps1 -SkipBuild
```

---

Ver guía completa en: `DOCKER_HUB_GUIDE.md`
