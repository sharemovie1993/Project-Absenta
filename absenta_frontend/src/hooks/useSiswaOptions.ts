import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { siswaApi } from '../api/academic.api';
import type { Siswa } from '../types/academic';
import type { SearchableSelectOption } from '../components/ui/SearchableSelect';

export interface UseSiswaOptionsParams {
  kelasId?: string;
  jurusanId?: string;
  jurusanNama?: string;
  onlyActive?: boolean;
}

export function useSiswaOptions(params: UseSiswaOptionsParams = {}) {
  const { kelasId, jurusanId, jurusanNama, onlyActive = true } = params;

  const query = useQuery({
    queryKey: ['siswa-options-list', kelasId, jurusanId, jurusanNama, onlyActive],
    queryFn: () => {
      console.log('🔍 [useSiswaOptions] Executing queryFn for params:', { kelasId, jurusanId, jurusanNama });
      return siswaApi.getAll({
        limit: 1000,
        ...(kelasId ? { kelas_id: kelasId } : {}),
        ...(jurusanId ? { jurusan_id: jurusanId } : {}),
        ...(jurusanNama ? { jurusan: jurusanNama } : {}),
      } as any);
    },
    staleTime: 5 * 60 * 1000,
  });

  const rawList: Siswa[] = useMemo(() => {
    const list = query.data?.data || (Array.isArray(query.data) ? (query.data as unknown as Siswa[]) : []);
    return list;
  }, [query.data]);

  const filteredList = useMemo(() => {
    const res = rawList.filter((s) => {
      const statusStr = (s.status || 'AKTIF').toUpperCase();
      const isStatusActive = !onlyActive || statusStr === 'AKTIF' || statusStr === 'ACTIVE';
      
      if (kelasId) {
        const sKelasId = s.kelas_id || s.Kelas?.id;
        if (sKelasId && sKelasId !== kelasId) return false;
      }

      if (jurusanId || jurusanNama) {
        const jId = jurusanId ? String(jurusanId).toLowerCase() : '';
        const jNama = jurusanNama ? String(jurusanNama).toUpperCase().trim() : '';

        const sJurusanObj = (s as any).Kelas?.Jurusan;
        const sJurusanId = String((s as any).jurusan_id || sJurusanObj?.id || '').toLowerCase();
        const sJurusanNamaStr = (
          sJurusanObj?.nama_jurusan ||
          sJurusanObj?.singkatan ||
          sJurusanObj?.kode ||
          s.Kelas?.nama_kelas ||
          ''
        ).toUpperCase();

        if (jId && sJurusanId && sJurusanId !== jId) return false;
        if (jNama && !sJurusanNamaStr.includes(jNama)) return false;
      }
      
      return isStatusActive;
    });
    return res;
  }, [rawList, kelasId, jurusanId, jurusanNama, onlyActive]);

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
