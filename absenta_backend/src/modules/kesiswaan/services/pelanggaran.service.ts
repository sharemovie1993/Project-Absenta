import { Prisma } from '@prisma/client';
import { prisma } from '../../../utils/prisma';
import { applyDataScope } from '../../../utils/applyDataScope';
import { DataScope } from '../../../types/fastify';
import { cacheService } from '../../../utils/cache.service';
import { cacheInvalidationService } from '../../../utils/cache-invalidation.service';
import { CACHE_KEYS, CACHE_TTL } from '../../../constants/cache-keys';
import { getTenantTimezone, getTenantDayRangeUTC } from '../../../utils/timezone.utils';

export class PelanggaranService {
  static async create(tenantId: string, data: {
    siswa_id: string;
    tanggal: Date;
    jenis_pelanggaran: string;
    poin: number;
    keterangan?: string;
    status?: string;
  }) {
    // Ambil info akademik saat ini dari data Siswa dengan verifikasi tenant_id ketat
    const siswa = await prisma.siswa.findFirst({
      where: { id: data.siswa_id, tenant_id: tenantId },
      select: { kelas_id: true, tahun_pelajaran_id: true, semester_id: true }
    });

    if (!siswa) {
      throw new Error('Siswa tidak ditemukan atau tidak terdaftar di instansi sekolah ini');
    }

    let siswaAkademikId: string | undefined;
    if (siswa && siswa.tahun_pelajaran_id && siswa.semester_id) {
      const sa = await prisma.siswaAkademik.findFirst({
        where: {
          siswa_id: data.siswa_id,
          kelas_id: siswa.kelas_id || undefined,
          tahun_pelajaran_id: siswa.tahun_pelajaran_id,
          semester_id: siswa.semester_id
        }
      });
      siswaAkademikId = sa?.id;
    }

    const violation = await prisma.pelanggaranSiswa.create({
      data: {
        tenant_id: tenantId,
        siswa_id: data.siswa_id,
        siswa_akademik_id: siswaAkademikId,
        kelas_id: siswa?.kelas_id || undefined,
        tanggal: data.tanggal,
        jenis_pelanggaran: data.jenis_pelanggaran,
        poin: data.poin,
        keterangan: data.keterangan,
        status: data.status || 'BARU',
      },
    });

    // Real-time EWS alert integration
    try {
      const { BpbkService } = await import('../../bpbk/services/bpbk.service');
      const ewsList = await BpbkService.calculateEwsForSiswa(tenantId);
      const studentEws = ewsList.find((e: any) => e.siswa.id === data.siswa_id);
      if (studentEws && studentEws.riskLevel === 'HIGH') {
        const bkTeachers = await prisma.user.findMany({
          where: {
            tenant_id: tenantId,
            Role: {
              rolePermissions: {
                some: {
                  permission_id: 'bk.cases.manage'
                }
              }
            }
          },
          select: { id: true }
        });
        if (bkTeachers.length > 0) {
          const { notificationService } = await import('../../../services/notification.service');
          const studentName = studentEws.siswa.nama_siswa || studentEws.siswa.nama || 'Siswa';
          for (const teacher of bkTeachers) {
            await notificationService.sendInApp(
              teacher.id,
              'PERINGATAN DINI: Siswa Berisiko Tinggi (Pelanggaran Baru)',
              `Siswa ${studentName} terdeteksi berisiko TINGGI (Skor EWS: ${studentEws.riskScore}) setelah dicatat melakukan pelanggaran "${data.jenis_pelanggaran}".`
            );
          }
        }
      }
    } catch (ewsErr) {
      console.error('[EWS INTEGRATION ERROR] Failed to run real-time EWS alert:', ewsErr);
    }

    // Invalidate Cache setelah create
    await PelanggaranService.invalidateCache(tenantId, data.siswa_id);

    return violation;
  }

  static async update(tenantId: string, id: string, data: {
    tanggal?: Date;
    jenis_pelanggaran?: string;
    poin?: number;
    keterangan?: string;
    status?: string;
  }) {
    // Verify ownership
    const existing = await prisma.pelanggaranSiswa.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!existing) {
      throw new Error('Pelanggaran not found');
    }

    const updated = await prisma.pelanggaranSiswa.update({
      where: { id },
      data,
    });

    // Invalidate Cache setelah update
    await PelanggaranService.invalidateCache(tenantId, existing.siswa_id);

    return updated;
  }

  static async delete(tenantId: string, id: string) {
    const existing = await prisma.pelanggaranSiswa.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!existing) {
      throw new Error('Pelanggaran not found');
    }

    const deleted = await prisma.pelanggaranSiswa.delete({
      where: { id },
    });

    // Invalidate Cache setelah delete
    await PelanggaranService.invalidateCache(tenantId, existing.siswa_id);

    return deleted;
  }

  /**
   * Invalidate Redis/In-Memory Cache untuk data Pelanggaran & Analitik Kedisiplinan
   */
  static async invalidateCache(tenantId: string, siswaId?: string) {
    try {
      await cacheInvalidationService.invalidatePelanggaranCache(tenantId, siswaId);
    } catch (err) {
      console.warn('[PelanggaranService] Non-blocking cache invalidation notice:', (err as any)?.message);
    }
  }

  static async getAll(tenantId: string, query: {
    page?: number;
    limit?: number;
    search?: string;
    siswa_id?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }, scope?: DataScope) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const offset = (page - 1) * limit;

    // 1. Coba baca dari Redis/Memory Cache (Cache HIT Check via CACHE_KEYS)
    const cacheKey = CACHE_KEYS.KESISWAAN.PELANGGARAN_LIST(
      tenantId,
      page,
      limit,
      query.search || '',
      (query as any).kelas_id,
      query.status
    );

    try {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        console.log(`[PelanggaranService] ⚡ Cache HIT for key: ${cacheKey}`);
        return cached;
      }
    } catch (cacheErr) {
      console.warn('[PelanggaranService] Non-blocking cache read notice:', (cacheErr as any)?.message);
    }

    let where: Prisma.PelanggaranSiswaWhereInput = {
      tenant_id: tenantId,
    };

    if (scope) {
      where = applyDataScope(where, scope);
      
      if (scope.userId) {
          where.Siswa = { user_id: scope.userId };
          delete (where as any).user_id; 
      }
    }

    if (query.siswa_id) {
      where.siswa_id = query.siswa_id;
    }

    if ((query as any).kelas_id) {
      where.kelas_id = (query as any).kelas_id;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.startDate || query.endDate) {
      const tz = await getTenantTimezone(tenantId);
      const startStr = query.startDate || query.endDate!;
      const endStr = query.endDate || query.startDate!;
      const startRange = getTenantDayRangeUTC(startStr, tz);
      const endRange = getTenantDayRangeUTC(endStr, tz);
      where.tanggal = {
        gte: startRange.startUTC,
        lte: endRange.endUTC,
      };
    }

    if (query.search) {
      where.OR = [
        { jenis_pelanggaran: { contains: query.search, mode: 'insensitive' } },
        { keterangan: { contains: query.search, mode: 'insensitive' } },
        { Siswa: { nama_siswa: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    console.log(`[PelanggaranService] Final Where Clause:`, JSON.stringify(where, null, 2));

    const [total, list] = await Promise.all([
      prisma.pelanggaranSiswa.count({ where }),
      prisma.pelanggaranSiswa.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { tanggal: 'desc' },
        include: {
          Siswa: {
            select: {
              id: true,
              nama_siswa: true,
              nis: true,
              Kelas: {
                select: {
                  id: true,
                  nama_kelas: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const resultPayload = {
      list,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    // 2. Simpan ke Cache via cacheService (Cache WRITE dengan CACHE_TTL.DEFAULT)
    try {
      await cacheService.set(cacheKey, resultPayload, CACHE_TTL.DEFAULT);
      console.log(`[PelanggaranService] 💾 Cache WRITE for key: ${cacheKey}`);
    } catch (cacheErr) {
      console.warn('[PelanggaranService] Non-blocking cache write notice:', (cacheErr as any)?.message);
    }

    return resultPayload;
  }

  static async getById(tenantId: string, id: string) {
    const cacheKey = CACHE_KEYS.KESISWAAN.PELANGGARAN_DETAIL(tenantId, id);
    try {
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;
    } catch (e) {}

    const res = await prisma.pelanggaranSiswa.findFirst({
      where: { id, tenant_id: tenantId },
      include: {
        Siswa: {
          select: {
            id: true,
            nama_siswa: true,
            nis: true,
            Kelas: true,
          },
        },
      },
    });

    if (res) {
      try {
        await cacheService.set(cacheKey, res, CACHE_TTL.DEFAULT);
      } catch (e) {}
    }
    return res;
  }

  static async getAnalytics(tenantId: string, query: { year?: number }) {
    const year = Number(query.year) || new Date().getFullYear();

    const cacheKey = CACHE_KEYS.KESISWAAN.PELANGGARAN_ANALYTICS(tenantId, year);
    try {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        console.log(`[PelanggaranService] ⚡ Cache HIT for analytics key: ${cacheKey}`);
        return cached;
      }
    } catch (cacheErr) {
      console.warn('[PelanggaranService] Non-blocking cache read notice:', (cacheErr as any)?.message);
    }

    const start = new Date(`${year}-01-01T00:00:00.000Z`);
    const end = new Date(`${year}-12-31T23:59:59.999Z`);

    const list = await prisma.pelanggaranSiswa.findMany({
      where: {
        tenant_id: tenantId,
        tanggal: { gte: start, lte: end },
      },
      select: {
        tanggal: true,
        poin: true,
        jenis_pelanggaran: true,
      },
    });

    const months = Array.from({ length: 12 }, (_, i) => ({
      bulan: i + 1,
      nama_bulan: new Date(2026, i, 1).toLocaleString('id-ID', { month: 'long' }),
      total_kasus: 0,
      total_poin: 0,
    }));

    const kategoriMap = new Map<string, number>();

    list.forEach((p) => {
      const monthIdx = new Date(p.tanggal).getMonth();
      if (monthIdx >= 0 && monthIdx < 12) {
        months[monthIdx].total_kasus += 1;
        months[monthIdx].total_poin += p.poin || 0;
      }
      const cat = p.jenis_pelanggaran || 'Umum';
      kategoriMap.set(cat, (kategoriMap.get(cat) || 0) + 1);
    });

    const kategori = Array.from(kategoriMap.entries()).map(([name, count]) => ({
      kategori: name,
      jumlah: count,
    }));

    const analyticsPayload = {
      trend_bulanan: months,
      distribusi_kategori: kategori,
    };

    try {
      await cacheService.set(cacheKey, analyticsPayload, CACHE_TTL.DASHBOARD);
      console.log(`[PelanggaranService] 💾 Cache WRITE for analytics key: ${cacheKey}`);
    } catch (cacheErr) {
      console.warn('[PelanggaranService] Non-blocking cache write notice:', (cacheErr as any)?.message);
    }

    return analyticsPayload;
  }
}
