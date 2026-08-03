import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { piketApi, piketQueryKeys, type IzinKeluarSiswa } from '../api/piket.api';

export interface UsePiketIzinKeluarOptionsParams {
  date?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  refetchInterval?: number | false;
}

export interface PiketIzinSelectOption {
  value: string;
  label: string;
  permit: IzinKeluarSiswa;
}

/**
 * Custom React Query Hook khusus Izin Keluar Siswa / Meja Piket Siswa
 */
export function usePiketIzinKeluarOptions(params?: UsePiketIzinKeluarOptionsParams) {
  const query = useQuery({
    queryKey: piketQueryKeys.dailyPermits(params),
    queryFn: async () => {
      const res: any = await piketApi.getDailyPermits(params).catch(() => null);
      if (!res) return [];
      if (Array.isArray(res)) return res;
      if (Array.isArray(res.data)) return res.data;
      if (Array.isArray(res.list)) return res.list;
      if (Array.isArray(res.data?.list)) return res.data.list;
      if (Array.isArray(res.data?.data)) return res.data.data;
      return [];
    },
    staleTime: params?.refetchInterval !== undefined ? 0 : 5000,
    refetchInterval: params?.refetchInterval ?? 5000, // 5-second real-time auto sync for live gate & dashboard monitoring
  });

  const rawList: IzinKeluarSiswa[] = useMemo(() => {
    return Array.isArray(query.data) ? query.data : [];
  }, [query.data]);

  const filteredList = useMemo(() => {
    if (!params?.status) return rawList;
    return rawList.filter(p => p.status === params.status);
  }, [rawList, params?.status]);

  const activeOutList = useMemo(() => {
    return rawList.filter(p => {
      const st = String(p.status || '').toUpperCase();
      const isReturned = st === 'KEMBALI' || Boolean(p.jam_kembali);
      return !isReturned;
    });
  }, [rawList]);

  const returnedList = useMemo(() => {
    return rawList.filter(p => {
      const st = String(p.status || '').toUpperCase();
      return st === 'KEMBALI' || Boolean(p.jam_kembali);
    });
  }, [rawList]);

  const options: PiketIzinSelectOption[] = useMemo(() => {
    return filteredList.map(p => {
      const namaSiswa = p.SiswaAkademik?.siswa?.nama_siswa || (p as any).Siswa?.nama_siswa || (p as any).siswa?.nama_siswa || (p as any).nama_siswa || 'Siswa';
      const kelas = p.SiswaAkademik?.kelas?.nama_kelas || (p as any).Siswa?.Kelas?.nama_kelas || (p as any).kelas?.nama_kelas ? `(${p.SiswaAkademik?.kelas?.nama_kelas || (p as any).Siswa?.Kelas?.nama_kelas || (p as any).kelas?.nama_kelas})` : '';
      const jam = p.jam_keluar ? new Date(p.jam_keluar).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';
      return {
        value: p.id,
        label: `${namaSiswa} ${kelas} - Izin: ${p.alasan} [Keluar: ${jam}]`,
        permit: p,
      };
    });
  }, [filteredList]);

  return {
    ...query,
    list: filteredList,
    rawList,
    activeOutList,
    returnedList,
    activeCount: activeOutList.length,
    totalCount: rawList.length,
    options,
  };
}

// Alias explicit short names for zero ambiguity
export const usePiketIzinOptions = usePiketIzinKeluarOptions;
export const usePiketOptions = usePiketIzinKeluarOptions;
