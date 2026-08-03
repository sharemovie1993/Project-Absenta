import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'piket_exited_gate_ids';
const EVENT_NAME = 'piket_gate_store_updated';

/**
 * Reactive custom hook to read & update confirmed gate exit permit IDs across browser windows & components
 */
export function usePiketGateStore() {
  const [exitedGateIds, setExitedGateIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Cross-tab / Window Storage Event Listener for zero-delay synchronization across open tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue !== null) {
        try {
          setExitedGateIds(JSON.parse(e.newValue));
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Listen to same-window custom events
  useEffect(() => {
    const handleLocalUpdate = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        setExitedGateIds(saved ? JSON.parse(saved) : []);
      } catch {}
    };
    window.addEventListener(EVENT_NAME, handleLocalUpdate);
    return () => window.removeEventListener(EVENT_NAME, handleLocalUpdate);
  }, []);

  const confirmGateExit = useCallback((id: string) => {
    setExitedGateIds(prev => {
      const next = Array.from(new Set([...prev, id]));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        window.dispatchEvent(new Event(EVENT_NAME));
      } catch {}
      return next;
    });
  }, []);

  const removeGateExit = useCallback((id: string) => {
    setExitedGateIds(prev => {
      const next = prev.filter(x => x !== id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        window.dispatchEvent(new Event(EVENT_NAME));
      } catch {}
      return next;
    });
  }, []);

  return {
    exitedGateIds,
    confirmGateExit,
    removeGateExit,
  };
}
