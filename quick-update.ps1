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

# 4. Shadow Build Strategy (Untuk menghindari File Lock di Windows)
Write-Host "[4/4] Melakukan kompilasi (Shadow Build)..." -ForegroundColor Yellow

# Shadow Build Backend
cd "$appRoot\absenta_backend"
$shadowDist = "dist_new_$(Get-Date -Format 'yyyyMMddHHmmss')"

Write-Host "-> Membangun Backend di folder bayangan..." -ForegroundColor Gray
$env:NODE_OPTIONS = "--max-old-space-size=4096"
# Kita gunakan flag --outDir untuk mengalihkan hasil build ke folder sementara
npx tsc -p tsconfig.json --outDir $shadowDist
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build Backend Gagal! Folder produksi tetap aman." -ForegroundColor Red
    Remove-Item -Path $shadowDist -Recurse -Force -ErrorAction SilentlyContinue
    exit 1
}
npx tsc-alias -p tsconfig.json --dir $shadowDist

# Shadow Build Frontend
cd "$appRoot\absenta_frontend"
npm run build # Frontend biasanya aman karena Vite membangun ke folder 'dist' yang tidak dikunci Node
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build Frontend Gagal!" -ForegroundColor Red
    exit 1
}

# 5. Atomic Swap & Reload (Zero-Downtime)
Write-Host "[5/5] Melakukan Atomic Swap & Reload PM2..." -ForegroundColor Yellow

# Backend Swap
cd "$appRoot\absenta_backend"
if (Test-Path "dist_old") { Remove-Item -Path "dist_old" -Recurse -Force -ErrorAction SilentlyContinue }
if (Test-Path "dist") { Rename-Item -Path "dist" -NewName "dist_old" -ErrorAction SilentlyContinue }
Rename-Item -Path $shadowDist -NewName "dist" -ErrorAction SilentlyContinue

# Reload PM2
cd $appRoot
pm2 reload ecosystem.config.js --update-env

# Cleanup
Remove-Item -Path "$appRoot\absenta_backend\dist_old" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "=== UPDATE BERHASIL SELESAI! ===" -ForegroundColor Green
Read-Host "Tekan [ENTER] untuk menutup..."
Read-Host "Tekan [ENTER] untuk menutup..."
