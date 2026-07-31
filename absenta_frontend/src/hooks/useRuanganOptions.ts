import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { sarprasApi } from '../api/sarpras.api';
import type { SearchableSelectOption } from '../components/ui/SearchableSelect';

export function useRuanganOptions() {
  const query = useQuery({
    queryKey: ['ruangan-options-list'],
    queryFn: async () => {
      const res = await sarprasApi.getLocations();
      return res.data || (Array.isArray(res) ? res : []);
    },
    staleTime: 5 * 60 * 1000,
  });

  const rawList = useMemo(() => {
    return query.data || [];
  }, [query.data]);

  const options: SearchableSelectOption[] = useMemo(() => {
    return rawList.map((r: any) => ({
      value: r.id || r.nama_ruangan || r.nama_lokasi,
      label: `${r.nama_ruangan || r.nama_lokasi || r.nama}${r.kode_ruangan ? ` (${r.kode_ruangan})` : ''}`,
      raw: r
    }));
  }, [rawList]);

  return {
    options,
    rawList,
    isLoading: query.isLoading,
    refetch: query.refetch
  };
}
