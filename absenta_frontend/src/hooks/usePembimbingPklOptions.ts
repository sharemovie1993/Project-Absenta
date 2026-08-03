import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { guruApi } from '../api/academic.api';
import type { SearchableSelectOption } from '../components/ui/SearchableSelect';

export function usePembimbingPklOptions() {
  const query = useQuery({
    queryKey: ['hubin-pembimbing-pkl-options'],
    queryFn: async () => {
      const res = await guruApi.getAll({ limit: 500, jenis_ptk: 'PENDIDIK' });
      const list = Array.isArray(res) ? res : res?.data || [];
      return list;
    },
    staleTime: 10 * 60 * 1000,
  });

  const rawList = useMemo(() => {
    return query.data || [];
  }, [query.data]);

  const options: SearchableSelectOption[] = useMemo(() => {
    return rawList.map((g: any) => ({
      value: g.id,
      label: `${g.nama_guru || g.full_name || 'Guru'}${g.nip ? ` (NIP. ${g.nip})` : ''}`,
      raw: g
    }));
  }, [rawList]);

  return {
    options,
    rawList,
    isLoading: query.isLoading,
    refetch: query.refetch
  };
}
