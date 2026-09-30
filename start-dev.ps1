# Script PowerShell untuk menjalankan Backend & Frontend Development
$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path

$BackendDir = Join-Path $ProjectDir "absenta_backend"
$FrontendDir = Join-Path $ProjectDir "absenta_frontend"

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "          🚀 ABSENTA DEVELOPMENT RUNNER (POWERSHELL)           " -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "Direktori Proyek: $ProjectDir`n"

if (-not (Test-Path $BackendDir)) {
    Write-Error "Folder backend tidak ditemukan: $BackendDir"
    exit 1
}

if (-not (Test-Path $FrontendDir)) {
    Write-Error "Folder frontend tidak ditemukan: $FrontendDir"
    exit 1
}

Write-Host "[1/2] Menjalankan Backend (npm run dev)..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/k cd /d `"$BackendDir`" && npm run dev"

Write-Host "[2/2] Menjalankan Frontend (npm run dev)..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/k cd /d `"$FrontendDir`" && npm run dev"

Write-Host "`n✅ Backend dan Frontend sedang dijalankan di jendela terpisah!" -ForegroundColor Green
