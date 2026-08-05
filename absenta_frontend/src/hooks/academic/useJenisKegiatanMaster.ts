import { useQuery } from '@tanstack/react-query';
import { jenisKegiatanMasterApi, type JenisKegiatanMaster } from '@/api/academic/jenisKegiatanMaster.api';

export function useJenisKegiatanMaster() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['jenis-kegiatan-master-list'],
    queryFn: () => jenisKegiatanMasterApi.getAll({ limit: 100 }).catch(() => ({ success: false, data: [] as JenisKegiatanMaster[] })),
    staleTime: 10 * 60 * 1000,
  });

  const rawList: JenisKegiatanMaster[] = data?.success && Array.isArray(data.data) ? data.data : [];

  const nonKbmList = rawList.filter(m => m.nama !== 'KBM' && m.tipe !== 'KBM');

  return {
    data,
    rawList,
    nonKbmList,
    isLoading,
    isError,
    refetch,
  };
}
