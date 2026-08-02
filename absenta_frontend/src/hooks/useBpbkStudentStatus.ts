import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { bpbkApi } from '../api/bpbk.api';

export interface BpbkStudentStatus {
  hasActiveEws: boolean;
  ewsRiskCategory?: 'SANGAT_TINGGI' | 'TINGGI' | 'SEDANG' | 'RENDAH' | 'NORMAL';
  totalKonseling: number;
  totalHomeVisit: number;
  latestCounselingDate?: string;
}

export function useBpbkStudentStatus(siswaId?: string) {
  const query = useQuery({
    queryKey: ['bpbk-student-status', siswaId],
    queryFn: async () => {
      if (!siswaId) return null;
      const [casesRes, konselingRes, homeVisitRes] = await Promise.all([
        bpbkApi.getKasusBK({ siswa_id: siswaId, limit: 10 }),
        bpbkApi.getKonselingList({ siswa_id: siswaId, limit: 10 }),
        bpbkApi.getHomeVisits({ siswa_id: siswaId, limit: 10 })
      ]);

      const cases = casesRes.data?.list || [];
      const konselingList = konselingRes.data?.list || konselingRes.data || [];
      const homeVisits = homeVisitRes.data?.list || homeVisitRes.data || [];

      const activeCase = cases.find((c: any) => c.status === 'TERBUKA' || c.status === 'PROSES');
      const latestKonseling = konselingList[0];

      return {
        hasActiveEws: !!activeCase,
        ewsRiskCategory: activeCase?.prioritas === 'TINGGI' ? 'TINGGI' : activeCase?.prioritas === 'SEDANG' ? 'SEDANG' : 'NORMAL',
        totalKonseling: konselingList.length,
        totalHomeVisit: homeVisits.length,
        latestCounselingDate: latestKonseling?.tanggal_konseling || latestKonseling?.tanggal
      } as BpbkStudentStatus;
    },
    enabled: !!siswaId,
    staleTime: 5 * 60 * 1000,
  });

  const status = useMemo(() => {
    return query.data || {
      hasActiveEws: false,
      ewsRiskCategory: 'NORMAL',
      totalKonseling: 0,
      totalHomeVisit: 0
    };
  }, [query.data]);

  return {
    status,
    isLoading: query.isLoading,
    refetch: query.refetch
  };
}
