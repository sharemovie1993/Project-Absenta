const readline = require('readline');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

function resolveK6Binary() {
  if (process.env.K6_BIN && process.env.K6_BIN.trim()) {
    return process.env.K6_BIN.trim();
  }
  const projectRoot = process.cwd();
  const localK6Path = path.join(projectRoot, '..', 'k6-v1.6.1-windows-amd64', 'k6.exe');
  if (fs.existsSync(localK6Path)) {
    return localK6Path;
  }
  return 'k6';
}

function formatTimestamp(date) {
  const pad = (n) => String(n).padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${y}${m}${d}-${hh}${mm}${ss}`;
}

function ensureLogDir() {
  const dir = path.join(process.cwd(), 'logs', 'loadtest');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function askQuestion(rl, prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(String(answer || '').trim());
    });
  });
}

function readSummary(summaryPath) {
  try {
    if (!fs.existsSync(summaryPath)) return null;
    const raw = fs.readFileSync(summaryPath, 'utf8');
    if (!raw) return null;
    const json = JSON.parse(raw);
    const metrics = json.metrics || {};
    const httpReqs = metrics.http_reqs && metrics.http_reqs.values ? metrics.http_reqs.values : {};
    const httpReqDuration = metrics.http_req_duration && metrics.http_req_duration.values ? metrics.http_req_duration.values : {};
    const httpReqFailed = metrics.http_req_failed && metrics.http_req_failed.values ? metrics.http_req_failed.values : {};
    const http409 = metrics.http_409 && metrics.http_409.values ? metrics.http_409.values : {};
    const http5xx = metrics.http_5xx && metrics.http_5xx.values ? metrics.http_5xx.values : {};

    const rps = typeof httpReqs.rate === 'number' ? httpReqs.rate : 0;
    const p95 = typeof httpReqDuration['p(95)'] === 'number' ? httpReqDuration['p(95)'] : 0;
    const max = typeof httpReqDuration.max === 'number' ? httpReqDuration.max : 0;
    const errorRate = typeof httpReqFailed.rate === 'number' ? httpReqFailed.rate : 0;
    const count409 = typeof http409.count === 'number' ? http409.count : 0;
    const count5xx = typeof http5xx.count === 'number' ? http5xx.count : 0;

    return { rps, p95, max, errorRate, count409, count5xx };
  } catch (e) {
    return null;
  }
}

function thresholdForLevel(level) {
  const lvl = String(level || '').toUpperCase();
  if (lvl === 'BASELINE') return 300;
  if (lvl === 'PEAK') return 400;
  if (lvl === 'STRESS') return 600;
  if (lvl === 'BURST') return 400;
  return 500;
}

function evaluateStatus(p95, errorRate, thresholdMs) {
  const errPct = errorRate * 100;
  if (p95 < thresholdMs && errPct < 2) return 'PASS';
  if (p95 < thresholdMs * 1.3 && errPct < 5) return 'WARNING';
  return 'FAIL';
}

function buildSummaryText(name, level, stats, thresholdMs, code) {
  if (!stats) {
    return `SUMMARY ${name} (${level}): tidak dapat membaca summary k6 (exit code ${code})`;
  }
  const status = evaluateStatus(stats.p95, stats.errorRate, thresholdMs);
  const errPct = (stats.errorRate * 100).toFixed(2);
  const rpsStr = stats.rps.toFixed(2);
  const p95Str = stats.p95.toFixed(2);
  const maxStr = stats.max.toFixed(2);
  return [
    `SUMMARY ${name} (${level}) [${status}]`,
    `Observed RPS      : ${rpsStr}`,
    `P95 Latency (ms)  : ${p95Str}`,
    `Max Latency (ms)  : ${maxStr}`,
    `Error Rate (%)    : ${errPct}`,
    `Count 409         : ${stats.count409}`,
    `Count 5xx         : ${stats.count5xx}`,
    `Threshold P95 (ms): ${thresholdMs}`,
    `Exit Code         : ${code}`,
  ].join('\n');
}

function runK6Scenario(name, level, config) {
  return new Promise((resolve) => {
    const {
      baseUrl,
      token,
      tenantIds,
      sessionIds,
      gateRatio,
      dupRatio,
      totalSiswa,
      hotPoolSize,
    } = config;

    const logDir = ensureLogDir();
    const ts = formatTimestamp(new Date());
    const fileName = `${ts}-${name.toLowerCase().replace(/\s+/g, '-')}.log`;
    const filePath = path.join(logDir, fileName);
    const logStream = fs.createWriteStream(filePath, { flags: 'a' });
    const summaryPath = path.join(logDir, `${ts}-${name.toLowerCase().replace(/\s+/g, '-')}.summary.json`);

    console.log(`\n=== Running scenario: ${name} (level=${level}) ===`);
    console.log(`Base URL   : ${baseUrl}`);
    console.log(`Tenant IDs : ${tenantIds}`);
    if (!token) {
      console.warn('WARNING: K6_TOKEN is empty, requests will likely be unauthorized.');
    }
    console.log(`Log file   : ${filePath}\n`);

    const env = {
      ...process.env,
      K6_BASE_URL: baseUrl,
      K6_TOKEN: token,
      K6_TENANT_IDS: tenantIds,
      K6_SESSION_IDS: sessionIds,
      K6_GATE_RATIO: gateRatio,
      K6_DUP_RATIO: dupRatio,
      K6_TOTAL_SISWA: totalSiswa,
      K6_HOT_POOL_SIZE: hotPoolSize,
      K6_LEVEL: level,
    };

    const scriptPath = path.join('scripts', 'k6', 'attendance_mixed_load_test.js');

    const k6Bin = resolveK6Binary();
    const child = spawn(k6Bin, ['run', scriptPath, '--summary-export', summaryPath], {
      shell: true,
      env,
    });

    child.stdout.on('data', (data) => {
      process.stdout.write(data);
      logStream.write(data);
    });

    child.stderr.on('data', (data) => {
      process.stderr.write(data);
      logStream.write(data);
    });

    child.on('close', (code) => {
      const stats = readSummary(summaryPath);
      const thresholdMs = thresholdForLevel(level);
      const summaryText = buildSummaryText(name, level, stats, thresholdMs, code);
      const separator = '\n=== SUMMARY ===\n';
      process.stdout.write(`${separator}${summaryText}\n\n`);
      logStream.write(`${separator}${summaryText}\n`);
      logStream.end();
      resolve();
    });
  });
}

function runDuplicateBurst(config) {
  return new Promise((resolve) => {
    const { baseUrl, token, tenantId, siswaId } = config;

    const logDir = ensureLogDir();
    const ts = formatTimestamp(new Date());
    const fileName = `${ts}-duplicate-burst.log`;
    const filePath = path.join(logDir, fileName);
    const logStream = fs.createWriteStream(filePath, { flags: 'a' });
    const summaryPath = path.join(logDir, `${ts}-duplicate-burst.summary.json`);

    console.log('\n=== Running scenario: DUPLICATE BURST ===');
    console.log(`Base URL : ${baseUrl}`);
    console.log(`Tenant   : ${tenantId}`);
    console.log(`Siswa ID : ${siswaId}`);
    if (!token) {
      console.warn('WARNING: K6_TOKEN is empty, requests will likely be unauthorized.');
    }
    console.log(`Log file : ${filePath}\n`);

    const env = {
      ...process.env,
      K6_BASE_URL: baseUrl,
      K6_TOKEN: token,
      K6_TENANT_ID: tenantId,
      K6_SISWA_ID: siswaId,
    };

    const scriptPath = path.join('scripts', 'k6', 'duplicate_burst_test.js');

    const k6Bin = resolveK6Binary();
    const child = spawn(k6Bin, ['run', scriptPath, '--summary-export', summaryPath], {
      shell: true,
      env,
    });

    child.stdout.on('data', (data) => {
      process.stdout.write(data);
      logStream.write(data);
    });

    child.stderr.on('data', (data) => {
      process.stderr.write(data);
      logStream.write(data);
    });

    child.on('close', (code) => {
      const stats = readSummary(summaryPath);
      const thresholdMs = thresholdForLevel('BURST');
      const summaryText = buildSummaryText('DUPLICATE BURST', 'BURST', stats, thresholdMs, code);
      const separator = '\n=== SUMMARY ===\n';
      process.stdout.write(`${separator}${summaryText}\n\n`);
      logStream.write(`${separator}${summaryText}\n`);
      logStream.end();
      resolve();
    });
  });
}

async function runAll(config) {
  await runK6Scenario('BASELINE', 'BASELINE', config);
  await runK6Scenario('PEAK', 'PEAK', config);
  await runK6Scenario('STRESS', 'STRESS', config);
}

function printMenu() {
  console.log('==============================');
  console.log(' Absensi Load Test Menu (k6) ');
  console.log('==============================');
  console.log('1. BASELINE');
  console.log('2. PEAK');
  console.log('3. STRESS');
  console.log('4. DUPLICATE BURST');
  console.log('5. Run All');
  console.log('6. Exit');
}

function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let lastMixedConfig = null;
  let lastBurstConfig = null;

  async function promptMixedConfig() {
    const defaultBaseUrl = lastMixedConfig?.baseUrl || process.env.K6_BASE_URL || 'http://localhost:3000';
    const defaultToken = lastMixedConfig?.token || process.env.K6_TOKEN || '';
    const defaultTenantIds = lastMixedConfig?.tenantIds || process.env.K6_TENANT_IDS || 'tenant_dev_1';
    const defaultSessionIds = lastMixedConfig?.sessionIds || process.env.K6_SESSION_IDS || '';
    const defaultTotalSiswa = String(lastMixedConfig?.totalSiswa || process.env.K6_TOTAL_SISWA || '2000');
    const defaultDupRatio = String(lastMixedConfig?.dupRatio || process.env.K6_DUP_RATIO || '0.15');
    const defaultGateRatio = String(lastMixedConfig?.gateRatio || process.env.K6_GATE_RATIO || '0.6');
    const defaultHotPoolSize = String(lastMixedConfig?.hotPoolSize || process.env.K6_HOT_POOL_SIZE || '50');

    console.log('\n=== Konfigurasi Scenario (kosongkan untuk pakai default) ===');
    const baseUrlInput = await askQuestion(rl, `Base URL [${defaultBaseUrl}]: `);
    const tokenInput = await askQuestion(rl, `Token (Bearer ...) [${defaultToken ? '***set***' : 'kosong'}]: `);
    const tenantIdsInput = await askQuestion(rl, `Tenant ID(s) comma-separated [${defaultTenantIds}]: `);
    const sessionIdsInput = await askQuestion(rl, `Session ID(s) comma-separated (opsional) [${defaultSessionIds}]: `);
    const totalSiswaInput = await askQuestion(rl, `Total siswa [${defaultTotalSiswa}]: `);
    const dupRatioInput = await askQuestion(rl, `Rasio duplicate (0-1) [${defaultDupRatio}]: `);
    const gateRatioInput = await askQuestion(rl, `Rasio gerbang (0-1, sisanya sesi) [${defaultGateRatio}]: `);
    const hotPoolSizeInput = await askQuestion(rl, `Ukuran pool siswa duplicate [${defaultHotPoolSize}]: `);

    const baseUrl = baseUrlInput || defaultBaseUrl;
    const token = tokenInput || defaultToken;
    const tenantIds = tenantIdsInput || defaultTenantIds;
    const sessionIds = sessionIdsInput || defaultSessionIds;

    const totalSiswa = Number(totalSiswaInput || defaultTotalSiswa);
    const dupRatio = Number(dupRatioInput || defaultDupRatio);
    const gateRatio = Number(gateRatioInput || defaultGateRatio);
    const hotPoolSize = Number(hotPoolSizeInput || defaultHotPoolSize);

    const config = {
      baseUrl,
      token,
      tenantIds,
      sessionIds,
      totalSiswa: Number.isFinite(totalSiswa) ? totalSiswa : Number(defaultTotalSiswa),
      dupRatio: Number.isFinite(dupRatio) ? dupRatio : Number(defaultDupRatio),
      gateRatio: Number.isFinite(gateRatio) ? gateRatio : Number(defaultGateRatio),
      hotPoolSize: Number.isFinite(hotPoolSize) ? hotPoolSize : Number(defaultHotPoolSize),
    };

    lastMixedConfig = config;
    return config;
  }

  async function promptBurstConfig() {
    const defaultBaseUrl = lastBurstConfig?.baseUrl || process.env.K6_BASE_URL || 'http://localhost:3000';
    const defaultToken = lastBurstConfig?.token || process.env.K6_TOKEN || '';
    const defaultTenantId = lastBurstConfig?.tenantId || process.env.K6_TENANT_ID || 'tenant_dev_1';
    const defaultSiswaId = lastBurstConfig?.siswaId || process.env.K6_SISWA_ID || 'siswa-duplicate-test';

    console.log('\n=== Konfigurasi Duplicate Burst (kosongkan untuk pakai default) ===');
    const baseUrlInput = await askQuestion(rl, `Base URL [${defaultBaseUrl}]: `);
    const tokenInput = await askQuestion(rl, `Token (Bearer ...) [${defaultToken ? '***set***' : 'kosong'}]: `);
    const tenantIdInput = await askQuestion(rl, `Tenant ID [${defaultTenantId}]: `);
    const siswaIdInput = await askQuestion(rl, `Siswa ID target [${defaultSiswaId}]: `);

    const baseUrl = baseUrlInput || defaultBaseUrl;
    const token = tokenInput || defaultToken;
    const tenantId = tenantIdInput || defaultTenantId;
    const siswaId = siswaIdInput || defaultSiswaId;

    const config = { baseUrl, token, tenantId, siswaId };
    lastBurstConfig = config;
    return config;
  }

  const ask = () => {
    printMenu();
    rl.question('Pilih opsi (1-6): ', async (answer) => {
      const choice = String(answer || '').trim();
      if (choice === '1') {
        const config = await promptMixedConfig();
        await runK6Scenario('BASELINE', 'BASELINE', config);
      } else if (choice === '2') {
        const config = await promptMixedConfig();
        await runK6Scenario('PEAK', 'PEAK', config);
      } else if (choice === '3') {
        const config = await promptMixedConfig();
        await runK6Scenario('STRESS', 'STRESS', config);
      } else if (choice === '4') {
        const config = await promptBurstConfig();
        await runDuplicateBurst(config);
      } else if (choice === '5') {
        const config = await promptMixedConfig();
        await runAll(config);
      } else if (choice === '6') {
        console.log('Keluar.');
        rl.close();
        return;
      } else {
        console.log('Pilihan tidak dikenal.\n');
      }
      ask();
    });
  };

  ask();
}

main();
