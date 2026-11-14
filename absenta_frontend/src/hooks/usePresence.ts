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

    const handleCountUpdate = (payload: { activeUsers: number }) => {
      if (typeof payload?.activeUsers === 'number') {
        setActiveCount(payload.activeUsers);
      }
    };

    const handleUserOnline = (user: PresenceUser) => {
      setSummary(prev => {
        if (!prev) return prev;
        const exists = prev.users.some(u => u.userId === user.userId);
        const updatedUsers = exists
          ? prev.users.map(u => (u.userId === user.userId ? user : u))
          : [user, ...prev.users];
        
        const roleCounts = { ...prev.roleCounts };
        roleCounts[user.role] = (roleCounts[user.role] || 0) + (exists ? 0 : 1);

        return {
          ...prev,
          totalActiveUsers: updatedUsers.length,
          users: updatedUsers,
          roleCounts
        };
      });
      setActiveCount(prev => Math.max(1, prev));
    };

    const handleUserOffline = (data: { userId: string; role?: string }) => {
      setSummary(prev => {
        if (!prev) return prev;
        const updatedUsers = prev.users.filter(u => u.userId !== data.userId);
        const roleCounts = { ...prev.roleCounts };
        if (data.role && roleCounts[data.role]) {
          roleCounts[data.role] = Math.max(0, roleCounts[data.role] - 1);
        }
        return {
          ...prev,
          totalActiveUsers: updatedUsers.length,
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
