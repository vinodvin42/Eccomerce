# PowerShell script to rebuild backend Docker container with new dependencies

Write-Host "🔨 Rebuilding backend Docker container..." -ForegroundColor Cyan

# Check if Docker Compose is available
if (-not (Get-Command docker-compose -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker Compose not found. Please install Docker Desktop." -ForegroundColor Red
    exit 1
}

# Navigate to e-commerce directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

Write-Host "`n📦 Rebuilding backend service..." -ForegroundColor Yellow
docker-compose build --no-cache backend

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Backend container rebuilt successfully!" -ForegroundColor Green
    Write-Host "`n🔄 Restarting backend container..." -ForegroundColor Yellow
    docker-compose up -d backend
    
    Write-Host "`n✅ Backend container restarted!" -ForegroundColor Green
    Write-Host "`n💡 You can now run the seed script:" -ForegroundColor Cyan
    Write-Host "   cd backend" -ForegroundColor White
    Write-Host "   .\run_seed.ps1" -ForegroundColor White
} else {
    Write-Host "`n❌ Failed to rebuild backend container." -ForegroundColor Red
    exit 1
}

