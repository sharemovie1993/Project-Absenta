import { useQuery } from '@tanstack/react-query';
import {
  getRekapBulananKelas,
  getRekapHarianKelas,
  getRekapBulananSiswa,
  getRekapHarianSiswa,
  getRekapHarianSiswaMe,
  getTrackingHarianSiswa,
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
 * 📅 Hook Terpusat Rekap Harian Siswa Login (/me)
 */
export function useRekapHarianSiswaMe(tanggal?: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['rekap-harian-siswa-me', tanggal],
    queryFn: async () => {
      if (!tanggal) return null;
      return await getRekapHarianSiswaMe({ tanggal });
    },
    enabled: enabled && !!tanggal,
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * 🧭 Hook Terpusat Tracking Harian Sesi Siswa
 */
export function useTrackingHarianSiswaHook(siswaId?: string, tanggal?: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['tracking-harian-siswa', siswaId, tanggal],
    queryFn: async () => {
      if (!siswaId || !tanggal) return null;
      return await getTrackingHarianSiswa(siswaId, { tanggal });
    },
    enabled: enabled && !!siswaId && !!tanggal,
    staleTime: 1000 * 60 * 2,
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
