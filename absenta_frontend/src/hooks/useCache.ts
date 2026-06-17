import { useState, useEffect, useCallback, useRef } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds (default: 5 minutes)
  maxSize?: number; // Maximum cache size (default: 100)
  staleWhileRevalidate?: boolean; // Return stale data while fetching new data
}

/**
 * Hook untuk caching data dengan TTL dan optimasi performa
 */
export function useCache<T>(options: CacheOptions = {}) {
  const {
    ttl = 5 * 60 * 1000, // 5 menit default
    maxSize = 100,
    staleWhileRevalidate = true
  } = options;

  const cacheRef = useRef<Map<string, CacheEntry<T>>>(new Map());
  const [cacheStats, setCacheStats] = useState({
    hits: 0,
    misses: 0,
    size: 0
  });

  // Cleanup expired entries
  const cleanupExpired = useCallback(() => {
    const now = Date.now();
    const cache = cacheRef.current;
    const keysToDelete: string[] = [];

    cache.forEach((entry, key) => {
      if (entry.expiresAt < now) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => cache.delete(key));

    setCacheStats(prev => ({
      ...prev,
      size: cache.size
    }));
  }, []);

  // Set cache entry
  const set = useCallback((key: string, data: T) => {
    const cache = cacheRef.current;
    const now = Date.now();

    // Remove oldest entries if cache is full
    if (cache.size >= maxSize) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey) {
        cache.delete(oldestKey);
      }
    }

    cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttl
    });

    setCacheStats(prev => ({
      ...prev,
      size: cache.size
    }));
  }, [maxSize, ttl]);

  // Get cache entry
  const get = useCallback((key: string): { data: T | null; isStale: boolean; exists: boolean } => {
    const cache = cacheRef.current;
    const entry = cache.get(key);
    const now = Date.now();

    if (!entry) {
      setCacheStats(prev => ({
        ...prev,
        misses: prev.misses + 1
      }));
      return { data: null, isStale: false, exists: false };
    }

    const isExpired = entry.expiresAt < now;
    const isStale = isExpired || (now - entry.timestamp) > (ttl * 0.8); // Consider stale at 80% of TTL

    setCacheStats(prev => ({
      ...prev,
      hits: prev.hits + 1
    }));

    if (isExpired && !staleWhileRevalidate) {
      cache.delete(key);
      setCacheStats(prev => ({
        ...prev,
        size: cache.size
      }));
      return { data: null, isStale: true, exists: false };
    }

    return { 
      data: entry.data, 
      isStale: isStale, 
      exists: true 
    };
  }, [ttl, staleWhileRevalidate]);

  // Delete cache entry
  const del = useCallback((key: string) => {
    const cache = cacheRef.current;
    const deleted = cache.delete(key);
    
    if (deleted) {
      setCacheStats(prev => ({
        ...prev,
        size: cache.size
      }));
    }
    
    return deleted;
  }, []);

  // Clear all cache
  const clear = useCallback(() => {
    cacheRef.current.clear();
    setCacheStats({
      hits: 0,
      misses: 0,
      size: 0
    });
  }, []);

  // Get cache keys
  const keys = useCallback(() => {
    return Array.from(cacheRef.current.keys());
  }, []);

  // Check if key exists
  const has = useCallback((key: string) => {
    const { exists } = get(key);
    return exists;
  }, [get]);

  // Get cache hit ratio
  const getHitRatio = useCallback(() => {
    const total = cacheStats.hits + cacheStats.misses;
    return total > 0 ? cacheStats.hits / total : 0;
  }, [cacheStats]);

  // Periodic cleanup
  useEffect(() => {
    const interval = setInterval(cleanupExpired, 60000); // Cleanup every minute
    return () => clearInterval(interval);
  }, [cleanupExpired]);

  return {
    set,
    get,
    del,
    clear,
    keys,
    has,
    stats: cacheStats,
    hitRatio: getHitRatio(),
    cleanupExpired
  };
}

/**
 * Hook untuk caching dengan fetch function
 */
export function useCachedFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: CacheOptions & {
    enabled?: boolean;
    refetchOnMount?: boolean;
    refetchOnWindowFocus?: boolean;
  } = {}
) {
  const {
    enabled = true,
    refetchOnMount = false,
    refetchOnWindowFocus = false,
    ...cacheOptions
  } = options;

  const cache = useCache<T>(cacheOptions);
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isStale, setIsStale] = useState(false);

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!enabled) return;

    try {
      // Check cache first
      if (!forceRefresh) {
        const cached = cache.get(key);
        if (cached.exists && cached.data) {
          setData(cached.data);
          setIsStale(cached.isStale);
          
          // If data is not stale, return early
          if (!cached.isStale) {
            return cached.data;
          }
        }
      }

      setLoading(true);
      setError(null);

      const result = await fetchFn();
      
      // Update cache
      cache.set(key, result);
      setData(result);
      setIsStale(false);
      
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      
      // If we have stale data, keep it
      const cached = cache.get(key);
      if (cached.exists && cached.data) {
        setData(cached.data);
        setIsStale(true);
      }
      
      throw error;
    } finally {
      setLoading(false);
    }
  }, [enabled, key, fetchFn, cache]);

  // Refetch function
  const refetch = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  // Invalidate cache
  const invalidate = useCallback(() => {
    cache.del(key);
    setData(null);
    setIsStale(false);
  }, [cache, key]);

  // Initial fetch
  useEffect(() => {
    if (enabled && (refetchOnMount || !data)) {
      fetchData();
    }
  }, [enabled, refetchOnMount, fetchData]);

  // Window focus refetch
  useEffect(() => {
    if (!refetchOnWindowFocus) return;

    const handleFocus = () => {
      if (enabled && isStale) {
        fetchData();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [enabled, refetchOnWindowFocus, isStale, fetchData]);

  return {
    data,
    loading,
    error,
    isStale,
    refetch,
    invalidate,
    cacheStats: cache.stats,
    hitRatio: cache.hitRatio
  };
}