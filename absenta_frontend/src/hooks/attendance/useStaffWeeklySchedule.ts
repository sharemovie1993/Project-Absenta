import { useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getJadwalKBM, type JadwalKBM } from '../../api/attendance/jadwalKBM.api';
import { useSocket } from '../useSocket';
import { useAuthStore } from '../../store/authStore';

export function useStaffWeeklySchedule(guruIdProp?: string) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { subscribe, unsubscribe } = useSocket();

  const effectiveGuruId = guruIdProp || user?.guru_profile?.id;

  // Fetch Teacher's full weekly schedule using TanStack Query (SSOT Caching)
  const { data: scheduleRes, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['jadwal-kbm', 'teacher-weekly', effectiveGuruId],
    queryFn: async () => {
      const filters: any = {};
      if (effectiveGuruId) filters.guru_id = effectiveGuruId;
      const res = await getJadwalKBM(filters);
      return res;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Real-time WebSocket: Otomatis invalidate cache jika admin kurikulum mengedit jadwal di backend
  useEffect(() => {
    const handleJadwalUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['jadwal-kbm'] });
    };

    subscribe('jadwal:updated', handleJadwalUpdate);
    subscribe('jadwal_kbm_update', handleJadwalUpdate);
    subscribe('kurikulum:jadwal_updated', handleJadwalUpdate);

    return () => {
      unsubscribe('jadwal:updated', handleJadwalUpdate);
      unsubscribe('jadwal_kbm_update', handleJadwalUpdate);
      unsubscribe('kurikulum:jadwal_updated', handleJadwalUpdate);
    };
  }, [subscribe, unsubscribe, queryClient]);

  // Memoized Parsed Schedules specifically for THIS Teacher
  const rawSchedules: JadwalKBM[] = useMemo(() => {
    const data = scheduleRes?.data ?? scheduleRes;
    const list: JadwalKBM[] = Array.isArray(data) ? data : (Array.isArray((data as any)?.data) ? (data as any).data : []);
    
    if (!effectiveGuruId) return list;
    return list.filter((s) => !s.guru_id || String(s.guru_id) === String(effectiveGuruId));
  }, [scheduleRes, effectiveGuruId]);

  const totalWeeklyJp = useMemo(() => rawSchedules.length, [rawSchedules]);

  return {
    rawSchedules,
    totalWeeklyJp,
    effectiveGuruId,
    isLoading,
    isFetching,
    refetch,
  };
}
