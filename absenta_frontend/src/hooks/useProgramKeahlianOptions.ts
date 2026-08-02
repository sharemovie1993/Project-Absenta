import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { requestWithFallback } from '../api/apiUtils';
import type { SearchableSelectOption } from '../components/ui/SearchableSelect';

export interface ProgramKeahlianItem {
  id: string;
  nama: string;
  kode?: string | null;
  singkatan?: string | null;
  bidang_keahlian?: string | null;
}

export function useProgramKeahlianOptions() {
  const query = useQuery({
    queryKey: ['program-keahlian-options-list'],
    queryFn: async () => {
      const res = await requestWithFallback<any>({
        url: '/api/v1/academic/program-keahlian',
        method: 'GET',
        params: { limit: 200 }
      });
      return res;
    },
    staleTime: 5 * 60 * 1000,
  });

  const rawList: ProgramKeahlianItem[] = useMemo(() => {
    return query.data?.data || (Array.isArray(query.data) ? (query.data as ProgramKeahlianItem[]) : []);
  }, [query.data]);

  const options: SearchableSelectOption[] = useMemo(() => {
    return rawList.map((item) => {
      const labelText = item.singkatan || item.kode ? `${item.nama} (${item.singkatan || item.kode})` : item.nama;
      return {
        value: item.id,
        label: labelText,
        raw: item
      };
    });
  }, [rawList]);

  return {
    options,
    rawList,
    isLoading: query.isLoading,
    refetch: query.refetch
  };
}
