# E-Commerce Platform Deployment Script (PowerShell)
# UTF-8 encoding to handle emojis properly
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

param(
    [string]$Environment = "development"
)

Write-Host "Starting E-Commerce Platform Deployment..." -ForegroundColor Green

# Check if .env file exists
if (-not (Test-Path .env)) {
    Write-Host "WARNING: .env file not found. Creating from .env.example..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    Write-Host "WARNING: Please update .env file with your configuration before continuing." -ForegroundColor Yellow
    Read-Host "Press Enter to continue after updating .env file"
}

# Check Docker
try {
    docker --version | Out-Null
} catch {
    Write-Host "ERROR: Docker is not installed. Please install Docker Desktop first." -ForegroundColor Red
    exit 1
}

# Check Docker Compose
$composeCmd = "docker compose"
try {
    docker compose version | Out-Null
} catch {
    try {
        docker-compose version | Out-Null
        $composeCmd = "docker-compose"
    } catch {
        Write-Host "ERROR: Docker Compose is not installed. Please install Docker Compose first." -ForegroundColor Red
        exit 1
    }
}

Write-Host "Building for environment: $Environment" -ForegroundColor Green

if ($Environment -eq "production") {
    $composeFile = "docker-compose.prod.yml"
    Write-Host "Using production configuration" -ForegroundColor Yellow
} else {
    $composeFile = "docker-compose.yml"
    Write-Host "Using development configuration" -ForegroundColor Green
}

# Stop existing containers
Write-Host "Stopping existing containers..." -ForegroundColor Green
& $composeCmd -f $composeFile down

# Build images
Write-Host "Building Docker images..." -ForegroundColor Green
& $composeCmd -f $composeFile build --no-cache

# Start services
Write-Host "Starting services..." -ForegroundColor Green
& $composeCmd -f $composeFile up -d

# Wait for services
Write-Host "Waiting for services to be healthy..." -ForegroundColor Green
Start-Sleep -Seconds 10

# Run database migrations
Write-Host "Running database migrations..." -ForegroundColor Green
try {
    & $composeCmd -f $composeFile exec -T backend alembic upgrade head
} catch {
    Write-Host "WARNING: Migration failed or already up to date" -ForegroundColor Yellow
}

# Show status
Write-Host "Service Status:" -ForegroundColor Green
& $composeCmd -f $composeFile ps

Write-Host "Deployment complete!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:4200" -ForegroundColor Cyan
Write-Host "Backend API: http://localhost:8000" -ForegroundColor Cyan
Write-Host "API Docs: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "RabbitMQ Management: http://localhost:15672 (admin/admin)" -ForegroundColor Cyan
