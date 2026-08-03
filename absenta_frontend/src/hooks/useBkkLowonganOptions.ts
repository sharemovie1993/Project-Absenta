import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { hubinApi, type HubinLowongan } from '../api/hubin.api';
import type { SearchableSelectOption } from '../components/ui/SearchableSelect';

export function useBkkLowonganOptions(status: string = 'BUKA') {
  const query = useQuery({
    queryKey: ['hubin-bkk-lowongan-options', status],
    queryFn: async () => {
      const res = await hubinApi.getLowonganList({ status, limit: 200 });
      const list: HubinLowongan[] = res.data?.list || res.data || (Array.isArray(res) ? res : []);
      return list;
    },
    staleTime: 5 * 60 * 1000,
  });

  const rawList = useMemo(() => {
    return query.data || [];
  }, [query.data]);

  const options: SearchableSelectOption[] = useMemo(() => {
    return rawList.map((l: HubinLowongan) => ({
      value: l.id,
      label: `${l.judul_posisi} — ${l.perusahaan_nama}`,
      raw: l
    }));
  }, [rawList]);

  return {
    options,
    rawList,
    isLoading: query.isLoading,
    refetch: query.refetch
  };
}
