import { prisma } from '@/utils/prisma';



export class KospConfigService {
  /**
   * Mengambil konfigurasi KOSP untuk tenant & tahun pelajaran tertentu
   */
  static async getByTahun(tenantId: string, tahunPelajaranId: string) {
    return await prisma.kospConfig.findUnique({
      where: {
        tenant_id_tahun_pelajaran_id: {
          tenant_id: tenantId,
          tahun_pelajaran_id: tahunPelajaranId,
        },
      },
    });
  }

  /**
   * Menyimpan / memperbarui (upsert) konfigurasi KOSP per tahun pelajaran
   */
  static async upsert(tenantId: string, data: {
    tahun_pelajaran_id: string;
    visi?: string;
    misi?: string;
    karakteristik?: string;
    halaman_html?: string;
    config?: string;
  }) {
    const { tahun_pelajaran_id, visi, misi, karakteristik, halaman_html, config } = data;

    return await prisma.kospConfig.upsert({
      where: {
        tenant_id_tahun_pelajaran_id: {
          tenant_id: tenantId,
          tahun_pelajaran_id,
        },
      },
      create: {
        tenant_id: tenantId,
        tahun_pelajaran_id,
        visi,
        misi,
        karakteristik,
        halaman_html,
        config,
      },
      update: {
        visi,
        misi,
        karakteristik,
        halaman_html,
        config,
        updated_at: new Date(),
      },
    });
  }
}
