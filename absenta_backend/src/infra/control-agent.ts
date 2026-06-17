import http from 'http';
import os from 'os';
import { createRedisConnection } from './redis/redisClient';
import { computeHardCap10 } from './auto-tune';

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

function dockerRequest(method: string, path: string, payload?: unknown): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    const body = payload == null ? null : JSON.stringify(payload);
    const req = http.request(
      {
        socketPath: '/var/run/docker.sock',
        method,
        path,
        headers: {
          'Content-Type': 'application/json',
          ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {}),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (d) => chunks.push(Buffer.isBuffer(d) ? d : Buffer.from(String(d))));
        res.on('end', () => resolve({ statusCode: res.statusCode || 0, body: Buffer.concat(chunks).toString('utf8') }));
      }
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function createContainerFromBase(baseName: string, newName: string): Promise<boolean> {
  try {
    const baseRes = await dockerRequest('GET', `/containers/${encodeURIComponent(baseName)}/json`);
    if (baseRes.statusCode < 200 || baseRes.statusCode >= 300) return false;
    const base = JSON.parse(baseRes.body || '{}');
    const image = String(base?.Config?.Image || base?.Image || '').trim();
    if (!image) return false;
    const cmd = Array.isArray(base?.Config?.Cmd) ? base.Config.Cmd : null;
    const env = Array.isArray(base?.Config?.Env) ? base.Config.Env : null;
    const workingDir = typeof base?.Config?.WorkingDir === 'string' ? base.Config.WorkingDir : undefined;
    const labels = typeof base?.Config?.Labels === 'object' && base.Config.Labels ? base.Config.Labels : undefined;
    const networkMode = typeof base?.HostConfig?.NetworkMode === 'string' && base.HostConfig.NetworkMode ? base.HostConfig.NetworkMode : undefined;
    const restartPolicy = base?.HostConfig?.RestartPolicy ? base.HostConfig.RestartPolicy : undefined;

    const body: any = {
      Image: image,
      Cmd: cmd || undefined,
      Env: env || undefined,
      WorkingDir: workingDir,
      Labels: labels,
      HostConfig: {
        NetworkMode: networkMode,
        RestartPolicy: restartPolicy,
      },
    };

    const createRes = await dockerRequest('POST', `/containers/create?name=${encodeURIComponent(newName)}`, body);
    if (createRes.statusCode === 409) {
      const startRes = await dockerRequest('POST', `/containers/${encodeURIComponent(newName)}/start`);
      return startRes.statusCode === 204 || startRes.statusCode === 304;
    }
    if (createRes.statusCode < 200 || createRes.statusCode >= 300) {
      console.log(`docker api create failed name=${newName} status=${createRes.statusCode} body=${String(createRes.body || '').slice(0, 200)}`);
      return false;
    }
    const created = JSON.parse(createRes.body || '{}');
    const id = String(created?.Id || '').trim();
    if (!id) return false;
    const startRes = await dockerRequest('POST', `/containers/${encodeURIComponent(id)}/start`);
    return startRes.statusCode === 204 || startRes.statusCode === 304;
  } catch {
    return false;
  }
}

async function getContainerStatus(name: string): Promise<string | null> {
  try {
    const encoded = encodeURIComponent(name);
    const res = await dockerRequest('GET', `/containers/${encoded}/json`);
    if (res.statusCode === 404) return null;
    if (res.statusCode < 200 || res.statusCode >= 300) return null;
    const data = JSON.parse(res.body || '{}');
    const s = String(data?.State?.Status || '').trim();
    return s || null;
  } catch {
    return null;
  }
}

async function getContainerEnv(name: string): Promise<Record<string, string>> {
  try {
    const encoded = encodeURIComponent(name);
    const res = await dockerRequest('GET', `/containers/${encoded}/json`);
    if (res.statusCode < 200 || res.statusCode >= 300) return {};
    const data = JSON.parse(res.body || '{}');
    const envList: string[] = Array.isArray(data?.Config?.Env) ? data.Config.Env : [];
    const out: Record<string, string> = {};
    for (const item of envList) {
      const idx = String(item).indexOf('=');
      if (idx <= 0) continue;
      const k = String(item).slice(0, idx);
      const v = String(item).slice(idx + 1);
      out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

async function deleteContainer(name: string): Promise<boolean> {
  try {
    const res = await dockerRequest('DELETE', `/containers/${encodeURIComponent(name)}?force=true`);
    return res.statusCode >= 200 && res.statusCode < 300;
  } catch {
    return false;
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

async function persistInstanceCount(redis: any, nodeId: string, workerType: string, count: number): Promise<void> {
  const n = Math.max(0, Math.floor(count));
  const keyA = `agent:${nodeId}:${workerType}:instances`;
  const keyW = `worker:${nodeId}:${workerType}:instances`;
  await Promise.allSettled([redis.set(keyA, String(n), 'EX', 86400), redis.set(keyW, String(n), 'EX', 86400)]);
}

async function startOne(redis: any, nodeId: string, workerType: string, maxInstances: number): Promise<void> {
  let firstMissing: string | null = null;
  for (let i = 1; i <= maxInstances; i++) {
    const name = toContainerName(workerType, i);
    const exists = await containerExists(name);
    if (!exists) {
      if (!firstMissing) firstMissing = name;
      continue;
    }
    if (i > 1) {
      const env = await getContainerEnv(name);
      const redisUrl = String(env.REDIS_URL || '').trim();
      const invalidRedis =
        !redisUrl || /127\.0\.0\.1|localhost/i.test(redisUrl);
      if (invalidRedis) {
        console.log(`docker api recreate invalid container ${name} (bad REDIS_URL)`);
        await deleteContainer(name);
        if (!firstMissing) firstMissing = name;
        continue;
      }
    }
    const running = await isRunning(name);
    if (!running) {
      console.log(`docker api start ${name}`);
      const encoded = encodeURIComponent(name);
      const res = await dockerRequest('POST', `/containers/${encoded}/start`);
      if (res.statusCode !== 204 && res.statusCode !== 304) {
        console.log(`docker api start failed name=${name} status=${res.statusCode}`);
      }
      const cnt = await countRunningInstances(workerType, maxInstances);
      await persistInstanceCount(redis, nodeId, workerType, cnt);
      return;
    }
  }
  if (firstMissing) {
    const baseName = toContainerName(workerType, 1);
    console.log(`docker api create+start ${firstMissing} from base ${baseName}`);
    const ok = await createContainerFromBase(baseName, firstMissing);
    if (!ok) console.log(`docker api create failed name=${firstMissing}`);
  }
  const cnt = await countRunningInstances(workerType, maxInstances);
  await persistInstanceCount(redis, nodeId, workerType, cnt);
}

async function stopOne(redis: any, nodeId: string, workerType: string, maxInstances: number): Promise<void> {
  for (let i = maxInstances; i >= 1; i--) {
    const name = toContainerName(workerType, i);
    const exists = await containerExists(name);
    if (!exists) continue;
    const running = await isRunning(name);
    if (running) {
      console.log(`docker api stop ${name}`);
      const encoded = encodeURIComponent(name);
      const res = await dockerRequest('POST', `/containers/${encoded}/stop?t=10`);
      if (res.statusCode !== 204 && res.statusCode !== 304) {
        console.log(`docker api stop failed name=${name} status=${res.statusCode}`);
      }
      const cnt = await countRunningInstances(workerType, maxInstances);
      await persistInstanceCount(redis, nodeId, workerType, cnt);
      return;
    }
  }
  await persistInstanceCount(redis, nodeId, workerType, 0);
}

async function handleEvent(redis: any, selfNodeId: string, evt: ControlEvent, maxInstances: number): Promise<void> {
  const handleAllNodes = String(process.env.AGENT_HANDLE_ALL_NODES || '').toLowerCase() === 'true';
  const targetNode = canonicalizeNodeId(evt.nodeId);
  if (!handleAllNodes && targetNode !== selfNodeId) return;

  const workerType = String(evt.workerType || '').trim();
  if (!workerType) return;

  console.log(`received infra-control event action=${evt.action} workerType=${workerType} nodeId=${targetNode}`);

  const persistNodeId = targetNode || selfNodeId;

  if (workerType === 'backend-api') {
    if (evt.action === 'restart') {
      console.log('docker api restart absenta-backend-api');
      const res = await dockerRequest('POST', `/containers/${encodeURIComponent('absenta-backend-api')}/restart?t=10`);
      if (res.statusCode !== 204) console.log(`docker api restart failed status=${res.statusCode}`);
    } else if (evt.action === 'start') {
      console.log('docker api start absenta-backend-api');
      const res = await dockerRequest('POST', `/containers/${encodeURIComponent('absenta-backend-api')}/start`);
      if (res.statusCode !== 204 && res.statusCode !== 304) console.log(`docker api start failed status=${res.statusCode}`);
    } else {
      console.log('docker api stop absenta-backend-api');
      const res = await dockerRequest('POST', `/containers/${encodeURIComponent('absenta-backend-api')}/stop?t=10`);
      if (res.statusCode !== 204 && res.statusCode !== 304) console.log(`docker api stop failed status=${res.statusCode}`);
    }
    return;
  }

  if (evt.action === 'start') {
    await startOne(redis, persistNodeId, workerType, maxInstances);
    return;
  }

  if (evt.action === 'stop') {
    await stopOne(redis, persistNodeId, workerType, maxInstances);
    return;
  }

  const name = toContainerName(workerType, 1);
  console.log(`docker api restart ${name}`);
  const res = await dockerRequest('POST', `/containers/${encodeURIComponent(name)}/restart?t=10`);
  if (res.statusCode !== 204) console.log(`docker api restart failed name=${name} status=${res.statusCode}`);
  const cnt = await countRunningInstances(workerType, maxInstances);
  await persistInstanceCount(redis, persistNodeId, workerType, cnt);
}

async function main() {
  const nodeId = resolveNodeId();
  const configured = parseInt(String(process.env.AGENT_MAX_INSTANCES || '10'), 10);
  const cfg = Number.isFinite(configured) ? Math.max(1, Math.min(10, Math.floor(configured))) : 10;
  const hardCap = computeHardCap10();
  const maxInstances = Math.max(1, Math.min(cfg, hardCap));

  const sub: any = createRedisConnection();
  const cmd: any = createRedisConnection();
  const chains = new Map<string, Promise<void>>();
  const enqueue = (key: string, fn: () => Promise<void>) => {
    const prev = chains.get(key) || Promise.resolve();
    const next = prev
      .catch(() => {})
      .then(fn)
      .finally(() => {
        if (chains.get(key) === next) chains.delete(key);
      });
    chains.set(key, next);
  };

  const initialTypes = ['attendance', 'billing', 'notification', 'analytics', 'maintenance', 'infra', 'recurring', 'email'];
  for (const t of initialTypes) {
    try {
      const cnt = await countRunningInstances(t, maxInstances);
      await persistInstanceCount(cmd, nodeId, t, cnt);
    } catch {}
  }

  await sub.subscribe('infra-control');
  sub.on('message', (_channel: any, message: any) => {
    try {
      const evt = JSON.parse(String(message || '')) as ControlEvent;
      const wt = String(evt.workerType || '').trim() || 'unknown';
      const nid = canonicalizeNodeId(evt.nodeId);
      enqueue(`${nid}:${wt}`, () => handleEvent(cmd, nodeId, evt, maxInstances));
    } catch (e) {
      console.log('control-agent: invalid message', String((e as any)?.message || e));
    }
  });
}

void main();
