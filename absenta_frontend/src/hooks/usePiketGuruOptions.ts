import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { piketGuruApi, type JadwalPiketGuru, type Hari } from '../api/piketGuru.api';

export interface UsePiketGuruOptionsParams {
  tahun_pelajaran_id?: string;
  semester_id?: string;
  hari?: Hari;
  guru_id?: string;
}

export interface PiketGuruSelectOption {
  value: string;
  label: string;
  jadwal: JadwalPiketGuru;
}

export function usePiketGuruOptions(params?: UsePiketGuruOptionsParams) {
  const isHariIniQuery = !params || Object.keys(params).length === 0;

  const hariIniQuery = useQuery({
    queryKey: ['piket-guru', 'hari-ini'],
    queryFn: async () => {
      const res = await piketGuruApi.getHariIni().catch(() => null);
      return res?.success && res?.data ? res.data : null;
    },
    enabled: isHariIniQuery,
    staleTime: 5 * 60 * 1000,
  });

  const listQuery = useQuery({
    queryKey: ['piket-guru-list', params?.tahun_pelajaran_id, params?.semester_id, params?.hari, params?.guru_id],
    queryFn: async () => {
      const res = await piketGuruApi.getList(params).catch(() => null);
      return res?.success && res?.data ? res.data : [];
    },
    enabled: !isHariIniQuery,
    staleTime: 5 * 60 * 1000,
  });

  const activeQuery = isHariIniQuery ? hariIniQuery : listQuery;

  const rawList: JadwalPiketGuru[] = useMemo(() => {
    if (isHariIniQuery) {
      return hariIniQuery.data?.guru_piket || [];
    }
    return Array.isArray(listQuery.data) ? listQuery.data : [];
  }, [isHariIniQuery, hariIniQuery.data, listQuery.data]);

  const options: PiketGuruSelectOption[] = useMemo(() => {
    return rawList.map(j => {
      const namaGuru = j.Guru?.nama_guru || 'Guru Piket';
      const pos = j.pos_piket ? `(${j.pos_piket})` : '';
      return {
        value: j.guru_id || j.id,
        label: `${namaGuru} ${pos}`.trim(),
        jadwal: j,
      };
    });
  }, [rawList]);

  return {
    ...activeQuery,
    list: rawList,
    guruPiketHariIni: rawList,
    totalGuruPiket: rawList.length,
    options,
  };
}

// Alias explicit name for zero ambiguity
export const useJadwalPiketGuruOptions = usePiketGuruOptions;
