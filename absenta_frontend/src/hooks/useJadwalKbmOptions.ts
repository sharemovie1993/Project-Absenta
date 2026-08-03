import { useQuery } from '@tanstack/react-query';
import api from '../lib/axiosInstance';

export interface JadwalKbmParams {
  kelas_id?: string;
  guru_id?: string;
  tahun_pelajaran_id?: string;
  semester_id?: string;
  hari?: string;
}

export function useJadwalKbmOptions(params?: JadwalKbmParams) {
  const query = useQuery({
    queryKey: ['jadwal-kbm-options', params?.kelas_id, params?.guru_id, params?.tahun_pelajaran_id, params?.semester_id, params?.hari],
    queryFn: async () => {
      const response = await api.get('/academic/jadwal-kbm', { params }).catch(() => null);
      return response?.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const list = query.data?.data ?? (Array.isArray(query.data) ? query.data : []);

  return {
    ...query,
    list,
  };
}
