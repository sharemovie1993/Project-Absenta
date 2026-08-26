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

export class BpbkHomeVisitService {
  static async createHomeVisit(tenantId: string, data: {
    siswa_id: string;
    tanggal: Date;
    alasan: string;
    hasil?: string | null;
    foto_dokumen_id?: string | null;
    kasus_bk_id?: string | null;
    visibility?: string;
    ortu_notified?: boolean;
  }, userId?: string) {
    const res = await prisma.homeVisit.create({
      data: {
        tenant_id: tenantId,
        siswa_id: data.siswa_id,
        tanggal: data.tanggal,
        alasan: data.alasan,
        hasil: data.hasil,
        foto_dokumen_id: data.foto_dokumen_id,
        kasus_bk_id: data.kasus_bk_id,
        visibility: data.visibility || 'LIMITED',
        ortu_notified: data.ortu_notified || false
      }
    });

    activityLogService.logEvent({
      event_type: 'HOMEVISIT_CREATE',
      tenant_id: tenantId,
      user_id: userId || null,
      entity: 'HomeVisit',
      entity_id: res.id,
      metadata: { newValue: res }
    });

    if (res.ortu_notified && res.visibility !== 'SENSITIVE') {
      await this.triggerParentNotification(tenantId, res.siswa_id, ParentEventType.BK_CASE_ALERT, {});
    }

    return res;
  }

  static async updateHomeVisit(tenantId: string, id: string, data: {
    tanggal?: Date;
    alasan?: string;
    hasil?: string | null;
    foto_dokumen_id?: string | null;
    kasus_bk_id?: string | null;
    visibility?: string;
    ortu_notified?: boolean;
  }, userId?: string) {
    await this.verifyOwner('homeVisit', id, tenantId);
    const oldVal = await prisma.homeVisit.findUnique({ where: { id } });
    const res = await prisma.homeVisit.update({
      where: { id },
      data
    });
    activityLogService.logEvent({
      event_type: 'HOMEVISIT_UPDATE',
      tenant_id: tenantId,
      user_id: userId || null,
      entity: 'HomeVisit',
      entity_id: id,
      metadata: { oldValue: oldVal, newValue: res }
    });
    return res;
  }

  static async deleteHomeVisit(tenantId: string, id: string, userId?: string) {
    await this.verifyOwner('homeVisit', id, tenantId);
    const oldVal = await prisma.homeVisit.findUnique({ where: { id } });
    const res = await prisma.homeVisit.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        deleted_by: userId || null
      }
    });
    activityLogService.logEvent({
      event_type: 'HOMEVISIT_DELETE',
      tenant_id: tenantId,
      user_id: userId || null,
      entity: 'HomeVisit',
      entity_id: id,
      metadata: { oldValue: oldVal, newValue: res }
    });
    return res;
  }

  static async restoreHomeVisit(tenantId: string, id: string, userId?: string) {
    await this.verifyOwner('homeVisit', id, tenantId);
    const res = await prisma.homeVisit.update({
      where: { id },
      data: {
        deleted_at: null,
        deleted_by: null
      }
    });
    activityLogService.logEvent({
      event_type: 'HOMEVISIT_RESTORE',
      tenant_id: tenantId,
      user_id: userId || null,
      entity: 'HomeVisit',
      entity_id: id,
      metadata: { newValue: res }
    });
    return res;
  }

  static async getAllHomeVisits(tenantId: string, userContext: { id: string; capabilities: string[] }, query: {
    page?: number;
    limit?: number;
    siswa_id?: string;
    kasus_bk_id?: string;
    show_deleted?: string;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const offset = (page - 1) * limit;

    const visibilityFilter = await this.buildVisibilityFilter(tenantId, userContext);

    const where: Prisma.HomeVisitWhereInput = {
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

    const [total, list] = await Promise.all([
      prisma.homeVisit.count({ where }),
      prisma.homeVisit.findMany({
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

  // === Asesmen BK ===
}
