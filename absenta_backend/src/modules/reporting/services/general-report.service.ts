import { prisma } from '../../../utils/prisma';

export class GeneralReportService {
  /**
   * 1. Laporan Kesiswaan: Rekap Pelanggaran per Kelas
   */
  async getKesiswaanReport(tenantId: string, startDate: Date, endDate: Date) {
    const report = await prisma.kelas.findMany({
      where: { tenant_id: tenantId },
      include: {
        PelanggaranSiswa: {
          where: {
            tanggal: { gte: startDate, lte: endDate }
          },
          select: {
            poin: true,
            jenis_pelanggaran: true
          }
        },
        _count: {
          select: { Siswa: true }
        }
      }
    });

    return report.map((k: any) => ({
      kelas_id: k.id,
      nama_kelas: k.nama_kelas,
      total_siswa: k._count?.Siswa || 0,
      total_pelanggaran: k.PelanggaranSiswa?.length || 0,
      total_poin: (k.PelanggaranSiswa || []).reduce((sum: number, p: any) => sum + p.poin, 0),
    }));
  }

  /**
   * 2. Laporan Hubin: Rekap PKL
   */
  async getHubinReport(tenantId: string) {
    const totalMitra = await prisma.mitraIndustri.count({ where: { tenant_id: tenantId } });
    const penempatan = await prisma.siswaPkl.findMany({
      where: { tenant_id: tenantId },
      include: {
        Siswa: { select: { nama_siswa: true } },
        Mitra: { select: { nama: true } }
      }
    });

    return {
      total_mitra: totalMitra,
      total_siswa_pkl: penempatan.length,
      siswa_aktif_pkl: penempatan.filter(p => p.status === 'AKTIF').length,
      penempatan: penempatan.map(p => ({
        siswa: p.Siswa.nama_siswa,
        mitra: p.Mitra.nama,
        status: p.status
      }))
    };
  }

  /**
   * 3. Laporan Kurikulum: Rekap Akademik (SiswaAkademik)
   */
  async getKurikulumReport(tenantId: string, tahunPelajaranId: string) {
    const stats = await prisma.siswaAkademik.groupBy({
      by: ['status'],
      where: {
        tahun_pelajaran_id: tahunPelajaranId,
        siswa: {
          tenant_id: tenantId
        }
      },
      _count: {
        id: true
      }
    });

    return stats.map((s: any) => ({
      status: s.status,
      count: s._count?.id || 0
    }));
  }
}
