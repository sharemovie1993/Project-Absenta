import { useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getJadwalKBM, type JadwalKBM } from '../../api/attendance/jadwalKBM.api';
import { useSocket } from '../useSocket';

export function useStaffWeeklySchedule() {
  const queryClient = useQueryClient();
  const { subscribe, unsubscribe } = useSocket();

  // Fetch Teacher's full weekly schedule using TanStack Query (SSOT Caching)
  const { data: scheduleRes, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['teacher-weekly-kbm-unified'],
    queryFn: async () => {
      const res = await getJadwalKBM();
      return res;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Real-time WebSocket: Otomatis invalidate cache jika admin kurikulum mengedit jadwal di backend
  useEffect(() => {
    const handleJadwalUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-weekly-kbm-unified'] });
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

  // Memoized Parsed Schedules
  const rawSchedules: JadwalKBM[] = useMemo(() => {
    const data = scheduleRes?.data ?? scheduleRes;
    return Array.isArray(data) ? data : (Array.isArray((data as any)?.data) ? (data as any).data : []);
  }, [scheduleRes]);

  const totalWeeklyJp = useMemo(() => rawSchedules.length, [rawSchedules]);

  return {
    rawSchedules,
    totalWeeklyJp,
    isLoading,
    isFetching,
    refetch,
  };
}
