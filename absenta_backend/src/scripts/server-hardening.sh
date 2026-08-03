#!/bin/bash
# ============================================================
# ABSENTA SERVER HARDENING SCRIPT
# Membuat server robust dari WireGuard/Easy Tunnel disconnect
# Jalankan sebagai: sudo bash server-hardening.sh
# ============================================================

set -e
echo ""
echo "============================================="
echo "  ABSENTA SERVER HARDENING - Auto Recovery"
echo "============================================="
echo ""

# -------------------------------------------------------
# STEP 1: Deteksi jenis tunnel yang digunakan
# -------------------------------------------------------
echo "[1/6] Mendeteksi tunnel yang digunakan..."

TUNNEL_TYPE=""
WG_IFACE=""
EASY_TUNNEL_SERVICE=""

# Cek WireGuard interfaces
if ip link show type wireguard 2>/dev/null | grep -q "wg"; then
  WG_IFACE=$(ip link show type wireguard 2>/dev/null | grep -oP '^\d+: \K[^:]+' | head -1)
  TUNNEL_TYPE="wireguard"
  echo "  ✅ Ditemukan WireGuard interface: $WG_IFACE"
fi

# Cek EasyPanel/Easy Tunnel service
for svc in easytunnel easy-tunnel easypanel cloudflared wg-easy; do
  if systemctl list-units --type=service 2>/dev/null | grep -q "$svc"; then
    EASY_TUNNEL_SERVICE="$svc"
    TUNNEL_TYPE="easytunnel"
    echo "  ✅ Ditemukan Easy Tunnel service: $EASY_TUNNEL_SERVICE"
    break
  fi
done

# Cek /etc/wireguard configs
if [ -d /etc/wireguard ] && ls /etc/wireguard/*.conf 2>/dev/null | head -1 | grep -q ".conf"; then
  WG_CONF=$(ls /etc/wireguard/*.conf | head -1)
  WG_IFACE=$(basename "$WG_CONF" .conf)
  TUNNEL_TYPE="wireguard"
  echo "  ✅ Ditemukan WireGuard config: $WG_CONF (interface: $WG_IFACE)"
fi

echo "  Tunnel type terdeteksi: ${TUNNEL_TYPE:-'tidak diketahui'}"
echo ""

# -------------------------------------------------------
# STEP 2: Hardening systemd service absenta-backend
# -------------------------------------------------------
echo "[2/6] Hardening absenta-backend.service..."

cat > /etc/systemd/system/absenta-backend.service << 'EOF'
[Unit]
Description=Absenta Backend Service
After=network-online.target postgresql.service
Wants=network-online.target
Requires=postgresql.service

[Service]
Type=simple
User=asepsuryadi
WorkingDirectory=/var/www/project-absenta/absenta_backend
ExecStart=/usr/bin/node dist/server.js
Restart=always
RestartSec=5
StartLimitIntervalSec=60
StartLimitBurst=5

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=absenta-backend

# Environment
Environment=NODE_ENV=production
EnvironmentFile=-/var/www/project-absenta/absenta_backend/.env

[Install]
WantedBy=multi-user.target
EOF

echo "  ✅ absenta-backend.service diperbarui dengan Restart=always"

# -------------------------------------------------------
# STEP 3: Hardening Caddy service
# -------------------------------------------------------
echo "[3/6] Hardening caddy.service..."

# Override Caddy dengan restart policy yang lebih agresif
mkdir -p /etc/systemd/system/caddy.service.d
cat > /etc/systemd/system/caddy.service.d/restart-override.conf << 'EOF'
[Service]
Restart=always
RestartSec=10
StartLimitIntervalSec=120
StartLimitBurst=10
EOF

echo "  ✅ Caddy override dibuat: Restart=always setiap 10 detik"

# -------------------------------------------------------
# STEP 4: Buat WireGuard Watchdog Service
# -------------------------------------------------------
echo "[4/6] Membuat WireGuard/Tunnel watchdog..."

# Buat script watchdog
cat > /usr/local/bin/absenta-tunnel-watchdog.sh << 'WATCHDOG'
#!/bin/bash
# =====================================================
# ABSENTA TUNNEL WATCHDOG
# Memonitor koneksi WireGuard/Easy Tunnel dan restart
# jika koneksi terputus.
# =====================================================

LOG_FILE="/var/log/absenta-tunnel-watchdog.log"
MAX_LOG_SIZE=5242880  # 5MB

log() {
  # Rotate log jika > 5MB
  if [ -f "$LOG_FILE" ] && [ $(stat -c%s "$LOG_FILE" 2>/dev/null || echo 0) -gt $MAX_LOG_SIZE ]; then
    mv "$LOG_FILE" "${LOG_FILE}.1"
  fi
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

check_and_restore_wireguard() {
  local iface="$1"
  
  # Cek apakah interface WG aktif
  if ! ip link show "$iface" 2>/dev/null | grep -q "UP"; then
    log "⚠️  WireGuard interface $iface DOWN - mencoba restart..."
    
    # Restart WireGuard interface
    wg-quick down "$iface" 2>/dev/null || true
    sleep 2
    wg-quick up "$iface" 2>/dev/null
    
    if ip link show "$iface" 2>/dev/null | grep -q "UP"; then
      log "✅ WireGuard $iface berhasil di-restore"
    else
      log "❌ WireGuard $iface gagal di-restore"
    fi
    return 1
  fi
  
  # Cek handshake terakhir (jika > 3 menit, anggap dead)
  if command -v wg &>/dev/null; then
    LAST_HANDSHAKE=$(wg show "$iface" latest-handshakes 2>/dev/null | awk '{print $2}' | head -1)
    if [ -n "$LAST_HANDSHAKE" ] && [ "$LAST_HANDSHAKE" != "0" ]; then
      NOW=$(date +%s)
      DIFF=$((NOW - LAST_HANDSHAKE))
      if [ $DIFF -gt 180 ]; then
        log "⚠️  WireGuard $iface handshake terakhir ${DIFF}s lalu - mencoba reconnect..."
        wg-quick down "$iface" 2>/dev/null || true
        sleep 2
        wg-quick up "$iface" 2>/dev/null
        log "🔄 WireGuard $iface di-restart karena stale handshake"
        return 1
      fi
    fi
  fi
  
  return 0
}

check_and_restore_service() {
  local service="$1"
  
  if ! systemctl is-active --quiet "$service" 2>/dev/null; then
    log "⚠️  Service $service tidak aktif - mencoba restart..."
    systemctl restart "$service" 2>/dev/null
    sleep 3
    
    if systemctl is-active --quiet "$service"; then
      log "✅ Service $service berhasil di-restart"
    else
      log "❌ Service $service gagal di-restart"
    fi
    return 1
  fi
  return 0
}

# === MAIN CHECK ===

# 1. Cek WireGuard interfaces
for iface in $(ip link show type wireguard 2>/dev/null | grep -oP '^\d+: \K[^:]+'); do
  check_and_restore_wireguard "$iface"
done

# 2. Cek WireGuard dari /etc/wireguard configs
if [ -d /etc/wireguard ]; then
  for conf in /etc/wireguard/*.conf; do
    [ -f "$conf" ] || continue
    iface=$(basename "$conf" .conf)
    check_and_restore_wireguard "$iface"
  done
fi

# 3. Cek Easy Tunnel service (easytunnel, wg-easy, dll)
for svc in easytunnel easy-tunnel wg-easy cloudflared; do
  if systemctl list-units --type=service 2>/dev/null | grep -q "^  ${svc}"; then
    check_and_restore_service "$svc"
  fi
done

# 4. Cek Caddy
check_and_restore_service "caddy"

# 5. Cek Absenta Backend
check_and_restore_service "absenta-backend"

WATCHDOG

chmod +x /usr/local/bin/absenta-tunnel-watchdog.sh
echo "  ✅ Watchdog script dibuat: /usr/local/bin/absenta-tunnel-watchdog.sh"

# -------------------------------------------------------
# STEP 5: Buat systemd timer untuk watchdog (tiap 30 detik)
# -------------------------------------------------------
echo "[5/6] Membuat systemd timer untuk watchdog..."

# Service unit
cat > /etc/systemd/system/absenta-tunnel-watchdog.service << 'EOF'
[Unit]
Description=Absenta Tunnel & Service Watchdog
After=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/absenta-tunnel-watchdog.sh
User=root
EOF

# Timer unit (setiap 30 detik)
cat > /etc/systemd/system/absenta-tunnel-watchdog.timer << 'EOF'
[Unit]
Description=Run Absenta Tunnel Watchdog every 30 seconds
Requires=absenta-tunnel-watchdog.service

[Timer]
OnBootSec=30s
OnUnitActiveSec=30s
AccuracySec=5s
Persistent=true

[Install]
WantedBy=timers.target
EOF

echo "  ✅ Watchdog timer dibuat: setiap 30 detik"

# -------------------------------------------------------
# STEP 6: Aktifkan semua service dan timer
# -------------------------------------------------------
echo "[6/6] Mengaktifkan semua service..."

systemctl daemon-reload

systemctl enable absenta-backend
systemctl restart absenta-backend
echo "  ✅ absenta-backend: enabled & restarted"

systemctl daemon-reload
systemctl restart caddy
echo "  ✅ caddy: restarted dengan override policy"

systemctl enable absenta-tunnel-watchdog.timer
systemctl start absenta-tunnel-watchdog.timer
echo "  ✅ absenta-tunnel-watchdog.timer: enabled & started"

# Verifikasi timer aktif
echo ""
echo "=== STATUS AKHIR ==="
echo ""
echo "📌 Watchdog Timer:"
systemctl status absenta-tunnel-watchdog.timer --no-pager | grep -E "Active:|Next"

echo ""
echo "📌 Services:"
for svc in caddy absenta-backend; do
  STATUS=$(systemctl is-active "$svc" 2>/dev/null || echo "unknown")
  echo "  - $svc: $STATUS"
done

echo ""
echo "📌 Log watchdog: /var/log/absenta-tunnel-watchdog.log"
echo ""
echo "============================================="
echo "  HARDENING SELESAI! Server sekarang robust."
echo "============================================="
echo ""
echo "Watchdog akan:"
echo "  ✅ Memonitor WireGuard setiap 30 detik"
echo "  ✅ Auto-restart tunnel jika DOWN"
echo "  ✅ Deteksi stale handshake (>3 menit)"  
echo "  ✅ Auto-restart Caddy jika mati"
echo "  ✅ Auto-restart Absenta Backend jika mati"
echo ""
