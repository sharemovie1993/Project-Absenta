// @ts-nocheck
import { prisma } from '../../../../utils/prisma';
import { AbsensiMode } from '../../../../constants/enums';
import { ATTENDANCE_POINTS } from '@/constants/attendance-points';
import { AttendanceRuleEngine } from '@/domain/attendance/AttendanceRuleEngine';
import { DataScope } from '../../../../types/fastify';
import { CacheService } from '../../../../utils/cache.service';
import { CACHE_KEYS } from '../../../../constants/cache-keys';
import { formatTenantTime, getTenantTimezone, getTenantOffsetString } from '../../../../utils/timezone.utils';

const cacheService = CacheService.getInstance();

export interface RekapHarianSiswaResponse {
  nama_siswa: string;
  tanggal: string;
  status: string;
  rincian: Array<{
    jenis_kegiatan: string;
    status: string;
    waktu_tap: string | null;
  }>;
}

export interface RekapBulananSiswaResponse {
  nama_siswa: string;
  bulan: string;
  statistik: {
    HADIR: number;
    IZIN: number;
    SAKIT: number;
    ALPA: number;
    TERLAMBAT: number;
    DISPEN: number;
  };
  persentase_kehadiran: number;
  total_hadir: number;
  total_izin: number;
  total_sakit: number;
  total_alpa: number;
  total_terlambat: number;
  total_poin: number;
  detail: Array<{
    tanggal: string;
    status: string;
  }>;
}

export interface RekapKelasBulananData {
  kelas_id: string;
  bulan: string;
  total_hadir: number;
  total_sakit: number;
  total_izin: number;
  total_alpa: number;
  total_telat: number;
  persentase_kehadiran: number;
  wali_kelas?: { nama_guru: string; nip?: string | null } | null;
  students: Array<{
    id: string;
    siswa_id?: string;
    nama: string;
    nama_siswa?: string;
    nis?: string | null;
    hadir: number;
    sakit: number;
    izin: number;
    alpa: number;
    HADIR?: number;
    IZIN?: number;
    SAKIT?: number;
    ALPA?: number;
    TERLAMBAT?: number;
    persentase: number;
    total_poin: number;
  }>;
}

export interface RekapMapelBulananData {
  kelas_id: string;
  mapel_id: string;
  bulan: string;
  total_sesi: number;
  mapel: {
    id: string;
    nama_mapel: string;
    kode_mapel?: string | null;
  } | null;
  guru_mapel: {
    nama_guru: string;
    nip?: string | null;
  } | null;
  wali_kelas: {
    nama_guru: string;
    nip?: string | null;
  } | null;
  students: Array<{
    id: string;
    siswa_id: string;
    nama_siswa: string;
    nis?: string | null;
    hadir: number;
    sakit: number;
    izin: number;
    alpa: number;
    HADIR: number;
    IZIN: number;
    SAKIT: number;
    ALPA: number;
    TERLAMBAT: number;
    persentase: number;
    total_poin: number;
    dailyMap: Record<string, string>;
  }>;
}

export interface TrackingHarianSiswaResponse {
  nama: string;
  nis?: string;
  tanggal: string;
  status?: string;
  kegiatan: Array<{
    waktu: string;
    timestamp?: Date | null;
    jenis_kegiatan: string;
    status: string;
    keterangan?: string | null;  // Catatan dari tap gerbang atau sesi — termasuk warisan kegiatan pembiasaan overtime
  }>;
}

export interface RekapHarianGuruResponse {
  nama_guru: string;
  mapel: string;
  kelas: string;
  status: string;
}

export interface StatistikHarianResponse {
  kelas: string;
  HADIR: number;
  IZIN: number;
  SAKIT: number;
  ALPA: number;
  TERLAMBAT: number;
  DISPEN: number;
}

export interface GuruPresensiSummaryResult {
  guruId: string;
  namaGuru: string;
  hariTglStr: string;
  bulanStr: string;
  statusMasukText: string;
  statusPulangText: string;
  statusKbmTodayText: string;
  rekapBulan: {
    totalHadirTepat: number;
    totalTerlambat: number;
    totalIzinSakit: number;
    totalAlpa: number;
    totalSesiMonth: number;
    totalKbmHadirMonth: number;
    rateKbm: number;
  };
}


import { GuruRekapCalculator } from './sub/guru-rekap.calculator';
import { SiswaRekapCalculator } from './sub/siswa-rekap.calculator';
import { KelasRekapCalculator } from './sub/kelas-rekap.calculator';
import { StatsRekapCalculator } from './sub/stats-rekap.calculator';

export class RekapImplService {
  private guruCalc = new GuruRekapCalculator();
  private siswaCalc = new SiswaRekapCalculator();
  private kelasCalc = new KelasRekapCalculator();
  private statsCalc = new StatsRekapCalculator();

  async getRekapPresensiGuruByGuruId(...args: any[]) { return (this.guruCalc as any).getRekapPresensiGuruByGuruId(...args); }
  async getRekapHarianGuru(...args: any[]) { return (this.guruCalc as any).getRekapHarianGuru(...args); }
  async getTrackingHarianGuru(...args: any[]) { return (this.guruCalc as any).getTrackingHarianGuru(...args); }
  async getRekapBulananGuruMe(...args: any[]) { return (this.guruCalc as any).getRekapBulananGuruMe(...args); }
  async getLeaderboardGuru(...args: any[]) { return (this.guruCalc as any).getLeaderboardGuru(...args); }

  async getSiswaIdFromUser(...args: any[]) { return (this.siswaCalc as any).getSiswaIdFromUser(...args); }
  async getRekapBulananSiswa(...args: any[]) { return (this.siswaCalc as any).getRekapBulananSiswa(...args); }
  async getTrackingHarianSiswa(...args: any[]) { return (this.siswaCalc as any).getTrackingHarianSiswa(...args); }
  async getRekapHarianSiswa(...args: any[]) { return (this.siswaCalc as any).getRekapHarianSiswa(...args); }

  async getRekapBulananKelas(...args: any[]) { return (this.kelasCalc as any).getRekapBulananKelas(...args); }
  async getRekapBulananMapel(...args: any[]) { return (this.kelasCalc as any).getRekapBulananMapel(...args); }
  async getRekapBulananSekolah(...args: any[]) { return (this.kelasCalc as any).getRekapBulananSekolah(...args); }
  async getRekapHarianKelas(...args: any[]) { return (this.kelasCalc as any).getRekapHarianKelas(...args); }

  async getStatistikHarian(...args: any[]) { return (this.statsCalc as any).getStatistikHarian(...args); }
  async logActivity(...args: any[]) { return (this.statsCalc as any).logActivity(...args); }
  async getLeaderboard(...args: any[]) { return (this.statsCalc as any).getLeaderboard(...args); }
}

export const rekapImplService = new RekapImplService();
