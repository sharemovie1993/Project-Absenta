import crypto from 'crypto';
import { getRedisConnection } from '../../queue/redis';
import { getNodeId } from '../nodeId';

type LockHandle = {
  key: string;
  value: string;
};

export async function acquireLock(lockKey: string, ttlSeconds: number): Promise<LockHandle | null> {
  const key = String(lockKey || '').trim();
  const ttl = Number.isFinite(Number(ttlSeconds)) && Number(ttlSeconds) > 0 ? Math.floor(Number(ttlSeconds)) : 1;
  if (!key) throw new Error('lockKey is required');

  const redis = getRedisConnection();
  const nodeId = getNodeId();
  const value = `${nodeId}:${process.pid}:${crypto.randomUUID()}`;
  const res = await (redis as any).set(key, value, 'NX', 'EX', ttl);
  if (res !== 'OK') return null;
  return { key, value };
}

export async function releaseLock(handle: LockHandle | null | undefined): Promise<boolean> {
  if (!handle) return false;
  const key = String(handle.key || '').trim();
  const value = String(handle.value || '').trim();
  if (!key || !value) return false;

  const redis = getRedisConnection();
  const lua = `
    if redis.call("GET", KEYS[1]) == ARGV[1] then
      return redis.call("DEL", KEYS[1])
    else
      return 0
    end
  `;
  try {
    const res = await (redis as any).eval(lua, 1, key, value);
    return Number(res) === 1;
  } catch {
    return false;
  }
}

