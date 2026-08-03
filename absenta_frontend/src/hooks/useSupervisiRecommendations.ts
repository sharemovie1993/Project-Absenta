import { useQuery } from '@tanstack/react-query';
import { kurikulumApi } from '../api/kurikulum.api';

export interface RecommendationSlot {
  id: string;
  jam_ke: number;
  jam_mulai: string;
  jam_selesai: string;
  kelas: string;
  mapel: string;
  recommended_supervisors: Array<{ id: string; nama_guru: string }>;
}

export function useSupervisiRecommendations(guruId?: string, tanggal?: string) {
  const query = useQuery({
    queryKey: ['supervisi-recommendations', guruId, tanggal],
    queryFn: () => {
      if (!guruId || !tanggal) return null;
      return kurikulumApi.getSupervisiRecommendations(guruId, tanggal).catch(() => null);
    },
    enabled: Boolean(guruId && tanggal),
    staleTime: 5 * 60 * 1000,
  });

  const slots: RecommendationSlot[] = query.data?.data ?? [];

  return {
    ...query,
    slots,
  };
}
