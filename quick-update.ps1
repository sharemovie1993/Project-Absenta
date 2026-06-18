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

# 2. Matikan PM2 Sementara (Penting untuk Windows agar file tidak terkunci)
Write-Host "[2/5] Menghentikan layanan PM2 sementara..." -ForegroundColor Yellow
pm2 stop ecosystem.config.js || Write-Host "PM2 sudah berhenti." -ForegroundColor Gray

# 3. Cek & Install Dependensi Backend
cd "$appRoot\absenta_backend"
Write-Host "[3/5] Memeriksa dependensi backend..." -ForegroundColor Yellow
npm install --omit=dev --no-audit

# 4. Build Backend & Frontend
Write-Host "[4/5] Melakukan kompilasi (Build)..." -ForegroundColor Yellow
npm run build
cd "$appRoot\absenta_frontend"
npm run build

# 5. Jalankan Kembali via PM2
cd $appRoot
Write-Host "[5/5] Menyalakan kembali layanan PM2..." -ForegroundColor Yellow
pm2 start ecosystem.config.js --update-env

Write-Host "=== UPDATE BERHASIL SELESAI! ===" -ForegroundColor Green
Read-Host "Tekan [ENTER] untuk menutup..."
