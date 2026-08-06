import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { getGerbangStats, getNotPresentStudents } from '../../api/attendanceGerbang.api';
import { useSocket } from '../useSocket';

interface Params {
  tenantId?: string | null;
  selectedKelasId?: string;
  tanggal?: string;
  enabled?: boolean;
}

interface MiniStats {
  masuk: number;
  keluar: number;
  total_target?: number;
}

export function useGerbangAttendanceData({ tenantId, selectedKelasId, tanggal, enabled = true }: Params) {
  const queryClient = useQueryClient();
  const { isConnected, subscribe, unsubscribe, emit } = useSocket();

  // Query 1: Not Present Students
  const notPresentQuery = useQuery({
    queryKey: ['gerbang-not-present', tenantId || '', selectedKelasId || '', tanggal || ''],
    queryFn: async () => {
      const params: any = { kelas_id: selectedKelasId || undefined, limit: 200, offset: 0 };
      if (tanggal) params.tanggal = tanggal;
      const res = await getNotPresentStudents(params);
      return res.data || [];
    },
    enabled: enabled && !!tenantId,
    staleTime: 15 * 1000,
  });

  // Query 2: Mini Stats
  const miniStatsQuery = useQuery({
    queryKey: ['gerbang-mini-stats', tenantId || '', selectedKelasId || '', tanggal || ''],
    queryFn: async () => {
      const statsRes = await getGerbangStats({ kelas_id: selectedKelasId });
      const s = statsRes?.data || null;
      const masukFromStats = Number((s && (s as any).students_entered) ?? (s && (s as any).total_masuk) ?? 0);
      const keluarFromStats = Number((s && (s as any).students_exited) ?? (s && (s as any).total_keluar) ?? 0);
      const totalTargetFromStats = Number((s as any)?.total_students_target ?? 0);

      return {
        masuk: isNaN(masukFromStats) ? 0 : masukFromStats,
        keluar: isNaN(keluarFromStats) ? 0 : keluarFromStats,
        total_target: isNaN(totalTargetFromStats) ? 0 : totalTargetFromStats,
      } as MiniStats;
    },
    enabled: enabled && !!tenantId,
    staleTime: 15 * 1000,
  });

  const refreshStats = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['gerbang-mini-stats'] });
    return null;
  }, [queryClient]);

  const fetchNotPresent = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['gerbang-not-present'] });
  }, [queryClient]);

  const removePendingStudent = useCallback((siswaId: string) => {
    if (!siswaId) return;
    queryClient.setQueryData(['gerbang-not-present', tenantId || '', selectedKelasId || '', tanggal || ''], (old: any[] | undefined) => {
      if (!old) return [];
      return old.filter((s: any) => String(s.id) !== String(siswaId));
    });
  }, [queryClient, tenantId, selectedKelasId, tanggal]);

  // Socket Subscription
  useEffect(() => {
    if (!enabled || !isConnected) return;

    const params: any = {};
    if (tanggal) params.tanggal = tanggal;
    if (selectedKelasId) params.kelas_id = selectedKelasId;
    emit('attendance_feed_subscribe', params);

    const handleTapUpdate = (payload: any) => {
      refreshStats();
      if (payload?.siswa_id && payload?.arah === 'GERBANG_DATANG') {
        removePendingStudent(payload.siswa_id);
      } else {
        fetchNotPresent();
      }
    };

    subscribe('gerbang_tap_update', handleTapUpdate);
    subscribe('attendance_update', handleTapUpdate);

    return () => {
      unsubscribe('gerbang_tap_update', handleTapUpdate);
      unsubscribe('attendance_update', handleTapUpdate);
    };
  }, [isConnected, enabled, tanggal, selectedKelasId, refreshStats, removePendingStudent, fetchNotPresent, subscribe, unsubscribe, emit]);

  return {
    notPresent: notPresentQuery.data || [],
    notPresentLoading: notPresentQuery.isLoading,
    fetchNotPresent,
    miniStats: miniStatsQuery.data || { masuk: 0, keluar: 0, total_target: 0 },
    refreshStats,
    removePendingStudent,
  };
}
