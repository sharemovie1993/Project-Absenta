import { useQuery } from '@tanstack/react-query';
import {
  getRekapBulananKelas,
  getRekapHarianKelas,
  getRekapBulananSiswa,
  getRekapHarianSiswa,
  getStatistikHarian,
} from '../../api/attendanceGerbang.api';

/**
 * 📊 Hook Terpusat Rekap Presensi Kelas Bulanan
 */
export function useRekapBulananKelas(kelasId?: string, bulan?: string, yearId?: string) {
  return useQuery({
    queryKey: ['rekap-bulanan-kelas', kelasId, bulan, yearId],
    queryFn: async () => {
      if (!kelasId) return null;
      return await getRekapBulananKelas(kelasId, bulan, yearId);
    },
    enabled: !!kelasId,
    staleTime: 1000 * 60 * 5, // 5 menit cache React Query
  });
}

/**
 * 📅 Hook Terpusat Rekap Presensi Kelas Harian
 */
export function useRekapHarianKelas(kelasId?: string, tanggal?: string) {
  return useQuery({
    queryKey: ['rekap-harian-kelas', kelasId, tanggal],
    queryFn: async () => {
      if (!kelasId) return null;
      return await getRekapHarianKelas(kelasId, tanggal);
    },
    enabled: !!kelasId,
    staleTime: 1000 * 60 * 2, // 2 menit cache React Query
  });
}

/**
 * 👦 Hook Terpusat Rekap Presensi Siswa Individual Bulanan
 */
export function useRekapBulananSiswa(siswaId?: string, bulan?: string, yearId?: string) {
  return useQuery({
    queryKey: ['rekap-bulanan-siswa', siswaId, bulan, yearId],
    queryFn: async () => {
      if (!siswaId) return null;
      return await getRekapBulananSiswa(siswaId, bulan, yearId);
    },
    enabled: !!siswaId,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * 📈 Hook Terpusat Statistik Presensi Harian Se-Sekolah
 */
export function useStatistikHarianPresensi(tanggal?: string) {
  return useQuery({
    queryKey: ['statistik-harian-presensi', tanggal],
    queryFn: async () => {
      return await getStatistikHarian(tanggal);
    },
    staleTime: 1000 * 60 * 2,
  });
}
