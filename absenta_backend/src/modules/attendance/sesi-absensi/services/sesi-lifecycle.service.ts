import { prisma } from '../../../../utils/prisma';

export class SesiLifecycleService {
  private static instance: SesiLifecycleService;

  public static getInstance(): SesiLifecycleService {
    if (!SesiLifecycleService.instance) {
      SesiLifecycleService.instance = new SesiLifecycleService();
    }
    return SesiLifecycleService.instance;
  }

  async create(tenantId: string, _org: any, payload: any, userId: string) {
    const {
      kelas_id,
      mapel_id,
      guru_id,
      jenis_kegiatan = 'KBM',
      tanggal,
      waktu_mulai,
      waktu_selesai,
      tahun_pelajaran_id,
      semester_id
    } = payload;

    const sessionDate = tanggal ? new Date(tanggal) : new Date();

    const sesi = await prisma.sesiAbsensi.create({
      data: {
        tenant_id: tenantId,
        kelas_id,
        mapel_id: mapel_id || null,
        guru_id: guru_id || null,
        tahun_pelajaran_id: tahun_pelajaran_id || 'default-tp',
        semester_id: semester_id || 'default-sem',
        jenis_kegiatan,
        tanggal: sessionDate,
        waktu_mulai: waktu_mulai ? new Date(waktu_mulai) : new Date(),
        waktu_selesai: waktu_selesai ? new Date(waktu_selesai) : null,
        status: 'AKTIF',
        created_by_user_id: userId
      }
    });

    return sesi;
  }

  async list(tenantId: string, _org: any, query: any) {
    const { kelas_id, guru_id, tanggal, status, limit = 50, page = 1 } = query;

    const where: any = { tenant_id: tenantId };
    if (kelas_id) where.kelas_id = kelas_id;
    if (guru_id) where.guru_id = guru_id;
    if (status) where.status = status;
    if (tanggal) {
      const dayStr = tanggal;
      const startOfDay = new Date(`${dayStr}T00:00:00.000Z`);
      const endOfDay = new Date(`${dayStr}T23:59:59.999Z`);
      where.tanggal = { gte: startOfDay, lte: endOfDay };
    }

    const take = Number(limit);
    const skip = (Number(page) - 1) * take;

    const [total, data] = await Promise.all([
      prisma.sesiAbsensi.count({ where }),
      prisma.sesiAbsensi.findMany({
        where,
        take,
        skip,
        select: {
          id: true,
          tenant_id: true,
          kelas_id: true,
          mapel_id: true,
          guru_id: true,
          jenis_kegiatan: true,
          tanggal: true,
          waktu_mulai: true,
          waktu_selesai: true,
          status: true,
          created_at: true,
          Kelas: { select: { nama_kelas: true } },
          Mapel: { select: { nama_mapel: true, kode_mapel: true } },
          Guru: { select: { nama_guru: true, nip: true } }
        },
        orderBy: { waktu_mulai: 'desc' }
      })
    ]);

    return { total, page: Number(page), limit: take, data };
  }

  async updateStatus(tenantId: string, _org: any, sesiId: string, status: string) {
    const sesi = await prisma.sesiAbsensi.findFirst({
      where: { id: sesiId, tenant_id: tenantId }
    });
    if (!sesi) throw new Error('Sesi tidak ditemukan');

    const updated = await prisma.sesiAbsensi.update({
      where: { id: sesiId },
      data: {
        status,
        updated_at: new Date()
      }
    });

    return updated;
  }

  async update(tenantId: string, _org: any, id: string, data: any) {
    const sesi = await prisma.sesiAbsensi.findFirst({
      where: { id, tenant_id: tenantId }
    });
    if (!sesi) throw new Error('Sesi tidak ditemukan');

    const updated = await prisma.sesiAbsensi.update({
      where: { id },
      data: {
        ...data,
        updated_at: new Date()
      }
    });

    return updated;
  }

  async remove(tenantId: string, _org: any, id: string, _userId: string) {
    const sesi = await prisma.sesiAbsensi.findFirst({
      where: { id, tenant_id: tenantId }
    });
    if (!sesi) throw new Error('Sesi tidak ditemukan');

    await prisma.sesiAbsensi.delete({
      where: { id }
    });

    return { success: true, message: 'Sesi berhasil dihapus' };
  }

  async listByTanggal(tenantId: string, tanggal: Date) {
    const startOfDay = new Date(tanggal);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(tanggal);
    endOfDay.setUTCHours(23, 59, 59, 999);

    return prisma.sesiAbsensi.findMany({
      where: {
        tenant_id: tenantId,
        tanggal: { gte: startOfDay, lte: endOfDay }
      },
      select: {
        id: true,
        kelas_id: true,
        mapel_id: true,
        guru_id: true,
        jadwal_kbm_id: true,
        jenis_kegiatan: true,
        waktu_mulai: true,
        waktu_selesai: true,
        status: true
      }
    });
  }
}

export const sesiLifecycleService = SesiLifecycleService.getInstance();
