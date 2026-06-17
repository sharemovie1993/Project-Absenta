import { getRedisConnection } from '../infra/redis/redisClient';

const isDebugLog = () => String(process.env.LOG_LEVEL || '').toLowerCase() === 'debug';

/**
 * 🗄️ Cache Service
 * Mengelola operasi caching dengan Redis sebagai backend
 * Fallback ke memory cache jika Redis tidak tersedia
 */
export class CacheService {
  private static instance: CacheService;
  private memoryCache: Map<string, { data: any; expiry: number }> = new Map();
  private readonly DEFAULT_TTL = 300; // 5 menit dalam detik

  private constructor() {}

  /**
   * Singleton pattern untuk Cache Service
   */
  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * 📥 Menyimpan data ke cache
   * @param key - Cache key
   * @param data - Data yang akan disimpan
   * @param ttl - Time to live dalam detik (default: 5 menit)
   */
  async set(key: string, data: any, ttl: number = this.DEFAULT_TTL): Promise<void> {
    try {
      const serializedData = JSON.stringify(data);
      
      // Coba gunakan Redis terlebih dahulu
      try {
        const redis = getRedisConnection();
        await (redis as any).setex(key, ttl, serializedData);
        if (isDebugLog()) console.log(`✅ Cache SET (Redis): ${key} (TTL: ${ttl}s)`);
        return;
      } catch {}

      // Fallback ke memory cache
      const expiry = Date.now() + (ttl * 1000);
      this.memoryCache.set(key, { data, expiry });
      if (isDebugLog()) console.log(`✅ Cache SET (Memory): ${key} (TTL: ${ttl}s)`);
      
    } catch (error) {
      console.error(`❌ Cache SET Error for key ${key}:`, error);
      // Fallback ke memory cache jika Redis error
      const expiry = Date.now() + (ttl * 1000);
      this.memoryCache.set(key, { data, expiry });
    }
  }

  /**
   * 📤 Mengambil data dari cache
   * @param key - Cache key
   * @returns Data dari cache atau null jika tidak ada/expired
   */
  async get<T = any>(key: string): Promise<T | null> {
    try {
      // Coba ambil dari Redis terlebih dahulu
      try {
        const redis = getRedisConnection();
        const data = await (redis as any).get(key);
        if (data) {
          if (isDebugLog()) console.log(`✅ Cache HIT (Redis): ${key}`);
          return JSON.parse(data) as T;
        }
      } catch {}

      // Fallback ke memory cache
      const cached = this.memoryCache.get(key);
      if (cached) {
        if (Date.now() < cached.expiry) {
          if (isDebugLog()) console.log(`✅ Cache HIT (Memory): ${key}`);
          return cached.data as T;
        } else {
          // Data expired, hapus dari memory cache
          this.memoryCache.delete(key);
          if (isDebugLog()) console.log(`⏰ Cache EXPIRED (Memory): ${key}`);
        }
      }

      if (isDebugLog()) console.log(`❌ Cache MISS: ${key}`);
      return null;
      
    } catch (error) {
      console.error(`❌ Cache GET Error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * 🗑️ Menghapus data dari cache
   * @param key - Cache key
   */
  async delete(key: string): Promise<void> {
    try {
      // Hapus dari Redis
      try {
        const redis = getRedisConnection();
        await (redis as any).del(key);
      } catch {}

      // Hapus dari memory cache
      this.memoryCache.delete(key);
      if (isDebugLog()) console.log(`🗑️ Cache DELETE: ${key}`);
      
    } catch (error) {
      console.error(`❌ Cache DELETE Error for key ${key}:`, error);
    }
  }

  /**
   * 🧹 Menghapus semua cache dengan pattern tertentu
   * @param pattern - Pattern untuk key (contoh: "tenant:123:*")
   */
  async deletePattern(pattern: string): Promise<void> {
    try {
      // Hapus dari Redis dengan pattern
      try {
        const redis = getRedisConnection();
        let cursor = '0';
        const batch: string[] = [];
        do {
          const res = await (redis as any).scan(cursor, 'MATCH', pattern, 'COUNT', 200);
          cursor = String(res?.[0] ?? '0');
          const keys: string[] = Array.isArray(res?.[1]) ? res[1] : [];
          for (const k of keys) {
            batch.push(k);
            if (batch.length >= 500) {
              await (redis as any).del(...batch);
              batch.length = 0;
            }
          }
        } while (cursor !== '0');
        if (batch.length > 0) {
          await (redis as any).del(...batch);
        }
      } catch {}

      // Hapus dari memory cache dengan pattern
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      for (const key of this.memoryCache.keys()) {
        if (regex.test(key)) {
          this.memoryCache.delete(key);
        }
      }
      
      if (isDebugLog()) console.log(`🧹 Cache DELETE PATTERN: ${pattern}`);
      
    } catch (error) {
      console.error(`❌ Cache DELETE PATTERN Error for ${pattern}:`, error);
    }
  }

  /**
   * 🔄 Cache dengan auto-refresh
   * Mengambil data dari cache, jika tidak ada maka eksekusi function dan simpan hasilnya
   * @param key - Cache key
   * @param fetchFunction - Function untuk mengambil data fresh
   * @param ttl - Time to live dalam detik
   */
  async getOrSet<T>(
    key: string, 
    fetchFunction: () => Promise<T>, 
    ttl: number = this.DEFAULT_TTL
  ): Promise<T> {
    try {
      // Coba ambil dari cache terlebih dahulu
      const cached = await this.get<T>(key);
      if (cached !== null) {
        return cached;
      }

      const g: any = globalThis as any;
      if (!g.__cacheLocks) g.__cacheLocks = new Map<string, Promise<any>>();
      let lock = g.__cacheLocks.get(key);
      if (!lock) {
        if (isDebugLog()) console.log(`🔄 Cache REFRESH: ${key}`);
        lock = (async () => {
          const freshData = await fetchFunction();
          await this.set(key, freshData, ttl);
          return freshData;
        })().finally(() => {
          g.__cacheLocks.delete(key);
        });
        g.__cacheLocks.set(key, lock);
      }

      return await (lock as Promise<T>);
      
    } catch (error) {
      console.error(`❌ Cache GET_OR_SET Error for key ${key}:`, error);
      // Jika error, tetap coba ambil data fresh
      return await fetchFunction();
    }
  }

  /**
   * 📊 Mendapatkan statistik cache
   */
  getCacheStats() {
    const redisConnected = (() => {
      try {
        const redis = getRedisConnection() as any;
        return String(redis?.status || '') === 'ready';
      } catch {
        return false;
      }
    })();
    return {
      memoryCache: {
        size: this.memoryCache.size,
        keys: Array.from(this.memoryCache.keys())
      },
      redis: {
        connected: redisConnected
      }
    };
  }

  /**
   * 🧹 Membersihkan expired entries dari memory cache
   */
  cleanupExpiredEntries(): void {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, value] of this.memoryCache.entries()) {
      if (now >= value.expiry) {
        this.memoryCache.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      if (isDebugLog()) console.log(`🧹 Cleaned up ${cleanedCount} expired cache entries`);
    }
  }
}

// Export singleton instance
export const cacheService = CacheService.getInstance();

if (!process.env.JEST_WORKER_ID && process.env.NODE_ENV !== 'test') {
  setInterval(() => {
    cacheService.cleanupExpiredEntries();
  }, 10 * 60 * 1000);
}
