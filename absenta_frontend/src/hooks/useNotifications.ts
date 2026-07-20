import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './useAuth';
import { getUserNotifications, getUserNotificationPreferences, getNotificationServiceStatus } from '../api/notifications.api';
import { LogService } from '../utils/LogService';
import type { NotificationStatsResponse } from '../types/notification';

interface UseNotificationsOptions {
  pollIntervalMs?: number;
  storageKey?: string; // key untuk localStorage unread tracking
}

export function useNotifications(options?: UseNotificationsOptions) {
  const pollIntervalMs = options?.pollIntervalMs ?? 60000;
  const storageKey = options?.storageKey ?? 'notifications_read_ids';
  const { user, isTokenValid, refreshAccessToken } = useAuth();
  const userScopedPrefsKey = `notif_prefs_${user?.id || 'anon'}`;

  const [recent, setRecent] = useState<NotificationStatsResponse['data']['recentNotifications']>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [serviceAvailable, setServiceAvailable] = useState<boolean>(true);
  const [prefs, setPrefs] = useState<{ enabledTypes: Record<string, boolean>; digestFrequency: 'NONE' | 'DAILY' | 'WEEKLY' }>(() => {
    try {
      const raw = localStorage.getItem(userScopedPrefsKey);
      const json = raw ? JSON.parse(raw) : null;
      const enabledTypes = json?.enabledTypes || { ATTENDANCE: true };
      const digestFrequency = json?.digestFrequency || 'NONE';
      return { enabledTypes, digestFrequency };
    } catch {
      return { enabledTypes: { ATTENDANCE: true }, digestFrequency: 'NONE' };
    }
  });

  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      const arr = raw ? (JSON.parse(raw) as string[]) : [];
      return new Set(arr);
    } catch {
      return new Set<string>();
    }
  });

  const unreadCount = useMemo(() => {
    return recent.filter((n) => !readIds.has(n.id)).length;
  }, [recent, readIds]);

  const saveReadIds = (ids: string[]) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(ids));
      setReadIds(new Set(ids));
    } catch (err) {
      console.warn('Failed to persist read IDs:', err);
    }
  };

  const markAsReadLocal = (id: string) => {
    const next = new Set(readIds);
    next.add(id);
    saveReadIds(Array.from(next));
  };

  const markAllAsReadLocal = () => {
    const next = new Set(readIds);
    recent.forEach((n) => next.add(n.id));
    saveReadIds(Array.from(next));
  };

  const isUnread = (id: string) => {
    return !readIds.has(id);
  };

  const inFlightRef = useRef(false);
  const load = async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      if (!serviceAvailable) {
        setRecent([]);
        setLoading(false);
        inFlightRef.current = false;
        return;
      }
      setLoading(true);
      setError(null);
      const res = await getUserNotifications({ headers: { 'X-Skip-403-Redirect': 'true' } });
      if (res.success) {
        const base = res.data.recentNotifications || [];
        setRecent(base.slice(0, 50));
      }
    } catch (err: any) {
      LogService.error('useNotifications load error:', err, 'useNotifications');
      setError('Gagal memuat notifikasi');
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  };

  useEffect(() => {
    let mounted = true;
    const roleName = user?.role?.name || '';
    if (roleName && roleName !== 'SUPERADMIN') {
      setServiceAvailable(true);
      return () => {
        mounted = false;
      };
    }
    (async () => {
      try {
        const status = await getNotificationServiceStatus({ headers: { 'X-Skip-403-Redirect': 'true' } });
        if (mounted) setServiceAvailable(!!status?.success);
      } catch {
        if (mounted) setServiceAvailable(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user?.role?.name]);

  useEffect(() => {
    let mounted = true;
    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    const stopPolling = () => {
      if (pollTimer) clearTimeout(pollTimer);
      pollTimer = null;
    };

    const schedulePoll = () => {
      stopPolling();
      pollTimer = setTimeout(async () => {
        if (cancelled) return;
        await load();
        if (cancelled) return;
        schedulePoll();
      }, Math.max(15000, pollIntervalMs));
    };

    (async () => {
      try {
        const p = await getUserNotificationPreferences();
        const next = p?.data || { enabledTypes: { ATTENDANCE: true }, digestFrequency: 'NONE' };
        localStorage.setItem(userScopedPrefsKey, JSON.stringify(next));
        if (mounted) setPrefs(next);
      } catch {}
    })();

    // initial fetch
    (async () => {
      await load();
      if (!cancelled) schedulePoll();
    })();

    return () => {
      stopPolling();
      cancelled = true;
      mounted = false;
    };
  }, [pollIntervalMs, user?.id]);

  return {
    recent,
    loading,
    error,
    unreadCount,
    markAsReadLocal,
    markAllAsReadLocal,
    isUnread,
    reload: load,
  };
}

