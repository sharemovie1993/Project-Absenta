# Wizard Instalasi & Deployment - Project Absenta
# Untuk Windows PowerShell

param (
    [string]$BackendPort = "3003",
    [string]$FrontendPort = "5175",
    [string]$DeployMode = "", # "saas" or "local"
    [string]$ServerDomain = "", # e.g. "api.absenta.id" or "192.168.1.10"
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
Write-Host "Wizard ini akan memandu Anda melakukan deployment backend dan frontend secara otomatis." -ForegroundColor White
Write-Host ""
Write-Host "Proses ini mencakup:"
Write-Host " 1. Pemeriksaan Prasyarat Sistem (Node.js, NPM, PM2)"
Write-Host " 2. Konfigurasi Skenario (SaaS vs Lokal Sekolah)"
Write-Host " 3. Instalasi Dependensi & Inisialisasi Database (Prisma)"
Write-Host " 4. Kompilasi Kode (Backend & Frontend)"
Write-Host " 5. Menjalankan Layanan (PM2 Mode Cluster)"
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
$hasPM2 = $false

Write-Host "Memeriksa Node.js... " -NoNewline
try {
    $nodeVer = node -v
    Write-Host "OK ($nodeVer)" -ForegroundColor Green
    $hasNode = $true
} catch {
    Write-Host "BELUM TERPASANG" -ForegroundColor Yellow
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
if (-not $Silent) { Read-Host "Tekan [ENTER] untuk melanjutkan ke konfigurasi skenario..." }

# ----------------------------------------------------
# LANGKAH 2: Konfigurasi Skenario & Port
# ----------------------------------------------------
$finalDomain = "api.absenta.id"
$finalScheme = "https"

if (-not $Silent) {
    $confirmed = $false
    while (-not $confirmed) {
        Show-Header "2 / 5 - Konfigurasi Skenario & Port"
        Write-Host "Konfigurasi Target Server:" -ForegroundColor White
        
        # 0. Redis Mode
        Write-Host "Pilih Mode Redis:" -ForegroundColor Gray
        Write-Host " 1. Built-in (Embedded) - Rekomendasi"
        Write-Host " 2. Eksternal (Laragon/Single)"
        $redisChoice = Read-Host "Pilih [1/2] (Default: 1)"
        if ($redisChoice -eq "2") { 
            $redisMode = "single" 
            $redisUrl = Read-Host "Masukkan Redis URL [redis://localhost:6379]"
            if ([string]::IsNullOrWhiteSpace($redisUrl)) { $redisUrl = "redis://localhost:6379" }
        } else { 
            $redisMode = "embedded"
            $redisUrl = "redis://localhost:6379"
        }

        # 1. Domain / Host
        $inputDomain = Read-Host "1. Masukkan Domain Tunggal (misal: sekolah.absenta.id) [$finalDomain]"
        if (-not [string]::IsNullOrWhiteSpace($inputDomain)) { $finalDomain = $inputDomain }

        # 2. Protokol
        $inputScheme = Read-Host "2. Gunakan Protokol (http/https) [$finalScheme]"
        if (-not [string]::IsNullOrWhiteSpace($inputScheme)) { $finalScheme = $inputScheme }
        
        # 3. LAN IP (Optional for Split DNS Helper)
        $lanIp = Read-Host "3. Masukkan IP LAN Server (untuk akses lokal tanpa DNS) [127.0.0.1]"
        if ([string]::IsNullOrWhiteSpace($lanIp)) { $lanIp = "127.0.0.1" }

        # 4. Ports
        $inputBPort = Read-Host "4. Port Backend [$BackendPort]"
        if (-not [string]::IsNullOrWhiteSpace($inputBPort)) { $BackendPort = $inputBPort }
        
        $inputFPort = Read-Host "5. Port Frontend [$FrontendPort]"
        if (-not [string]::IsNullOrWhiteSpace($inputFPort)) { $FrontendPort = $inputFPort }

        # 6. License Key
        $inputLic = Read-Host "6. Masukkan Kunci Lisensi (Kosongkan jika ingin registrasi baru)"
        if (-not [string]::IsNullOrWhiteSpace($inputLic)) { 
            $licenseKey = $inputLic.Trim() 
        } else { 
            $licenseKey = "" 
            $requestNew = Read-Host "Belum punya lisensi? Ingin registrasi sekarang? [y/N]"
            if ($requestNew -eq 'y' -or $requestNew -eq 'Y') {
                $schoolName = Read-Host "Masukkan Nama Sekolah / Instansi"
                if ([string]::IsNullOrWhiteSpace($schoolName)) {
                    Write-Host "Nama sekolah wajib diisi untuk registrasi!" -ForegroundColor Red
                } else {
                    Write-Host "Menghubungi server lisensi untuk registrasi..." -ForegroundColor Cyan
                    try {
                        $machineId = "server-$([guid]::NewGuid().ToString().Substring(0,8))" # Fallback machine ID for script
                        $body = @{
                            school_name = $schoolName
                            product_id = "platform-absenta"
                            device_limit = 9999
                            plan_id = "absenta_on_premise"
                            payment_method = "manual"
                        } | ConvertTo-Json
                        
                        $resp = Invoke-RestMethod -Method Post -Uri "https://api.absenta.id/api/license/request" -Body $body -ContentType "application/json"
                        if ($resp.success) {
                            $licenseKey = $resp.data.license_key
                            Write-Host "----------------------------------------------------------" -ForegroundColor Green
                            Write-Host " REGISTRASI BERHASIL!" -ForegroundColor Green -Bold
                            Write-Host " Kunci Lisensi Anda: $licenseKey" -ForegroundColor Yellow
                            Write-Host " Status: Menunggu Persetujuan Admin (Pending Approval)"
                            Write-Host "----------------------------------------------------------" -ForegroundColor Green
                            Write-Host "Silakan teruskan proses deploy ini, lalu hubungi owner untuk aktivasi."
                            Read-Host "Tekan [ENTER] untuk melanjutkan..."
                        }
                    } catch {
                        Write-Host "Gagal melakukan registrasi otomatis: $($_.Exception.Message)" -ForegroundColor Red
                        Read-Host "Tekan [ENTER] untuk lanjut deploy tanpa lisensi..."
                    }
                }
            }
        }

        Write-Host "--- RINGKASAN KONFIGURASI SPLIT DNS ---" -ForegroundColor Yellow
        Write-Host " - Domain Utama   : $finalDomain"
        Write-Host " - Protokol       : $finalScheme"
        Write-Host " - IP LAN         : $lanIp"
        Write-Host " - Port Backend   : $BackendPort"
        Write-Host " - Port Frontend  : $FrontendPort"
        Write-Host " - License Key    : $(if($licenseKey){$licenseKey}else{'Tidak Ada'})"
        Write-Host "---------------------------------------" -ForegroundColor Yellow
        Write-Host " Catatan: Pastikan DNS Lokal & Cloudflare/VPS Anda mengarah ke domain ini." -ForegroundColor Gray
        Write-Host ""
        $confKey = Read-Host "Apakah sudah benar? [Y/n]"
        if ($confKey -eq 'n' -or $confKey -eq 'N') { } else { $confirmed = $true }
    }
} else {
    # Logic for Silent mode parameters
    if (-not [string]::IsNullOrWhiteSpace($ServerDomain)) { $finalDomain = $ServerDomain }
}

# Update .env files
Write-Host "Menulis konfigurasi ke file .env..." -ForegroundColor Cyan

if (-not (Test-Path "absenta_backend/.env")) { Copy-Item "absenta_backend/.env.example" "absenta_backend/.env" }
$backendEnv = Get-Content "absenta_backend/.env"
$newBackendEnv = @()

foreach ($line in $backendEnv) {
    if ($line -match "^PORT=") { $newBackendEnv += "PORT=$BackendPort" }
    elseif ($line -match "^REDIS_MODE=") { $newBackendEnv += "REDIS_MODE=$redisMode" }
    elseif ($line -match "^REDIS_URL=") { $newBackendEnv += "REDIS_URL=$redisUrl" }
    elseif ($line -match "^API_URL=") { $newBackendEnv += "API_URL=${finalScheme}://$finalDomain" }
    elseif ($line -match "^APP_URL=") { $newBackendEnv += "APP_URL=${finalScheme}://$finalDomain" }
    elseif ($line -match "^PUBLIC_APP_URL=") { $newBackendEnv += "PUBLIC_APP_URL=${finalScheme}://$finalDomain" }
    elseif ($line -match "^PUBLIC_INVOICE_BASE_URL=") { $newBackendEnv += "PUBLIC_INVOICE_BASE_URL=${finalScheme}://$finalDomain" }
    elseif ($line -match "^PUBLIC_APP_SCHEME=") { $newBackendEnv += "PUBLIC_APP_SCHEME=$finalScheme" }
    elseif ($line -match "^PUBLIC_DOMAIN_BASE=") { $newBackendEnv += "PUBLIC_DOMAIN_BASE=$finalDomain" }
    elseif ($line -match "^TENANT_BASE_DOMAIN=") { $newBackendEnv += "TENANT_BASE_DOMAIN=$finalDomain" }
    elseif ($line -match "^FRONTEND_URL=") { $newBackendEnv += "FRONTEND_URL=${finalScheme}://$finalDomain" }
    elseif ($line -match "^ALLOWED_LAN_IP=") { $newBackendEnv += "ALLOWED_LAN_IP=$lanIp" }
    elseif ($line -match "^LICENSE_KEY=") { $newBackendEnv += "LICENSE_KEY=$licenseKey" }
    else { $newBackendEnv += $line }
}
# Pastikan LICENSE_KEY tertulis jika tidak ada di example
if ($newBackendEnv -notmatch "^LICENSE_KEY=") { $newBackendEnv += "LICENSE_KEY=$licenseKey" }
$newBackendEnv | Set-Content "absenta_backend/.env"

if (-not (Test-Path "absenta_frontend/.env")) { Copy-Item "absenta_frontend/.env.example" "absenta_frontend/.env" }
# Frontend is flexible, just ensure VITE_API_BASE_URL is /api for auto-detection
$frontendEnv = Get-Content "absenta_frontend/.env"
$newFrontendEnv = @()
$fPortFound = $false
$proxyTargetFound = $false

foreach ($line in $frontendEnv) {
    if ($line -match "^VITE_API_BASE_URL=") { $newFrontendEnv += "VITE_API_BASE_URL=/api" }
    elseif ($line -match "^VITE_PROXY_TARGET=") { 
        $newFrontendEnv += "VITE_PROXY_TARGET=http://localhost:$BackendPort"
        $proxyTargetFound = $true
    }
    elseif ($line -match "^VITE_SOCKET_URL=") { $newFrontendEnv += "VITE_SOCKET_URL=" }
    elseif ($line -match "^PORT=") { 
        $newFrontendEnv += "PORT=$FrontendPort"
        $fPortFound = $true
    }
    else { $newFrontendEnv += $line }
}
if (-not $fPortFound) { $newFrontendEnv += "PORT=$FrontendPort" }
if (-not $proxyTargetFound) { $newFrontendEnv += "VITE_PROXY_TARGET=http://localhost:$BackendPort" }
$newFrontendEnv | Set-Content "absenta_frontend/.env"

Write-Host "Info: Konfigurasi .env berhasil diperbarui untuk target ${finalScheme}://$finalDomain." -ForegroundColor Gray

# ----------------------------------------------------
# LANGKAH 3: Instalasi Dependensi & Database
# ----------------------------------------------------
Show-Header "3 / 5 - Instalasi Dependensi & Database"
Write-Host "Menginstal dependensi dan sinkronisasi database... (Mungkin memakan waktu)" -ForegroundColor Yellow
Push-Location absenta_backend
npm install --quiet
npx prisma generate
Pop-Location

Push-Location absenta_frontend
npm install --quiet
Pop-Location

# ----------------------------------------------------
# LANGKAH 4: Kompilasi (Build)
# ----------------------------------------------------
Show-Header "4 / 5 - Kompilasi Kode (Build)"
Write-Host "Membangun Backend & Frontend..." -ForegroundColor Yellow

$buildFailed = $false

Write-Host "1. Membangun Backend (TSC)..." -ForegroundColor Cyan
Push-Location absenta_backend
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!" -ForegroundColor Red
    Write-Host " GAGAL: Kompilasi Backend bermasalah!" -ForegroundColor Red -Bold
    Write-Host " Proses deployment dihentikan seketika untuk keamanan." -ForegroundColor Yellow
    Write-Host "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!" -ForegroundColor Red
    Pop-Location
    if (-not $Silent) { Read-Host "Tekan [ENTER] untuk keluar..." }
    Exit 1
}
Pop-Location

Write-Host "2. Membangun Frontend (Vite)..." -ForegroundColor Cyan
Push-Location absenta_frontend
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!" -ForegroundColor Red
    Write-Host " GAGAL: Kompilasi Frontend bermasalah!" -ForegroundColor Red -Bold
    Write-Host " Proses deployment dihentikan seketika untuk keamanan." -ForegroundColor Yellow
    Write-Host "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!" -ForegroundColor Red
    Pop-Location
    if (-not $Silent) { Read-Host "Tekan [ENTER] untuk keluar..." }
    Exit 1
}
Pop-Location

# ----------------------------------------------------
# LANGKAH 5: Jalankan Layanan
# ----------------------------------------------------
Show-Header "5 / 5 - Jalankan Layanan"
if ($hasPM2) {
    Write-Host "Menjalankan PM2 Mode Cluster..." -ForegroundColor Yellow
    & pm2 delete ecosystem.config.js 2>&1 | Out-Null
    & pm2 start ecosystem.config.js --update-env
    & pm2 save
} else {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd absenta_backend; npm start"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd absenta_frontend; npm run preview -- --port $FrontendPort --host 0.0.0.0"
}

Show-Header "Selesai!"
Write-Host "Project Absenta berhasil di-deploy!" -ForegroundColor Green
Write-Host "Akses URL: ${finalScheme}://$finalDomain"
if (-not $Silent) { Read-Host "Tekan [ENTER] untuk keluar..." }
