import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { jurusanApi } from '../api/academic.api';
import type { Jurusan } from '../types/academic';
import type { SearchableSelectOption } from '../components/ui/SearchableSelect';

export function useJurusanOptions() {
  const query = useQuery({
    queryKey: ['jurusan-options-list'],
    queryFn: () => jurusanApi.getAll({ limit: 500 }),
    staleTime: 5 * 60 * 1000,
  });

  const rawList: Jurusan[] = useMemo(() => {
    return query.data?.data || (Array.isArray(query.data) ? (query.data as unknown as Jurusan[]) : []);
  }, [query.data]);

  const options: SearchableSelectOption[] = useMemo(() => {
    return rawList.map((j) => {
      const nama = j.nama || (j as any).nama_jurusan || 'Jurusan';
      const kode = j.singkatan || j.kode || (j as any).kode_jurusan;
      return {
        value: j.id,
        label: `${nama}${kode ? ` (${kode})` : ''}`,
        raw: j
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
