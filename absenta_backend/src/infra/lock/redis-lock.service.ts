import { randomUUID } from 'crypto';
import { RedisClient, createRedisConnection } from '../redis/redisClient';

export class RedisLockService {
  private static instance: RedisLockService;
  private redis: RedisClient;

  private constructor() {
    this.redis = createRedisConnection();
  }

  static getInstance(): RedisLockService {
    if (!RedisLockService.instance) {
      RedisLockService.instance = new RedisLockService();
    }
    return RedisLockService.instance;
  }

  /**
   * Acquire a distributed lock.
   * @param key Lock key
   * @param ttlMs Time to live in milliseconds
   * @returns Object containing success status and token if successful
   */
  async acquire(key: string, ttlMs: number): Promise<{ success: boolean; token?: string }> {
    const token = randomUUID();
    // SET key token PX ttlMs NX
    const result = await this.redis.set(key, token, 'PX', ttlMs, 'NX');
    
    if (result === 'OK') {
      return { success: true, token };
    }
    return { success: false };
  }

  /**
   * Release a distributed lock securely (only if token matches).
   * Uses Lua script to ensure atomicity.
   * @param key Lock key
   * @param token Token received during acquisition
   */
  async release(key: string, token: string): Promise<void> {
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    await this.redis.eval(script, 1, key, token);
  }

  /**
   * Extend a lock's TTL (Heartbeat).
   * Only extends if token matches.
   * @param key Lock key
   * @param token Token received during acquisition
   * @param ttlMs New TTL in milliseconds
   */
  async extend(key: string, token: string, ttlMs: number): Promise<void> {
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("pexpire", KEYS[1], ARGV[2])
      else
        return 0
      end
    `;
    await this.redis.eval(script, 1, key, token, ttlMs);
  }
  /**
   * Verify if a lock is still valid and held by the provided token.
   * @param key Lock key
   * @param token Token to verify
   * @returns boolean
   */
  async verify(key: string, token: string): Promise<boolean> {
    const value = await this.redis.get(key);
    return value === token;
  }
}

export const redisLockService = RedisLockService.getInstance();
