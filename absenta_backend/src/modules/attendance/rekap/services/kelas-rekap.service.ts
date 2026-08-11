import { rekapImplService } from './rekap-impl.service';

export class KelasRekapService {
  private static instance: KelasRekapService;

  public static getInstance(): KelasRekapService {
    if (!KelasRekapService.instance) {
      KelasRekapService.instance = new KelasRekapService();
    }
    return KelasRekapService.instance;
  }

  async getRekapHarianKelas(kelasId: string, tanggal: string, tenantId: string, tahunPelajaranId?: string) {
    return rekapImplService.getRekapHarianKelas(kelasId, tanggal, tenantId, tahunPelajaranId);
  }

  async getRekapBulananKelas(kelasId: string, bulan: string, tenantId: string, tahunPelajaranId?: string) {
    return rekapImplService.getRekapBulananKelas(kelasId, bulan, tenantId, tahunPelajaranId);
  }

  async getRekapBulananSekolah(tenantId: string, bulan: string, jurusanId?: string) {
    return rekapImplService.getRekapBulananSekolah(tenantId, bulan, jurusanId);
  }

  async getRekapBulananMapel(kelasId: string, mapelId: string, bulan: string, tenantId: string, tahunPelajaranId?: string) {
    return rekapImplService.getRekapBulananMapel(kelasId, mapelId, bulan, tenantId, tahunPelajaranId);
  }
}

export const kelasRekapService = KelasRekapService.getInstance();
