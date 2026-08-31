import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { kesiswaanApi, JenisPelanggaran } from '../api/kesiswaan.api';
import type { SearchableSelectOption } from '../components/ui/SearchableSelect';

export interface UseJenisPelanggaranOptionsParams {
  kategori?: string;
  valueMode?: 'name' | 'id';
}

export function useJenisPelanggaranOptions(params: UseJenisPelanggaranOptionsParams = {}) {
  const { kategori, valueMode = 'name' } = params;

  const query = useQuery({
    queryKey: ['jenis-pelanggaran-options-list', kategori],
    queryFn: async () => {
      const res = await kesiswaanApi.getJenisPelanggaran();
      return res.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const rawList: JenisPelanggaran[] = useMemo(() => {
    return query.data || [];
  }, [query.data]);

  const filteredList = useMemo(() => {
    if (!kategori) return rawList;
    return rawList.filter(p => (p as any).kategori === kategori || (p as any).kategori_pelanggaran === kategori);
  }, [rawList, kategori]);

  const options: SearchableSelectOption[] = useMemo(() => {
    return filteredList.map((p) => ({
      value: valueMode === 'id' ? p.id : p.nama_pelanggaran,
      label: `${p.nama_pelanggaran} - [${p.poin} Poin]`,
      raw: p
    }));
  }, [filteredList, valueMode]);

  return {
    options,
    rawList: filteredList,
    isLoading: query.isLoading,
    refetch: query.refetch
  };
}
