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

export class BpbkAsesmenService {
  static async createAsesmen(tenantId: string, data: {
    siswa_id: string;
    tanggal: Date;
    nama_asesmen: string;
    hasil_skor?: string | null;
    keterangan?: string | null;
    dokumen_id?: string | null;
    kasus_bk_id?: string | null;
    visibility?: string;
  }, userId?: string) {
    const res = await prisma.asesmenSiswa.create({
      data: {
        tenant_id: tenantId,
        siswa_id: data.siswa_id,
        tanggal: data.tanggal,
        nama_asesmen: data.nama_asesmen,
        hasil_skor: data.hasil_skor,
        keterangan: data.keterangan,
        dokumen_id: data.dokumen_id,
        kasus_bk_id: data.kasus_bk_id,
        visibility: data.visibility || 'SENSITIVE'
      }
    });

    activityLogService.logEvent({
      event_type: 'ASSESSMENT_CREATE',
      tenant_id: tenantId,
      user_id: userId || null,
      entity: 'AsesmenSiswa',
      entity_id: res.id,
      metadata: { newValue: res }
    });

    return res;
  }

  static async updateAsesmen(tenantId: string, id: string, data: {
    tanggal?: Date;
    nama_asesmen?: string;
    hasil_skor?: string | null;
    keterangan?: string | null;
    dokumen_id?: string | null;
    kasus_bk_id?: string | null;
    visibility?: string;
  }, userId?: string) {
    await this.verifyOwner('asesmenSiswa', id, tenantId);
    const oldVal = await prisma.asesmenSiswa.findUnique({ where: { id } });
    const res = await prisma.asesmenSiswa.update({
      where: { id },
      data
    });
    activityLogService.logEvent({
      event_type: 'ASSESSMENT_UPDATE',
      tenant_id: tenantId,
      user_id: userId || null,
      entity: 'AsesmenSiswa',
      entity_id: id,
      metadata: { oldValue: oldVal, newValue: res }
    });
    return res;
  }

  static async deleteAsesmen(tenantId: string, id: string, userId?: string) {
    await this.verifyOwner('asesmenSiswa', id, tenantId);
    const oldVal = await prisma.asesmenSiswa.findUnique({ where: { id } });
    const res = await prisma.asesmenSiswa.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        deleted_by: userId || null
      }
    });
    activityLogService.logEvent({
      event_type: 'ASSESSMENT_DELETE',
      tenant_id: tenantId,
      user_id: userId || null,
      entity: 'AsesmenSiswa',
      entity_id: id,
      metadata: { oldValue: oldVal, newValue: res }
    });
    return res;
  }

  static async restoreAsesmen(tenantId: string, id: string, userId?: string) {
    await this.verifyOwner('asesmenSiswa', id, tenantId);
    const res = await prisma.asesmenSiswa.update({
      where: { id },
      data: {
        deleted_at: null,
        deleted_by: null
      }
    });
    activityLogService.logEvent({
      event_type: 'ASSESSMENT_RESTORE',
      tenant_id: tenantId,
      user_id: userId || null,
      entity: 'AsesmenSiswa',
      entity_id: id,
      metadata: { newValue: res }
    });
    return res;
  }

  static async getAllAsesmen(tenantId: string, userContext: { id: string; capabilities: string[] }, query: {
    page?: number;
    limit?: number;
    siswa_id?: string;
    search?: string;
    kasus_bk_id?: string;
    show_deleted?: string;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const offset = (page - 1) * limit;

    const visibilityFilter = await this.buildVisibilityFilter(tenantId, userContext);

    const where: Prisma.AsesmenSiswaWhereInput = {
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
    if (query.kasus_bk_id) {
      where.kasus_bk_id = query.kasus_bk_id;
    }
    if (query.search) {
      where.OR = [
        { nama_asesmen: { contains: query.search, mode: 'insensitive' } },
        { keterangan: { contains: query.search, mode: 'insensitive' } }
      ];
    }

    const [total, list] = await Promise.all([
      prisma.asesmenSiswa.count({ where }),
      prisma.asesmenSiswa.findMany({
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
          Dokumen: true
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

  // === Rujukan Kasus ===
  static async createRujukan(tenantId: string, data: {
    siswa_id: string;
    tanggal: Date;
    rujukan_ke: string;
    alasan: string;
    status?: string;
    kasus_bk_id?: string | null;
    visibility?: string;
  }, userId?: string) {
    const res = await prisma.rujukanKasus.create({
      data: {
        tenant_id: tenantId,
        siswa_id: data.siswa_id,
        tanggal: data.tanggal,
        rujukan_ke: data.rujukan_ke,
        alasan: data.alasan,
        status: data.status || 'DIUSULKAN',
        kasus_bk_id: data.kasus_bk_id,
        visibility: data.visibility || 'LIMITED'
      }
    });

    activityLogService.logEvent({
      event_type: 'REFERRAL_CREATE',
      tenant_id: tenantId,
      user_id: userId || null,
      entity: 'RujukanKasus',
      entity_id: res.id,
      metadata: { newValue: res }
    });

    return res;
  }

  static async updateRujukan(tenantId: string, id: string, data: {
    tanggal?: Date;
    rujukan_ke?: string;
    alasan?: string;
    status?: string;
    kasus_bk_id?: string | null;
    visibility?: string;
  }, userId?: string) {
    await this.verifyOwner('rujukanKasus', id, tenantId);
    const oldVal = await prisma.rujukanKasus.findUnique({ where: { id } });
    const res = await prisma.rujukanKasus.update({
      where: { id },
      data
    });
    activityLogService.logEvent({
      event_type: 'REFERRAL_UPDATE',
      tenant_id: tenantId,
      user_id: userId || null,
      entity: 'RujukanKasus',
      entity_id: id,
      metadata: { oldValue: oldVal, newValue: res }
    });
    return res;
  }

  static async deleteRujukan(tenantId: string, id: string, userId?: string) {
    await this.verifyOwner('rujukanKasus', id, tenantId);
    const oldVal = await prisma.rujukanKasus.findUnique({ where: { id } });
    const res = await prisma.rujukanKasus.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        deleted_by: userId || null
      }
    });
    activityLogService.logEvent({
      event_type: 'REFERRAL_DELETE',
      tenant_id: tenantId,
      user_id: userId || null,
      entity: 'RujukanKasus',
      entity_id: id,
      metadata: { oldValue: oldVal, newValue: res }
    });
    return res;
  }

  static async restoreRujukan(tenantId: string, id: string, userId?: string) {
    await this.verifyOwner('rujukanKasus', id, tenantId);
    const res = await prisma.rujukanKasus.update({
      where: { id },
      data: {
        deleted_at: null,
        deleted_by: null
      }
    });
    activityLogService.logEvent({
      event_type: 'REFERRAL_RESTORE',
      tenant_id: tenantId,
      user_id: userId || null,
      entity: 'RujukanKasus',
      entity_id: id,
      metadata: { newValue: res }
    });
    return res;
  }

  static async getAllRujukan(tenantId: string, userContext: { id: string; capabilities: string[] }, query: {
    page?: number;
    limit?: number;
    siswa_id?: string;
    status?: string;
    kasus_bk_id?: string;
    show_deleted?: string;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const offset = (page - 1) * limit;

    const visibilityFilter = await this.buildVisibilityFilter(tenantId, userContext);

    const where: Prisma.RujukanKasusWhereInput = {
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
    if (query.status) {
      where.status = query.status;
    }
    if (query.kasus_bk_id) {
      where.kasus_bk_id = query.kasus_bk_id;
    }

    const [total, list] = await Promise.all([
      prisma.rujukanKasus.count({ where }),
      prisma.rujukanKasus.findMany({
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

  // === Dashboard Stats & Early Warning System ===
}
