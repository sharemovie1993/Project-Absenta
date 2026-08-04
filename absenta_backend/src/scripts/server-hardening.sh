#!/bin/bash
# ============================================================
# ABSENTA TUNNEL WATCHDOG v2
# Monitor WireGuard et-smkn1pld + PM2 + Caddy
# Auto-recovery jika tunnel/service disconnect
# Dijalankan oleh: absenta-tunnel-watchdog.timer (setiap 30 detik)
# Log: /var/log/absenta-tunnel-watchdog.log
# ============================================================

LOG_FILE="/var/log/absenta-tunnel-watchdog.log"
MAX_LOG_SIZE=5242880  # 5MB - auto rotate

# Interface WireGuard Easy Tunnel Absenta
ET_IFACE="et-smkn1pld"
# Endpoint VPS publik (untuk ping test)
ET_PEER_IP="10.0.0.1"
# Batas stale handshake (detik)
STALE_HANDSHAKE_SECS=180

log() {
  # Rotate log jika > 5MB
  if [ -f "$LOG_FILE" ] && [ "$(stat -c%s "$LOG_FILE" 2>/dev/null || echo 0)" -gt $MAX_LOG_SIZE ]; then
    mv "$LOG_FILE" "${LOG_FILE}.1"
    touch "$LOG_FILE"
  fi
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# -------------------------------------------------------
# Fungsi: Cek dan restore WireGuard et-smkn1pld
# -------------------------------------------------------
check_wireguard() {
  local iface="$ET_IFACE"
  local repaired=0

  # 1. Cek apakah interface exist dan UP
  if ! ip link show "$iface" 2>/dev/null | grep -q "UP"; then
    log "⚠️  WireGuard $iface DOWN atau tidak ada - mencoba restore via absenta deployer..."
    
    # Coba restart via absenta deployer jika ada
    if [ -f /var/www/project-absenta/deployer/restart-tunnel.sh ]; then
      bash /var/www/project-absenta/deployer/restart-tunnel.sh
    fi
    
    # Jika masih tidak ada, coba bawa up langsung via ip link
    if ! ip link show "$iface" 2>/dev/null | grep -q "UP"; then
      ip link set "$iface" up 2>/dev/null || true
    fi
    
    sleep 3
    
    if ip link show "$iface" 2>/dev/null | grep -q "UP"; then
      log "✅ WireGuard $iface berhasil di-restore (interface UP)"
      repaired=1
    else
      log "❌ WireGuard $iface tidak bisa di-restore otomatis - perlu intervensi manual"
    fi
    return $repaired
  fi

  # 2. Cek handshake terakhir (jika > STALE_HANDSHAKE_SECS, anggap stale)
  if command -v wg &>/dev/null; then
    local last_hs
    last_hs=$(wg show "$iface" latest-handshakes 2>/dev/null | awk '{print $2}' | head -1)
    
    if [ -n "$last_hs" ] && [ "$last_hs" != "0" ]; then
      local now diff
      now=$(date +%s)
      diff=$((now - last_hs))
      
      if [ "$diff" -gt "$STALE_HANDSHAKE_SECS" ]; then
        log "⚠️  WireGuard $iface stale handshake (${diff}s lalu > ${STALE_HANDSHAKE_SECS}s) - mencoba reconnect..."
        
        # Trigger handshake baru dengan ping ke peer
        ping -c 3 -W 5 "$ET_PEER_IP" &>/dev/null || true
        sleep 5
        
        # Cek lagi handshake setelah ping
        local new_hs new_diff
        new_hs=$(wg show "$iface" latest-handshakes 2>/dev/null | awk '{print $2}' | head -1)
        new_diff=$((now - new_hs))
        
        if [ "$new_diff" -lt "$diff" ]; then
          log "✅ WireGuard $iface handshake diperbarui (${new_diff}s lalu)"
          repaired=1
        else
          log "❌ WireGuard $iface handshake masih stale - koneksi mungkin bermasalah"
        fi
      fi
    fi
  fi
  
  # 3. Cek konektivitas ke peer tunnel
  if ! ping -c 2 -W 5 "$ET_PEER_IP" &>/dev/null; then
    log "⚠️  Tidak bisa ping peer $ET_PEER_IP melalui $iface - tunnel mungkin putus"
    # Log tapi tidak restart karena mungkin firewall yang blokir ping
  fi
  
  return 0
}

# -------------------------------------------------------
# Fungsi: Cek dan restore PM2 processes
# -------------------------------------------------------
check_pm2() {
  # Cek apakah PM2 daemon berjalan
  if ! pgrep -x PM2 &>/dev/null && ! pgrep -f "pm2" &>/dev/null; then
    log "⚠️  PM2 daemon tidak berjalan - mencoba resurrect..."
    su - asepsuryadi -c "pm2 resurrect" 2>/dev/null || true
    sleep 5
    
    if pgrep -f "pm2" &>/dev/null; then
      log "✅ PM2 berhasil di-resurrect"
    else
      log "❌ PM2 gagal di-resurrect"
    fi
    return 1
  fi
  
  # Cek absenta-api apakah ada yang errored
  local errored
  errored=$(su - asepsuryadi -c "pm2 jlist 2>/dev/null" | python3 -c "
import json, sys
try:
    processes = json.load(sys.stdin)
    errored = [p['name'] for p in processes if p.get('pm2_env', {}).get('status') == 'errored']
    print(','.join(errored))
except:
    print('')
" 2>/dev/null)
  
  if [ -n "$errored" ]; then
    log "⚠️  PM2 processes dalam status errored: $errored - mencoba restart..."
    su - asepsuryadi -c "pm2 restart errored 2>/dev/null || pm2 restart all" 2>/dev/null || true
    sleep 3
    log "🔄 PM2 processes di-restart"
    return 1
  fi
  
  return 0
}

# -------------------------------------------------------
# Fungsi: Cek dan restore Caddy
# -------------------------------------------------------
check_caddy() {
  if ! systemctl is-active --quiet caddy 2>/dev/null; then
    log "⚠️  Caddy tidak aktif - mencoba restart..."
    systemctl restart caddy 2>/dev/null
    sleep 3
    
    if systemctl is-active --quiet caddy; then
      log "✅ Caddy berhasil di-restart"
    else
      log "❌ Caddy gagal di-restart"
    fi
    return 1
  fi
  return 0
}

# -------------------------------------------------------
# Fungsi: Cek konektivitas HTTP lokal
# -------------------------------------------------------
check_http() {
  # Cek apakah backend merespons
  local http_code
  http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://127.0.0.1:3003/api/health 2>/dev/null || echo "000")
  
  if [ "$http_code" = "000" ]; then
    log "⚠️  Backend tidak merespons di port 3003 - mencoba restart PM2..."
    su - asepsuryadi -c "pm2 restart absenta-api:3003 2>/dev/null" || true
    sleep 5
    
    http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://127.0.0.1:3003/api/health 2>/dev/null || echo "000")
    if [ "$http_code" != "000" ]; then
      log "✅ Backend merespons kembali (HTTP $http_code)"
    else
      log "❌ Backend masih tidak merespons setelah restart"
    fi
  fi
}

# ================================================================
# MAIN EXECUTION
# ================================================================

# Hanya log jika ada masalah (tidak log setiap 30 detik jika normal)
WG_OK=0
PM2_OK=0
CADDY_OK=0

check_wireguard && WG_OK=1
check_pm2 && PM2_OK=1
check_caddy && CADDY_OK=1

# Log status setiap 5 menit (setiap 10 kali run) untuk monitoring
COUNTER_FILE="/tmp/absenta-watchdog-counter"
COUNTER=0
if [ -f "$COUNTER_FILE" ]; then
  COUNTER=$(cat "$COUNTER_FILE" 2>/dev/null || echo 0)
fi
COUNTER=$((COUNTER + 1))
echo "$COUNTER" > "$COUNTER_FILE"

if [ "$COUNTER" -ge 10 ]; then
  echo "0" > "$COUNTER_FILE"
  # Status log setiap ~5 menit
  WG_STATUS="UP"
  ip link show "$ET_IFACE" 2>/dev/null | grep -q "UP" || WG_STATUS="DOWN"
  LAST_HS=$(wg show "$ET_IFACE" latest-handshakes 2>/dev/null | awk '{print $2}' | head -1)
  NOW=$(date +%s)
  HS_AGO="N/A"
  if [ -n "$LAST_HS" ] && [ "$LAST_HS" != "0" ]; then
    HS_AGO="$((NOW - LAST_HS))s"
  fi
  log "📊 STATUS: WG=$WG_STATUS (last_hs: ${HS_AGO}), Caddy=$(systemctl is-active caddy 2>/dev/null), PM2=$(pgrep -x PM2 &>/dev/null && echo running || echo dead)"
fi
