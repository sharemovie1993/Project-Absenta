const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

/**
 * Mendapatkan daftar PID proses yang sedang LISTENING pada port tertentu secara akurat.
 * Menghindari false positive dari status TIME_WAIT atau koneksi keluar (outgoing).
 */
function getListeningPids(port) {
  const pids = new Set();
  try {
    if (process.platform === 'win32') {
      // Jalankan netstat untuk mengambil semua socket TCP
      const output = execSync('netstat -aon', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
      const lines = output.split('\n');
      
      lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5) {
          const proto = parts[0];       // TCP/UDP
          const localAddr = parts[1];   // e.g. 0.0.0.0:3001 atau [::]:3001
          const state = parts[3];       // e.g. LISTENING, ESTABLISHED, TIME_WAIT
          const pid = parts[4];         // PID proses pemilik socket

          // Hanya saring koneksi TCP berstatus LISTENING yang berada di port target
          if (proto === 'TCP' && state === 'LISTENING') {
            if (localAddr.endsWith(`:${port}`)) {
              const pidNum = parseInt(pid, 10);
              if (pidNum && pidNum > 0) {
                pids.add(pidNum);
              }
            }
          }
        }
      });
    } else {
      // Unix-like: Saring khusus koneksi LISTEN
      try {
        const output = execSync(`lsof -t -i:${port} -sTCP:LISTEN`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
        output.split('\n').forEach(line => {
          const pid = parseInt(line.trim(), 10);
          if (pid) {
            pids.add(pid);
          }
        });
      } catch (e) {
        // lsof mengembalikan exit code 1 jika tidak ada proses yang mendengarkan
      }
    }
  } catch (err) {
    console.error('[pre-dev] Gagal memindai port dengan netstat/lsof:', err.message);
  }
  return Array.from(pids);
}

function preDevCleanup() {
  // Load .env
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }

  const port = process.env.PORT || '3001';
  console.log(`[pre-dev] Memulai pembersihan port ${port}...`);

  try {
    if (process.platform === 'win32') {
      // Tutup paksa jendela CMD/PowerShell dengan Window Title absenta-backend jika ada
      try {
        execSync(`taskkill /f /fi "windowtitle eq absenta-backend*" /t`, { stdio: 'ignore' });
      } catch (e) {}
    }

    // Dapatkan semua proses aktif yang sedang mendengarkan (LISTENING) pada port 3001
    const pids = getListeningPids(port);
    pids.forEach(pid => {
      console.log(`[pre-dev] Mematikan proses PID: ${pid} pada port ${port}`);
      try {
        execSync(process.platform === 'win32' ? `taskkill /f /pid ${pid} /t` : `kill -9 ${pid}`, { stdio: 'ignore' });
      } catch (e) {}
    });

    // Verifikasi aktif pelepasan port oleh OS (maksimal 5 detik)
    console.log(`[pre-dev] Memverifikasi pelepasan port ${port}...`);
    let isPortFree = false;
    for (let attempt = 1; attempt <= 5; attempt++) {
      const activePids = getListeningPids(port);
      if (activePids.length === 0) {
        isPortFree = true;
        break;
      }

      console.log(`[pre-dev] Port ${port} masih ditahan OS, menunggu pelepasan (percobaan ${attempt}/5)...`);
      try {
        execSync(process.platform === 'win32' ? 'ping -n 2 127.0.0.1' : 'sleep 1', { stdio: 'ignore' });
      } catch (e) {}
    }

    if (isPortFree) {
      console.log(`[pre-dev] Port ${port} berhasil dibebaskan sepenuhnya.`);
    } else {
      console.warn(`[pre-dev] Peringatan: Port ${port} mungkin masih ditahan oleh OS.`);
    }
  } catch (error) {
    console.error(`[pre-dev] Gagal membersihkan port ${port}:`, error.message);
  }
}

preDevCleanup();
