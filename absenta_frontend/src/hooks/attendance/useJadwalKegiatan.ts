import { useQuery } from '@tanstack/react-query';
import { getJadwalKegiatan, type JadwalKegiatanItem } from '@/api/attendance/jadwalKegiatan.api';

export function useJadwalKegiatan(params?: { aktif?: boolean }) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['jadwal-kegiatan-list', params?.aktif],
    queryFn: () => getJadwalKegiatan(params),
    staleTime: 5 * 60 * 1000,
  });

  const rawList: JadwalKegiatanItem[] = data?.success && Array.isArray(data.data) ? data.data : [];

  const pembiasaanList = rawList.filter(keg => {
    const jTipe = (keg.jenis_kegiatan || '').toUpperCase();
    return (
      jTipe === 'PEMBIASAAN' ||
      (keg.nama || '').toLowerCase().includes('apel') ||
      (keg.nama || '').toLowerCase().includes('duha') ||
      (keg.nama || '').toLowerCase().includes('ketarunaan')
    );
  });

  return {
    data,
    rawList,
    pembiasaanList,
    isLoading,
    isError,
    refetch,
  };
}
