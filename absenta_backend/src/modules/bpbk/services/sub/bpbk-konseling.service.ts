// @ts-nocheck
import { PLATFORM_TIMEZONE } from '@/infra/jobEngine';
import { getTenantTimezone } from '@/utils/timezone.utils';
import { appLogger } from '@/utils/app-logger';
import { Prisma } from '@prisma/client';
import { prisma } from '../../../../utils/prisma';
import { parentNotificationService } from '../../../parent-app/services/parent-notification.service';
import { ParentEventType } from '../../../parent-app/constants/parent-event-matrix';
import { activityLogService } from '../../../activity/services/activity-log.service';
import { SuratKeluarService } from '../../../correspondence/services/surat-keluar.service';
import { systemConfigService } from '../../../system-config/services/system-config.service';
import { randomBytes } from 'crypto';
import { cacheService } from '../../../../utils/cache.service';
import { getSmartFrontendBaseUrl } from '../../../../utils/url-helper';
import { cacheInvalidationService } from '../../../../utils/cache-invalidation.service';
import { BpbkCommonHelper } from './bpbk-common.helper';
import { BpbkPemanggilanService } from './bpbk-pemanggilan.service';
import { BpbkKasusService } from './bpbk-kasus.service';
import { BpbkKonselingService } from './bpbk-konseling.service';
import { BpbkHomeVisitService } from './bpbk-homevisit.service';
import { BpbkAsesmenService } from './bpbk-asesmen.service';
import { BpbkAnalyticsService } from './bpbk-analytics.service';

export class BpbkKonselingService {
  static async createKonseling(tenantId: string, data: {
    siswa_id: string;
    tanggal: Date;
    tipe: 'INDIVIDU' | 'KELOMPOK';
    kelompok_id?: string | null;
    masalah: string;
    solusi?: string | null;
    status: 'PROSES' | 'SELESAI';
    visibility?: string;
    kasus_bk_id?: string | null;
    petugas_id: string;
  }, userId?: string) {
    const res = await prisma.konselingSiswa.create({
      data: {
        tenant_id: tenantId,
        siswa_id: data.siswa_id,
        tanggal: data.tanggal,
        tipe: data.tipe,
        kelompok_id: data.kelompok_id,
        masalah: data.masalah,
        solusi: data.solusi,
        status: data.status,
        visibility: data.visibility || 'SENSITIVE',
        kasus_bk_id: data.kasus_bk_id,
        petugas_id: data.petugas_id
      }
    });

    activityLogService.logEvent({
      event_type: 'COUNSELING_CREATE',
      tenant_id: tenantId,
      user_id: userId || data.petugas_id || null,
      entity: 'KonselingSiswa',
      entity_id: res.id,
      metadata: { newValue: res }
    });

    await cacheInvalidationService.invalidateBpbkCache(tenantId, res.siswa_id);
    return res;
  }

  static async updateKonseling(tenantId: string, id: string, data: {
    tanggal?: Date;
    tipe?: 'INDIVIDU' | 'KELOMPOK';
    kelompok_id?: string | null;
    masalah?: string;
    solusi?: string | null;
    status?: 'PROSES' | 'SELESAI';
    visibility?: string;
    kasus_bk_id?: string | null;
  }, userId?: string) {
    await this.verifyOwner('konselingSiswa', id, tenantId);
    const oldVal = await prisma.konselingSiswa.findUnique({ where: { id } });
    const res = await prisma.konselingSiswa.update({
      where: { id },
      data
    });
    activityLogService.logEvent({
      event_type: 'COUNSELING_UPDATE',
      tenant_id: tenantId,
      user_id: userId || null,
      entity: 'KonselingSiswa',
      entity_id: id,
      metadata: { oldValue: oldVal, newValue: res }
    });
    await cacheInvalidationService.invalidateBpbkCache(tenantId, res.siswa_id);
    return res;
  }

  static async deleteKonseling(tenantId: string, id: string, userId?: string) {
    await this.verifyOwner('konselingSiswa', id, tenantId);
    const oldVal = await prisma.konselingSiswa.findUnique({ where: { id } });
    const res = await prisma.konselingSiswa.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        deleted_by: userId || null
      }
    });
    activityLogService.logEvent({
      event_type: 'COUNSELING_DELETE',
      tenant_id: tenantId,
      user_id: userId || null,
      entity: 'KonselingSiswa',
      entity_id: id,
      metadata: { oldValue: oldVal, newValue: res }
    });
    await cacheInvalidationService.invalidateBpbkCache(tenantId, res.siswa_id);
    return res;
  }

  static async restoreKonseling(tenantId: string, id: string, userId?: string) {
    await this.verifyOwner('konselingSiswa', id, tenantId);
    const res = await prisma.konselingSiswa.update({
      where: { id },
      data: {
        deleted_at: null,
        deleted_by: null
      }
    });
    activityLogService.logEvent({
      event_type: 'COUNSELING_RESTORE',
      tenant_id: tenantId,
      user_id: userId || null,
      entity: 'KonselingSiswa',
      entity_id: id,
      metadata: { newValue: res }
    });
    return res;
  }

  static async getAllKonseling(tenantId: string, userContext: { id: string; capabilities: string[] }, query: {
    page?: number;
    limit?: number;
    search?: string;
    siswa_id?: string;
    tipe?: string;
    status?: string;
    kasus_bk_id?: string;
    show_deleted?: string;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const offset = (page - 1) * limit;

    const visibilityFilter = await this.buildVisibilityFilter(tenantId, userContext);

    const where: Prisma.KonselingSiswaWhereInput = {
      tenant_id: tenantId,
      ...visibilityFilter
    };

    if (query.show_deleted === 'true') {
      where.deleted_at = { not: null };
    } else {
      where.deleted_at = null;
    }

    if (query.siswa_id) {
      where.siswa_id = query.siswa_id;
    }
    if (query.tipe) {
      where.tipe = query.tipe;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.kasus_bk_id) {
      where.kasus_bk_id = query.kasus_bk_id;
    }
    if (query.search) {
      where.OR = [
        { masalah: { contains: query.search, mode: 'insensitive' } },
        { solusi: { contains: query.search, mode: 'insensitive' } },
        { Siswa: { nama_siswa: { contains: query.search, mode: 'insensitive' } } }
      ];
    }

    const [total, list] = await Promise.all([
      prisma.konselingSiswa.count({ where }),
      prisma.konselingSiswa.findMany({
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
              Kelas: { select: { nama_kelas: true } }
            }
          },
          Petugas: {
            select: {
              id: true,
              full_name: true
            }
          }
        }
      })
    ]);

    return {
      list,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  // === Pemanggilan Orang Tua ===
}
