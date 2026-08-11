import { rekapService } from './rekap.service';

export class KelasRekapService {
  private static instance: KelasRekapService;

  public static getInstance(): KelasRekapService {
    if (!KelasRekapService.instance) {
      KelasRekapService.instance = new KelasRekapService();
    }
    return KelasRekapService.instance;
  }

  async getRekapHarianKelas(kelasId: string, tanggal: string, tenantId: string, tahunPelajaranId?: string) {
    return rekapService.getRekapHarianKelas(kelasId, tanggal, tenantId, tahunPelajaranId);
  }

  async getRekapBulananKelas(kelasId: string, bulan: string, tenantId: string, tahunPelajaranId?: string) {
    return rekapService.getRekapBulananKelas(kelasId, bulan, tenantId, tahunPelajaranId);
  }

  async getRekapBulananSekolah(tenantId: string, bulan: string, jurusanId?: string) {
    return rekapService.getRekapBulananSekolah(tenantId, bulan, jurusanId);
  }
}

export const kelasRekapService = KelasRekapService.getInstance();
