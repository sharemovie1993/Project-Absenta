import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { kelasApi } from '../api/academic.api';
import type { Kelas } from '../types/academic';
import type { SearchableSelectOption } from '../components/ui/SearchableSelect';
import { useJenjang } from './useJenjang';

export interface UseKelasOptionsParams {
  onlyActive?: boolean;
  jurusanId?: string;
  tingkat?: number;
  filterByJenjang?: boolean;
}

export function useKelasOptions(params: UseKelasOptionsParams = {}) {
  const { onlyActive = true, jurusanId, tingkat, filterByJenjang = true } = params;
  const { tingkatList } = useJenjang();
  const serializedTingkatList = useMemo(() => (tingkatList || []).join(','), [tingkatList]);

  const query = useQuery({
    queryKey: ['kelas-options-list', onlyActive, jurusanId, tingkat, filterByJenjang, serializedTingkatList],
    queryFn: () => kelasApi.getAll({ 
      limit: 500, 
      ...(onlyActive ? { is_active: true } : {}) 
    } as any),
    staleTime: 5 * 60 * 1000,
  });

  const rawList: Kelas[] = useMemo(() => {
    return query.data?.data || (Array.isArray(query.data) ? (query.data as unknown as Kelas[]) : []);
  }, [query.data]);

  const filteredList = useMemo(() => {
    return rawList.filter((k) => {
      const isActiveBool = k.is_active !== false;
      const statusText = ((k as any).status || 'AKTIF').toUpperCase();
      const isActiveStatus = statusText === 'AKTIF' || statusText === 'ACTIVE';
      
      if (onlyActive && (!isActiveBool || !isActiveStatus)) return false;
      if (jurusanId && k.jurusan_id !== jurusanId) return false;
      if (tingkat !== undefined && Number(k.tingkat) !== Number(tingkat)) return false;

      // Filter by tenant jenjang tingkatList (SD: 1-6, SMP: 7-9, SMA: 10-12, SMK: 10-12/13)
      if (filterByJenjang && tingkatList && tingkatList.length > 0) {
        if (!tingkatList.includes(Number(k.tingkat))) return false;
      }

      return true;
    });
  }, [rawList, onlyActive, jurusanId, tingkat, filterByJenjang, tingkatList]);

  const options: SearchableSelectOption[] = useMemo(() => {
    return filteredList.map((k) => {
      const nama = k.nama_kelas || (k as any).nama || 'Kelas';
      const kodeJurusan = k.Jurusan?.kode_jurusan || (k.Jurusan as any)?.kode || (k.Jurusan as any)?.singkatan;
      return {
        value: k.id,
        label: `${nama}${kodeJurusan ? ` (${kodeJurusan})` : ''}`,
        raw: k
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
