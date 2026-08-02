import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { sarprasApi } from '../api/sarpras.api';
import type { SearchableSelectOption } from '../components/ui/SearchableSelect';

export interface SarprasKategoriItem {
  id: string;
  nama: string;
  deskripsi?: string;
}

export function useSarprasKategoriOptions() {
  const query = useQuery({
    queryKey: ['sarpras-categories-options-list'],
    queryFn: async () => {
      const res = await sarprasApi.getCategories();
      const list: SarprasKategoriItem[] = res.data || (Array.isArray(res) ? res : []);
      return list;
    },
    staleTime: 10 * 60 * 1000,
  });

  const rawList = useMemo(() => {
    return query.data || [];
  }, [query.data]);

  const options: SearchableSelectOption[] = useMemo(() => {
    return rawList.map((c: SarprasKategoriItem) => ({
      value: c.id,
      label: c.nama,
      raw: c
    }));
  }, [rawList]);

  return {
    options,
    rawList,
    isLoading: query.isLoading,
    refetch: query.refetch
  };
}
