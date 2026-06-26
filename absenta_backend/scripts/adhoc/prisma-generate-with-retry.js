const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const clientDir = path.join(process.cwd(), 'node_modules', '.prisma', 'client');
const schemaFile = path.join(process.cwd(), 'prisma', 'schema.prisma');
const clientMarkerFile = path.join(clientDir, 'index.d.ts');

const sleep = (ms) => {
  try {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  } catch {}
};

const cleanup = () => {
  try {
    if (!fs.existsSync(clientDir)) return;
    for (const f of fs.readdirSync(clientDir)) {
      if (/\.tmp\d*$/i.test(f)) {
        try {
          fs.rmSync(path.join(clientDir, f), { force: true });
        } catch {}
      }
    }
  } catch {}
};

const isWin = process.platform === 'win32';
const env = isWin
  ? { ...process.env, PRISMA_CLIENT_ENGINE_TYPE: 'binary', PRISMA_CLI_QUERY_ENGINE_TYPE: 'binary' }
  : { ...process.env };

const lockRe = isWin
  ? /EPERM: operation not permitted, (rename|unlink) '.*\\query-engine-windows\.exe(\.tmp\d*)?'/i
  : null;

let last = 1;
let sawLock = false;
let announcedLock = false;

try {
  if (fs.existsSync(schemaFile) && fs.existsSync(clientMarkerFile)) {
    const schemaMtime = fs.statSync(schemaFile).mtimeMs;
    const clientMtime = fs.statSync(clientMarkerFile).mtimeMs;
    if (clientMtime >= schemaMtime) {
      process.exit(0);
    }
  }
} catch {}

const maxAttempts = 20;
for (let i = 1; i <= maxAttempts; i += 1) {
  cleanup();
  const r = spawnSync('npx', ['prisma', 'generate'], {
    stdio: 'pipe',
    shell: true,
    env,
    encoding: 'utf8',
    windowsHide: true
  });
  const combined = String(r.stderr || '') + String(r.stdout || '');
  const isLock = lockRe ? lockRe.test(combined) : false;
  if (isLock) sawLock = true;

  if (r.status === 0) {
    if (r.stdout) process.stdout.write(r.stdout);
    if (r.stderr) process.stderr.write(r.stderr);
    process.exit(0);
  }

  if (isLock) {
    if (!announcedLock) {
      process.stdout.write('[build] Prisma query engine sedang terkunci. Mencoba ulang...\n');
      announcedLock = true;
    }
  } else {
    if (r.stdout) process.stdout.write(r.stdout);
    if (r.stderr) process.stderr.write(r.stderr);
  }
  last = typeof r.status === 'number' ? r.status : 1;
  const waitMs = Math.min(2500, 800 + i * 150);
  sleep(waitMs);
}

if (sawLock) {
  process.stderr.write(
    '[build] Prisma generate gagal karena query engine tetap terkunci setelah retry. Pastikan tidak ada proses Node/Prisma lain yang sedang berjalan.\n'
  );
  process.exit(1);
}

process.exit(last);
