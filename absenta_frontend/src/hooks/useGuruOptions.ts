import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { guruApi } from '../api/academic.api';
import type { Guru } from '../types/academic';
import type { SearchableSelectOption } from '../components/ui/SearchableSelect';

export interface UseGuruOptionsParams {
  jenisPtk?: 'PENDIDIK' | 'TENAGA_KEPENDIDIKAN' | 'ALL';
  onlyActive?: boolean;
  teachingLoadMap?: Record<string, { total_jp: number }>;
}

export function useGuruOptions(params: UseGuruOptionsParams = {}) {
  const { jenisPtk = 'PENDIDIK', onlyActive = true, teachingLoadMap } = params;

  const query = useQuery({
    queryKey: ['guru-options-list', jenisPtk, onlyActive],
    queryFn: () => guruApi.getAll({ 
      limit: 1000, 
      ...(jenisPtk !== 'ALL' ? { jenis_ptk: jenisPtk } : {}) 
    }),
    staleTime: 5 * 60 * 1000, // 5-minute cache
  });

  const rawList: Guru[] = useMemo(() => {
    return query.data?.data || (Array.isArray(query.data) ? (query.data as unknown as Guru[]) : []);
  }, [query.data]);

  const filteredList = useMemo(() => {
    return rawList.filter((g) => {
      // Filter jenis_ptk — strict match, no loose ptk.includes()
      const ptk = (g.jenis_ptk || '').toUpperCase().trim();
      const isMatchPtk =
        jenisPtk === 'ALL' ||
        ptk === jenisPtk ||
        (jenisPtk === 'PENDIDIK' && (ptk === 'PENDIDIK' || ptk === 'GURU'));

      // Filter active status
      const u = g.User;
      const isUserActive = !onlyActive || (u ? (u.is_active !== false && u.status?.toUpperCase() !== 'INACTIVE' && u.status?.toUpperCase() !== 'NONAKTIF' && u.status?.toUpperCase() !== 'SUSPENDED') : true);

      return isMatchPtk && isUserActive;
    });
  }, [rawList, jenisPtk, onlyActive]);

  const options: SearchableSelectOption[] = useMemo(() => {
    return filteredList.map((g) => {
      let loadSuffix = '';
      if (teachingLoadMap && teachingLoadMap[g.id] !== undefined) {
        const load = teachingLoadMap[g.id]?.total_jp || 0;
        const loadLabel = load === 0 ? '🟢 0 JP (Kosong)' : load >= 5 ? `🔴 ${load} JP (Padat)` : `🟡 ${load} JP`;
        loadSuffix = ` - [${loadLabel}]`;
      }

      return {
        value: g.id,
        label: `${g.nama_guru}${g.nip ? ` (NIP: ${g.nip})` : ''}${loadSuffix}`,
        raw: g
      };
    });
  }, [filteredList, teachingLoadMap]);

  return {
    options,
    rawList: filteredList,
    isLoading: query.isLoading,
    refetch: query.refetch
  };
}
