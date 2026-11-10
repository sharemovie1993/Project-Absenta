import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { getUserNotifications, getUserNotificationPreferences } from '../api/notifications.api';
import type { NotificationStatsResponse } from '../types/notification';

interface UseNotificationsOptions {
  pollIntervalMs?: number;
  storageKey?: string; // key untuk localStorage unread tracking
}

export function useNotifications(options?: UseNotificationsOptions) {
  const pollIntervalMs = options?.pollIntervalMs ?? 60000;
  const storageKey = options?.storageKey ?? 'notifications_read_ids';
  const { user } = useAuth();
  const userScopedPrefsKey = `notif_prefs_${user?.id || 'anon'}`;

  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      const arr = raw ? (JSON.parse(raw) as string[]) : [];
      return new Set(arr);
    } catch {
      return new Set<string>();
    }
  });

  // 1. Scoped & Deduplicated Notifications Query
  const {
    data: notifRes,
    isLoading: loading,
    error: queryError,
    refetch: reload,
  } = useQuery({
    queryKey: ['notifications', 'my', user?.id],
    queryFn: () => getUserNotifications({ headers: { 'X-Skip-403-Redirect': 'true' } }),
    enabled: !!user?.id,
    staleTime: 30000,
    refetchInterval: pollIntervalMs,
    refetchOnWindowFocus: false,
  });

  // 2. Scoped Preferences Query (Disabled on initial load to avoid blocking main thread)
  useQuery({
    queryKey: ['notifications', 'preferences', user?.id],
    queryFn: async () => {
      const p = await getUserNotificationPreferences();
      const next = p?.data || { enabledTypes: { ATTENDANCE: true }, digestFrequency: 'NONE' };
      try {
        localStorage.setItem(userScopedPrefsKey, JSON.stringify(next));
      } catch {}
      return next;
    },
    enabled: false,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const recent: NotificationStatsResponse['data']['recentNotifications'] = useMemo(() => {
    if (notifRes?.success && Array.isArray(notifRes.data?.recentNotifications)) {
      return notifRes.data.recentNotifications.slice(0, 50);
    }
    return [];
  }, [notifRes]);

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

  return {
    recent,
    loading,
    error: queryError ? 'Gagal memuat notifikasi' : null,
    unreadCount,
    markAsReadLocal,
    markAllAsReadLocal,
    isUnread,
    reload,
  };
}
