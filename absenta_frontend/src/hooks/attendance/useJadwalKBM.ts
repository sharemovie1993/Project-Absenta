import { useQuery } from '@tanstack/react-query';
import { getJadwalKBM, type JadwalKBM, type JadwalKBMFilters } from '../../api/attendance/jadwalKBM.api';

export interface UseJadwalKBMParams extends JadwalKBMFilters {
  enabled?: boolean;
  staleTime?: number;
}

/**
 * Hook for fetching Jadwal KBM (lesson schedules) with reactive caching.
 * Part of the Single Source of Truth architecture for schedule data.
 */
export function useJadwalKBM(params: UseJadwalKBMParams = {}) {
  const {
    tahun_pelajaran_id,
    semester_id,
    kelas_id,
    guru_id,
    hari,
    enabled = true,
    staleTime = 0,
  } = params;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [
      'jadwal-kbm',
      tahun_pelajaran_id,
      semester_id,
      kelas_id ?? 'all',
      guru_id ?? 'all',
      hari ?? 'all',
    ],
    queryFn: () => {
      if (!tahun_pelajaran_id || !semester_id) return null;
      const filters: JadwalKBMFilters = { tahun_pelajaran_id, semester_id };
      if (kelas_id && kelas_id !== 'all') filters.kelas_id = kelas_id;
      if (guru_id && guru_id !== 'all') filters.guru_id = guru_id;
      if (hari) filters.hari = hari;
      return getJadwalKBM(filters).catch(() => null);
    },
    enabled: enabled && !!tahun_pelajaran_id && !!semester_id,
    staleTime,
  });

  const rawList: JadwalKBM[] = Array.isArray(data)
    ? data
    : (Array.isArray((data as any)?.data) ? (data as any).data : []);

  return {
    data,
    rawList,
    isLoading,
    isError,
    refetch,
  };
}
