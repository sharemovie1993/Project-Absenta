import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { siswaApi } from '../api/academic.api';
import type { Siswa } from '../types/academic';
import type { SearchableSelectOption } from '../components/ui/SearchableSelect';

export interface UseSiswaOptionsParams {
  kelasId?: string;
  onlyActive?: boolean;
}

export function useSiswaOptions(params: UseSiswaOptionsParams = {}) {
  const { kelasId, onlyActive = true } = params;

  const query = useQuery({
    queryKey: ['siswa-options-list', kelasId, onlyActive],
    queryFn: () => siswaApi.getAll({
      limit: 1000,
      ...(kelasId ? { kelas_id: kelasId } : {})
    }),
    staleTime: 5 * 60 * 1000,
  });

  const rawList: Siswa[] = useMemo(() => {
    return query.data?.data || (Array.isArray(query.data) ? (query.data as unknown as Siswa[]) : []);
  }, [query.data]);

  const filteredList = useMemo(() => {
    return rawList.filter((s) => {
      const statusStr = (s.status || 'AKTIF').toUpperCase();
      const isStatusActive = !onlyActive || statusStr === 'AKTIF' || statusStr === 'ACTIVE';
      
      if (kelasId) {
        const sKelasId = s.kelas_id || s.Kelas?.id;
        if (sKelasId && sKelasId !== kelasId) return false;
      }
      
      return isStatusActive;
    });
  }, [rawList, kelasId, onlyActive]);

  const options: SearchableSelectOption[] = useMemo(() => {
    return filteredList.map((s) => ({
      value: s.id,
      label: `${s.nama_siswa}${s.nis ? ` (NIS: ${s.nis})` : ''}${s.Kelas?.nama_kelas ? ` - [${s.Kelas.nama_kelas}]` : ''}`,
      raw: s
    }));
  }, [filteredList]);

  return {
    options,
    rawList: filteredList,
    isLoading: query.isLoading,
    refetch: query.refetch
  };
}
