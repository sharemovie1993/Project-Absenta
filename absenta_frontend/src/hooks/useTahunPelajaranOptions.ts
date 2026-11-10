import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { tahunPelajaranApi } from '../api/academic.api';
import type { TahunPelajaran } from '../types/academic';
import type { SearchableSelectOption } from '../components/ui/SearchableSelect';

export interface UseTahunPelajaranOptionsParams {
  enabled?: boolean;
}

export function useTahunPelajaranOptions(params?: UseTahunPelajaranOptionsParams) {
  const isEnabled = params?.enabled ?? true;

  const query = useQuery({
    queryKey: ['tahun-pelajaran-options-list'],
    queryFn: () => tahunPelajaranApi.getAll({ limit: 200 }),
    enabled: isEnabled,
    staleTime: 5 * 60 * 1000,
  });

  const rawList: TahunPelajaran[] = useMemo(() => {
    return query.data?.data || (Array.isArray(query.data) ? (query.data as unknown as TahunPelajaran[]) : []);
  }, [query.data]);

  const activeYear = useMemo(() => {
    const found = rawList.find(y => y.is_active);
    if (found) {
      try { localStorage.setItem('absenta_cached_tp', JSON.stringify(found)); } catch {}
      return found;
    }
    try {
      const raw = localStorage.getItem('absenta_cached_tp');
      return raw ? (JSON.parse(raw) as TahunPelajaran) : undefined;
    } catch {
      return undefined;
    }
  }, [rawList]);

  const options: SearchableSelectOption[] = useMemo(() => {
    return rawList.map((y) => {
      const tahun = y.tahun || (y as any).nama || (y as any).tahun_pelajaran || 'TP';
      return {
        value: y.id,
        label: `${tahun}${y.is_active ? ' ⭐' : ''}`,
        raw: y
      };
    });
  }, [rawList]);

  return {
    options,
    rawList,
    activeYear,
    activeTahunPelajaran: activeYear,
    isLoading: query.isLoading,
    refetch: query.refetch
  };
}
