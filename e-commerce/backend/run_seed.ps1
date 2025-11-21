# PowerShell script to run seed data script
# This script can be run with or without Poetry

Write-Host "🌱 Running seed data script..." -ForegroundColor Cyan
Write-Host ""

# Change to script directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  Warning: .env file not found!" -ForegroundColor Yellow
    Write-Host "   Please create .env file with database configuration." -ForegroundColor Yellow
    Write-Host "   See .env.example for reference." -ForegroundColor Yellow
    Write-Host ""
}

# Option 1: Try Docker Compose (if services are running)
Write-Host "Checking for Docker Compose..." -ForegroundColor Cyan
$dockerComposeCmd = Get-Command docker-compose -ErrorAction SilentlyContinue
if ($dockerComposeCmd) {
    Write-Host "Docker Compose found. Checking if backend container is running..." -ForegroundColor Yellow
    Push-Location ..
    $containers = docker-compose ps -q backend 2>$null
    Pop-Location
    if ($containers) {
        Write-Host "✅ Backend container is running. Using Docker..." -ForegroundColor Green
        
        # Check if pandas is available in the container
        Push-Location ..
        $pandasCheck = docker-compose exec -T backend python -c "import pandas" 2>&1
        Pop-Location
        if ($LASTEXITCODE -ne 0) {
            Write-Host "⚠️  pandas module not found in Docker container." -ForegroundColor Yellow
            Write-Host "💡 Installing pandas and openpyxl in running container..." -ForegroundColor Cyan
            Push-Location ..
            docker-compose exec -T backend pip install pandas openpyxl
            Pop-Location
            if ($LASTEXITCODE -ne 0) {
                Write-Host "❌ Failed to install pandas. Please rebuild the container:" -ForegroundColor Red
                Write-Host "   cd .." -ForegroundColor White
                Write-Host "   docker-compose build --no-cache backend" -ForegroundColor White
                Write-Host "   docker-compose up -d backend" -ForegroundColor White
                exit 1
            }
        }
        
        Push-Location ..
        # Run from /app directory with PYTHONPATH set
        docker-compose exec -e PYTHONPATH=/app backend python scripts/seed_data.py
        Pop-Location
        exit $LASTEXITCODE
    }
}

# Option 2: Try Poetry
Write-Host "Checking for Poetry..." -ForegroundColor Cyan
$poetryCmd = Get-Command poetry -ErrorAction SilentlyContinue
if ($poetryCmd) {
    Write-Host "✅ Poetry found. Using Poetry..." -ForegroundColor Green
    poetry run python scripts/seed_data.py
    exit $LASTEXITCODE
}

# Option 3: Try Python directly
Write-Host "Checking for Python..." -ForegroundColor Cyan
$pythonCmd = Get-Command python -ErrorAction SilentlyContinue
if (-not $pythonCmd) {
    $pythonCmd = Get-Command py -ErrorAction SilentlyContinue
}

if ($pythonCmd) {
    Write-Host "✅ Python found. Using Python directly..." -ForegroundColor Green
    Write-Host "⚠️  Note: Make sure all dependencies are installed!" -ForegroundColor Yellow
    Write-Host "   Run: pip install -r requirements.txt" -ForegroundColor Yellow
    Write-Host ""
    python scripts/seed_data.py
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "❌ Script failed. Try installing dependencies:" -ForegroundColor Red
        Write-Host "   pip install -r requirements.txt" -ForegroundColor Cyan
    }
    exit $LASTEXITCODE
}

# No options available
Write-Host "❌ Error: Could not find Python or Docker!" -ForegroundColor Red
Write-Host ""
Write-Host "Please choose one of the following options:" -ForegroundColor Yellow
Write-Host ""
Write-Host "Option 1: Install Poetry" -ForegroundColor Cyan
Write-Host "  (Invoke-WebRequest -Uri https://install.python-poetry.org -UseBasicParsing).Content | python -" -ForegroundColor White
Write-Host ""
Write-Host "Option 2: Use Docker Compose" -ForegroundColor Cyan
Write-Host "  cd .." -ForegroundColor White
Write-Host "  docker-compose up -d" -ForegroundColor White
Write-Host "  docker-compose exec backend python scripts/seed_data.py" -ForegroundColor White
Write-Host ""
Write-Host "Option 3: Install Python 3.12+ and dependencies" -ForegroundColor Cyan
Write-Host "  Download from: https://www.python.org/downloads/" -ForegroundColor White
Write-Host "  Then run: pip install -r requirements.txt" -ForegroundColor White
Write-Host ""
exit 1
