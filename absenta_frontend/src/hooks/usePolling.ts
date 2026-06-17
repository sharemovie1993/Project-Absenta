import { useEffect, useRef, useCallback } from 'react';

interface UsePollingOptions {
  interval: number; // dalam milliseconds
  enabled?: boolean;
  immediate?: boolean; // jalankan segera saat hook dimount
}

/**
 * Custom hook untuk polling data secara berkala
 * @param callback - Fungsi yang akan dipanggil secara berkala
 * @param options - Konfigurasi polling
 */
export function usePolling(
  callback: () => void | Promise<void>,
  options: UsePollingOptions
) {
  const { interval, enabled = true, immediate = false } = options;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callbackRef = useRef(callback);

  // Update callback ref ketika callback berubah
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const startPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current as any);
    }

    intervalRef.current = setInterval(() => {
      callbackRef.current();
    }, interval);
  }, [interval]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current as any);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      // Jalankan segera jika immediate = true
      if (immediate) {
        callbackRef.current();
      }
      
      // Mulai polling
      startPolling();
    } else {
      stopPolling();
    }

    // Cleanup saat unmount atau dependency berubah
    return () => {
      stopPolling();
    };
  }, [enabled, startPolling, stopPolling, immediate]);

  return {
    startPolling,
    stopPolling,
    isPolling: intervalRef.current !== null
  };
}
