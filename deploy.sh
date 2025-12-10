#!/bin/bash

# Script de despliegue del Backoffice a Producción
# Uso: ./deploy.sh

set -e

echo "🚀 Desplegando Backoffice a Producción..."

# Variables
IMAGE_NAME="mmoyac/masas-estacion-backoffice"
TAG="latest"
FULL_IMAGE="${IMAGE_NAME}:${TAG}"

# 1. Build de la imagen
echo "📦 Construyendo imagen Docker..."
docker build -t $FULL_IMAGE -f Dockerfile.prod .

# 2. Push a Docker Hub
echo "⬆️  Subiendo imagen a Docker Hub..."
docker push $FULL_IMAGE

echo "✅ Imagen desplegada exitosamente: $FULL_IMAGE"
echo ""
echo "📋 Próximos pasos en el VPS:"
echo "   1. ssh user@168.231.96.205"
echo "   2. cd /path/to/fme-backend"
echo "   3. docker pull $FULL_IMAGE"
echo "   4. docker-compose -f docker-compose.prod.yml up -d backoffice"
echo "   5. docker logs -f masas_estacion_backoffice"
