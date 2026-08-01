import { prisma } from '../../../../utils/prisma';
import { cacheService } from '../../../../utils/cache.service';
import { cacheInvalidationService } from '../../../../utils/cache-invalidation.service';
import { CACHE_KEYS, CACHE_TTL } from '../../../../constants/cache-keys';

export class PiketService {
  /**
   * 1. Buat Izin Keluar Baru
   */
  async createIzin(tenantId: string, data: {
    siswa_akademik_id: string;
    guru_piket_id?: string;
    alasan: string;
    tipe_izin: string;
    jam_keluar: Date;
  }) {
    let academicId = data.siswa_akademik_id;

    // Robust resolution: Check if the provided ID is a valid SiswaAkademik ID
    const exists = await prisma.siswaAkademik.findUnique({
      where: { id: academicId }
    });

    if (!exists) {
      // Treat as base Siswa ID and look up active SiswaAkademik mapping for this student
      const sa = await prisma.siswaAkademik.findFirst({
        where: {
          siswa_id: academicId,
          status: 'AKTIF'
        }
      });

      if (!sa) {
        throw new Error('Siswa tidak memiliki data akademik yang aktif pada tahun ajaran/semester ini');
      }
      academicId = sa.id;
    }

    const res = await prisma.izinKeluarSiswa.create({
      data: {
        tenant_id: tenantId,
        siswa_akademik_id: academicId,
        guru_piket_id: data.guru_piket_id,
        alasan: data.alasan,
        tipe_izin: data.tipe_izin || 'IZIN_KELUAR',
        jam_keluar: data.jam_keluar,
        status: 'DISETUJUI'
      },
      include: {
        SiswaAkademik: {
          include: {
            siswa: { select: { nama_siswa: true, nis: true } },
            kelas: { select: { nama_kelas: true } }
          }
        },
        GuruPiket: { select: { nama_guru: true } }
      }
    });

    // Invalidate piket and attendance cache
    void cacheInvalidationService.invalidatePiketCache(tenantId);

    return res;
  }

  /**
   * 2. Catat Siswa Kembali
   */
  async catatKembali(tenantId: string, id: string) {
    const res = await prisma.izinKeluarSiswa.update({
      where: { id, tenant_id: tenantId },
      data: {
        status: 'KEMBALI',
        jam_kembali: new Date()
      }
    });

    // Invalidate piket cache
    void cacheInvalidationService.invalidatePiketCache(tenantId);

    return res;
  }

  /**
   * 3. Get Izin Harian (Monitoring)
   */
  async getIzinHarian(tenantId: string, date: Date) {
    const dateStr = date.toISOString().split('T')[0];
    const cacheKey = CACHE_KEYS.KESISWAAN.PIKET_HARIAN(tenantId, dateStr);

    return await cacheService.getOrSet(
      cacheKey,
      async () => {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        return await prisma.izinKeluarSiswa.findMany({
          where: {
            tenant_id: tenantId,
            jam_keluar: { gte: startOfDay, lte: endOfDay }
          },
          include: {
            SiswaAkademik: {
              include: {
                siswa: { select: { nama_siswa: true, nis: true } },
                kelas: { select: { nama_kelas: true } }
              }
            },
            GuruPiket: { select: { nama_guru: true } }
          },
          orderBy: { jam_keluar: 'desc' }
        });
      },
      CACHE_TTL.DASHBOARD
    );
  }

  /**
   * 3.5. Get Izin Range (Untuk Laporan Kustom / Filter)
   */
  async getIzinRange(tenantId: string, startDateStr: string, endDateStr: string) {
    const start = new Date(startDateStr);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDateStr);
    end.setHours(23, 59, 59, 999);

    return await prisma.izinKeluarSiswa.findMany({
      where: {
        tenant_id: tenantId,
        jam_keluar: { gte: start, lte: end }
      },
      include: {
        SiswaAkademik: {
          include: {
            siswa: { select: { nama_siswa: true, nis: true } },
            kelas: { select: { nama_kelas: true } }
          }
        },
        GuruPiket: { select: { nama_guru: true } }
      },
      orderBy: { jam_keluar: 'desc' }
    });
  }

  /**
   * 4. Batalkan Izin
   */
  async deleteIzin(tenantId: string, id: string) {
    const res = await prisma.izinKeluarSiswa.delete({
      where: { id, tenant_id: tenantId }
    });

    // Invalidate piket cache
    void cacheInvalidationService.invalidatePiketCache(tenantId);

    return res;
  }
}
