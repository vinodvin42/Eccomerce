# Run database migrations
# Prerequisites: PostgreSQL must be running and DATABASE_URL must be set in .env file

Write-Host "Running database migrations..." -ForegroundColor Cyan

# Change to script directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Option 1: Try Docker Compose (if services are running)
Write-Host "Checking for Docker Compose..." -ForegroundColor Cyan
$dockerComposeCmd = Get-Command docker-compose -ErrorAction SilentlyContinue
if ($dockerComposeCmd) {
    Write-Host "Docker Compose found. Checking if backend container is running..." -ForegroundColor Yellow
    Push-Location ..
    $containers = docker-compose ps -q backend 2>$null
    Pop-Location
    if ($containers) {
        Write-Host "Backend container is running. Using Docker..." -ForegroundColor Green
        Push-Location ..
        docker-compose exec backend alembic upgrade head
        Pop-Location
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Migrations completed successfully!" -ForegroundColor Green
        } else {
            Write-Host "Migration failed. Please check the error messages above." -ForegroundColor Red
        }
        exit $LASTEXITCODE
    }
}

# Option 2: Try Poetry
Write-Host "Checking for Poetry..." -ForegroundColor Cyan
$poetryCmd = Get-Command poetry -ErrorAction SilentlyContinue
if ($poetryCmd) {
    Write-Host "Poetry found. Using Poetry..." -ForegroundColor Green
    poetry run alembic upgrade head
    exit $LASTEXITCODE
}

# Option 3: Try Python directly
Write-Host "Checking for Python..." -ForegroundColor Cyan
$pythonCmd = Get-Command python -ErrorAction SilentlyContinue
if (-not $pythonCmd) {
    $pythonCmd = Get-Command py -ErrorAction SilentlyContinue
}

if ($pythonCmd) {
    Write-Host "Python found. Using Python directly..." -ForegroundColor Green
    python -m alembic upgrade head
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Migrations completed successfully!" -ForegroundColor Green
    } else {
        Write-Host "Migration failed. Please check the error messages above." -ForegroundColor Red
    }
    exit $LASTEXITCODE
}

# No options available
Write-Host "Error: Could not find Python or Docker!" -ForegroundColor Red
Write-Host "Please use Docker Compose or install Python to run migrations." -ForegroundColor Yellow
exit 1

