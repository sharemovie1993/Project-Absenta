import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { getSesiAbsensiList, createSesiAbsensi } from '../../api/attendanceGerbang.api';
import { useSocket } from '../useSocket';
import {
  normalizeSesiStatus,
  getSesiStatusBadgeProps,
  CanonicalSesiStatus,
} from '../../utils/attendance/statusMapping';

export interface UnifiedKbmSessionQueryOptions {
  tanggal?: string;
  kelas_id?: string;
  guru_id?: string;
  allowedKelasIds?: string[];
  enabled?: boolean;
}

export interface UnifiedKbmSessionItem {
  id: string;
  tenant_id: string;
  kelas_id: string;
  mapel_id: string | null;
  guru_id: string | null;
  jadwal_kbm_id?: string | null;
  jenis_kegiatan: string;
  tanggal: string;
  waktu_mulai: string;
  waktu_selesai: string;
  jam_mulai?: string;
  jam_selesai?: string;
  status: CanonicalSesiStatus;
  foto_kegiatan?: string | null;
  catatan_inval?: string | null;
  guru_pengganti_id?: string | null;
  kelas_nama: string | null;
  mapel_nama: string | null;
  guru_nama: string | null;
  summary: {
    total: number;
    HADIR: number;
    IZIN: number;
    SAKIT: number;
    ALPA: number;
    TERLAMBAT: number;
  };
  badgeProps: ReturnType<typeof getSesiStatusBadgeProps>;
}

export function useUnifiedKbmSessions(options: UnifiedKbmSessionQueryOptions = {}) {
  const queryClient = useQueryClient();
  const { subscribe, unsubscribe } = useSocket();
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const targetDate = options.tanggal || todayStr;
  const isToday = targetDate === todayStr;

  const queryKey = useMemo(
    () => ['unified-kbm-sessions', targetDate, options.kelas_id, options.guru_id, options.allowedKelasIds],
    [targetDate, options.kelas_id, options.guru_id, options.allowedKelasIds]
  );

  // 1. Fetch Sessions via TanStack useQuery
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      try {
        console.log('🚀 [FRONTEND QUERY] Calling getSesiAbsensiList with params:', {
          tanggal: targetDate,
          kelas_id: options.kelas_id || undefined,
          guru_id: options.guru_id || undefined,
          allowedKelasIds: options.allowedKelasIds,
        });

        const res = await getSesiAbsensiList({
          tanggal: targetDate,
          kelas_id: options.kelas_id || undefined,
          guru_id: options.guru_id || undefined,
          allowedKelasIds: options.allowedKelasIds,
          include_scheduled: true,
          summary: true,
          limit: 100,
        } as any);

        const rawData = res.data;
        const items = Array.isArray(rawData)
          ? rawData
          : Array.isArray(rawData?.data)
          ? rawData.data
          : Array.isArray(res.items)
          ? res.items
          : Array.isArray(res)
          ? res
          : [];

        const mapped = items.map((raw: any): UnifiedKbmSessionItem => {
          const canonicalStatus = normalizeSesiStatus(raw.status);
          const teacherStat = raw.guru_status || raw.absenGuru?.status || raw.AbsenGuru?.[0]?.status || null;
          return {
            ...raw,
            guru_status: teacherStat,
            status: canonicalStatus,
            badgeProps: getSesiStatusBadgeProps(canonicalStatus),
            summary: raw.summary || { total: 0, HADIR: 0, IZIN: 0, SAKIT: 0, ALPA: 0, TERLAMBAT: 0 },
          };
        });

        // Ensure chronological sorting across all UI modules
        return mapped.sort((a, b) => {
          const timeA = a.waktu_mulai || a.jam_mulai || '00:00';
          const timeB = b.waktu_mulai || b.jam_mulai || '00:00';
          return String(timeA).localeCompare(String(timeB));
        });
      } catch (err: any) {
        console.error('🚨 [FRONTEND QUERY ERROR] getSesiAbsensiList failed:', {
          status: err?.response?.status,
          data: err?.response?.data,
          message: err?.message,
          err,
        });
        throw err;
      }
    },
    enabled: options.enabled !== false,
    staleTime: 10000,
    refetchInterval: isToday ? 30000 : false,
  });

  // 2. Real-time Socket.io invalidation listener
  useEffect(() => {
    const handleRealtimeUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['unified-kbm-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['monitoring-sesi-absensi'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'kurikulum', 'monitoring-global'] });
      queryClient.invalidateQueries({ queryKey: ['my-schedule-timeline'] });
    };

    subscribe('SESI_CREATED', handleRealtimeUpdate);
    subscribe('SESI_UPDATED', handleRealtimeUpdate);
    subscribe('SESSION_ATTENDANCE_UPDATE', handleRealtimeUpdate);

    return () => {
      unsubscribe('SESI_CREATED', handleRealtimeUpdate);
      unsubscribe('SESI_UPDATED', handleRealtimeUpdate);
      unsubscribe('SESSION_ATTENDANCE_UPDATE', handleRealtimeUpdate);
    };
  }, [queryClient, subscribe, unsubscribe]);

  // 3. Mutation for opening Assignment Session (Petugas Kelas mode)
  const bukaSesiPenugasanMutation = useMutation({
    mutationFn: async (payload: {
      kelas_id: string;
      mapel_id: string;
      guru_id: string;
      jadwal_kbm_id?: string;
      waktu_mulai?: string;
      waktu_selesai?: string;
      catatan_inval?: string;
    }) => {
      const res = await createSesiAbsensi({
        kelas_id: payload.kelas_id,
        mapel_id: payload.mapel_id,
        guru_id: payload.guru_id,
        jadwal_kbm_id: payload.jadwal_kbm_id,
        jenis_kegiatan: 'KBM_PENUGASAN',
        tanggal: targetDate,
        waktu_mulai: payload.waktu_mulai || new Date().toISOString(),
        waktu_selesai: payload.waktu_selesai,
        mode_penugasan: true,
        catatan_inval: payload.catatan_inval || 'Sesi Pembelajaran Mandiri / Penugasan (Guru Berhalangan)',
      } as any);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-kbm-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['monitoring-sesi-absensi'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'kurikulum', 'monitoring-global'] });
    },
  });

  return {
    sessions: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    bukaSesiPenugasan: bukaSesiPenugasanMutation.mutateAsync,
    isBukaSesiPenugasanLoading: bukaSesiPenugasanMutation.isPending,
  };
}
