import { useQuery } from '@tanstack/react-query';
import { getWalasStats, WalasStatsParams } from '@/api/dashboard.api';
import { WalasDashboardData } from './types';

export interface UseWalasDashboardDataOptions {
  targetKelasId?: string;
  tahunPelajaranId?: string;
  semesterId?: string;
  enabled?: boolean;
}

export function useWalasDashboardData(options?: UseWalasDashboardDataOptions) {
  const params: WalasStatsParams = {
    kelas_id: options?.targetKelasId,
    tahun_pelajaran_id: options?.tahunPelajaranId,
    semester_id: options?.semesterId,
  };

  return useQuery<WalasDashboardData>({
    queryKey: ['walas-dashboard-stats', params],
    queryFn: async () => {
      const res = await getWalasStats(params);
      if (res && res.data) {
        return res.data;
      }
      return res;
    },
    staleTime: 60 * 1000, // 60 detik (Fase 4 Hardening Dual-Layer Cache)
    gcTime: 5 * 60 * 1000,
    enabled: options?.enabled !== false,
  });
}
