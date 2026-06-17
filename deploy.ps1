# Wizard Instalasi & Deployment - Project Absenta
# Untuk Windows PowerShell

param (
    [string]$BackendPort = "3003",
    [string]$FrontendPort = "5175",
    [switch]$Silent = $false
)

$ErrorActionPreference = "Stop"

# Mengonfigurasi ExecutionPolicy agar berkas script global npm (seperti PM2) dapat berjalan
try {
    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force -ErrorAction SilentlyContinue
} catch {}


function Show-Header {
    param ($StepTitle)
    Clear-Host
    Write-Host "==========================================================================" -ForegroundColor Cyan
    Write-Host "             WIZARD INSTALASI & DEPLOYMENT - PROJECT ABSENTA             " -ForegroundColor Yellow -Bold
    Write-Host "==========================================================================" -ForegroundColor Cyan
    if ($StepTitle) {
        Write-Host " [Langkah] $StepTitle" -ForegroundColor Green
        Write-Host "--------------------------------------------------------------------------" -ForegroundColor Gray
    }
}

# ----------------------------------------------------
# LANGKAH 0: Selamat Datang / Welcome Screen
# ----------------------------------------------------
Show-Header
Write-Host "Selamat datang di Wizard Deployment Project Absenta." -ForegroundColor White
Write-Host "Wizard ini akan memandu Anda melakukan deployment backend dan frontend secara lokal." -ForegroundColor White
Write-Host ""
Write-Host "Proses ini mencakup:"
Write-Host " 1. Pemeriksaan Prasyarat Sistem (Node.js, NPM, PM2)"
Write-Host " 2. Konfigurasi Port & Lingkungan"
Write-Host " 3. Instalasi Dependensi & Inisialisasi Database (Prisma)"
Write-Host " 4. Kompilasi Kode (Backend & Frontend)"
Write-Host " 5. Menjalankan Layanan (PM2 atau Terminal Baru)"
Write-Host ""

if (-not $Silent) {
    Write-Host "Tekan [Y] untuk melanjutkan, atau tombol lain untuk keluar."
    $key = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    if ($key.Character -ne 'y' -and $key.Character -ne 'Y') {
        Write-Host "Instalasi dibatalkan oleh pengguna." -ForegroundColor Red
        Exit
    }
}

# ----------------------------------------------------
# LANGKAH 1: Pemeriksaan Prasyarat Sistem
# ----------------------------------------------------
Show-Header "1 / 5 - Pemeriksaan Prasyarat Sistem"
$hasNode = $false
$hasNpm = $false
$hasPM2 = $false

Write-Host "Memeriksa Node.js... " -NoNewline
try {
    $nodeVer = node -v
    Write-Host "OK ($nodeVer)" -ForegroundColor Green
    $hasNode = $true
} catch {
    Write-Host "BELUM TERPASANG" -ForegroundColor Yellow
    if (-not $hasNode) {
        Write-Host "Kesalahan: Node.js tidak terdeteksi!" -ForegroundColor Red
        Read-Host "Tekan [ENTER] untuk keluar..."
        Exit
    }
}

Write-Host "Memeriksa NPM... " -NoNewline
try {
    $npmVer = npm -v
    Write-Host "OK ($npmVer)" -ForegroundColor Green
    $hasNpm = $true
} catch {
    Write-Host "GAGAL" -ForegroundColor Red
    Exit
}

Write-Host "Memeriksa PM2... " -NoNewline
$pm2Path = Get-Command pm2 -ErrorAction SilentlyContinue
if ($pm2Path) {
    Write-Host "OK (Terpasang)" -ForegroundColor Green
    $hasPM2 = $true
} else {
    Write-Host "BELUM TERPASANG" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Pemeriksaan prasyarat selesai!" -ForegroundColor Green
if (-not $Silent) {
    Read-Host "Tekan [ENTER] untuk melanjutkan ke konfigurasi port..."
}

# ----------------------------------------------------
# LANGKAH 2: Konfigurasi Port & Lingkungan
# ----------------------------------------------------
if (-not $Silent) {
    $backendPortInput = "3003"
    $frontendPortInput = "5175"

    if (Test-Path "absenta_backend/.env") {
        $content = Get-Content "absenta_backend/.env"
        foreach ($line in $content) {
            if ($line -match "^PORT=(\d+)") { $backendPortInput = $Matches[1] }
        }
    }

    $confirmed = $false
    while (-not $confirmed) {
        Show-Header "2 / 5 - Konfigurasi Port & Lingkungan"
        Write-Host "Silakan masukkan port di bawah ini." -ForegroundColor White
        
        $inBackend = Read-Host "1. Port Backend [$backendPortInput]"
        if (-not [string]::IsNullOrWhiteSpace($inBackend)) { $backendPortInput = $inBackend }

        $inFrontend = Read-Host "2. Port Frontend [$frontendPortInput]"
        if (-not [string]::IsNullOrWhiteSpace($inFrontend)) { $frontendPortInput = $inFrontend }

        Write-Host ""
        Write-Host "--- RINGKASAN KONFIGURASI ---" -ForegroundColor Yellow
        Write-Host " - Port Backend  : $backendPortInput"
        Write-Host " - Port Frontend : $frontendPortInput"
        Write-Host "-----------------------------" -ForegroundColor Yellow
        Write-Host ""
        $confKey = Read-Host "Apakah sudah benar? [Y/n]"
        if ($confKey -eq 'n' -or $confKey -eq 'N') { } else { $confirmed = $true }
    }
    $BackendPort = $backendPortInput
    $FrontendPort = $frontendPortInput
}

# Update .env files
Write-Host "Menulis konfigurasi ke file .env..." -ForegroundColor Cyan

if (-not (Test-Path "absenta_backend/.env")) { Copy-Item "absenta_backend/.env.example" "absenta_backend/.env" }
$backendEnv = Get-Content "absenta_backend/.env"
$newBackendEnv = @()
$portFound = $false
foreach ($line in $backendEnv) {
    if ($line -match "^PORT=") {
        $newBackendEnv += "PORT=$BackendPort"
        $portFound = $true
    } elseif ($line -match "^API_URL=http://localhost:") {
        $newBackendEnv += "API_URL=http://localhost:$BackendPort"
    } elseif ($line -match "^APP_URL=http://localhost:") {
        $newBackendEnv += "APP_URL=http://localhost:$BackendPort"
    } elseif ($line -match "^PUBLIC_APP_URL=http://localhost:") {
        $newBackendEnv += "PUBLIC_APP_URL=http://localhost:$BackendPort"
    } elseif ($line -match "^PUBLIC_INVOICE_BASE_URL=http://localhost:") {
        $newBackendEnv += "PUBLIC_INVOICE_BASE_URL=http://localhost:$BackendPort"
    } else {
        $newBackendEnv += $line
    }
}
if (-not $portFound) { $newBackendEnv += "PORT=$BackendPort" }
$newBackendEnv | Set-Content "absenta_backend/.env"

if (-not (Test-Path "absenta_frontend/.env")) { Copy-Item "absenta_frontend/.env.example" "absenta_frontend/.env" }
Write-Host "Info: Frontend dikonfigurasi dalam mode FLEXIBLE (Auto-Detect Domain)." -ForegroundColor Gray

# ----------------------------------------------------
# LANGKAH 3: Instalasi Dependensi & Database
# ----------------------------------------------------
Show-Header "3 / 5 - Instalasi Dependensi & Database"

Write-Host "1. Menginstal dependensi Backend..." -ForegroundColor Yellow
Push-Location absenta_backend
npm install
if ($LASTEXITCODE -ne 0) { Write-Host "Gagal npm install backend"; Exit }

Write-Host "2. Sinkronisasi Database Prisma..." -ForegroundColor Yellow
npx prisma generate
Pop-Location

Write-Host "3. Menginstal dependensi Frontend..." -ForegroundColor Yellow
Push-Location absenta_frontend
npm install
if ($LASTEXITCODE -ne 0) { Write-Host "Gagal npm install frontend"; Exit }
Pop-Location

# ----------------------------------------------------
# LANGKAH 4: Kompilasi (Build)
# ----------------------------------------------------
Show-Header "4 / 5 - Kompilasi Kode (Build)"

Write-Host "1. Membangun Backend (TSC)..." -ForegroundColor Yellow
Push-Location absenta_backend
npm run build
Pop-Location

Write-Host "2. Membangun Frontend (Vite)..." -ForegroundColor Yellow
Push-Location absenta_frontend
npm run build
Pop-Location

# ----------------------------------------------------
# LANGKAH 5: Jalankan Layanan
# ----------------------------------------------------
Show-Header "5 / 5 - Jalankan Layanan"
if ($hasPM2) {
    Write-Host "Menggunakan PM2 dengan Mode Cluster (Adaptive) untuk performa maksimal..." -ForegroundColor Yellow
    & pm2 delete ecosystem.config.js 2>&1 | Out-Null
    & pm2 start ecosystem.config.js --update-env
    & pm2 save
    Write-Host "Layanan telah dijalankan dalam Mode Cluster." -ForegroundColor Green
    Write-Host "Gunakan perintah 'pm2 status' untuk melihat semua instance yang berjalan." -ForegroundColor Gray
} else {
    Write-Host "PM2 tidak ditemukan, menjalankan via terminal baru..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd absenta_backend; npm start"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd absenta_frontend; npm run preview -- --port $FrontendPort --host 0.0.0.0"
}

Show-Header "Selesai!"
Write-Host "Project Absenta berhasil di-deploy!" -ForegroundColor Green
Write-Host "Backend : http://localhost:$BackendPort"
Write-Host "Frontend: http://localhost:$FrontendPort"
if (-not $Silent) {
    Read-Host "Tekan [ENTER] untuk keluar..."
}
