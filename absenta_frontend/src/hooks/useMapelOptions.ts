import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { mapelApi } from '../api/academic.api';
import type { Mapel } from '../types/academic';
import type { SearchableSelectOption } from '../components/ui/SearchableSelect';

export interface UseMapelOptionsParams {
  kelompok?: string;
  tingkat?: number;
}

export function useMapelOptions(params: UseMapelOptionsParams = {}) {
  const { kelompok, tingkat } = params;

  const query = useQuery({
    queryKey: ['mapel-options-list', kelompok, tingkat],
    queryFn: () => mapelApi.getAll({ limit: 500 }),
    staleTime: 5 * 60 * 1000,
  });

  const rawList: Mapel[] = useMemo(() => {
    return query.data?.data || (Array.isArray(query.data) ? (query.data as unknown as Mapel[]) : []);
  }, [query.data]);

  const filteredList = useMemo(() => {
    return rawList.filter((m) => {
      const kel = m.kelompok || (m as any).kelompok_mapel;
      if (kelompok && kel !== kelompok) return false;
      if (tingkat !== undefined && m.tingkat !== null && m.tingkat !== undefined && Number(m.tingkat) !== Number(tingkat)) return false;
      return true;
    });
  }, [rawList, kelompok, tingkat]);

  const options: SearchableSelectOption[] = useMemo(() => {
    return filteredList.map((m) => {
      const nama = m.nama_mapel || (m as any).nama || 'Mata Pelajaran';
      const kode = m.kode_mapel || (m as any).kode;
      const kelompokVal = m.kelompok;
      return {
        value: m.id,
        label: `${nama}${kode ? ` (${kode})` : ''}${kelompokVal ? ` - [${kelompokVal}]` : ''}`,
        raw: m
      };
    });
  }, [filteredList]);

  return {
    options,
    rawList: filteredList,
    isLoading: query.isLoading,
    refetch: query.refetch
  };
}
