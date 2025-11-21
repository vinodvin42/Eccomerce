# Comprehensive setup and seed script
# This script will check prerequisites and guide you through setup

Write-Host "🚀 E-Commerce Setup and Seed Script" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Step 1: Check for .env file
Write-Host "Step 1: Checking .env file..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    Write-Host "  ⚠️  .env file not found. Creating from docker-compose defaults..." -ForegroundColor Yellow
    @"
# Database Configuration
DATABASE_URL=postgresql+asyncpg://postgres:vinod@localhost:5432/ecommerce_db

# Redis Configuration
REDIS_URL=redis://localhost:6379/0

# Celery Configuration
CELERY_BROKER_URL=amqp://admin:admin@localhost:5672//
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Application Settings
ENVIRONMENT=development
APP_NAME=Premium Commerce API
SECRET_KEY=dev-secret-key-change-in-production-min-32-chars-long-please-change

# JWT Settings
ACCESS_TOKEN_EXPIRE_MINUTES=60

# CORS Settings
ALLOWED_ORIGINS=http://localhost:4200,http://localhost:5173
"@ | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host "  ✅ .env file created!" -ForegroundColor Green
} else {
    Write-Host "  ✅ .env file exists" -ForegroundColor Green
}

# Step 2: Check Docker
Write-Host ""
Write-Host "Step 2: Checking Docker..." -ForegroundColor Yellow
$dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
if ($dockerCmd) {
    try {
        docker ps | Out-Null
        Write-Host "  ✅ Docker is running" -ForegroundColor Green
        
        # Check if containers are running
        Push-Location ..
        $containers = docker-compose ps -q 2>$null
        Pop-Location
        
        if ($containers) {
            Write-Host "  ✅ Docker containers are running" -ForegroundColor Green
            Write-Host ""
            Write-Host "Step 3: Running migrations..." -ForegroundColor Yellow
            Push-Location ..
            docker-compose exec backend alembic upgrade head 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  ✅ Migrations completed" -ForegroundColor Green
            } else {
                Write-Host "  ⚠️  Migrations may have issues, but continuing..." -ForegroundColor Yellow
            }
            Pop-Location
            
            Write-Host ""
            Write-Host "Step 4: Running seed script..." -ForegroundColor Yellow
            Push-Location ..
            docker-compose exec backend python scripts/seed_data.py
            Pop-Location
            exit $LASTEXITCODE
        } else {
            Write-Host "  ⚠️  Docker containers are not running" -ForegroundColor Yellow
            Write-Host "  Starting Docker containers..." -ForegroundColor Cyan
            Push-Location ..
            docker-compose up -d postgres redis rabbitmq
            Start-Sleep -Seconds 10
            Write-Host "  ✅ Services started. Waiting for health checks..." -ForegroundColor Green
            Start-Sleep -Seconds 15
            
            Write-Host ""
            Write-Host "Step 3: Running migrations..." -ForegroundColor Yellow
            docker-compose exec backend alembic upgrade head 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  ✅ Migrations completed" -ForegroundColor Green
            } else {
                Write-Host "  ⚠️  Migrations may have issues, but continuing..." -ForegroundColor Yellow
            }
            
            Write-Host ""
            Write-Host "Step 4: Running seed script..." -ForegroundColor Yellow
            docker-compose exec backend python scripts/seed_data.py
            Pop-Location
            exit $LASTEXITCODE
        }
    } catch {
        Write-Host "  ❌ Docker is installed but not running" -ForegroundColor Red
        Write-Host "  Please start Docker Desktop and try again" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ❌ Docker not found" -ForegroundColor Red
}

# Step 3: Check Python (if Docker not available)
Write-Host ""
Write-Host "Step 3: Checking Python..." -ForegroundColor Yellow
$pythonCmd = Get-Command python -ErrorAction SilentlyContinue
if (-not $pythonCmd) {
    $pythonCmd = Get-Command py -ErrorAction SilentlyContinue
}

if ($pythonCmd) {
    Write-Host "  ✅ Python found" -ForegroundColor Green
    
    # Check if dependencies are installed
    Write-Host ""
    Write-Host "Step 4: Checking dependencies..." -ForegroundColor Yellow
    try {
        $test = python -c "import fastapi" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✅ Dependencies appear to be installed" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️  Dependencies may not be installed" -ForegroundColor Yellow
            Write-Host "  Please run: pip install -r requirements.txt" -ForegroundColor Cyan
            exit 1
        }
    } catch {
        Write-Host "  ⚠️  Could not verify dependencies" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "Step 5: Running migrations..." -ForegroundColor Yellow
    $alembicCmd = Get-Command alembic -ErrorAction SilentlyContinue
    if (-not $alembicCmd) {
        $alembicCmd = Get-Command py -ErrorAction SilentlyContinue
        if ($alembicCmd) {
            py -m alembic upgrade head
        }
    } else {
        alembic upgrade head
    }
    
    Write-Host ""
    Write-Host "Step 6: Running seed script..." -ForegroundColor Yellow
    python scripts/seed_data.py
    exit $LASTEXITCODE
} else {
    Write-Host "  ❌ Python not found" -ForegroundColor Red
}

# Final message
Write-Host ""
Write-Host "❌ Setup incomplete. Please install one of the following:" -ForegroundColor Red
Write-Host ""
Write-Host "Option 1: Install Docker Desktop" -ForegroundColor Cyan
Write-Host "  Download from: https://www.docker.com/products/docker-desktop" -ForegroundColor White
Write-Host ""
Write-Host "Option 2: Install Python 3.12+" -ForegroundColor Cyan
Write-Host "  Download from: https://www.python.org/downloads/" -ForegroundColor White
Write-Host "  Then run: pip install -r requirements.txt" -ForegroundColor White
Write-Host ""
exit 1

