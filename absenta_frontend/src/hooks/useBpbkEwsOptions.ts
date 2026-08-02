import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { bpbkApi, type EwsRecord } from '../api/bpbk.api';
import type { SearchableSelectOption } from '../components/ui/SearchableSelect';

export function useBpbkEwsOptions(status?: string) {
  const query = useQuery({
    queryKey: ['bpbk-ews-options-list', status],
    queryFn: async () => {
      const res = await bpbkApi.getEwsList({ limit: 200, status: status || undefined });
      const list: EwsRecord[] = res.data?.list || res.data || (Array.isArray(res) ? res : []);
      return list;
    },
    staleTime: 5 * 60 * 1000,
  });

  const rawList = useMemo(() => {
    return query.data || [];
  }, [query.data]);

  const options: SearchableSelectOption[] = useMemo(() => {
    return rawList.map((e: EwsRecord) => ({
      value: e.id,
      label: `[${e.kategori_risiko || 'EWS'}] ${e.Siswa?.nama_siswa || 'Siswa'} - ${e.ringkasan_kasus || 'Alert'}`,
      raw: e
    }));
  }, [rawList]);

  return {
    options,
    rawList,
    isLoading: query.isLoading,
    refetch: query.refetch
  };
}
