import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { tahunPelajaranApi } from '../api/academic.api';
import type { TahunPelajaran } from '../types/academic';
import type { SearchableSelectOption } from '../components/ui/SearchableSelect';

export function useTahunPelajaranOptions() {
  const query = useQuery({
    queryKey: ['tahun-pelajaran-options-list'],
    queryFn: () => tahunPelajaranApi.getAll({ limit: 200 }),
    staleTime: 5 * 60 * 1000,
  });

  const rawList: TahunPelajaran[] = useMemo(() => {
    return query.data?.data || (Array.isArray(query.data) ? (query.data as unknown as TahunPelajaran[]) : []);
  }, [query.data]);

  const activeYear = useMemo(() => {
    return rawList.find(y => y.is_active);
  }, [rawList]);

  const options: SearchableSelectOption[] = useMemo(() => {
    return rawList.map((y) => {
      const tahun = y.tahun || (y as any).nama || (y as any).tahun_pelajaran || 'TP';
      return {
        value: y.id,
        label: `TP ${tahun}${y.is_active ? ' ⭐ [AKTIF]' : ''}`,
        raw: y
      };
    });
  }, [rawList]);

  return {
    options,
    rawList,
    activeYear,
    isLoading: query.isLoading,
    refetch: query.refetch
  };
}
