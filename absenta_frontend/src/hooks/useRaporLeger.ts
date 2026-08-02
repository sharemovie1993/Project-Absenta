import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { requestWithFallback } from '../api/apiUtils';

export interface LegerRow {
  siswaId: string;
  namaSiswa: string;
  nis: string;
  nilaiMapel: Record<string, number>;
  totalNilai: number;
  rataRata: number;
  ranking?: number;
}

export function useRaporLeger(kelasId?: string, semesterId?: string) {
  const query = useQuery({
    queryKey: ['rapor-leger-list', kelasId, semesterId],
    queryFn: async () => {
      if (!kelasId) return [];
      const res = await requestWithFallback<any>('get', `/rapor/leger/${kelasId}`, { params: { semester_id: semesterId } });
      const list: LegerRow[] = res.data?.list || res.data || (Array.isArray(res) ? res : []);
      return list;
    },
    enabled: !!kelasId,
    staleTime: 5 * 60 * 1000,
  });

  const rawList = useMemo(() => {
    return query.data || [];
  }, [query.data]);

  return {
    legerData: rawList,
    isLoading: query.isLoading,
    refetch: query.refetch
  };
}
