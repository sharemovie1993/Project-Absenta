import IORedis from 'ioredis';
import { exec } from 'child_process';
import os from 'os';

try {
  const dotenv = require('dotenv');
  dotenv.config();
} catch {}

type ControlEvent = {
  action: 'start' | 'stop' | 'restart';
  workerType: string;
  nodeId: string;
};

function canonicalizeNodeId(id: string): string {
  return String(id || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/_+/g, '-');
}

function resolveNodeId(): string {
  const env = process.env.NODE_ID || process.env.NODE_NAME || process.env.HOSTNAME || process.env.COMPUTERNAME || '';
  const base = env && String(env).trim() ? String(env) : os.hostname();
  return canonicalizeNodeId(base);
}

function toContainerName(workerType: string, instance: number): string {
  const base = `absenta-worker-${workerType}`;
  return instance <= 1 ? base : `${base}-${instance}`;
}

function run(cmd: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    exec(cmd, { windowsHide: true }, (err, stdout, stderr) => {
      if (err) return reject(err);
      resolve({ stdout: String(stdout || ''), stderr: String(stderr || '') });
    });
  });
}

async function getContainerStatus(name: string): Promise<string | null> {
  try {
    const { stdout } = await run(`docker inspect --format="{{.State.Status}}" ${name}`);
    const s = stdout.trim().replace(/(^"+|"+$)/g, '');
    return s || null;
  } catch {
    return null;
  }
}

async function containerExists(name: string): Promise<boolean> {
  const s = await getContainerStatus(name);
  return s != null;
}

async function isRunning(name: string): Promise<boolean> {
  const s = await getContainerStatus(name);
  return s === 'running';
}

async function countRunningInstances(workerType: string, maxInstances: number): Promise<number> {
  let count = 0;
  for (let i = 1; i <= maxInstances; i++) {
    const name = toContainerName(workerType, i);
    const exists = await containerExists(name);
    if (!exists) continue;
    const running = await isRunning(name);
    if (running) count++;
  }
  return count;
}

async function persistInstanceCount(redis: IORedis, nodeId: string, workerType: string, count: number): Promise<void> {
  const n = Math.max(0, Math.floor(count));
  const keyA = `agent:${nodeId}:${workerType}:instances`;
  const keyW = `worker:${nodeId}:${workerType}:instances`;
  await Promise.allSettled([
    redis.set(keyA, String(n), 'EX', 86400),
    redis.set(keyW, String(n), 'EX', 86400),
  ]);
}

async function startOne(redis: IORedis, nodeId: string, workerType: string, maxInstances: number): Promise<void> {
  for (let i = 1; i <= maxInstances; i++) {
    const name = toContainerName(workerType, i);
    const exists = await containerExists(name);
    if (!exists) continue;
    const running = await isRunning(name);
    if (!running) {
      await run(`docker start ${name}`);
      const cnt = await countRunningInstances(workerType, maxInstances);
      await persistInstanceCount(redis, nodeId, workerType, cnt);
      return;
    }
  }
  const cnt = await countRunningInstances(workerType, maxInstances);
  await persistInstanceCount(redis, nodeId, workerType, cnt);
}

async function stopOne(redis: IORedis, nodeId: string, workerType: string, maxInstances: number): Promise<void> {
  for (let i = maxInstances; i >= 1; i--) {
    const name = toContainerName(workerType, i);
    const exists = await containerExists(name);
    if (!exists) continue;
    const running = await isRunning(name);
    if (running) {
      await run(`docker stop ${name}`);
      const cnt = await countRunningInstances(workerType, maxInstances);
      await persistInstanceCount(redis, nodeId, workerType, cnt);
      return;
    }
  }
  await persistInstanceCount(redis, nodeId, workerType, 0);
}

async function handleEvent(redis: IORedis, selfNodeId: string, evt: ControlEvent, maxInstances: number): Promise<void> {
  const targetNode = canonicalizeNodeId(evt.nodeId);
  if (targetNode !== selfNodeId) return;

  const workerType = String(evt.workerType || '').trim();
  if (!workerType) return;

  if (workerType === 'backend-api') {
    if (evt.action === 'restart') {
      await run('docker restart absenta-backend-api');
    } else if (evt.action === 'start') {
      await run('docker start absenta-backend-api');
    } else {
      await run('docker stop absenta-backend-api');
    }
    return;
  }

  if (evt.action === 'start') {
    await startOne(redis, selfNodeId, workerType, maxInstances);
    return;
  }

  if (evt.action === 'stop') {
    await stopOne(redis, selfNodeId, workerType, maxInstances);
    return;
  }

  await run(`docker restart ${toContainerName(workerType, 1)}`);
  const cnt = await countRunningInstances(workerType, maxInstances);
  await persistInstanceCount(redis, selfNodeId, workerType, cnt);
}

async function main() {
  const nodeId = resolveNodeId();
  const url = String(process.env.REDIS_URL || '').trim() || 'redis://127.0.0.1:6379';
  const maxInstances = Math.max(1, Math.min(10, parseInt(String(process.env.AGENT_MAX_INSTANCES || '10'), 10) || 10));

  const sub = new IORedis(url, { maxRetriesPerRequest: null, enableReadyCheck: true });
  const cmd = new IORedis(url, { maxRetriesPerRequest: null, enableReadyCheck: true });

  const initialTypes = ['attendance', 'billing', 'notification', 'analytics', 'maintenance', 'infra', 'recurring', 'email'];
  for (const t of initialTypes) {
    try {
      const cnt = await countRunningInstances(t, maxInstances);
      await persistInstanceCount(cmd, nodeId, t, cnt);
    } catch {}
  }

  await sub.subscribe('infra-control');
  sub.on('message', (_channel, message) => {
    try {
      const evt = JSON.parse(String(message || '')) as ControlEvent;
      void handleEvent(cmd, nodeId, evt, maxInstances);
    } catch {}
  });
}

void main();
