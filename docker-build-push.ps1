# Script para construir y subir imagen del Backoffice a Docker Hub
# Uso: .\docker-build-push.ps1 -Username "tu-usuario" -Version "v1.0.0"

param(
    [Parameter(Mandatory=$false)]
    [string]$Username = "mmoyac",
    
    [Parameter(Mandatory=$false)]
    [string]$Version = "latest",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipBuild,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipPush
)

$ImageName = "masas-estacion-backoffice"
$FullImageName = "$Username/$ImageName"

Write-Host "🐳 Docker Hub - Build & Push Script" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que Docker está corriendo
Write-Host "✓ Verificando Docker..." -ForegroundColor Yellow
try {
    docker info | Out-Null
    Write-Host "✓ Docker está corriendo" -ForegroundColor Green
} catch {
    Write-Host "✗ Error: Docker no está corriendo" -ForegroundColor Red
    Write-Host "  Inicia Docker Desktop y vuelve a intentar" -ForegroundColor Red
    exit 1
}

# Verificar login en Docker Hub
if (-not $SkipPush) {
    Write-Host ""
    Write-Host "✓ Verificando login en Docker Hub..." -ForegroundColor Yellow
    $loginCheck = docker info 2>&1 | Select-String "Username"
    if (-not $loginCheck) {
        Write-Host "⚠ No has iniciado sesión en Docker Hub" -ForegroundColor Yellow
        Write-Host "  Ejecutando docker login..." -ForegroundColor Yellow
        docker login
        if ($LASTEXITCODE -ne 0) {
            Write-Host "✗ Error en el login" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "✓ Sesión activa en Docker Hub" -ForegroundColor Green
    }
}

# Build de la imagen
if (-not $SkipBuild) {
    Write-Host ""
    Write-Host "🏗️  Construyendo imagen..." -ForegroundColor Yellow
    Write-Host "   Imagen: $FullImageName:$Version" -ForegroundColor Cyan
    Write-Host ""
    
    docker build -t "${FullImageName}:${Version}" -f Dockerfile.prod .
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Error al construir la imagen" -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
    Write-Host "✓ Imagen construida exitosamente" -ForegroundColor Green
    
    # Tag como latest si no es latest
    if ($Version -ne "latest") {
        Write-Host "   Creando tag 'latest'..." -ForegroundColor Yellow
        docker tag "${FullImageName}:${Version}" "${FullImageName}:latest"
    }
} else {
    Write-Host ""
    Write-Host "⏭️  Omitiendo build (--SkipBuild)" -ForegroundColor Yellow
}

# Push a Docker Hub
if (-not $SkipPush) {
    Write-Host ""
    Write-Host "📤 Subiendo imagen a Docker Hub..." -ForegroundColor Yellow
    Write-Host ""
    
    # Push de la versión específica
    Write-Host "   Subiendo ${FullImageName}:${Version}..." -ForegroundColor Cyan
    docker push "${FullImageName}:${Version}"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Error al subir la imagen" -ForegroundColor Red
        exit 1
    }
    
    # Push de latest si no es latest
    if ($Version -ne "latest") {
        Write-Host "   Subiendo ${FullImageName}:latest..." -ForegroundColor Cyan
        docker push "${FullImageName}:latest"
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "✗ Error al subir tag latest" -ForegroundColor Red
            exit 1
        }
    }
    
    Write-Host ""
    Write-Host "✓ Imagen subida exitosamente" -ForegroundColor Green
    Write-Host ""
    Write-Host "📦 Imagen disponible en:" -ForegroundColor Cyan
    Write-Host "   https://hub.docker.com/r/${Username}/${ImageName}" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "⏭️  Omitiendo push (--SkipPush)" -ForegroundColor Yellow
}

# Mostrar imágenes locales
Write-Host ""
Write-Host "📋 Imágenes locales:" -ForegroundColor Yellow
docker images | Select-String $ImageName

Write-Host ""
Write-Host "✅ Proceso completado exitosamente!" -ForegroundColor Green
Write-Host ""
Write-Host "📚 Siguiente paso:" -ForegroundColor Cyan
Write-Host "   En el VPS, ejecuta:" -ForegroundColor White
Write-Host "   docker pull ${FullImageName}:${Version}" -ForegroundColor Yellow
Write-Host "   docker-compose -f docker-compose.prod.yml up -d backoffice" -ForegroundColor Yellow
Write-Host ""
