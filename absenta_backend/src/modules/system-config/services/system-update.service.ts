import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
// @ts-ignore
import AdmZip from 'adm-zip';

// Path root kedua repo — sesuaikan jika letak folder berbeda
const BACKEND_ROOT = path.join(__dirname, '..', '..', '..', '..'); // absenta_backend/
const FRONTEND_ROOT = path.join(BACKEND_ROOT, '..', 'absenta_frontend'); // ../absenta_frontend/
const PROGRESS_FILE = path.join(BACKEND_ROOT, '..', 'update-progress.json');

function isVersionBehind(local: string, latest: string): boolean {
  const lParts = String(local).split('.').map(Number);
  const rParts = String(latest).split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const lVal = lParts[i] || 0;
    const rVal = rParts[i] || 0;
    if (rVal > lVal) return true;
    if (lVal > rVal) return false;
  }
  return false;
}

async function downloadFile(url: string, outputPath: string): Promise<void> {
  const writer = fs.createWriteStream(outputPath);
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream'
  });
  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}


export type UpdateStatus = 'idle' | 'running' | 'success' | 'failed';
export type UpdateStep =
  | 'pulling_backend'
  | 'pulling_frontend'
  | 'installing_backend'
  | 'installing_frontend'
  | 'migrating'
  | 'building_frontend'
  | 'restarting'
  | 'done';

export interface UpdateProgress {
  status: UpdateStatus;
  step: UpdateStep | 'error';
  message: string;
  error?: string;
  updatedAt?: string;
  isDryRun?: boolean;
}

export interface CommitInfo {
  hash: string;
  message: string;
}

export interface UpdateCheckResult {
  isBehind: boolean;
  backendCommits: CommitInfo[];
  frontendCommits: CommitInfo[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function writeProgress(data: Omit<UpdateProgress, 'updatedAt'>): void {
  try {
    fs.writeFileSync(
      PROGRESS_FILE,
      JSON.stringify({ ...data, updatedAt: new Date().toISOString() }, null, 2),
    );
  } catch (e) {
    console.error('[Updater] Failed to write progress file:', e);
  }
}

export function readProgress(): UpdateProgress {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8')) as UpdateProgress;
    }
  } catch { /* ignore */ }
  return { status: 'idle', step: 'done', message: 'Tidak ada pembaruan aktif.' };
}

function execCmd(cmd: string, cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const pathKey = Object.keys(process.env).find(k => k.toUpperCase() === 'PATH') || 'PATH';
    const localBin = path.join(cwd, 'node_modules', '.bin');
    const originalPath = process.env[pathKey] || '';
    const newEnv = { ...process.env, [pathKey]: `${localBin}${path.delimiter}${originalPath}` };

    exec(cmd, { cwd, timeout: 360_000, env: newEnv, windowsHide: true }, (error, stdout, stderr) => {
      if (error) reject({ error, stderr, stdout });
      else resolve(stdout);
    });
  });
}


/** Simulasi delay step untuk dry-run mode */
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function checkUpdates(): Promise<UpdateCheckResult> {
  try {
    const licenseServerUrl = process.env.LICENSE_SERVER_URL || 'https://api.absenta.id';
    const currentVersion = process.env.APP_VERSION || '1.0.0';

    const response = await axios.get(`${licenseServerUrl}/api/public/release/check`, { timeout: 10000 });
    const release = response.data;

    if (release && release.success && release.latest_version) {
      const isBehind = isVersionBehind(currentVersion, release.latest_version);
      
      if (isBehind) {
        // Map changelog ke backendCommits untuk ditampilkan di UI tanpa merubah React frontend
        const changelogLines = String(release.changelog || '')
          .split(/[.\n]/)
          .map(s => s.trim())
          .filter(Boolean);

        const backendCommits = [
          { hash: 'version', message: `Versi Baru Tersedia: v${release.latest_version}` },
          { hash: 'date', message: `Tanggal Rilis: ${new Date(release.released_at || Date.now()).toLocaleDateString('id-ID')}` },
          { hash: 'info', message: '--- CATATAN RILIS ---' },
          ...changelogLines.map((line, idx) => ({
            hash: `item-${idx}`,
            message: `• ${line}`
          }))
        ];

        return {
          isBehind: true,
          backendCommits,
          frontendCommits: []
        };
      }
    }
  } catch (err: any) {
    console.error('[Updater] Gagal memeriksa update dari Server Lisensi:', err.message);
  }

  return {
    isBehind: false,
    backendCommits: [],
    frontendCommits: []
  };
}

export async function executeUpdate(): Promise<void> {
  const current = readProgress();
  if (current.status === 'running') return;

  const isDev = process.env.NODE_ENV !== 'production';
  if (isDev) {
    console.log('[Updater] ⚠️  DEV MODE: Dry-run update simulation (no real commands will run)');
    runDryRunInBackground();
  } else {
    runUpdateInBackground();
  }
}

// ---------------------------------------------------------------------------
// DRY-RUN (Dev) — simulasi UI tanpa menjalankan perintah shell berbahaya
// ---------------------------------------------------------------------------

async function runDryRunInBackground(): Promise<void> {
  const steps: { step: UpdateProgress['step']; message: string; delay: number }[] = [
    { step: 'pulling_backend',    message: '[DRY-RUN] Simulasi: git fetch + reset --hard backend...', delay: 1800 },
    { step: 'pulling_frontend',   message: '[DRY-RUN] Simulasi: git fetch + reset --hard frontend...', delay: 1500 },
    { step: 'installing_backend', message: '[DRY-RUN] Simulasi: npm ci backend (dilewati di dev)...', delay: 2000 },
    { step: 'installing_frontend',message: '[DRY-RUN] Simulasi: npm ci frontend (dilewati di dev)...', delay: 1800 },
    { step: 'migrating',          message: '[DRY-RUN] Simulasi: prisma generate + migrate deploy...', delay: 1500 },
    { step: 'building_frontend',  message: '[DRY-RUN] Simulasi: vite build (dilewati di dev)...', delay: 2500 },
    { step: 'restarting',         message: '[DRY-RUN] Simulasi: tsc build + pm2 reload (dilewati di dev)...', delay: 1500 },
  ];

  try {
    for (const s of steps) {
      writeProgress({ status: 'running', step: s.step, message: s.message, isDryRun: true });
      await sleep(s.delay);
    }
    writeProgress({
      status: 'success',
      step: 'done',
      message: '[DRY-RUN] Simulasi selesai! Semua langkah berhasil (mode development).',
      isDryRun: true,
    });
    console.log('[Updater] ✅ Dry-run simulation completed successfully');
  } catch (e: any) {
    writeProgress({
      status: 'failed',
      step: 'error',
      message: '[DRY-RUN] Simulasi gagal.',
      error: e?.message || String(e),
      isDryRun: true,
    });
  }
}

async function runUpdateInBackground(): Promise<void> {
  const tmpZipPath = path.join(BACKEND_ROOT, '..', 'tmp_update.zip');
  const tmpExtractPath = path.join(BACKEND_ROOT, '..', 'tmp_update_extracted');

  try {
    const licenseServerUrl = process.env.LICENSE_SERVER_URL || 'https://api.absenta.id';

    // Step 1 — Pull backend (Mengunduh rilis)
    writeProgress({ status: 'running', step: 'pulling_backend', message: 'Mencari paket rilis terbaru...' });
    const response = await axios.get(`${licenseServerUrl}/api/public/release/check`, { timeout: 10000 });
    const release = response.data;

    if (!release || !release.success || !release.download_url) {
      throw new Error('Gagal mendapatkan URL paket rilis dari Server Lisensi.');
    }

    writeProgress({ status: 'running', step: 'pulling_backend', message: `Mengunduh paket rilis v${release.latest_version}...` });
    await downloadFile(release.download_url, tmpZipPath);

    // Step 2 — Pull frontend (Mengekstrak rilis)
    writeProgress({ status: 'running', step: 'pulling_frontend', message: 'Mengekstrak berkas paket rilis...' });
    if (fs.existsSync(tmpExtractPath)) {
      fs.rmSync(tmpExtractPath, { recursive: true, force: true });
    }
    fs.mkdirSync(tmpExtractPath, { recursive: true });

    const zip = new AdmZip(tmpZipPath);
    zip.extractAllTo(tmpExtractPath, true);

    const newBackendPath = path.join(tmpExtractPath, 'absenta_backend');
    const newFrontendPath = path.join(tmpExtractPath, 'absenta_frontend');

    const backendDepsChanged = hasFileContentChanged(
      path.join(BACKEND_ROOT, 'package-lock.json'),
      path.join(newBackendPath, 'package-lock.json')
    );
    const prismaSchemaChanged = hasFileContentChanged(
      path.join(BACKEND_ROOT, 'prisma', 'schema.prisma'),
      path.join(newBackendPath, 'prisma', 'schema.prisma')
    );

    // Step 3 — Install backend dependencies jika berubah
    if (backendDepsChanged) {
      writeProgress({ status: 'running', step: 'installing_backend', message: 'Memperbarui dependensi backend (npm install)...' });
      fs.copyFileSync(path.join(newBackendPath, 'package.json'), path.join(BACKEND_ROOT, 'package.json'));
      fs.copyFileSync(path.join(newBackendPath, 'package-lock.json'), path.join(BACKEND_ROOT, 'package-lock.json'));
      
      const cmd = 'npm install --omit=dev --no-audit --no-fund --prefer-offline';
      await execCmd(cmd, BACKEND_ROOT);
    } else {
      writeProgress({ status: 'running', step: 'installing_backend', message: 'Dependensi backend tidak berubah, melewati instalasi.' });
      if (fs.existsSync(path.join(newBackendPath, 'package.json'))) {
        fs.copyFileSync(path.join(newBackendPath, 'package.json'), path.join(BACKEND_ROOT, 'package.json'));
      }
      await sleep(500);
    }

    // Step 4 — Install frontend dependencies (Dilewati karena static build sudah siap)
    writeProgress({ status: 'running', step: 'installing_frontend', message: 'Menyalin berkas statis frontend...' });
    await sleep(500);

    // Step 5 — Prisma migrate jika berubah
    if (prismaSchemaChanged) {
      writeProgress({ status: 'running', step: 'migrating', message: 'Menjalankan migrasi database (prisma migrate deploy)...' });
      fs.cpSync(path.join(newBackendPath, 'prisma'), path.join(BACKEND_ROOT, 'prisma'), { recursive: true, force: true });
      await execCmd('npx prisma generate', BACKEND_ROOT);
      await execCmd('npx prisma migrate deploy', BACKEND_ROOT);
    } else {
      writeProgress({ status: 'running', step: 'migrating', message: 'Skema database tidak berubah, melewati migrasi.' });
      await execCmd('npx prisma generate', BACKEND_ROOT);
    }

    // Step 6 — Salin build frontend statis (vite build sudah jadi dari paket zip)
    writeProgress({ status: 'running', step: 'building_frontend', message: 'Memperbarui file antarmuka frontend...' });
    const targetFrontendDist = path.join(FRONTEND_ROOT, 'dist');
    const newFrontendDist = path.join(newFrontendPath, 'dist');
    
    if (fs.existsSync(newFrontendDist)) {
      if (fs.existsSync(targetFrontendDist)) {
        fs.rmSync(targetFrontendDist, { recursive: true, force: true });
      }
      fs.cpSync(newFrontendDist, targetFrontendDist, { recursive: true, force: true });
    }

    // Step 7 — Salin build backend (dist) & restart PM2
    writeProgress({ status: 'running', step: 'restarting', message: 'Memasang rilis backend baru & memuat ulang layanan...' });
    
    const targetBackendDist = path.join(BACKEND_ROOT, 'dist');
    const newBackendDist = path.join(newBackendPath, 'dist');

    if (fs.existsSync(newBackendDist)) {
      const oldDistPath = path.join(BACKEND_ROOT, 'dist_old');
      if (fs.existsSync(oldDistPath)) {
        fs.rmSync(oldDistPath, { recursive: true, force: true });
      }
      if (fs.existsSync(targetBackendDist)) {
        fs.renameSync(targetBackendDist, oldDistPath);
      }
      fs.cpSync(newBackendDist, targetBackendDist, { recursive: true, force: true });
    }

    // Bersihkan file sementara
    try {
      if (fs.existsSync(tmpZipPath)) fs.unlinkSync(tmpZipPath);
      if (fs.existsSync(tmpExtractPath)) fs.rmSync(tmpExtractPath, { recursive: true, force: true });
    } catch (e) {}

    // Update versi aplikasi di file .env jika ada
    try {
      const envPath = path.join(BACKEND_ROOT, '.env');
      if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, 'utf8');
        envContent = envContent.replace(/APP_VERSION=.*/, `APP_VERSION=${release.latest_version}`);
        fs.writeFileSync(envPath, envContent, 'utf8');
      }
    } catch (e) {}

    writeProgress({ status: 'success', step: 'done', message: `Aplikasi berhasil diperbarui ke v${release.latest_version}! Memuat ulang layanan...` });

    // Tunda 2 detik baru restart agar response sempat dibaca frontend
    setTimeout(() => {
      exec('npx pm2 restart all', { cwd: BACKEND_ROOT }, () => {});
    }, 2000);

  } catch (errPayload: any) {
    console.error('[Updater] Update failed:', errPayload);
    
    try {
      if (fs.existsSync(tmpZipPath)) fs.unlinkSync(tmpZipPath);
      if (fs.existsSync(tmpExtractPath)) fs.rmSync(tmpExtractPath, { recursive: true, force: true });
    } catch (e) {}

    writeProgress({
      status: 'failed',
      step: 'error',
      message: 'Proses pembaruan gagal.',
      error: errPayload?.message || String(errPayload),
    });
  }
}

function hasFileContentChanged(localPath: string, newPath: string): boolean {
  if (!fs.existsSync(localPath) || !fs.existsSync(newPath)) return true;
  try {
    const localContent = fs.readFileSync(localPath, 'utf8').trim();
    const newContent = fs.readFileSync(newPath, 'utf8').trim();
    return localContent !== newContent;
  } catch (e) {
    return true;
  }
}
