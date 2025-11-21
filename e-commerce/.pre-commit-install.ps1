# PowerShell script to install pre-commit hooks

Write-Host "Installing pre-commit hooks..." -ForegroundColor Green

# Check if pre-commit is installed
try {
    $null = Get-Command pre-commit -ErrorAction Stop
    Write-Host "pre-commit is already installed." -ForegroundColor Yellow
} catch {
    Write-Host "pre-commit is not installed. Installing..." -ForegroundColor Yellow
    pip install pre-commit
}

# Install the hooks
pre-commit install

Write-Host "Pre-commit hooks installed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Hooks will run automatically on git commit." -ForegroundColor Cyan
Write-Host "To run manually: pre-commit run --all-files" -ForegroundColor Cyan

