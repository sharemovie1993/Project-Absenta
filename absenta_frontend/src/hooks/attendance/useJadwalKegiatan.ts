import { useQuery } from '@tanstack/react-query';
import { getJadwalKegiatan, type JadwalKegiatanItem } from '@/api/attendance/jadwalKegiatan.api';

export function useJadwalKegiatan(params?: { aktif?: boolean }) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['jadwal-kegiatan-list', params?.aktif],
    queryFn: () => getJadwalKegiatan(params),
    staleTime: 5 * 60 * 1000,
  });

  const rawList: JadwalKegiatanItem[] = data?.success && Array.isArray(data.data) ? data.data : [];

export const isRoutineKesiswaanActivity = (keg: any): boolean => {
  if (!keg || keg.aktif === false) return false;
  const jTipe = String(keg.jenis_kegiatan || '').toUpperCase();
  const namaLower = String(keg.nama || '').toLowerCase();

  return (
    jTipe === 'PEMBIASAAN' ||
    jTipe === 'UPACARA' ||
    jTipe === 'APEL' ||
    jTipe === 'IBADAH' ||
    namaLower.includes('upacara') ||
    namaLower.includes('apel') ||
    namaLower.includes('duha') ||
    namaLower.includes('dhuha') ||
    namaLower.includes('ketarunaan') ||
    namaLower.includes('pembiasaan') ||
    namaLower.includes('senam') ||
    namaLower.includes('pramuka') ||
    namaLower.includes('yasin') ||
    namaLower.includes('literasi')
  );
};

export function useJadwalKegiatan(params?: { aktif?: boolean }) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['jadwal-kegiatan-list', params?.aktif],
    queryFn: () => getJadwalKegiatan(params),
    staleTime: 5 * 60 * 1000,
  });

  const rawList: JadwalKegiatanItem[] = data?.success && Array.isArray(data.data) ? data.data : [];

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
