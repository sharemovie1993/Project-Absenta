import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { hubinApi } from '../api/hubin.api';
import type { SearchableSelectOption } from '../components/ui/SearchableSelect';

export interface ActivePklStudentFilter {
  kelas_id?: string;
  mitra_id?: string;
  pembimbing_id?: string;
  search?: string;
}

export function useActivePklStudents(filter?: ActivePklStudentFilter) {
  const query = useQuery({
    queryKey: ['hubin-active-pkl-students-options', filter],
    queryFn: async () => {
      const res = await hubinApi.getPenempatan({
        status: 'AKTIF',
        limit: 1000,
        ...filter,
      });
      const list = Array.isArray(res?.data) ? res.data : (res?.data as any)?.list || [];
      return list;
    },
    staleTime: 5 * 60 * 1000, // Cache selama 5 menit
  });

  const rawList = useMemo(() => {
    return query.data || [];
  }, [query.data]);

  // Dropdown options siap pakai untuk SearchableSelect
  const options: SearchableSelectOption[] = useMemo(() => {
    return rawList.map((p: any) => {
      const namaSiswa = p.Siswa?.nama_siswa || p.Siswa?.full_name || p.siswa_nama || 'Siswa';
      const kelasNama = p.Siswa?.Kelas?.nama_kelas || p.kelas_nama || '';
      const dudiNama = p.Mitra?.nama || p.MitraIndustri?.nama || p.mitra_nama || 'DU-DI';
      
      return {
        value: p.siswa_id || p.id,
        label: `${namaSiswa}${kelasNama ? ` (${kelasNama})` : ''} — ${dudiNama}`,
        raw: p,
      };
    });
  }, [rawList]);

  return {
    options,
    rawList,
    totalCount: rawList.length,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
