import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { hubinApi, type PenempatanPkl } from '../api/hubin.api';
import type { SearchableSelectOption } from '../components/ui/SearchableSelect';

export function usePklPlacementOptions(status?: string) {
  const query = useQuery({
    queryKey: ['hubin-pkl-placements-options-list', status],
    queryFn: async () => {
      const res = await hubinApi.getPenempatanList({ limit: 200, status: status || 'AKTIF' });
      const list: PenempatanPkl[] = res.data?.list || res.data || (Array.isArray(res) ? res : []);
      return list;
    },
    staleTime: 5 * 60 * 1000,
  });

  const rawList = useMemo(() => {
    return query.data || [];
  }, [query.data]);

  const options: SearchableSelectOption[] = useMemo(() => {
    return rawList.map((p: any) => ({
      value: p.id,
      label: `${p.Siswa?.nama_siswa || p.siswa_nama || 'Siswa'} — ${p.MitraIndustri?.nama || p.mitra_nama || 'DUDI'}`,
      raw: p
    }));
  }, [rawList]);

  return {
    options,
    rawList,
    isLoading: query.isLoading,
    refetch: query.refetch
  };
}
