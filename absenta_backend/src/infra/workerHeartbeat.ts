import { getNodeId } from './nodeId';
import path from 'path';
import fs from 'fs';
import type { RedisClient } from './redis/redisClient';

let started: Record<string, boolean> = {};

export function startWorkerHeartbeat(redis: RedisClient, name: string, intervalMs = 10000): void {
  if (started[name]) return;
  started[name] = true;
  const key = `worker:${name}:heartbeat`;
  setInterval(() => {
    try {
      void redis.set(key, String(Date.now()), 'EX', 30);
    } catch {}
  }, intervalMs);
}

export function startWorkerRegistryAndHeartbeat(
  redis: RedisClient,
  workerType:
    | 'email'
    | 'recurring'
    | 'billing'
    | 'notification'
    | 'attendance'
    | 'analytics'
    | 'maintenance'
    | 'infra'
    | 'pdf',
  intervalMs = 10000,
  opts?: { concurrency?: number; version?: string }
): void {
  const nodeId = getNodeId();
  const regKey = `worker:${nodeId}:${workerType}`;
  const hbKey = `worker:${nodeId}:${workerType}:heartbeat`;
  if (started[regKey]) return;
  started[regKey] = true;
  const resolveVersion = (): string => {
    if (opts?.version && String(opts.version).trim()) return String(opts.version).trim();
    if (process.env.WORKER_VERSION && String(process.env.WORKER_VERSION).trim()) return String(process.env.WORKER_VERSION).trim();
    if (process.env.APP_VERSION && String(process.env.APP_VERSION).trim()) return String(process.env.APP_VERSION).trim();
    try {
      const pkgPaths = [
        path.join(process.cwd(), 'package.json'),
        path.join(__dirname, '..', '..', 'package.json'),
        path.join(__dirname, '..', '..', '..', 'package.json'),
      ];
      for (const p of pkgPaths) {
        if (fs.existsSync(p)) {
          const raw = fs.readFileSync(p, 'utf8');
          const json = JSON.parse(raw);
          if (json?.version) return String(json.version);
        }
      }
    } catch {}
    return 'unknown';
  };
  const base = {
    nodeId,
    workerType,
    pid: process.pid,
    startedAt: Date.now(),
    version: resolveVersion(),
    concurrency: typeof opts?.concurrency === 'number' ? opts?.concurrency : workerType === 'recurring' ? 3 : 1,
  };
  const write = () => {
    try {
      void redis.set(regKey, JSON.stringify({ ...base, lastHeartbeat: Date.now() }), 'EX', 60);
      void redis.set(hbKey, String(Date.now()), 'EX', 30);
      void redis.set(`node:${nodeId}:heartbeat`, String(Date.now()), 'EX', 30);
    } catch {}
  };
  write();
  setInterval(write, intervalMs);
}
