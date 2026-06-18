# Script Update Cepat (Tanpa Wizard) - Project Absenta
# Hanya Pull, Build, dan Restart PM2

$ErrorActionPreference = "Stop"
$appRoot = "C:\apps\project-absenta"

Write-Host "=== MEMULAI UPDATE CEPAT ===" -ForegroundColor Cyan

if (-not (Test-Path $appRoot)) {
    Write-Host "Folder $appRoot tidak ditemukan!" -ForegroundColor Red
    exit
}

cd $appRoot

# 1. Pull Kode Terbaru
Write-Host "[1/4] Menarik kode terbaru dari GitHub..." -ForegroundColor Yellow
git fetch origin main
git reset --hard origin/main

# 2. Cek & Install Dependensi Backend
cd "$appRoot\absenta_backend"
Write-Host "[2/4] Memeriksa dependensi backend..." -ForegroundColor Yellow
# Gunakan npm install agar lebih aman terhadap file locked di Windows
npm install --omit=dev --no-audit

# 3. Build Backend & Frontend
Write-Host "[3/4] Melakukan kompilasi (Build)..." -ForegroundColor Yellow
npm run build

cd "$appRoot\absenta_frontend"
npm install --no-audit
npm run build

# 4. Restart Layanan via PM2
cd $appRoot
Write-Host "[4/4] Memuat ulang layanan PM2..." -ForegroundColor Yellow
pm2 reload ecosystem.config.js --update-env

Write-Host "=== UPDATE BERHASIL SELESAI! ===" -ForegroundColor Green
Read-Host "Tekan [ENTER] untuk menutup..."
