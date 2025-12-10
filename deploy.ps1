# Script de despliegue del Backoffice a Producción
# Uso: .\deploy.ps1

$ErrorActionPreference = "Stop"

Write-Host "🚀 Desplegando Backoffice a Producción..." -ForegroundColor Cyan

# Variables
$IMAGE_NAME = "mmoyac/masas-estacion-backoffice"
$TAG = "latest"
$FULL_IMAGE = "${IMAGE_NAME}:${TAG}"

# 1. Build de la imagen
Write-Host "📦 Construyendo imagen Docker..." -ForegroundColor Yellow
docker build -t $FULL_IMAGE -f Dockerfile.prod .

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al construir la imagen" -ForegroundColor Red
    exit 1
}

# 2. Push a Docker Hub
Write-Host "⬆️  Subiendo imagen a Docker Hub..." -ForegroundColor Yellow
docker push $FULL_IMAGE

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al subir la imagen" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Imagen desplegada exitosamente: $FULL_IMAGE" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Próximos pasos en el VPS:" -ForegroundColor Cyan
Write-Host "   1. ssh user@168.231.96.205"
Write-Host "   2. cd /path/to/fme-backend"
Write-Host "   3. docker pull $FULL_IMAGE"
Write-Host "   4. docker-compose -f docker-compose.prod.yml up -d backoffice"
Write-Host "   5. docker logs -f masas_estacion_backoffice"
