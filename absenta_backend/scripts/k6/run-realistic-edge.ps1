Param(
  [string]$BaseUrl = "https://www.absenta.id",
  [string]$Email = "",
  [string]$Password = "",
  [string]$TenantIds = "",
  [string]$SessionIds = "",
  [string]$ResolveIp = "",
  [string]$HostHeader = "",
  [switch]$AllowUnsafe,
  [switch]$SkipPreflight,
  [switch]$NoClear
)

function Ensure-K6 {
  if (-not (Get-Command k6 -ErrorAction SilentlyContinue)) {
    Write-Error "k6 tidak ditemukan. Install dari https://k6.io"
    exit 1
  }
}

function Read-IfEmpty($label, [ref]$value) {
  if ([string]::IsNullOrWhiteSpace($value.Value)) {
    $value.Value = Read-Host $label
  }
}

function Read-OrKeep($label, $current) {
  $suffix = ""
  if (-not [string]::IsNullOrWhiteSpace($current)) { $suffix = " [current: $current]" }
  $v = Read-Host ($label + $suffix)
  if ([string]::IsNullOrWhiteSpace($v)) { return $current }
  return $v
}

function Read-PasswordIfEmpty([ref]$pwd) {
  if ([string]::IsNullOrWhiteSpace($pwd.Value)) {
    $sec = Read-Host "Password (disembunyikan)" -AsSecureString
    $pwd.Value = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
  }
}

function Build-EnvArgs([hashtable]$envs) {
  $args = @()
  foreach ($k in $envs.Keys) {
    $v = [string]$envs[$k]
    if (-not [string]::IsNullOrWhiteSpace($v)) {
      $args += "-e"
      $args += "$k=$v"
    }
  }
  return $args
}

function Configure-TargetAndAuth {
  if (-not $script:BaseUrl) { $script:BaseUrl = "https://www.absenta.id" }
  if ($null -eq $script:Email) { $script:Email = "" }
  if ($null -eq $script:Password) { $script:Password = "" }
  if ($null -eq $script:TenantIds) { $script:TenantIds = "" }
  if ($null -eq $script:SessionIds) { $script:SessionIds = "" }
  if ($null -eq $script:ResolveIp) { $script:ResolveIp = "" }
  if ($null -eq $script:HostHeader) { $script:HostHeader = "" }

  Write-Host ""
  Write-Host "=== Konfigurasi Target & Kredensial ===" -ForegroundColor Cyan
  Write-Host "1) Via Domain (mis. Cloudflare proxied)"
  Write-Host "2) Via IP Tunnel / Internal (langsung ke origin, biasanya http://IP:PORT)"
  Write-Host "3) Advanced (isi BaseUrl + ResolveIp + Host header manual)"
  $mode = Read-Host "Pilih mode [1-3]"

  switch ($mode) {
    '1' {
      $script:BaseUrl = Read-OrKeep "Base URL (contoh: https://absen.domain.com)" $script:BaseUrl
      $script:ResolveIp = ""
      $script:HostHeader = ""
    }
    '2' {
      $scheme = Read-OrKeep "Scheme (http/https)" "http"
      $ipPort = Read-OrKeep "IP:PORT tujuan (contoh: 10.8.0.2:3001)" ""
      if (-not [string]::IsNullOrWhiteSpace($ipPort)) {
        $script:BaseUrl = ($scheme.Trim().TrimEnd(':','/')) + "://" + $ipPort.Trim().TrimEnd('/')
      } else {
        $script:BaseUrl = Read-OrKeep "Base URL (contoh: http://10.8.0.2:3001)" $script:BaseUrl
      }
      $script:ResolveIp = ""
      $script:HostHeader = ""
    }
    Default {
      $script:BaseUrl = Read-OrKeep "Base URL (contoh: https://www.absenta.id)" $script:BaseUrl
      $script:ResolveIp = Read-OrKeep "Override IP tujuan (opsional, contoh: 203.0.113.10)" $script:ResolveIp
      if (-not [string]::IsNullOrWhiteSpace($script:ResolveIp)) {
        $script:HostHeader = Read-OrKeep "Host header (misal: www.absenta.id)" $script:HostHeader
      } else {
        $script:HostHeader = ""
      }
    }
  }

  $script:Email = Read-OrKeep "Email (boleh kosong untuk tanpa token)" $script:Email
  if (-not [string]::IsNullOrWhiteSpace($script:Email)) {
    if ([string]::IsNullOrWhiteSpace($script:Password)) {
      [ref]$PwdRef = [ref]$script:Password
      Read-PasswordIfEmpty $PwdRef
    } else {
      $pw = Read-Host "Password (kosongkan untuk tetap pakai yang tersimpan)"
      if (-not [string]::IsNullOrWhiteSpace($pw)) { $script:Password = $pw }
    }
  } else {
    $script:Password = ""
  }

  $script:TenantIds = Read-OrKeep "TENANT_IDS (opsional, koma-sep)" $script:TenantIds
  $script:SessionIds = Read-OrKeep "SESSION_IDS (opsional, koma-sep)" $script:SessionIds
}

function Run-Scenario($name, $rates) {
  $scriptPath = Join-Path $PSScriptRoot "realistic_absenta_edge.js"
  $ts = Get-Date -Format "yyyyMMdd_HHmmss"
  $safeName = ($name -replace '[^a-zA-Z0-9_-]', '_')
  $outDir = Join-Path $PSScriptRoot ("results\" + $ts + "_" + $safeName)
  New-Item -ItemType Directory -Force -Path $outDir | Out-Null
  $summaryPath = Join-Path $outDir "summary.json"
  $logPath = Join-Path $outDir "console.log"

  $envs = @{
    "K6_BASE_URL"  = $script:BaseUrl
    "K6_EMAIL"     = $script:Email
    "K6_PASSWORD"  = $script:Password
    "K6_TENANT_IDS"= $script:TenantIds
    "K6_SESSION_IDS"= $script:SessionIds
    "K6_RESOLVE_IP" = $script:ResolveIp
    "K6_HOST"      = $script:HostHeader
    "K6_PREFLIGHT" = ($(if ($script:SkipPreflight) { "false" } else { "true" }))
    "K6_GATE_RATE" = $rates.GateRate
    "K6_GATE_DURATION" = $rates.GateDuration
    "K6_SESI_RATE" = $rates.SesiRate
    "K6_SESI_DURATION" = $rates.SesiDuration
    "K6_PULANG_RATE" = $rates.PulangRate
    "K6_PULANG_DURATION" = $rates.PulangDuration
    "K6_PHASE2_START" = $rates.Phase2Start
    "K6_PHASE3_START" = $rates.Phase3Start
    "K6_PRE_VUS"   = $rates.PreVus
    "K6_MAX_VUS"   = $rates.MaxVus
    "K6_GATE_FIRST_IN_SESI" = $rates.GateFirstInSesi
    "K6_TOTAL_SISWA" = $rates.TotalSiswa
    "K6_HOT_POOL_SIZE" = $rates.HotPoolSize
    "K6_DUP_RATIO" = $rates.DupRatio
  }
  $args = Build-EnvArgs $envs

  Write-Host "=== Menjalankan varian: $name ===" -ForegroundColor Cyan
  Write-Host ("Base URL         : {0}" -f $script:BaseUrl)
  if ($script:TenantIds) { Write-Host ("Tenant IDs       : {0}" -f $script:TenantIds) }
  if ($script:SessionIds){ Write-Host ("Session IDs      : {0}" -f $script:SessionIds) }
  Write-Host ("Gate   : {0} rps x {1}" -f $rates.GateRate, $rates.GateDuration)
  Write-Host ("Sesi   : {0} rps x {1}" -f $rates.SesiRate, $rates.SesiDuration)
  Write-Host ("Pulang : {0} rps x {1}" -f $rates.PulangRate, $rates.PulangDuration)
  Write-Host ("VUs    : pre={0}, max={1}" -f $rates.PreVus, $rates.MaxVus)
  Write-Host ("Output : {0}" -f $outDir) -ForegroundColor Yellow
  if ($script:ResolveIp) { Write-Host ("Resolve IP       : {0}" -f $script:ResolveIp) }
  if ($script:HostHeader) { Write-Host ("Host header      : {0}" -f $script:HostHeader) }
  Write-Host ""

  $k6Args = @(
    "run",
    $scriptPath,
    "--summary-export",
    $summaryPath,
    "--tag",
    ("scenario=" + $safeName)
  ) + $args

  & k6 @k6Args 2>&1 | Tee-Object -FilePath $logPath
  if ($LASTEXITCODE -ne 0) {
    Write-Host ("k6 exit code: {0}" -f $LASTEXITCODE) -ForegroundColor Red
  } else {
    Write-Host ("Selesai. Summary: {0}" -f $summaryPath) -ForegroundColor Green
    Write-Host ("Log     : {0}" -f $logPath) -ForegroundColor Green
  }

  $script:LastOutDir = $outDir
  $script:LastSummaryPath = $summaryPath
  $script:LastLogPath = $logPath

  Write-Host ""
  Read-Host "Tekan Enter untuk kembali ke menu"
}

function Menu {
  if (-not $script:NoClearMenu) { Clear-Host }
  Write-Host "=== K6 Absenta Edge Load Test ===`n" -ForegroundColor Green
  $targetLine = $script:BaseUrl
  if ($script:ResolveIp) { $targetLine = ($targetLine + " (via IP: " + $script:ResolveIp + ")") }
  if ($script:HostHeader) { $targetLine = ($targetLine + " host=" + $script:HostHeader) }
  Write-Host "Target aktif: $targetLine"
  Write-Host "0) Konfigurasi target & kredensial"
  Write-Host "1) Baseline (ringan)"
  Write-Host "2) Peak (menengah)"
  Write-Host "3) Stress (berat)"
  Write-Host "4) Gate-only (tanpa sesi)"
  Write-Host "5) Session-heavy (sesi dominan)"
  Write-Host "6) Custom (isi angka sendiri)"
  Write-Host "7) Buka folder hasil terakhir"
  Write-Host "8) Tampilkan lokasi hasil terakhir"
  Write-Host "9) Keluar"
  $choice = Read-Host "Pilih [0-9]"
  return $choice
}

# --- ENTRY ---
Ensure-K6

# Jangan clear screen kalau diminta (biar hasil k6 tidak hilang)
$script:NoClearMenu = $NoClear.IsPresent

$script:BaseUrl = $BaseUrl
$script:Email = $Email
$script:Password = $Password
$script:TenantIds = $TenantIds
$script:SessionIds = $SessionIds
$script:ResolveIp = $ResolveIp
$script:HostHeader = $HostHeader
$script:SkipPreflight = $SkipPreflight.IsPresent

Configure-TargetAndAuth

while ($true) {
  $opt = Menu
  switch ($opt) {
    '0' {
      Configure-TargetAndAuth
    }
    '1' {
      $r = @{
        GateRate=50; GateDuration='3m';
        SesiRate=20; SesiDuration='3m';
        PulangRate=40; PulangDuration='3m';
        Phase2Start='3m'; Phase3Start='6m';
        PreVus=200; MaxVus=2000;
        GateFirstInSesi='true'; TotalSiswa=2000; HotPoolSize=150; DupRatio=0.1
      }
      Run-Scenario "Baseline" $r
    }
    '2' {
      $r = @{
        GateRate=200; GateDuration='5m';
        SesiRate=100; SesiDuration='5m';
        PulangRate=150; PulangDuration='5m';
        Phase2Start='5m'; Phase3Start='10m';
        PreVus=800; MaxVus=8000;
        GateFirstInSesi='true'; TotalSiswa=5000; HotPoolSize=300; DupRatio=0.12
      }
      Run-Scenario "Peak" $r
    }
    '3' {
      if (-not $AllowUnsafe.IsPresent) {
        Write-Host "Mode Stress dinonaktifkan untuk keamanan. Jalankan ulang dengan -AllowUnsafe jika memang ini environment test milik Anda." -ForegroundColor Yellow
        Start-Sleep -Seconds 2
        break
      }
      $r = @{
        GateRate=300; GateDuration='5m';
        SesiRate=150; SesiDuration='5m';
        PulangRate=250; PulangDuration='5m';
        Phase2Start='5m'; Phase3Start='10m';
        PreVus=800; MaxVus=8000;
        GateFirstInSesi='true'; TotalSiswa=10000; HotPoolSize=800; DupRatio=0.15
      }
      Run-Scenario "Stress" $r
    }
    '4' {
      # Gate-only: tetap aktifkan skenario sesi tapi SESSION_IDS dibiarkan kosong agar fungsi sesi auto-skip
      $r = @{
        GateRate=300; GateDuration='6m';
        SesiRate=200; SesiDuration='6m';
        PulangRate=300; PulangDuration='6m';
        Phase2Start='6m'; Phase3Start='12m';
        PreVus=600; MaxVus=6000;
        GateFirstInSesi='false'; TotalSiswa=4000; HotPoolSize=200; DupRatio=0.1
      }
      Run-Scenario "Gate-only" $r
    }
    '5' {
      $r = @{
        GateRate=150; GateDuration='6m';
        SesiRate=400; SesiDuration='6m';
        PulangRate=150; PulangDuration='6m';
        Phase2Start='2m'; Phase3Start='8m';
        PreVus=800; MaxVus=8000;
        GateFirstInSesi='true'; TotalSiswa=6000; HotPoolSize=400; DupRatio=0.2
      }
      Run-Scenario "Session-heavy" $r
    }
    '6' {
      $r = @{
        GateRate     = [int](Read-Host "Gate rate (rps)")
        GateDuration = Read-Host "Gate duration (e.g. 5m)"
        SesiRate     = [int](Read-Host "Sesi rate (rps)")
        SesiDuration = Read-Host "Sesi duration (e.g. 5m)"
        PulangRate   = [int](Read-Host "Pulang rate (rps)")
        PulangDuration = Read-Host "Pulang duration (e.g. 5m)"
        Phase2Start  = Read-Host "Phase2 start (e.g. 5m)"
        Phase3Start  = Read-Host "Phase3 start (e.g. 10m)"
        PreVus       = [int](Read-Host "Pre-allocated VUs")
        MaxVus       = [int](Read-Host "Max VUs")
        GateFirstInSesi = (Read-Host "Gate pre-tap in sesi? [true/false]")
        TotalSiswa   = [int](Read-Host "Total siswa (dataset)")
        HotPoolSize  = [int](Read-Host "Hot pool size")
        DupRatio     = [double](Read-Host "Dup ratio (0..1)")
      }
      Run-Scenario "Custom" $r
    }
    '7' {
      if ($script:LastOutDir -and (Test-Path $script:LastOutDir)) {
        Invoke-Item $script:LastOutDir
      } else {
        Write-Host "Belum ada hasil test tersimpan." -ForegroundColor Yellow
        Start-Sleep -Seconds 1
      }
    }
    '8' {
      if ($script:LastOutDir) {
        Write-Host ("Hasil terakhir: {0}" -f $script:LastOutDir) -ForegroundColor Yellow
        if ($script:LastSummaryPath) { Write-Host ("Summary: {0}" -f $script:LastSummaryPath) }
        if ($script:LastLogPath) { Write-Host ("Log    : {0}" -f $script:LastLogPath) }
        Write-Host ""
        Read-Host "Tekan Enter"
      } else {
        Write-Host "Belum ada hasil test tersimpan." -ForegroundColor Yellow
        Start-Sleep -Seconds 1
      }
    }
    '9' { break }
    Default { Write-Host "Pilihan tidak dikenal."; Start-Sleep -Seconds 1 }
  }
}
