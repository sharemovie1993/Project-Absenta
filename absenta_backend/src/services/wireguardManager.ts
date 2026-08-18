import { execSync, exec } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

// Letakkan folder tunnels di root project absenta_backend
const TUNNELS_DIR = path.join(__dirname, '../../../tunnels');

const WINDOWS_WG_PATH = 'C:\\Program Files\\WireGuard\\wireguard.exe';
const WIREGUARD_INSTALLER_URL = 'https://download.wireguard.com/windows-client/wireguard-installer.exe';

export interface TunnelStatus {
  status: 'connected' | 'disconnected' | 'not_configured' | 'error';
  wg_ip?: string;
  message?: string;
}

export class WireguardManager {
  static isWindows(): boolean {
    return os.platform() === 'win32';
  }

  static isAdmin(): boolean {
    try {
      execSync('net session', { stdio: 'pipe', windowsHide: true });
      return true;
    } catch {
      return false;
    }
  }

  static ensureTunnelsDir(): void {
    if (!fs.existsSync(TUNNELS_DIR)) {
      fs.mkdirSync(TUNNELS_DIR, { recursive: true });
    }
  }

  static isWireGuardInstalled(): boolean {
    if (this.isWindows()) {
      return fs.existsSync(WINDOWS_WG_PATH);
    } else {
      try {
        execSync('which wg-quick', { stdio: 'pipe', windowsHide: true });
        return true;
      } catch {
        return false;
      }
    }
  }

  /** Auto-install WireGuard jika belum ada (Windows & Linux) */
  static async installWireGuard(): Promise<{ success: boolean; message: string }> {
    if (this.isWireGuardInstalled()) {
      return { success: true, message: 'WireGuard sudah terinstall.' };
    }

    if (!this.isWindows()) {
      // Jalankan instalasi otomatis pada Linux (Debian/Ubuntu)
      return new Promise((resolve) => {
        console.log('[WG] Installing WireGuard on Linux (apt-get)...');
        exec(
          'export DEBIAN_FRONTEND=noninteractive && sudo -n apt-get update -y && sudo -n apt-get install -y wireguard openresolv',
          { timeout: 180000 },
          (err) => {
            if (err) {
              console.error('[WG] Linux auto-install error:', err);
              resolve({
                success: false,
                message: 'Gagal menginstal WireGuard secara otomatis. Silakan jalankan perintah ini manual di terminal server Anda: sudo apt-get update && sudo apt-get install -y wireguard. Error: ' + err.message
              });
              return;
            }
            resolve({ success: true, message: 'WireGuard (wg-quick) berhasil diinstal di Linux secara otomatis!' });
          }
        );
      });
    }

    const tmpInstaller = path.join(os.tmpdir(), 'wireguard-installer.exe');
    return new Promise((resolve) => {
      console.log('[WG] Downloading WireGuard installer...');
      exec(
        `powershell -Command "Invoke-WebRequest -Uri '${WIREGUARD_INSTALLER_URL}' -OutFile '${tmpInstaller}'"`,
        { timeout: 120000, windowsHide: true },
        (downloadErr) => {
          if (downloadErr) {
            resolve({ success: false, message: 'Gagal download installer WireGuard: ' + downloadErr.message });
            return;
          }

          console.log('[WG] Running WireGuard installer (silent)...');
          exec(`"${tmpInstaller}" /S`, { timeout: 120000, windowsHide: true }, (installErr) => {
            if (installErr) {
              resolve({ success: false, message: 'Gagal install WireGuard: ' + installErr.message });
              return;
            }
            resolve({ success: true, message: 'WireGuard berhasil diinstall!' });
          });
        }
      );
    });
  }

  /** Dapatkan nama service dari slug */
  static serviceName(slug: string): string {
    return `WireGuardTunnel$et-${slug}`;
  }

  /** Dapatkan path .conf dari slug — SELALU mengarah ke tunnels/ sebagai satu-satunya sumber kebenaran */
  static confPath(slug: string): string {
    this.ensureTunnelsDir();
    return path.join(TUNNELS_DIR, `et-${slug}.conf`);
  }

  /** Path symlink di /etc/wireguard/ — hanya untuk keperluan systemd & wg-quick by-name */
  static etcConfPath(slug: string): string {
    return `/etc/wireguard/et-${slug}.conf`;
  }

  /** Tulis file konfigurasi WireGuard ke disk dengan PersistentKeepalive = 25 hardening */
  static writeConfig(slug: string, configContent: string): string {
    this.ensureTunnelsDir();
    const confPath = this.confPath(slug);

    // Hardening: Ensure PersistentKeepalive = 25 is present in [Peer] section to prevent NAT timeout & auto-reconnect on disconnect
    let hardenedConfig = configContent;
    if (/\[Peer\]/i.test(hardenedConfig) && !/PersistentKeepalive/i.test(hardenedConfig)) {
      hardenedConfig = hardenedConfig.replace(/(\[Peer\][\s\S]*?)(?=\n\[|\s*$)/gi, '$1\nPersistentKeepalive = 25\n');
    }
    // Mencegah error "RTNETLINK answers: File exists" saat multi-tunnel aktif di Linux
    if (!this.isWindows() && !/Table\s*=/i.test(hardenedConfig)) {
      hardenedConfig = hardenedConfig.replace(/\[Interface\]/i, '[Interface]\nTable = off\nPostUp = ip -4 route replace 10.0.0.1/32 dev %i 2>/dev/null || true');
    }

    fs.writeFileSync(confPath, hardenedConfig, { encoding: 'utf8', mode: 0o600 });
    if (!this.isWindows()) {
      try {
        fs.chmodSync(confPath, 0o600);
        execSync(`sudo chmod 600 "${confPath}"`, { stdio: 'pipe' });
      } catch {}

      // Buat symlink di /etc/wireguard/ agar systemctl wg-quick@<iface> & wg-quick up <name> bekerja
      // Gunakan ln -sf sehingga jika sudah ada file/symlink lama, otomatis diganti
      try {
        const etcPath = this.etcConfPath(slug);
        execSync(`sudo ln -sf "${confPath}" "${etcPath}"`, { stdio: 'pipe' });
        console.log(`[WG] Symlink created: ${etcPath} -> ${confPath}`);
      } catch (e: any) {
        console.warn(`[WG] Gagal membuat symlink /etc/wireguard/: ${e.message}`);
      }
    }
    console.log(`[WG] Config written with 0600 perms & PersistentKeepalive=25: ${confPath}`);
    return confPath;
  }

  /** Hapus file konfigurasi (sumber di tunnels/) DAN symlink di /etc/wireguard/ */
  static deleteConfig(slug: string): void {
    // 1. Hapus file sumber di tunnels/
    const confPath = this.confPath(slug);
    if (fs.existsSync(confPath)) {
      fs.unlinkSync(confPath);
      console.log(`[WG] Config deleted: ${confPath}`);
    }
    // 2. Hapus symlink atau file sisa di /etc/wireguard/ (Linux only)
    if (!this.isWindows()) {
      try {
        const etcPath = this.etcConfPath(slug);
        execSync(`sudo rm -f "${etcPath}"`, { stdio: 'pipe' });
        console.log(`[WG] /etc/wireguard symlink/file removed: ${etcPath}`);
      } catch {}
    }
  }

  /** Cek status tunnel spesifik */
  static getStatus(slug: string): TunnelStatus {
    const confPath = this.confPath(slug);

    if (!fs.existsSync(confPath)) {
      return { status: 'not_configured', message: 'File konfigurasi belum ada.' };
    }

    try {
      if (this.isWindows()) {
        const svcName = this.serviceName(slug);
        try {
          const out = execSync(`sc query "${svcName}"`, { stdio: 'pipe', windowsHide: true }).toString();
          const wgIp = this.readIpFromConf(confPath);
          if (out.includes('RUNNING')) return { status: 'connected', wg_ip: wgIp };
          return { status: 'disconnected', wg_ip: wgIp };
        } catch {
          return { status: 'disconnected', wg_ip: this.readIpFromConf(confPath) };
        }
      } else {
        const ifName = `et-${slug}`;
        try {
          execSync(`ip link show ${ifName}`, { stdio: 'pipe', windowsHide: true });

          // Hardening: Verify handshake staleness on Linux
          try {
            const wgOut = execSync(`sudo wg show ${ifName} latest-handshakes`, { stdio: 'pipe' }).toString();
            const match = wgOut.match(/\s+(\d+)\s*$/);
            if (match) {
              const lastHandshakeSec = parseInt(match[1], 10);
              const nowSec = Math.floor(Date.now() / 1000);
              // If handshake is > 180 seconds (3 minutes) old and non-zero, treat as stale / disconnected
              if (lastHandshakeSec > 0 && (nowSec - lastHandshakeSec) > 180) {
                console.warn(`[WG-Status] Interface ${ifName} handshake stale (${nowSec - lastHandshakeSec}s old).`);
                return { status: 'disconnected', wg_ip: this.readIpFromConf(confPath), message: 'Koneksi terputus (Handshake Stale)' };
              }
            }
          } catch {}

          return { status: 'connected', wg_ip: this.readIpFromConf(confPath) };
        } catch {
          return { status: 'disconnected', wg_ip: this.readIpFromConf(confPath) };
        }
      }
    } catch (err: any) {
      return { status: 'error', message: err.message };
    }
  }

  /** Baca IP client dari file .conf */
  static readIpFromConf(confPath: string): string {
    try {
      const content = fs.readFileSync(confPath, 'utf8');
      const match = content.match(/Address\s*=\s*([0-9.]+)/i);
      return match ? match[1] : '';
    } catch {
      return '';
    }
  }

  /** Jalankan Caddy Reverse Proxy otomatis di Windows Dev jika Port 443 belum aktif */
  static ensureWindowsCaddyRunning(slug: string): void {
    if (!this.isWindows()) return;

    // Cek apakah Port 443 sudah mendengarkan (Caddy/Server sudah running)
    try {
      const testCmd = `powershell -Command "(Test-NetConnection -ComputerName 127.0.0.1 -Port 443).TcpTestSucceeded"`;
      const testOut = execSync(testCmd, { stdio: 'pipe', windowsHide: true }).toString().trim();
      if (testOut === 'True') {
        console.log('[WG-Caddy] Port 443 sudah MENDENGARKAN di Windows.');
        return;
      }
    } catch {}

    // Cari caddy.exe dengan urutan prioritas:
    // 1. Path di dalam Project Absenta (project root / bin)
    // 2. Fallback ke toolkit Deployer (deployer/caddy-bin/caddy.exe)
    const candidatePaths = [
      path.join(__dirname, '../../../caddy.exe'),
      path.join(__dirname, '../../../bin/caddy.exe'),
      path.join(process.cwd(), 'caddy.exe'),
      path.join(process.cwd(), 'bin/caddy.exe'),
      path.join(__dirname, '../../../../deployer/caddy-bin/caddy.exe'),
      'd:\\BarayaProject\\deployer\\caddy-bin\\caddy.exe',
      path.join(process.cwd(), '../deployer/caddy-bin/caddy.exe')
    ];

    let caddyExe = candidatePaths.find(p => fs.existsSync(p));
    
    // Cek jika caddy terinstall di PATH Windows
    if (!caddyExe) {
      try {
        const whichOut = execSync('where caddy 2>nul', { stdio: 'pipe', windowsHide: true }).toString().trim().split('\r\n')[0];
        if (whichOut && fs.existsSync(whichOut)) {
          caddyExe = whichOut;
        }
      } catch {}
    }

    if (!caddyExe) {
      console.warn('[WG-Caddy] Binary caddy.exe tidak ditemukan.');
      return;
    }

    const confPath = this.confPath(slug);
    let localPort = 5173;
    try {
      const content = fs.readFileSync(confPath, 'utf8');
      const match = content.match(/#\s*LocalPort\s*=\s*(\d+)/i);
      if (match) localPort = parseInt(match[1], 10);
    } catch {}

    const backendPort = process.env.PORT || '3004';
    const caddyfilePath = path.join(os.tmpdir(), 'Caddyfile.absenta.dev');
    const caddyConfig = `
:80, :443 {
    tls internal
    reverse_proxy /api/* localhost:${backendPort}
    reverse_proxy /* localhost:${localPort}
}
`.trim();

    fs.writeFileSync(caddyfilePath, caddyConfig, 'utf8');

    try {
      const { spawn } = require('child_process');
      const child = spawn(caddyExe, ['run', '--config', caddyfilePath], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true
      });
      child.unref();
      console.log(`[WG-Caddy] Otomatis menjalankan Caddy reverse proxy di Windows Dev (Port 443 -> localhost:${localPort})`);
    } catch (e: any) {
      console.warn('[WG-Caddy] Gagal menjalankan Caddy:', e.message);
    }
  }

  /** Mematikan Caddy Reverse Proxy di Windows Dev agar tidak ada proses menggantung */
  static stopWindowsCaddy(): void {
    if (!this.isWindows()) return;
    try {
      execSync('taskkill /F /IM caddy.exe 2>nul', { stdio: 'pipe', windowsHide: true });
      console.log('[WG-Caddy] Berhasil mematikan proses caddy.exe di Windows.');
    } catch {}
  }

  /**
   * Pengelola Multi-Tunnel Coexistence.
   * Catatan: Auto-kill switch enforceSingleActiveTunnel telah dinonaktifkan karena subnet mask /32
   * kini mengizinkan multiple interface et-* berjalan bersamaan secara simultan tanpa bentrok rute.
   */
  static enforceSingleActiveTunnel(_activeSlug: string): void {
    // No-op: Subnet mask /32 host routing allows concurrent multi-tunnel coexistence cleanly.
  }

  /** Aktifkan tunnel */
  static async startTunnel(slug: string): Promise<{ success: boolean; message: string }> {
    const confPath = this.confPath(slug);

    if (!fs.existsSync(confPath)) {
      throw new Error('File konfigurasi VPN tidak ditemukan. Silakan setup tunnel terlebih dahulu.');
    }

    if (!this.isWireGuardInstalled()) {
      throw new Error('WireGuard belum terinstall. Gunakan tombol "Install WireGuard" terlebih dahulu.');
    }

    if (this.isWindows()) {
      const svcName = this.serviceName(slug);

      if (!this.isAdmin()) {
        const psCode = `
          Start-Process "${WINDOWS_WG_PATH}" -ArgumentList '/uninstalltunnelservice','et-${slug}' -Wait
          Start-Sleep -Seconds 1
          Start-Process "${WINDOWS_WG_PATH}" -ArgumentList '/installtunnelservice','${confPath}' -Wait
          $svc = Get-Service -Name '${svcName}' -ErrorAction SilentlyContinue
          if ($svc -and $svc.Status -ne 'Running') {
              Start-Service -Name '${svcName}'
          }
        `.trim();
        const codeBuffer = Buffer.from(psCode, 'utf16le');
        const codeBase64 = codeBuffer.toString('base64');
        const outerCode = `Start-Process powershell -ArgumentList "-NoProfile -WindowStyle Hidden -EncodedCommand ${codeBase64}" -Verb RunAs -Wait`;
        const outerBuffer = Buffer.from(outerCode, 'utf16le');
        const outerBase64 = outerBuffer.toString('base64');
        return new Promise((resolve, reject) => {
          exec(`powershell -NoProfile -EncodedCommand ${outerBase64}`, { windowsHide: true }, (err) => {
            if (err) {
              reject(new Error('Gagal mengaktifkan Tunnel VPN: UAC ditolak atau dibatalkan.'));
            } else {
              resolve({ success: true, message: 'Tunnel VPN berhasil diaktifkan.' });
            }
          });
        });
      }

      try { execSync(`"${WINDOWS_WG_PATH}" /uninstalltunnelservice "et-${slug}"`, { stdio: 'pipe', windowsHide: true }); } catch {}
      execSync(`"${WINDOWS_WG_PATH}" /installtunnelservice "${confPath}"`, { stdio: 'pipe', windowsHide: true });
      
      let started = false;
      let lastErr: any = null;
      for (let i = 0; i < 5; i++) {
        try {
          try {
            const queryOut = execSync(`sc query "${svcName}"`, { stdio: 'pipe', windowsHide: true }).toString();
            if (queryOut.includes('RUNNING')) {
              started = true;
              break;
            }
          } catch {}

          execSync('powershell -Command "Start-Sleep -Milliseconds 500"', { stdio: 'pipe', windowsHide: true });
          execSync(`net start "${svcName}"`, { stdio: 'pipe', windowsHide: true });
          started = true;
          break;
        } catch (err: any) {
          const errMsg = err.message || '';
          const errStderr = err.stderr ? err.stderr.toString() : '';
          if (
            errMsg.includes('2182') || 
            errStderr.includes('2182') || 
            errMsg.includes('already been started') || 
            errStderr.includes('already been started')
          ) {
            started = true;
            break;
          }
          lastErr = err;
        }
      }
      if (!started) {
        const errMsg = lastErr && lastErr.stderr ? lastErr.stderr.toString().trim() : (lastErr ? lastErr.message : 'Unknown error');
        throw new Error('Gagal menjalankan layanan WireGuard: ' + errMsg);
      }

      // Otomatis jalankan Caddy Reverse Proxy di Windows Dev jika Port 443 belum active
      this.ensureWindowsCaddyRunning(slug);

      return { success: true, message: 'Tunnel VPN berhasil diaktifkan.' };
    } else {
      const ifName = `et-${slug}`;

      // Pastikan symlink /etc/wireguard/ selalu up-to-date sebelum start
      // (antisipasi jika Watchdog sebelumnya cp -f menimpa symlink jadi file biasa)
      try {
        execSync(`sudo ln -sf "${confPath}" "${this.etcConfPath(slug)}"`, { stdio: 'pipe' });
      } catch {}

      // Ensure permission 600 so WireGuard doesn't warn "world accessible"
      try {
        fs.chmodSync(confPath, 0o600);
        execSync(`sudo chmod 600 "${confPath}"`, { stdio: 'pipe' });
      } catch {}

      // Pembersihan aman: pastikan interface lama sudah down sebelum up
      try { execSync(`sudo wg-quick down ${ifName}`, { stdio: 'pipe' }); } catch {}
      try { execSync(`sudo ip link delete ${ifName}`, { stdio: 'pipe' }); } catch {}

      // Jalankan wg-quick menggunakan NAMA interface (baca dari /etc/wireguard/ via symlink)
      // — konsisten dengan cara systemctl enable wg-quick@<iface> bekerja
      try {
        execSync(`sudo wg-quick up ${ifName}`, { stdio: 'pipe' });
      } catch (err: any) {
        const errMsg = err.stderr ? err.stderr.toString() : err.message;
        if (errMsg.includes('already exists')) {
          try { execSync(`sudo ip link delete ${ifName}`, { stdio: 'pipe' }); } catch {}
          execSync(`sudo wg-quick up ${ifName}`, { stdio: 'pipe' });
        } else {
          throw new Error(`Gagal mengaktifkan WireGuard: ${errMsg}`);
        }
      }

      // Enable systemd agar tunnel otomatis hidup kembali setelah VPS reboot
      try {
        execSync(`sudo systemctl enable wg-quick@${ifName}`, { stdio: 'pipe' });
      } catch {}

      return { success: true, message: 'Tunnel VPN berhasil diaktifkan.' };
    }
  }

  /** Nonaktifkan tunnel */
  static async stopTunnel(slug: string): Promise<{ success: boolean; message: string }> {
    const ifName = `et-${slug}`;
    if (this.isWindows()) {
      const tunnelName = ifName;
      this.stopWindowsCaddy();

      if (!this.isAdmin()) {
        const psCode = `Start-Process "${WINDOWS_WG_PATH}" -ArgumentList '/uninstalltunnelservice','${tunnelName}' -Wait`;
        const codeBuffer = Buffer.from(psCode, 'utf16le');
        const codeBase64 = codeBuffer.toString('base64');
        const outerCode = `Start-Process powershell -ArgumentList "-NoProfile -WindowStyle Hidden -EncodedCommand ${codeBase64}" -Verb RunAs -Wait`;
        const outerBuffer = Buffer.from(outerCode, 'utf16le');
        const outerBase64 = outerBuffer.toString('base64');
        return new Promise((resolve) => {
          exec(`powershell -NoProfile -EncodedCommand ${outerBase64}`, { windowsHide: true }, () => {
            resolve({ success: true, message: 'Tunnel VPN berhasil dinonaktifkan.' });
          });
        });
      }

      try { execSync(`"${WINDOWS_WG_PATH}" /uninstalltunnelservice "${tunnelName}"`, { stdio: 'pipe', windowsHide: true }); } catch {}
      return { success: true, message: 'Tunnel VPN berhasil dinonaktifkan.' };
    } else {
      // Gunakan nama interface (bukan path) agar konsisten dengan systemctl
      try { execSync(`sudo wg-quick down ${ifName}`, { stdio: 'pipe', windowsHide: true }); } catch {}
      try { execSync(`sudo ip link delete ${ifName}`, { stdio: 'pipe' }); } catch {}
      try { execSync(`sudo systemctl disable wg-quick@${ifName}`, { stdio: 'pipe' }); } catch {}
      return { success: true, message: 'Tunnel VPN berhasil dinonaktifkan & layanan systemd dinonaktifkan.' };
    }
  }

  /** Hapus tunnel secara permanen */
  static async removeTunnel(slug: string): Promise<{ success: boolean; message: string }> {
    const ifName = `et-${slug}`;
    if (this.isWindows()) {
      const tunnelName = ifName;
      this.stopWindowsCaddy();

      if (!this.isAdmin()) {
        const psCode = `
          Start-Process "${WINDOWS_WG_PATH}" -ArgumentList '/uninstalltunnelservice','${tunnelName}' -Wait
        `.trim();
        const codeBuffer = Buffer.from(psCode, 'utf16le');
        const codeBase64 = codeBuffer.toString('base64');
        const outerCode = `Start-Process powershell -ArgumentList "-NoProfile -WindowStyle Hidden -EncodedCommand ${codeBase64}" -Verb RunAs -Wait`;
        const outerBuffer = Buffer.from(outerCode, 'utf16le');
        const outerBase64 = outerBuffer.toString('base64');
        return new Promise((resolve) => {
          exec(`powershell -NoProfile -EncodedCommand ${outerBase64}`, { windowsHide: true }, (err) => {
            if (err) {
              console.error('[WG Remove] Gagal uninstall via UAC:', err.message);
            }
            resolve({ success: true, message: 'Tunnel berhasil dihapus.' });
          });
        });
      } else {
        try {
          execSync(`"${WINDOWS_WG_PATH}" /uninstalltunnelservice "${tunnelName}"`, { stdio: 'pipe', windowsHide: true });
        } catch (err: any) {
          console.error('[WG Remove] Gagal uninstall:', err.message);
        }
      }
    } else {
      // 1. Matikan interface & hapus dari kernel
      try { execSync(`sudo wg-quick down ${ifName}`, { stdio: 'pipe', windowsHide: true }); } catch {}
      try { execSync(`sudo ip link delete ${ifName}`, { stdio: 'pipe' }); } catch {}
      // 2. Nonaktifkan autostart systemd
      try { execSync(`sudo systemctl disable wg-quick@${ifName}`, { stdio: 'pipe' }); } catch {}
      try { execSync(`sudo systemctl stop wg-quick@${ifName}`, { stdio: 'pipe' }); } catch {}
    }

    // 3. Hapus file sumber di tunnels/ DAN symlink/file di /etc/wireguard/ (via deleteConfig)
    this.deleteConfig(slug);
    return { success: true, message: 'Tunnel berhasil dihapus & dikosongkan dari OS.' };
  }

  /** Dapatkan status semua tunnel */
  static getAllStatus(slugs: string[]): Record<string, TunnelStatus> {
    const result: Record<string, TunnelStatus> = {};
    for (const slug of slugs) {
      result[slug] = this.getStatus(slug);
    }
    return result;
  }

  /** Diagnosa Koneksi Tunnel Terperinci dengan Penentuan Lokasi Masalah */
  static async diagnoseTunnel(slug: string): Promise<{ success: boolean; message: string; details: string[] }> {
    const details: string[] = [];
    const status = this.getStatus(slug);
    const confPath = this.confPath(slug);
    
    details.push(`1️⃣ STATUS TINGKAT KERNEL: ${status.status.toUpperCase()}`);
    if (status.wg_ip) {
      details.push(`   └─ IP Interface VPN Lokal: ${status.wg_ip}`);
    }

    if (!fs.existsSync(confPath)) {
      details.push('❌ [LOKASI MASALAH: LOKAL] Berkas konfigurasi WireGuard (.conf) tidak ditemukan!');
      return { 
        success: false, 
        message: 'File konfigurasi tunnel tidak ada di disk.',
        details 
      };
    }

    if (status.status !== 'connected') {
      details.push('⚠️ [LOKASI MASALAH: LOKAL] Interface WireGuard belum aktif di OS.');
      details.push('   └─ Solusi: Klik "Aktifkan Tunnel" di dashboard.');
      return { 
        success: false, 
        message: 'Tunnel sedang tidak terhubung. Silakan aktifkan tunnel terlebih dahulu.',
        details 
      };
    }

    // 2. Handshake WireGuard dengan Server Lisensi (10.0.0.1)
    try {
      details.push('2️⃣ PEMERIKSAAN HANDSHAKE WIREGUARD (Koneksi ke Gateway 10.0.0.1):');
      const wgExe = this.isWindows() ? 'C:\\Program Files\\WireGuard\\wg.exe' : 'sudo wg';
      const ifName = `et-${slug}`;
      const wgCmd = this.isWindows() ? `"${wgExe}" show` : `${wgExe} show ${ifName}`;
      const wgOut = execSync(wgCmd, { stdio: 'pipe', windowsHide: true }).toString();
      
      const hsMatch = wgOut.match(/latest handshake:\s*(.+)/i) || wgOut.match(/\s+(\d+)\s*$/m);
      const txMatch = wgOut.match(/transfer:\s*(.+)/i) || wgOut.match(/transfer\s*:\s*(.+)/i);

      if (hsMatch) {
        details.push(`   ├─ Handshake Terakhir: ${hsMatch[1].trim()}`);
      }
      if (txMatch) {
        details.push(`   └─ Data Terkirim/Diterima: ${txMatch[1].trim()}`);
      }

      if (!hsMatch) {
        details.push('❌ [LOKASI MASALAH: KONEKSI/FIREWALL] Belum ada handshake sama sekali.');
        details.push('   └─ Penyebab: Port UDP 51820 terblokir oleh ISP/Firewall, atau IP Server Lisensi tidak dapat dijangkau.');
      } else {
        details.push('✅ Handshake WireGuard aktif & berhasil terverifikasi.');
      }
    } catch (e: any) {
      details.push(`⚠️ Gagal membaca status handshake WireGuard: ${e.message}`);
    }

    // 3. Ping Test ke Internet Publik & Gateway VPN
    try {
      details.push('3️⃣ PEMERIKSAAN KONEKTIVITAS JARINGAN:');
      
      // Ping Internet
      const pingNetCmd = this.isWindows() ? 'ping -n 2 -w 2000 8.8.8.8' : 'ping -c 2 -W 2 8.8.8.8';
      let internetOk = false;
      try {
        const outNet = execSync(pingNetCmd, { stdio: 'pipe', windowsHide: true }).toString();
        if (outNet.includes('TTL=') || outNet.includes('ttl=')) internetOk = true;
      } catch {}

      if (internetOk) {
        details.push('   ├─ Internet Server Lokal: ✅ KONEK (Ping 8.8.8.8 OK)');
      } else {
        details.push('   ├─ Internet Server Lokal: ❌ TERPUTUS (Ping 8.8.8.8 RTO)');
        details.push('   │  └─ [LOKASI MASALAH: JARINGAN SEKOLAH] Server lokal tidak memiliki akses internet!');
      }

      // Ping Gateway VPN 10.0.0.1
      const pingVpnCmd = this.isWindows() ? 'ping -n 2 -w 2000 10.0.0.1' : 'ping -c 2 -W 2 10.0.0.1';
      let vpnGatewayOk = false;
      try {
        const outVpn = execSync(pingVpnCmd, { stdio: 'pipe', windowsHide: true }).toString();
        if (outVpn.includes('TTL=') || outVpn.includes('ttl=')) vpnGatewayOk = true;
      } catch {}

      if (vpnGatewayOk) {
        details.push('   └─ Tunnel VPN Gateway (10.0.0.1): ✅ KONEK (Ping 10.0.0.1 OK)');
      } else {
        details.push('   └─ Tunnel VPN Gateway (10.0.0.1): ❌ RTO (Tidak ada balasan dari 10.0.0.1)');
        details.push('      └─ [LOKASI MASALAH: VPS LISENSI / ROUTING] WireGuard up tetapi paket VPN tidak sampai ke 10.0.0.1.');
      }
    } catch (err: any) {
      details.push('❌ Error saat pengujian ping: ' + err.message);
    }

    // 4. Pemeriksaan Port Aplikasi Lokal (Local Application Service)
    try {
      details.push('4️⃣ PEMERIKSAAN LAYANAN APLIKASI LOKAL:');
      const confContent = fs.readFileSync(confPath, 'utf8');
      const localPortMatch = confContent.match(/#\s*LocalPort\s*=\s*(\d+)/i);
      const portToCheck = localPortMatch ? localPortMatch[1] : '443';

      let portOpen = false;
      if (this.isWindows()) {
        try {
          const testCmd = `powershell -Command "(Test-NetConnection -ComputerName 127.0.0.1 -Port ${portToCheck}).TcpTestSucceeded"`;
          const testOut = execSync(testCmd, { stdio: 'pipe', windowsHide: true }).toString().trim();
          if (testOut === 'True') portOpen = true;
        } catch {}
      } else {
        try {
          const testCmd = `ss -tulpn | grep -E ":${portToCheck}\\b" || curl -sk -o /dev/null -w "%{http_code}" https://127.0.0.1:${portToCheck}`;
          const testOut = execSync(testCmd, { stdio: 'pipe', windowsHide: true }).toString().trim();
          if (testOut.length > 0) portOpen = true;
        } catch {}
      }

      if (portOpen) {
        details.push(`   └─ Port Lokal ${portToCheck}: ✅ MENDENGARKAN (Aplikasi/Caddy aktif di port ${portToCheck})`);
      } else {
        details.push(`   └─ Port Lokal ${portToCheck}: ⚠️ TIDAK MENDENGARKAN`);
        details.push(`      └─ [LOKASI MASALAH: LOKAL PORT] Aplikasi Absenta / Caddy tidak berjalan di port ${portToCheck}.`);
      }
    } catch {}

    details.push('--------------------------------------------------');
    details.push('💡 RINGKASAN: Jika semua langkah bernilai ✅, terowongan siap digunakan.');

    return {
      success: true,
      message: 'Diagnosa terperinci selesai.',
      details
    };
  }

  /** Mendapatkan daftar semua service WireGuard yang terpasang */
  static listInstalledServices(): { name: string; display: string; status: string }[] {
    if (!this.isWindows()) {
      try {
        const out = execSync("ip link show | grep -o 'et-[a-zA-Z0-9-]*'", { stdio: 'pipe', windowsHide: true }).toString();
        const interfaces = [...new Set(out.split('\n').map(i => i.trim()).filter(Boolean))];
        return interfaces.map(ifName => ({
          name: ifName,
          display: `WireGuard Interface: ${ifName}`,
          status: 'RUNNING'
        }));
      } catch {
        return [];
      }
    }

    try {
      const psCmd = `Get-Service | Where-Object Name -like 'WireGuardTunnel$et-*' | Select-Object Name, DisplayName, Status | ConvertTo-Json`;
      const out = execSync(`powershell -NoProfile -Command "${psCmd}"`, { stdio: 'pipe', windowsHide: true }).toString();
      if (!out.trim()) return [];
      const parsed = JSON.parse(out.trim());
      const rawServices = Array.isArray(parsed) ? parsed : [parsed];
      return rawServices.map((s: any) => ({
        name: s.Name,
        display: s.DisplayName,
        status: s.Status === 4 ? 'RUNNING' : (s.Status === 1 ? 'STOPPED' : 'UNKNOWN')
      }));
    } catch (e) {
      console.error('[WG List] Gagal list service:', e);
      return [];
    }
  }

  /** Menghapus service-service WireGuard yang dipilih */
  static async cleanServices(serviceNames: string[]): Promise<{ success: boolean; message: string }> {
    if (serviceNames.length === 0) {
      return { success: true, message: 'Tidak ada service yang dipilih.' };
    }

    if (this.isWindows()) {
      const psCommands = serviceNames.map(svcName => {
        const tunnelName = svcName.includes('$') ? svcName.split('$')[1] : svcName;
        return `
          Start-Process "${WINDOWS_WG_PATH}" -ArgumentList '/uninstalltunnelservice','${tunnelName}' -Wait
        `.trim();
      }).join('\n');

      if (!this.isAdmin()) {
        const codeBuffer = Buffer.from(psCommands, 'utf16le');
        const codeBase64 = codeBuffer.toString('base64');
        const outerCode = `Start-Process powershell -ArgumentList "-NoProfile -WindowStyle Hidden -EncodedCommand ${codeBase64}" -Verb RunAs -Wait`;
        const outerBuffer = Buffer.from(outerCode, 'utf16le');
        const outerBase64 = outerBuffer.toString('base64');
        return new Promise((resolve, reject) => {
          exec(`powershell -NoProfile -EncodedCommand ${outerBase64}`, { windowsHide: true }, (err) => {
            if (err) {
              reject(new Error('Gagal membersihkan service: UAC ditolak atau dibatalkan.'));
            } else {
              resolve({ success: true, message: 'Layanan VPN terpilih berhasil dibersihkan.' });
            }
          });
        });
      }

      const debugResults: string[] = [];
      for (const svcName of serviceNames) {
        const tunnelName = svcName.includes('$') ? svcName.split('$')[1] : svcName;
        try {
          const out = execSync(`"${WINDOWS_WG_PATH}" /uninstalltunnelservice "${tunnelName}"`, { stdio: 'pipe', windowsHide: true });
          debugResults.push(`Success ${tunnelName}: ${out.toString()}`);
        } catch (err: any) {
          debugResults.push(`Failed ${tunnelName}: ${err.message} - StdErr: ${err.stderr ? err.stderr.toString() : ''}`);
        }
      }
      return { success: true, message: 'Hasil pembersihan: ' + debugResults.join(' | ') };
    } else {
      for (const ifName of serviceNames) {
        const confPath = path.join(__dirname, `../../../tunnels/${ifName}.conf`);
        try { execSync(`sudo wg-quick down "${ifName}"`, { stdio: 'pipe', windowsHide: true }); } catch {}
        if (fs.existsSync(confPath)) {
          fs.unlinkSync(confPath);
        }
      }
      return { success: true, message: 'Interface VPN terpilih berhasil dibersihkan.' };
    }
  }
}
