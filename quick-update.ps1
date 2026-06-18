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

# 2. Sinkronisasi Kode (Pull)
Write-Host "[2/5] Menarik kode terbaru dari GitHub..." -ForegroundColor Yellow
git fetch origin main
git reset --hard origin/main

# 3. Cek & Install Dependensi Backend
cd "$appRoot\absenta_backend"
Write-Host "[3/5] Memeriksa dependensi backend..." -ForegroundColor Yellow
npm install --omit=dev --no-audit

# 4. Build Backend dengan Trik Renaming (Agar tidak kena file locked di Windows)
Write-Host "[4/5] Melakukan kompilasi (Build)..." -ForegroundColor Yellow
cd "$appRoot\absenta_backend"
if (Test-Path "dist_old") { Remove-Item -Path "dist_old" -Recurse -Force -ErrorAction SilentlyContinue }
if (Test-Path "dist") { Rename-Item -Path "dist" -NewName "dist_old" -ErrorAction SilentlyContinue }
npm run build

cd "$appRoot\absenta_frontend"
npm run build

# 5. Reload PM2 (Zero-Downtime)
cd $appRoot
Write-Host "[5/5] Memuat ulang layanan PM2..." -ForegroundColor Yellow
pm2 reload ecosystem.config.js --update-env

# Hapus dist lama setelah reload sukses
Remove-Item -Path "$appRoot\absenta_backend\dist_old" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "=== UPDATE BERHASIL SELESAI! ===" -ForegroundColor Green
Read-Host "Tekan [ENTER] untuk menutup..."
Read-Host "Tekan [ENTER] untuk menutup..."
