import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { hubinApi, type MitraIndustri } from '../api/hubin.api';
import type { SearchableSelectOption } from '../components/ui/SearchableSelect';

export function useDudiOptions(search?: string) {
  const query = useQuery({
    queryKey: ['hubin-dudi-options-list', search],
    queryFn: async () => {
      const res = await hubinApi.getMitraList({ limit: 200, search: search || undefined });
      const list: MitraIndustri[] = res.data?.list || res.data || (Array.isArray(res) ? res : []);
      return list;
    },
    staleTime: 10 * 60 * 1000,
  });

  const rawList = useMemo(() => {
    return query.data || [];
  }, [query.data]);

  const options: SearchableSelectOption[] = useMemo(() => {
    return rawList.map((m: MitraIndustri) => ({
      value: m.id,
      label: `${m.nama}${m.bidang ? ` (${m.bidang})` : ''}`,
      raw: m
    }));
  }, [rawList]);

  return {
    options,
    rawList,
    isLoading: query.isLoading,
    refetch: query.refetch
  };
}
