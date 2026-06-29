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

function Install-CaddyLocal {
    param (
        [string]$Domain,
        [string]$FPort,
        [string]$BPort,
        [string]$SSLEmail = "",
        [string]$CFToken = "",
        [string]$DeployScenario = "hybrid"
    )
    
    Show-Header "Setup Reverse Proxy Lokal (Caddy)"
    
    # ZERO TOUCH: Otomatis deteksi dan hentikan konflik port 80/443
    Write-Host "Memeriksa konflik port 80/443..." -ForegroundColor Cyan
    $conflictingService = Get-Service -Name "Apache24", "W3SVC" -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq "Running" }
    if ($conflictingService) {
        foreach ($svc in $conflictingService) {
            Write-Host "Menentukan layanan konflik: $($svc.DisplayName). Menghentikan otomatis..." -ForegroundColor Yellow
            Stop-Service -Name $svc.Name -Force -ErrorAction SilentlyContinue
            Set-Service -Name $svc.Name -StartupType Disabled -ErrorAction SilentlyContinue
        }
    }

    # Jika port 80 masih terpakai oleh proses lain (bukan service)
    $port80Owner = Get-NetTCPConnection -LocalPort 80 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -ErrorAction SilentlyContinue
    if ($port80Owner) {
        Write-Host "Port 80 dikuasai oleh PID $port80Owner. Menghentikan proses..." -ForegroundColor Yellow
        Stop-Process -Id $port80Owner -Force -ErrorAction SilentlyContinue
    }

    # Pastikan protokol TLS 1.2 diaktifkan agar proses download tidak diblokir oleh TLS versi lama
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

    Write-Host "Memeriksa Caddy... " -NoNewline
    # Cari di PATH global sistem terlebih dahulu
    $caddyPath = Get-Command caddy -ErrorAction SilentlyContinue
    # Jika tidak ada di PATH, cari di folder instalasi lokal ($PSScriptRoot\caddy.exe)
    if (-not $caddyPath -and (Test-Path "$PSScriptRoot\caddy.exe")) {
        $caddyPath = "$PSScriptRoot\caddy.exe"
    }

    $isCustomCaddy = $false
    if ($caddyPath) {
        try {
            $modules = & $caddyPath list-modules
            if ($modules -match "dns.providers.cloudflare") { $isCustomCaddy = $true }
        } catch {
            $caddyPath = $null
        }
    }

    $dest = "$PSScriptRoot\caddy.exe"
    $needCloudflare = -not [string]::IsNullOrWhiteSpace($CFToken)

    if ($needCloudflare) {
        if ($isCustomCaddy) {
            Write-Host "OK (Menggunakan Caddy + Cloudflare yang sudah ada)" -ForegroundColor Green
        } else {
            # Periksa apakah file caddy.exe lokal sebenarnya sudah ada dan mendukung cloudflare
            if (Test-Path $dest) {
                try {
                    $localModules = & $dest list-modules
                    if ($localModules -match "dns.providers.cloudflare") {
                        $isCustomCaddy = $true
                        $caddyPath = $dest
                    }
                } catch {}
            }

            if ($isCustomCaddy) {
                Write-Host "OK (Menggunakan Caddy + Cloudflare lokal)" -ForegroundColor Green
            } else {
                Write-Host "BUTUH VERSI CLOUDFLARE" -ForegroundColor Yellow
                Write-Host "Mengunduh Caddy dengan Cloudflare Plugin..." -ForegroundColor Cyan
                $url = "https://caddyserver.com/api/download?os=windows&arch=amd64&p=github.com%2Fcaddy-dns%2Fcloudflare"
                
                # Hentikan service Caddy terlebih dahulu agar file caddy.exe tidak terkunci saat ditimpa
                sc.exe stop Caddy 2>&1 | Out-Null
                Start-Sleep -Seconds 1
                
                Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $dest
                $caddyPath = $dest
                Write-Host "Caddy Custom berhasil diunduh ke $dest" -ForegroundColor Green
            }
        }
    } else {
        if ($caddyPath) {
            Write-Host "OK (Menggunakan Caddy yang sudah ada)" -ForegroundColor Green
        } else {
            Write-Host "TIDAK DITEMUKAN" -ForegroundColor Yellow
            Write-Host "Mengunduh Caddy standar..." -ForegroundColor Cyan
            $url = "https://caddyserver.com/api/download?os=windows&arch=amd64"
            
            Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $dest
            $caddyPath = $dest
            Write-Host "Caddy standar berhasil diunduh ke $dest" -ForegroundColor Green
        }
    }

    # Buat Caddyfile cerdas
    Write-Host "Membuat konfigurasi Caddyfile..." -ForegroundColor Cyan
    $tlsConfig = "tls internal"
    
    if (-not [string]::IsNullOrWhiteSpace($CFToken)) {
        # Bersihkan token dari karakter yang tidak diinginkan (seperti titik dua di depan)
        $cleanToken = $CFToken.Trim().TrimStart(':').Trim()
        $tlsConfig = "tls {
        dns cloudflare $cleanToken
    }"
    } elseif (-not [string]::IsNullOrWhiteSpace($SSLEmail)) {
        $tlsConfig = "email $SSLEmail"
    }

    $hosts = $Domain
    if ($DeployScenario -eq "saas" -and -not [string]::IsNullOrWhiteSpace($CFToken)) {
        $hosts = "$Domain, *.$Domain"
    }

    $caddyfileContent = @"
$hosts {
    # Forward API requests to Backend
    reverse_proxy /api/* localhost:$BPort

    # WebSocket Support (socket.io)
    reverse_proxy /socket.io/* localhost:$BPort {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
    }

    # Forward everything else to Frontend
    reverse_proxy /* localhost:$FPort

    # Optimization
    encode gzip zstd
    
    # SSL Configuration
    $tlsConfig
}
"@
    $caddyfileContent | Set-Content "$PSScriptRoot\Caddyfile" -Encoding utf8

    # Install as Service (Windows Native approach)
    Write-Host "Mendaftarkan Caddy sebagai Windows Service..." -ForegroundColor Cyan
    try {
        $binPath = "`"$caddyPath`" run --config `"$PSScriptRoot\Caddyfile`""
        sc.exe stop Caddy 2>&1 | Out-Null
        sc.exe delete Caddy 2>&1 | Out-Null
        sc.exe create Caddy binPath= $binPath start= auto DisplayName= "Absenta Reverse Proxy (Caddy)"
        sc.exe start Caddy
        
        if ([string]::IsNullOrWhiteSpace($CFToken)) {
            # ZERO TOUCH SSL: Import Root CA secara native ke Windows Store (Hanya untuk Internal SSL)
            Write-Host "Menginstal Sertifikat Root Caddy ke Windows Trusted Store..." -ForegroundColor Cyan
            $caddyDataDir = "$env:AppData\Caddy"
            $systemCertPath = "C:\Windows\System32\config\systemprofile\AppData\Roaming\Caddy\pki\authorities\local\root.crt"
            $userCertPath = "$caddyDataDir\pki\authorities\local\root.crt"
            
            $finalCertPath = ""
            if (Test-Path $userCertPath) { $finalCertPath = $userCertPath }
            elseif (Test-Path $systemCertPath) { $finalCertPath = $systemCertPath }

            if (-not [string]::IsNullOrWhiteSpace($finalCertPath)) {
                Import-Certificate -FilePath $finalCertPath -CertStoreLocation Cert:\LocalMachine\Root -ErrorAction SilentlyContinue
                Import-Certificate -FilePath $finalCertPath -CertStoreLocation Cert:\CurrentUser\Root -ErrorAction SilentlyContinue
                certutil.exe -user -pulse | Out-Null
                Write-Host "Sertifikat berhasil diimpor!" -ForegroundColor Green
            }
        } else {
            Write-Host "Menggunakan Cloudflare DNS Challenge. Sertifikat resmi akan segera terbit otomatis." -ForegroundColor Green
        }
        
        Write-Host "Caddy Service & SSL berhasil dikonfigurasi!" -ForegroundColor Green
    } catch {
        Write-Host "Peringatan: Gagal mengotomatisasi service Caddy." -ForegroundColor Yellow
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
# LANGKAH 2: Konfigurasi SkenARIO & Port
# ----------------------------------------------------
$LicenseServer = "https://api.absenta.id"
$finalDomain = "your-domain.id"
$finalScheme = "https"
$deployScenario = "saas" # default

if (-not $Silent) {
    $confirmed = $false
    while (-not $confirmed) {
        Show-Header "2 / 5 - Konfigurasi Skenario & Port"
        Write-Host "Pilih Skenario Deployment:" -ForegroundColor White
        Write-Host " 1. SaaS / Cloud (Akses via Domain Publik, e.g. https://app.absenta.id)"
        Write-Host " 2. Lokal Sekolah (Akses via IP LAN/Localhost, e.g. http://192.168.1.10:5175)"
        Write-Host " 3. Hybrid (Lokal Sekolah + Reverse Proxy VPS via Caddy/Nginx)"
        $scenarioChoice = Read-Host "Pilih [1/2/3] (Default: 1)"
        
        if ($scenarioChoice -eq "2") { 
            $deployScenario = "local"
            $finalScheme = "http"
            $finalDomain = "localhost"
        }
        elseif ($scenarioChoice -eq "3") { 
            $deployScenario = "hybrid"
            $finalScheme = "https" # Biasanya VPS pakai SSL
        }
        else { $deployScenario = "saas" }

        Write-Host ""
        Write-Host "Konfigurasi Target Server ($deployScenario):" -ForegroundColor White
        
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

        # Membaca konfigurasi yang sudah ada di file .env jika ada (idempotensi)
        $existingLicense = ""
        $existingCFToken = ""
        if (Test-Path "absenta_backend/.env") {
            $envContent = Get-Content "absenta_backend/.env"
            foreach ($line in $envContent) {
                if ($line -match "^LICENSE_KEY=(.*)") {
                    $existingLicense = $Matches[1].Trim()
                }
                elseif ($line -match "^CLOUDFLARE_API_TOKEN=(.*)") {
                    $existingCFToken = $Matches[1].Trim()
                }
            }
        }

        # 1. Domain / Host
        if ($deployScenario -eq "local") {
            $inputDomain = Read-Host "1. Masukkan IP LAN Server (misal: 192.168.1.10 atau localhost) [$finalDomain]"
        } else {
            $inputDomain = Read-Host "1. Masukkan Domain Utama (misal: sekolah.absenta.id) [$finalDomain]"
        }
        if (-not [string]::IsNullOrWhiteSpace($inputDomain)) { $finalDomain = $inputDomain }

        # 2. Protokol
        if ($deployScenario -eq "local") { $finalScheme = "http" }
        $inputScheme = Read-Host "2. Gunakan Protokol (http/https) [$finalScheme]"
        if (-not [string]::IsNullOrWhiteSpace($inputScheme)) { $finalScheme = $inputScheme }
        
        # 3. LAN IP (Untuk akses lokal di skenario Hybrid)
        if ($deployScenario -eq "hybrid") {
            $lanIp = Read-Host "3. Masukkan IP LAN Server (untuk akses lokal bypass VPS) [192.168.1.10]"
            if ([string]::IsNullOrWhiteSpace($lanIp)) { $lanIp = "192.168.1.10" }
        } else {
            $lanIp = $finalDomain
        }

        # 4. Ports
        $inputBPort = Read-Host "4. Port Backend [$BackendPort]"
        if (-not [string]::IsNullOrWhiteSpace($inputBPort)) { $BackendPort = $inputBPort }
        
        $inputFPort = Read-Host "5. Port Frontend [$FrontendPort]"
        if (-not [string]::IsNullOrWhiteSpace($inputFPort)) { $FrontendPort = $inputFPort }

        # 6. SSL Configuration
        $sslEmail = ""
        $cfToken = ""
        if ($deployScenario -eq "hybrid" -or $deployScenario -eq "saas") {
            if ($deployScenario -eq "saas") {
                Write-Host "Opsi SSL SaaS (Memerlukan Cloudflare DNS Challenge untuk Wildcard SSL):" -ForegroundColor Gray
                Write-Host " 1. Cloudflare DNS Challenge (Sertifikat Resmi Wildcard - Rekomendasi)"
                Write-Host " 2. SSL Let's Encrypt Standar (Hanya Domain Utama - Tanpa Subdomain)"
                $sslChoice = Read-Host "Pilih [1/2] (Default: 1)"
                
                if ($sslChoice -eq "2") {
                    $inputEmail = Read-Host "Email untuk SSL Let's Encrypt"
                    if (-not [string]::IsNullOrWhiteSpace($inputEmail)) { $sslEmail = $inputEmail }
                } else {
                    # Cloudflare DNS Challenge
                    $cfPrompt = "Masukkan Cloudflare API Token Anda"
                    if ($existingCFToken) { $cfPrompt += " (Kosongkan untuk menggunakan yang sudah ada: $existingCFToken)" }
                    $inputCF = Read-Host $cfPrompt
                    if ([string]::IsNullOrWhiteSpace($inputCF)) {
                        $cfToken = $existingCFToken
                    } else {
                        $cfToken = $inputCF.Trim()
                    }
                }
            } else {
                Write-Host "Opsi SSL Lokal (Hybrid):" -ForegroundColor Gray
                Write-Host " 1. SSL Internal (Bawaan Caddy - Butuh Trust Manual)"
                Write-Host " 2. Cloudflare DNS Challenge (Sertifikat Resmi - Seamless di HP)"
                $sslChoice = Read-Host "Pilih [1/2] (Default: 1)"
                
                if ($sslChoice -eq "2") {
                    $cfPrompt = "Masukkan Cloudflare API Token Anda"
                    if ($existingCFToken) { $cfPrompt += " (Kosongkan untuk menggunakan yang sudah ada: $existingCFToken)" }
                    $inputCF = Read-Host $cfPrompt
                    if ([string]::IsNullOrWhiteSpace($inputCF)) {
                        $cfToken = $existingCFToken
                    } else {
                        $cfToken = $inputCF.Trim()
                    }
                } else {
                    $inputEmail = Read-Host "Email untuk SSL Let's Encrypt (Kosongkan untuk SSL Internal)"
                    if (-not [string]::IsNullOrWhiteSpace($inputEmail)) { $sslEmail = $inputEmail }
                }
            }
        }

        # 7. License Key
        $licPrompt = "7. Masukkan Kunci Lisensi"
        if ($existingLicense) { 
            $licPrompt += " (Kosongkan untuk menggunakan yang sudah ada: $existingLicense)" 
        } else {
            $licPrompt += " (Kosongkan jika ingin registrasi baru)"
        }
        $inputLic = Read-Host $licPrompt
        if (-not [string]::IsNullOrWhiteSpace($inputLic)) { 
            $licenseKey = $inputLic.Trim() 
        } else { 
            if ($existingLicense) {
                $licenseKey = $existingLicense
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
                            
                            $resp = Invoke-RestMethod -Method Post -Uri "$LicenseServer/api/license/request" -Body $body -ContentType "application/json"
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
        }

        Write-Host "--- RINGKASAN KONFIGURASI ---" -ForegroundColor Yellow
        Write-Host " - Skenario       : $deployScenario"
        Write-Host " - Domain/Host    : $finalDomain"
        Write-Host " - Protokol       : $finalScheme"
        Write-Host " - IP LAN (Local) : $lanIp"
        Write-Host " - Port Backend   : $BackendPort"
        Write-Host " - Port Frontend  : $FrontendPort"
        Write-Host " - License Key    : $(if($licenseKey){$licenseKey}else{'Tidak Ada'})"
        Write-Host "-----------------------------" -ForegroundColor Yellow
        if ($deployScenario -eq "hybrid" -or $deployScenario -eq "saas") {
            if ($deployScenario -eq "hybrid") {
                Write-Host " INFO: Frontend akan dikonfigurasi menggunakan domain VPS ($finalDomain)" -ForegroundColor Cyan
                Write-Host "       Backend akan mengizinkan akses dari domain VPS DAN IP Lokal ($lanIp)" -ForegroundColor Cyan
            } else {
                Write-Host " INFO: Skenario SaaS terpusat. Caddy akan dikonfigurasi untuk melayani domain utama ($finalDomain) dan seluruh subdomain (*.$finalDomain)" -ForegroundColor Cyan
            }
            $setupCaddy = Read-Host " Apakah Anda ingin memasang/update Reverse Proxy (Caddy) lokal? [Y/n]"
        }
        Write-Host ""
        $confKey = Read-Host "Apakah sudah benar? [Y/n]"
        if ($confKey -eq 'n' -or $confKey -eq 'N') { } else { $confirmed = $true }
    }
} else {
    # Logic for Silent mode parameters
    if (-not [string]::IsNullOrWhiteSpace($ServerDomain)) { $finalDomain = $ServerDomain }
}

# ----------------------------------------------------
# LANGKAH Tambahan: Setup Caddy (Hybrid/SaaS)
# ----------------------------------------------------
if (($deployScenario -eq "hybrid" -or $deployScenario -eq "saas") -and ($setupCaddy -eq 'y' -or $setupCaddy -eq 'Y' -or [string]::IsNullOrWhiteSpace($setupCaddy))) {
    Install-CaddyLocal -Domain $finalDomain -FPort $FrontendPort -BPort $BackendPort -SSLEmail $sslEmail -CFToken $cfToken -DeployScenario $deployScenario
}

# ----------------------------------------------------
# LANGKAH 3: Tulis Konfigurasi ke .env
# ----------------------------------------------------
Write-Host "Menulis konfigurasi ke file .env..." -ForegroundColor Cyan

# Hitung Main Domain (misal: app.absenta.id -> absenta.id)
$calculatedMainDomain = $finalDomain
$domainParts = $finalDomain.Split('.')
if ($domainParts.Count -ge 3) {
    # Jika ada 3 bagian atau lebih (misal app.absenta.id), ambil 2 bagian terakhir sebagai main domain
    $calculatedMainDomain = "$($domainParts[-2]).$($domainParts[-1])"
}

if (-not (Test-Path "absenta_backend/.env")) { Copy-Item "absenta_backend/.env.example" "absenta_backend/.env" }
$backendEnv = Get-Content "absenta_backend/.env"
$newBackendEnv = @()

foreach ($line in $backendEnv) {
    if ($line -match "^PORT=") { $newBackendEnv += "PORT=$BackendPort" }
    elseif ($line -match "^REDIS_MODE=") { $newBackendEnv += "REDIS_MODE=$redisMode" }
    elseif ($line -match "^REDIS_URL=") { $newBackendEnv += "REDIS_URL=$redisUrl" }
    elseif ($line -match "^API_URL=") { $newBackendEnv += "API_URL=${finalScheme}://$finalDomain/api" }
    elseif ($line -match "^APP_URL=") { $newBackendEnv += "APP_URL=${finalScheme}://$finalDomain" }
    elseif ($line -match "^PUBLIC_APP_URL=") { $newBackendEnv += "PUBLIC_APP_URL=${finalScheme}://$finalDomain" }
    elseif ($line -match "^PUBLIC_INVOICE_BASE_URL=") { $newBackendEnv += "PUBLIC_INVOICE_BASE_URL=${finalScheme}://$finalDomain" }
    elseif ($line -match "^PUBLIC_APP_SCHEME=") { $newBackendEnv += "PUBLIC_APP_SCHEME=$finalScheme" }
    elseif ($line -match "^PUBLIC_DOMAIN_BASE=") { $newBackendEnv += "PUBLIC_DOMAIN_BASE=$finalDomain" }
    elseif ($line -match "^MAIN_DOMAIN=") { $newBackendEnv += "MAIN_DOMAIN=$calculatedMainDomain" }
    elseif ($line -match "^TENANT_BASE_DOMAIN=") { $newBackendEnv += "TENANT_BASE_DOMAIN=$calculatedMainDomain" }
    elseif ($line -match "^FRONTEND_URL=") { $newBackendEnv += "FRONTEND_URL=${finalScheme}://$finalDomain" }
    elseif ($line -match "^ALLOWED_LAN_IP=") { $newBackendEnv += "ALLOWED_LAN_IP=$lanIp" }
    elseif ($line -match "^LICENSE_KEY=") { $newBackendEnv += "LICENSE_KEY=$licenseKey" }
    elseif ($line -match "^CLOUDFLARE_API_TOKEN=") { $newBackendEnv += "CLOUDFLARE_API_TOKEN=$cfToken" }
    else { $newBackendEnv += $line }
}
# Pastikan variabel kritikal tertulis jika tidak ada di example
if ($newBackendEnv -notmatch "^LICENSE_KEY=") { $newBackendEnv += "LICENSE_KEY=$licenseKey" }
if ($newBackendEnv -notmatch "^CLOUDFLARE_API_TOKEN=") { $newBackendEnv += "CLOUDFLARE_API_TOKEN=$cfToken" }
if ($newBackendEnv -notmatch "^MAIN_DOMAIN=") { $newBackendEnv += "MAIN_DOMAIN=$finalDomain" }
$newBackendEnv | Set-Content "absenta_backend/.env"

if (-not (Test-Path "absenta_frontend/.env")) { Copy-Item "absenta_frontend/.env.example" "absenta_frontend/.env" }
# Frontend VITE_API_BASE_URL must be absolute for local deployments without a proxy like Caddy/Nginx
$frontendEnv = Get-Content "absenta_frontend/.env"
$newFrontendEnv = @()
$fPortFound = $false
$proxyTargetFound = $false

foreach ($line in $frontendEnv) {
    if ($line -match "^VITE_API_BASE_URL=") { 
        # Hybrid scenario: Always use public domain if provided
        if ($deployScenario -eq "hybrid" -or $deployScenario -eq "saas") {
            $newFrontendEnv += "VITE_API_BASE_URL=${finalScheme}://$finalDomain/api"
        } 
        # Pure Local scenario: Use IP/Localhost + Port
        else {
            $newFrontendEnv += "VITE_API_BASE_URL=${finalScheme}://$finalDomain`:$BackendPort/api"
        }
    }
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
Write-Host "Sinkronisasi skema database..." -ForegroundColor Cyan
npx prisma generate
npx prisma db push --accept-data-loss

Write-Host "Migrasi data tenant (subdomain)..." -ForegroundColor Cyan
node -e "const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); p.tenant.findMany({ where: { subdomain: null, domain: { not: null } } }).then(ts => Promise.all(ts.map(t => p.tenant.update({ where: { id: t.id }, data: { subdomain: t.domain.includes('.') ? t.domain.split('.')?.[0] : t.domain } })))).then(() => { console.log('Migrasi selesai.'); process.exit(0); }).catch(e => { console.error(e); process.exit(1); })"
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
$env:NODE_OPTIONS = "--max-old-space-size=4096"
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
$env:NODE_OPTIONS = "--max-old-space-size=4096"
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
