import { siswaRekapService } from './siswa-rekap.service';
import { guruRekapService } from './guru-rekap.service';
import { kelasRekapService } from './kelas-rekap.service';
import { statistikRekapService } from './statistik-rekap.service';
import { DataScope } from '../../../../types/fastify';

export * from './rekap-impl.service';

/**
 * RekapService (Facade Pattern)
 * Clean Architecture Delegate for Rekapitulasi Presensi Module.
 * Completely cleaned up from legacy monolithic code while maintaining 100% Backward Compatibility.
 */
export class RekapService {
  // --- Domain 1: Siswa Rekap ---
  async getSiswaIdFromUser(tenantId: string, userId: string): Promise<string | null> {
    return siswaRekapService.getSiswaIdFromUser(tenantId, userId);
  }

  async getRekapHarianSiswa(siswaId: string, tanggal: string, tenantId: string, tahunPelajaranId?: string) {
    return siswaRekapService.getRekapHarianSiswa(siswaId, tanggal, tenantId, tahunPelajaranId);
  }

  async getRekapBulananSiswa(siswaId: string, bulan: string, tenantId: string, tahunPelajaranId?: string) {
    return siswaRekapService.getRekapBulananSiswa(siswaId, bulan, tenantId, tahunPelajaranId);
  }

  async getTrackingHarianSiswa(siswaId: string, tanggal: string, tenantId: string) {
    return siswaRekapService.getTrackingHarianSiswa(siswaId, tanggal, tenantId);
  }

  // --- Domain 2: Guru Rekap ---
  async getRekapPresensiGuruByGuruId(guruId: string, namaGuru: string) {
    return guruRekapService.getRekapPresensiGuruByGuruId(guruId, namaGuru);
  }

  async getRekapHarianGuru(tanggal: string, tenantId: string, guruId?: string) {
    return guruRekapService.getRekapHarianGuru(tanggal, tenantId, guruId);
  }

  async getTrackingHarianGuru(guruId: string, tanggal: string, tenantId: string) {
    return guruRekapService.getTrackingHarianGuru(guruId, tanggal, tenantId);
  }

  async getRekapBulananGuruMe(userId: string, tenantId: string, bulan: string) {
    return guruRekapService.getRekapBulananGuruMe(userId, tenantId, bulan);
  }

  // --- Domain 3: Kelas Rekap ---
  async getRekapHarianKelas(kelasId: string, tanggal: string, tenantId: string, tahunPelajaranId?: string) {
    return kelasRekapService.getRekapHarianKelas(kelasId, tanggal, tenantId, tahunPelajaranId);
  }

  async getRekapBulananKelas(kelasId: string, bulan: string, tenantId: string, tahunPelajaranId?: string, _scope?: DataScope) {
    return kelasRekapService.getRekapBulananKelas(kelasId, bulan, tenantId, tahunPelajaranId);
  }

  async getRekapBulananSekolah(tenantId: string, bulan: string, jurusanId?: string) {
    return kelasRekapService.getRekapBulananSekolah(tenantId, bulan, jurusanId);
  }

  async getRekapBulananMapel(kelasId: string, mapelId: string, bulan: string, tenantId: string, tahunPelajaranId?: string) {
    return kelasRekapService.getRekapBulananMapel(kelasId, mapelId, bulan, tenantId, tahunPelajaranId);
  }

  // --- Domain 4: Statistik Rekap & Activity Log ---
  async getStatistikHarian(tanggal: string, tenantId: string, tahunPelajaranId?: string, scope?: DataScope) {
    return statistikRekapService.getStatistikHarian(tanggal, tenantId, tahunPelajaranId, scope);
  }

  async getLeaderboard(tenantId: string, limit: number = 10) {
    return statistikRekapService.getLeaderboard(tenantId, limit);
  }

  async getLeaderboardGuru(tenantId: string, limit: number = 50, jenisPtk: string = 'PENDIDIK') {
    return statistikRekapService.getLeaderboardGuru(tenantId, limit, jenisPtk);
  }

  async logActivity(userId: string, tenantId: string, action: string, entityId?: string) {
    return statistikRekapService.logActivity(userId, tenantId, action, entityId);
  }
}

export const rekapService = new RekapService();
