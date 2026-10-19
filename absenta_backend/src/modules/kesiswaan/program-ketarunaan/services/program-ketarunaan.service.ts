import { unifiedKegiatanService, UnifiedTapPayload } from '@/modules/attendance/unified-kegiatan/services/unified-kegiatan.service';

/**
 * ProgramKetarunaanService
 * 
 * Bertindak sebagai spesialisasi / wrapper ke UnifiedKegiatanService dengan konteks jenis kegiatan "KETARUNAAN".
 * Memastikan backward compatibility 100% untuk semua controller & route kesiswaan yang sudah ada.
 */
export class ProgramKetarunaanService {
  async getGuardStatus(tenantId: string) {
    return unifiedKegiatanService.getGuardStatus(tenantId, 'KETARUNAAN');
  }

  async getSesiHariIni(tenantId: string, params?: { tanggal?: string; jadwal_kegiatan_id?: string }) {
    return unifiedKegiatanService.getSesiHariIni(tenantId, { ...params, jenis_kegiatan: 'KETARUNAAN' });
  }

  async getPendamping(tenantId: string, params: { tanggal?: string; sesi_id?: string; jadwal_kegiatan_id?: string }) {
    return unifiedKegiatanService.getPendamping(tenantId, { ...params, jenis_kegiatan: 'KETARUNAAN' });
  }

  async tapPendamping(tenantId: string, payload: UnifiedTapPayload) {
    return unifiedKegiatanService.tapPendamping(tenantId, payload);
  }

  async getStats(tenantId: string, params?: { tahun_pelajaran_id?: string; semester_id?: string; jadwal_kegiatan_id?: string }) {
    return unifiedKegiatanService.getStats(tenantId, { ...params, jenis_kegiatan: 'KETARUNAAN' });
  }

  async getLaporanTim(tenantId: string, params: { tanggal?: string; sesi_id?: string; jadwal_kegiatan_id?: string }) {
    return unifiedKegiatanService.getLaporanTim(tenantId, { ...params, jenis_kegiatan: 'Ketarunaan' });
  }

  async getLaporanKelas(tenantId: string, params: { tanggal?: string; kelas_id?: string; jadwal_kegiatan_id?: string }) {
    return unifiedKegiatanService.getLaporanKelas(tenantId, { ...params, jenis_kegiatan: 'Ketarunaan' });
  }
}

export const programKetarunaanService = new ProgramKetarunaanService();
