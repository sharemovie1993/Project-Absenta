import { useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSesiAbsensiList } from '../api/attendanceGerbang.api';
import { useAuthStore } from '../store/authStore';
import { useSocket } from './useSocket';
import { toLocalDate } from '../utils/attendance/time';
import { normalizeFromSesiAbsensi, KbmItem } from '../utils/kbm-normalizer';

/**
 * useStaffTimeline
 * Menggunakan SATU KABEL tunggal (GET /attendance/sesi-absensi?include_scheduled=true)
 * yang sama persis dengan Monitoring KBM & Presensi Ops.
 * Seluruh agregasi slot jam, kalkulasi shift, status server-side dihitung di Backend.
 */
export const useStaffTimeline = (guruId?: string) => {
  const { token } = useAuthStore();
  const { subscribe, unsubscribe } = useSocket();
  const today = toLocalDate();

  // Endpoint tunggal terpadu: Sumber yang sama, Mesin yang sama
  const { data: timelineRes, isLoading, refetch } = useQuery({
    queryKey: ['staff-timeline-unified', guruId, today],
    queryFn: () => getSesiAbsensiList({ 
      tanggal: today, 
      guru_id: guruId, 
      include_scheduled: true, 
      summary: true, 
      limit: 100 
    } as any),
    enabled: !!token && !!guruId,
    staleTime: 30000,
  });

  // Gunakan normalizer tunggal — shape identik dengan Monitoring KBM & Ops
  const timelineItems: KbmItem[] = useMemo(() => {
    const rawData = timelineRes?.data;
    const items = Array.isArray(rawData)
      ? rawData
      : Array.isArray(rawData?.data)
      ? rawData.data
      : Array.isArray(timelineRes?.items)
      ? timelineRes.items
      : [];
    return items.map((item: any) => normalizeFromSesiAbsensi(item));
  }, [timelineRes]);

  // Sockets untuk update real-time
  useEffect(() => {
    if (!guruId) return;
    const handleSesiChange = () => {
      refetch();
    };
    subscribe(`sesi:created:${guruId}`, handleSesiChange);
    subscribe(`sesi:updated:${guruId}`, handleSesiChange);
    subscribe('sesi_status_update', handleSesiChange);
    subscribe('absen_guru_update', handleSesiChange);
    return () => {
      unsubscribe(`sesi:created:${guruId}`, handleSesiChange);
      unsubscribe(`sesi:updated:${guruId}`, handleSesiChange);
      unsubscribe('sesi_status_update', handleSesiChange);
      unsubscribe('absen_guru_update', handleSesiChange);
    };
  }, [guruId, subscribe, unsubscribe, refetch]);

  return {
    timelineItems,
    isLoading,
    refetch,
    impact: {
      totalStudents: timelineItems.reduce((acc: number, curr: KbmItem) => acc + (curr.summary?.total || 0), 0),
      totalSessions: timelineItems.length,
      attendanceRate: (() => {
        const total = timelineItems.reduce((acc: number, curr: KbmItem) => acc + (curr.summary?.total || 0), 0);
        if (total === 0) return 0;
        const hadir = timelineItems.reduce((acc: number, curr: KbmItem) => acc + (curr.summary?.hadir || 0), 0);
        return Math.round((hadir / total) * 100);
      })()
    }
  };
};
