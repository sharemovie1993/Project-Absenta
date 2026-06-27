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

# 2. Sinkronisasi Skema Database (Kritikal untuk SaaS)
Write-Host "[2/4] Sinkronisasi skema database (Prisma)..." -ForegroundColor Yellow
cd "$appRoot\absenta_backend"
npx prisma generate
npx prisma db push --accept-data-loss

# 3. Cek & Install Dependensi
Write-Host "[3/4] Memperbarui dependensi..." -ForegroundColor Yellow
cd "$appRoot\absenta_backend"
npm install --omit=dev --no-audit
cd "$appRoot\absenta_frontend"
npm install --no-audit

# 4. Build dengan Zero-Downtime Strategy
Write-Host "[4/4] Melakukan kompilasi (Build)..." -ForegroundColor Yellow

# Build Backend
cd "$appRoot\absenta_backend"
if (Test-Path "dist_old") { Remove-Item -Path "dist_old" -Recurse -Force -ErrorAction SilentlyContinue }
if (Test-Path "dist") { Rename-Item -Path "dist" -NewName "dist_old" -ErrorAction SilentlyContinue }
$env:NODE_OPTIONS = "--max-old-space-size=4096"
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build Backend Gagal! Mengembalikan folder dist..." -ForegroundColor Red
    Rename-Item -Path "dist_old" -NewName "dist" -ErrorAction SilentlyContinue
    exit 1
}

# Build Frontend
cd "$appRoot\absenta_frontend"
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build Frontend Gagal!" -ForegroundColor Red
    exit 1
}

# 5. Reload PM2 (Zero-Downtime)
cd $appRoot
Write-Host "Memuat ulang layanan PM2..." -ForegroundColor Yellow
pm2 reload ecosystem.config.js --update-env

# Cleanup
Remove-Item -Path "$appRoot\absenta_backend\dist_old" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "=== UPDATE BERHASIL SELESAI! ===" -ForegroundColor Green
Read-Host "Tekan [ENTER] untuk menutup..."
Read-Host "Tekan [ENTER] untuk menutup..."
