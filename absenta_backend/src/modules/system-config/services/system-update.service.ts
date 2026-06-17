import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Path root kedua repo — sesuaikan jika letak folder berbeda
const BACKEND_ROOT = path.join(__dirname, '..', '..', '..', '..'); // absenta_backend/
const FRONTEND_ROOT = path.join(BACKEND_ROOT, '..', 'absenta_frontend'); // ../absenta_frontend/
const PROGRESS_FILE = path.join(BACKEND_ROOT, '..', 'update-progress.json');

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

    exec(cmd, { cwd, timeout: 360_000, env: newEnv }, (error, stdout, stderr) => {
      if (error) reject({ error, stderr, stdout });
      else resolve(stdout);
    });
  });
}

function parseCommits(raw: string): CommitInfo[] {
  return raw
    .trim()
    .split('\n')
    .filter(Boolean)
    .map(line => {
      const spaceIdx = line.indexOf(' ');
      if (spaceIdx === -1) return { hash: line, message: '' };
      return { hash: line.substring(0, spaceIdx), message: line.substring(spaceIdx + 1) };
    });
}

async function getCurrentBranch(cwd: string): Promise<string> {
  try {
    return (await execCmd('git rev-parse --abbrev-ref HEAD', cwd)).trim() || 'master';
  } catch {
    return 'master';
  }
}

/** Simulasi delay step untuk dry-run mode */
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function checkUpdates(): Promise<UpdateCheckResult> {
  // Fetch terbaru dari remote untuk kedua repo
  await Promise.allSettled([
    execCmd('git fetch origin', BACKEND_ROOT),
    execCmd('git fetch origin', FRONTEND_ROOT),
  ]);

  const [backendBranch, frontendBranch] = await Promise.all([
    getCurrentBranch(BACKEND_ROOT),
    getCurrentBranch(FRONTEND_ROOT),
  ]);

  const [backendLog, frontendLog] = await Promise.allSettled([
    execCmd(`git log HEAD..origin/${backendBranch} --oneline`, BACKEND_ROOT),
    execCmd(`git log HEAD..origin/${frontendBranch} --oneline`, FRONTEND_ROOT),
  ]);

  const backendCommits =
    backendLog.status === 'fulfilled' ? parseCommits(backendLog.value) : [];
  const frontendCommits =
    frontendLog.status === 'fulfilled' ? parseCommits(frontendLog.value) : [];

  return {
    isBehind: backendCommits.length > 0 || frontendCommits.length > 0,
    backendCommits,
    frontendCommits,
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

// ---------------------------------------------------------------------------
// PRODUKSI — jalankan perintah shell nyata
// ---------------------------------------------------------------------------

async function runUpdateInBackground(): Promise<void> {
  try {
    // Step 1 — Pull backend
    writeProgress({ status: 'running', step: 'pulling_backend', message: 'Menarik kode backend terbaru dari GitHub...' });
    const backendBranch = await getCurrentBranch(BACKEND_ROOT);
    await execCmd('git fetch origin', BACKEND_ROOT);
    await execCmd(`git reset --hard origin/${backendBranch}`, BACKEND_ROOT);

    // Step 2 — Pull frontend
    writeProgress({ status: 'running', step: 'pulling_frontend', message: 'Menarik kode frontend terbaru dari GitHub...' });
    const frontendBranch = await getCurrentBranch(FRONTEND_ROOT);
    await execCmd('git fetch origin', FRONTEND_ROOT);
    await execCmd(`git reset --hard origin/${frontendBranch}`, FRONTEND_ROOT);

    // Step 3 — Install backend deps
    writeProgress({ status: 'running', step: 'installing_backend', message: 'Memperbarui dependensi backend (npm ci)...' });
    await execCmd('npm ci --omit=dev --no-audit', BACKEND_ROOT);

    // Step 4 — Install frontend deps
    writeProgress({ status: 'running', step: 'installing_frontend', message: 'Memperbarui dependensi frontend (npm ci)...' });
    await execCmd('npm ci --no-audit', FRONTEND_ROOT);

    // Step 5 — Prisma migrate
    writeProgress({ status: 'running', step: 'migrating', message: 'Menjalankan migrasi database (prisma migrate deploy)...' });
    await execCmd('npx prisma generate', BACKEND_ROOT);
    await execCmd('npx prisma migrate deploy', BACKEND_ROOT);

    // Step 6 — Build frontend
    writeProgress({ status: 'running', step: 'building_frontend', message: 'Mengompilasi aset frontend (vite build)...' });
    await execCmd('npm run build', FRONTEND_ROOT);

    // Step 7 — Build backend
    writeProgress({ status: 'running', step: 'restarting', message: 'Build backend & memuat ulang layanan (PM2 reload)...' });
    await execCmd('npm run build', BACKEND_ROOT);

    writeProgress({ status: 'success', step: 'done', message: 'Aplikasi berhasil diperbarui! Memuat ulang layanan...' });

    // Tunda 2 detik baru reload agar response sempat dibaca frontend
    setTimeout(() => {
      exec('pm2 reload ecosystem.config.js --update-env', { cwd: BACKEND_ROOT }, (err) => {
        if (err) {
          console.warn('[Updater] pm2 reload failed, trying restart all:', err.message);
          exec('pm2 restart all', () => {});
        }
      });
    }, 2000);

  } catch (errPayload: any) {
    console.error('[Updater] Update failed:', errPayload);
    writeProgress({
      status: 'failed',
      step: 'error',
      message: 'Proses pembaruan gagal.',
      error: errPayload?.stderr || errPayload?.error?.message || String(errPayload),
    });
  }
}
