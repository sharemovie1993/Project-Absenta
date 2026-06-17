import os from 'os';

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

export function resolveCpuCount(): number {
  try {
    const ap = (os as any).availableParallelism;
    if (typeof ap === 'function') {
      const n = Number(ap());
      if (Number.isFinite(n) && n > 0) return Math.floor(n);
    }
  } catch {}
  const n = Array.isArray(os.cpus()) ? os.cpus().length : 1;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
}

export function resolveMemoryGb(): number {
  const b = Number(os.totalmem());
  if (!Number.isFinite(b) || b <= 0) return 0;
  return b / 1024 / 1024 / 1024;
}

export function computeHardCap10(): number {
  const cpu = resolveCpuCount();
  const memGb = resolveMemoryGb();
  const capByCpu = cpu <= 1 ? 1 : cpu <= 2 ? 2 : cpu <= 4 ? 4 : cpu <= 8 ? 6 : 10;
  const capByMem = memGb > 0 && memGb < 2 ? 1 : memGb > 0 && memGb < 4 ? 2 : memGb > 0 && memGb < 8 ? 4 : memGb > 0 && memGb < 16 ? 6 : 10;
  return Math.max(1, Math.min(10, Math.min(capByCpu, capByMem)));
}

export function resolveWorkerConcurrency(maxConcurrency: number): number {
  const cpu = resolveCpuCount();
  const memGb = resolveMemoryGb();

  let conc = cpu <= 1 ? 1 : cpu <= 2 ? 1 : cpu <= 4 ? 2 : cpu <= 8 ? 3 : 4;
  if (memGb > 0 && memGb < 2) conc = 1;
  else if (memGb > 0 && memGb < 4) conc = Math.min(conc, 1);
  else if (memGb > 0 && memGb < 8) conc = Math.min(conc, 2);
  else if (memGb > 0 && memGb < 16) conc = Math.min(conc, 3);

  return clampInt(conc, 1, Math.max(1, Math.floor(maxConcurrency)));
}

