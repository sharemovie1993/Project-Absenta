import { useQuery } from '@tanstack/react-query';
import { getJadwalKegiatan, type JadwalKegiatanItem } from '@/api/attendance/jadwalKegiatan.api';

export const isRoutineKesiswaanActivity = (keg: any): boolean => {
  if (!keg) return false;
  if (keg.aktif === false || keg.aktif === 0 || keg.aktif === 'false' || keg.aktif === '0') return false;
  return true;
};

export function useJadwalKegiatan(params?: { aktif?: boolean }) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['jadwal-kegiatan-list', params?.aktif],
    queryFn: () => getJadwalKegiatan(params).catch(err => {
      console.error('[ERROR in queryFn getJadwalKegiatan]', err);
      return null;
    }),
    staleTime: 5 * 60 * 1000,
  });

  const rawList: JadwalKegiatanItem[] = Array.isArray(data)
    ? data
    : (Array.isArray((data as any)?.data) ? (data as any).data : []);

  const pembiasaanList = rawList.filter(isRoutineKesiswaanActivity);

  return {
    data,
    rawList,
    pembiasaanList,
    isLoading,
    isError,
    refetch,
  };
}
