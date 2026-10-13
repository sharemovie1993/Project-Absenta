import { prisma } from '@/utils/prisma';
import { DataScope } from '../../../../types/fastify';
import { Hari } from '@prisma/client';
import { cacheInvalidationService } from '@/utils/cache-invalidation.service';
import { getTenantTimezone } from '@/utils/timezone.utils';
import { getTenantLocalTime, generateSessionsForTenantDirect } from '@/jobs/attendanceAutoSession.job';

export interface CreateJadwalKegiatanInput {
  nama: string;
  jenis_kegiatan: string;
  hari: Hari[];
  waktu_mulai: string;
  waktu_selesai?: string | null;
  target_semua_kelas: boolean;
  target_kelas_ids?: string[];
  berlaku_mulai: string; // YYYY-MM-DD
  berlaku_sampai?: string | null; // YYYY-MM-DD
  tahun_pelajaran_id?: string;
}

export interface UpdateJadwalKegiatanInput {
  nama?: string;
  jenis_kegiatan?: string;
  hari?: Hari[];
  waktu_mulai?: string;
  waktu_selesai?: string | null;
  target_semua_kelas?: boolean;
  target_kelas_ids?: string[];
  berlaku_mulai?: string;
  berlaku_sampai?: string | null;
  aktif?: boolean;
}

export class JadwalKegiatanService {
  private async syncTodayActivitySessions(tenantId: string) {
    try {
      const tz = await getTenantTimezone(tenantId);
      const { dateStr, timeZone } = getTenantLocalTime(tz, new Date());
      await generateSessionsForTenantDirect(tenantId, dateStr, timeZone);
    } catch {
      // Non-blocking sync
    }
  }

  async getAll(scope: DataScope, activeOnly = false) {
    if (!scope.tenantId) throw new Error('Tenant ID required');

    return prisma.jadwalKegiatan.findMany({
      where: {
        tenant_id: scope.tenantId,
        ...(activeOnly ? { aktif: true } : {}),
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async getById(scope: DataScope, id: string) {
    if (!scope.tenantId) throw new Error('Tenant ID required');

    const record = await prisma.jadwalKegiatan.findFirst({
      where: { id, tenant_id: scope.tenantId },
    });

    if (!record) {
      throw new Error('Jadwal Kegiatan tidak ditemukan atau akses ditolak');
    }

    return record;
  }

  async create(scope: DataScope, userId: string, input: CreateJadwalKegiatanInput) {
    if (!scope.tenantId) throw new Error('Tenant ID required');

    // Validasi format jam (mendukung HH:mm maupun HH:mm:ss dari input time browser)
    const timeRegex = /^\d{2}:\d{2}(:\d{2})?$/;
    if (!input?.waktu_mulai || !timeRegex.test(input.waktu_mulai) || (input.waktu_selesai && !timeRegex.test(input.waktu_selesai))) {
      throw new Error('Format waktu_mulai dan waktu_selesai harus HH:mm');
    }

    const cleanMulai = input.waktu_mulai.slice(0, 5);
    const cleanSelesai = input.waktu_selesai ? input.waktu_selesai.slice(0, 5) : null;

    let tpId = input.tahun_pelajaran_id;
    if (!tpId || tpId.trim() === '') {
      const activeTp = await prisma.tahunPelajaran.findFirst({
        where: { tenant_id: scope.tenantId, is_active: true }
      }) || await prisma.tahunPelajaran.findFirst({
        where: { tenant_id: scope.tenantId }
      });
      if (!activeTp) throw new Error('Tahun Pelajaran tidak ditemukan di sistem');
      tpId = activeTp.id;
    }

    const created = await prisma.jadwalKegiatan.create({
      data: {
        tenant_id: scope.tenantId,
        nama: input.nama,
        jenis_kegiatan: input.jenis_kegiatan,
        hari: input.hari,
        waktu_mulai: cleanMulai,
        waktu_selesai: cleanSelesai,
        target_semua_kelas: input.target_semua_kelas ?? true,
        target_kelas_ids: input.target_kelas_ids || [],
        berlaku_mulai: new Date(input.berlaku_mulai),
        berlaku_sampai: input.berlaku_sampai ? new Date(input.berlaku_sampai) : null,
        tahun_pelajaran_id: tpId,
        dibuat_oleh: userId || 'system',
        aktif: true,
      },
    });

    await this.syncTodayActivitySessions(scope.tenantId);
    await cacheInvalidationService.invalidateAttendanceCache(scope.tenantId);
    await cacheInvalidationService.invalidatePelanggaranCache(scope.tenantId);
    return created;
  }

  async update(scope: DataScope, id: string, input: UpdateJadwalKegiatanInput) {
    // Pastikan record ada dan milik tenant tersebut
    await this.getById(scope, id);

    const data: any = {};
    if (input.nama !== undefined) data.nama = input.nama;
    if (input.jenis_kegiatan !== undefined) data.jenis_kegiatan = input.jenis_kegiatan;
    if (input.hari !== undefined) data.hari = input.hari;
    if (input.waktu_mulai !== undefined) data.waktu_mulai = input.waktu_mulai.slice(0, 5);
    if (input.waktu_selesai !== undefined) data.waktu_selesai = input.waktu_selesai ? input.waktu_selesai.slice(0, 5) : null;
    if (input.target_semua_kelas !== undefined) data.target_semua_kelas = input.target_semua_kelas;
    if (input.target_kelas_ids !== undefined) data.target_kelas_ids = input.target_kelas_ids;
    if (input.berlaku_mulai !== undefined) data.berlaku_mulai = new Date(input.berlaku_mulai);
    if (input.berlaku_sampai !== undefined) data.berlaku_sampai = input.berlaku_sampai ? new Date(input.berlaku_sampai) : null;
    if (input.aktif !== undefined) data.aktif = input.aktif;

    const updated = await prisma.jadwalKegiatan.update({
      where: { id },
      data,
    });

    if (scope.tenantId) {
      if (input.aktif === false) {
        await prisma.sesiAbsensi.deleteMany({
          where: { tenant_id: scope.tenantId, jadwal_kegiatan_id: id, status: 'MENDATANG' },
        });
      } else {
        await this.syncTodayActivitySessions(scope.tenantId);
      }
      await cacheInvalidationService.invalidateAttendanceCache(scope.tenantId);
      await cacheInvalidationService.invalidatePelanggaranCache(scope.tenantId);
    }
    return updated;
  }

  async delete(scope: DataScope, id: string) {
    await this.getById(scope, id);

    if (scope.tenantId) {
      await prisma.sesiAbsensi.deleteMany({
        where: { tenant_id: scope.tenantId, jadwal_kegiatan_id: id, status: 'MENDATANG' },
      });
    }

    const deleted = await prisma.jadwalKegiatan.delete({
      where: { id },
    });

    if (scope.tenantId) {
      await cacheInvalidationService.invalidateAttendanceCache(scope.tenantId);
      await cacheInvalidationService.invalidatePelanggaranCache(scope.tenantId);
    }
    return deleted;
  }
}

export const jadwalKegiatanService = new JadwalKegiatanService();
