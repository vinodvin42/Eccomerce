# Start the FastAPI backend server
# Prerequisites: Dependencies installed (poetry install or pip install), .env file configured

Write-Host "Starting FastAPI backend server..." -ForegroundColor Cyan

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "Warning: .env file not found. Using default environment variables." -ForegroundColor Yellow
}

# Start uvicorn server
py -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

