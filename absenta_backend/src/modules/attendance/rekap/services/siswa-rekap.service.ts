import { rekapService } from './rekap.service';

export class SiswaRekapService {
  private static instance: SiswaRekapService;

  public static getInstance(): SiswaRekapService {
    if (!SiswaRekapService.instance) {
      SiswaRekapService.instance = new SiswaRekapService();
    }
    return SiswaRekapService.instance;
  }

  async getSiswaIdFromUser(tenantId: string, userId: string): Promise<string | null> {
    return rekapService.getSiswaIdFromUser(tenantId, userId);
  }

  async getRekapHarianSiswa(siswaId: string, tanggal: string, tenantId: string, tahunPelajaranId?: string) {
    return rekapService.getRekapHarianSiswa(siswaId, tanggal, tenantId, tahunPelajaranId);
  }

  async getRekapBulananSiswa(siswaId: string, bulan: string, tenantId: string, tahunPelajaranId?: string) {
    return rekapService.getRekapBulananSiswa(siswaId, bulan, tenantId, tahunPelajaranId);
  }

  async getTrackingHarianSiswa(siswaId: string, tanggal: string, tenantId: string) {
    return rekapService.getTrackingHarianSiswa(siswaId, tanggal, tenantId);
  }
}

export const siswaRekapService = SiswaRekapService.getInstance();
