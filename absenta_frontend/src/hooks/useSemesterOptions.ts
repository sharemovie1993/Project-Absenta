import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { semesterApi } from '../api/academic.api';
import type { Semester } from '../types/academic';
import type { SearchableSelectOption } from '../components/ui/SearchableSelect';

export interface UseSemesterOptionsParams {
  tahunPelajaranId?: string;
}

export function useSemesterOptions(params: UseSemesterOptionsParams = {}) {
  const { tahunPelajaranId } = params;

  const query = useQuery({
    queryKey: ['semester-options-list', tahunPelajaranId],
    queryFn: () => semesterApi.getAll({ limit: 200 }),
    staleTime: 5 * 60 * 1000,
  });

  const rawList: Semester[] = useMemo(() => {
    return query.data?.data || (Array.isArray(query.data) ? (query.data as unknown as Semester[]) : []);
  }, [query.data]);

  const filteredList = useMemo(() => {
    if (!tahunPelajaranId) return rawList;
    return rawList.filter(s => s.tahun_pelajaran_id === tahunPelajaranId);
  }, [rawList, tahunPelajaranId]);

  const activeSemester = useMemo(() => {
    return filteredList.find(s => s.is_active) || rawList.find(s => s.is_active);
  }, [filteredList, rawList]);

  const options: SearchableSelectOption[] = useMemo(() => {
    return filteredList.map((s) => ({
      value: s.id,
      label: `Semester ${s.nama_semester}${s.TahunPelajaran?.tahun ? ` (TP ${s.TahunPelajaran.tahun})` : ''}${s.is_active ? ' ⭐ [AKTIF]' : ''}`,
      raw: s
    }));
  }, [filteredList]);

  return {
    options,
    rawList: filteredList,
    activeSemester,
    isLoading: query.isLoading,
    refetch: query.refetch
  };
}
