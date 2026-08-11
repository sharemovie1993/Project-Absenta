import { useQuery } from '@tanstack/react-query';
import { getPresensiTerpaduSesi } from '../api/attendanceGerbang.api';

/**
 * Custom React Query Hook for fetching unified session attendance (Teacher + Students)
 * @param sesiId UUID Sesi Absensi
 * @param enabled Condition to trigger query execution
 */
export function usePresensiTerpaduSesi(sesiId?: string, enabled: boolean = true) {
  const isUUID = Boolean(sesiId && !sesiId.startsWith('rincian-') && !sesiId.startsWith('session-'));

  return useQuery({
    queryKey: ['presensi-terpadu-sesi', sesiId],
    queryFn: async () => {
      if (!sesiId || !isUUID) return [];
      try {
        const res = await getPresensiTerpaduSesi(sesiId);
        return res?.data || [];
      } catch (err) {
        console.error('[usePresensiTerpaduSesi] Query Error:', err);
        return [];
      }
    },
    enabled: Boolean(enabled && sesiId && isUUID),
    staleTime: 1000 * 60 * 2, // 2 minutes caching
    refetchOnWindowFocus: false,
  });
}
