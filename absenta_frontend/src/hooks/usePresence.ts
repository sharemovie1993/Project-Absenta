import { useState, useEffect, useCallback } from 'react';
import { presenceApi, PresenceSummary, PresenceUser } from '../api/presence.api';
import { socketService } from '../services/socket.service';

export function usePresence() {
  const [summary, setSummary] = useState<PresenceSummary | null>(null);
  const [activeCount, setActiveCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await presenceApi.getActiveUsers();
      setSummary(data);
      setActiveCount(data?.totalActiveUsers || 0);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat status user aktif');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();

    const handleCountUpdate = (payload: any) => {
      const count = Number(payload?.activeUsers ?? payload?.totalOnline ?? payload?.count);
      if (!isNaN(count)) {
        setActiveCount(count);
      }
    };

    const handleUserOnline = (rawUser: any) => {
      let role = String(rawUser?.role || rawUser?.roleName || '').trim().toUpperCase();
      if (!role || role === 'UNDEFINED' || role === 'NULL') {
        role = 'ADMIN';
      }
      const user: PresenceUser = {
        userId: String(rawUser?.userId || rawUser?.id || ''),
        name: String(rawUser?.name || rawUser?.full_name || 'Pengguna'),
        role,
        roleName: role,
        tabsCount: Number(rawUser?.tabsCount || rawUser?.sessionCount || 1),
        connectedAt: rawUser?.connectedAt || new Date().toISOString()
      };

      setSummary(prev => {
        if (!prev) return prev;
        const exists = prev.users.some(u => u.userId === user.userId);
        const updatedUsers = exists
          ? prev.users.map(u => (u.userId === user.userId ? user : u))
          : [user, ...prev.users];
        
        const roleCounts: Record<string, number> = {};
        for (const [r, cnt] of Object.entries(prev.roleCounts || {})) {
          let cleanR = String(r || '').trim().toUpperCase();
          if (cleanR && cleanR !== 'UNDEFINED' && cleanR !== 'NULL') {
            roleCounts[cleanR] = (roleCounts[cleanR] || 0) + Number(cnt || 0);
          }
        }
        if (!exists) {
          roleCounts[role] = (roleCounts[role] || 0) + 1;
        }

        return {
          ...prev,
          totalActiveUsers: updatedUsers.length,
          totalOnline: updatedUsers.length,
          users: updatedUsers,
          roleCounts
        };
      });
      setActiveCount(prev => Math.max(1, prev));
    };

    const handleUserOffline = (data: { userId: string; role?: string; roleName?: string }) => {
      let role = String(data?.role || data?.roleName || '').trim().toUpperCase();
      setSummary(prev => {
        if (!prev) return prev;
        const targetUser = prev.users.find(u => u.userId === data.userId);
        if (!role && targetUser) {
          role = targetUser.role;
        }
        const updatedUsers = prev.users.filter(u => u.userId !== data.userId);
        const roleCounts: Record<string, number> = {};
        for (const [r, cnt] of Object.entries(prev.roleCounts || {})) {
          let cleanR = String(r || '').trim().toUpperCase();
          if (cleanR && cleanR !== 'UNDEFINED' && cleanR !== 'NULL') {
            roleCounts[cleanR] = (roleCounts[cleanR] || 0) + Number(cnt || 0);
          }
        }
        if (role && roleCounts[role]) {
          roleCounts[role] = Math.max(0, roleCounts[role] - 1);
          if (roleCounts[role] === 0) delete roleCounts[role];
        }

        return {
          ...prev,
          totalActiveUsers: updatedUsers.length,
          totalOnline: updatedUsers.length,
          users: updatedUsers,
          roleCounts
        };
      });
      setActiveCount(prev => Math.max(0, prev - 1));
    };

    socketService.subscribe('presence:count_update', handleCountUpdate);
    socketService.subscribe('presence:user_online', handleUserOnline);
    socketService.subscribe('presence:user_offline', handleUserOffline);

    // Refresh every 60 seconds as a heartbeat fallback
    const interval = setInterval(fetchSummary, 60000);

    return () => {
      socketService.unsubscribe('presence:count_update', handleCountUpdate);
      socketService.unsubscribe('presence:user_online', handleUserOnline);
      socketService.unsubscribe('presence:user_offline', handleUserOffline);
      clearInterval(interval);
    };
  }, [fetchSummary]);

  return {
    summary,
    activeCount,
    isLoading,
    error,
    refresh: fetchSummary
  };
}
