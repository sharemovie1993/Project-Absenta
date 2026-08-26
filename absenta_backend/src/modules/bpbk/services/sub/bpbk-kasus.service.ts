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

export class BpbkKasusService {
  static async createKasusBK(tenantId: string, data: {
    siswa_id: string;
    judul: string;
    kategori: string;
    status: string;
    prioritas: string;
    visibility: string;
    tanggal_kasus: Date;
    keterangan?: string | null;
  }, userId?: string) {
    const res = await prisma.kasusBK.create({
      data: {
        tenant_id: tenantId,
        siswa_id: data.siswa_id,
        judul: data.judul,
        kategori: data.kategori,
        status: data.status,
        prioritas: data.prioritas,
        visibility: data.visibility,
        tanggal_kasus: data.tanggal_kasus,
        keterangan: data.keterangan
      }
    });

    activityLogService.logEvent({
      event_type: 'CASE_OPEN',
      tenant_id: tenantId,
      user_id: userId || null,
      entity: 'KasusBK',
      entity_id: res.id,
      metadata: { newValue: res }
    });

    if (res.visibility === 'PUBLIC') {
      await this.triggerParentNotification(tenantId, res.siswa_id, ParentEventType.BK_CASE_ALERT, {});
    }

    await cacheInvalidationService.invalidateBpbkCache(tenantId, res.siswa_id);
    return res;
  }

  static async updateKasusBK(tenantId: string, id: string, data: {
    judul?: string;
    kategori?: string;
    status?: string;
    prioritas?: string;
    visibility?: string;
    tanggal_kasus?: Date;
    keterangan?: string | null;
  }, userId?: string) {
    await this.verifyOwner('kasusBK', id, tenantId);
    const oldVal = await prisma.kasusBK.findUnique({ where: { id } });
    const res = await prisma.kasusBK.update({
      where: { id },
      data
    });
    activityLogService.logEvent({
      event_type: 'CASE_UPDATE',
      tenant_id: tenantId,
      user_id: userId || null,
      entity: 'KasusBK',
      entity_id: id,
      metadata: { oldValue: oldVal, newValue: res }
    });
    await cacheInvalidationService.invalidateBpbkCache(tenantId, res.siswa_id);
    return res;
  }

  static async deleteKasusBK(tenantId: string, id: string, userId?: string) {
    await this.verifyOwner('kasusBK', id, tenantId);
    const oldVal = await prisma.kasusBK.findUnique({ where: { id } });
    const res = await prisma.kasusBK.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        deleted_by: userId || null
      }
    });
    activityLogService.logEvent({
      event_type: 'CASE_DELETE',
      tenant_id: tenantId,
      user_id: userId || null,
      entity: 'KasusBK',
      entity_id: id,
      metadata: { oldValue: oldVal, newValue: res }
    });
    await cacheInvalidationService.invalidateBpbkCache(tenantId, res.siswa_id);
    return res;
    return res;
  }

  static async restoreKasusBK(tenantId: string, id: string, userId?: string) {
    await this.verifyOwner('kasusBK', id, tenantId);
    const res = await prisma.kasusBK.update({
      where: { id },
      data: {
        deleted_at: null,
        deleted_by: null
      }
    });
    activityLogService.logEvent({
      event_type: 'CASE_RESTORE',
      tenant_id: tenantId,
      user_id: userId || null,
      entity: 'KasusBK',
      entity_id: id,
      metadata: { newValue: res }
    });
    return res;
  }

  static async closeKasusBK(tenantId: string, id: string, userId: string, data: { catatan_selesai: string }) {
    await this.verifyOwner('kasusBK', id, tenantId);
    const oldVal = await prisma.kasusBK.findUnique({ where: { id } });
    const res = await prisma.kasusBK.update({
      where: { id },
      data: {
        status: 'SELESAI',
        closed_at: new Date(),
        closed_by: userId,
        catatan_selesai: data.catatan_selesai
      }
    });

    // Automatically complete connected counseling sessions that are still PROSES
    await prisma.konselingSiswa.updateMany({
      where: { kasus_bk_id: id, status: 'PROSES', tenant_id: tenantId },
      data: { status: 'SELESAI' }
    });

    activityLogService.logEvent({
      event_type: 'CASE_CLOSE',
      tenant_id: tenantId,
      user_id: userId || null,
      entity: 'KasusBK',
      entity_id: id,
      metadata: { oldValue: oldVal, newValue: res }
    });

    return res;
  }

  static async reopenKasusBK(tenantId: string, id: string, userId: string) {
    await this.verifyOwner('kasusBK', id, tenantId);
    const oldVal = await prisma.kasusBK.findUnique({ where: { id } });
    const res = await prisma.kasusBK.update({
      where: { id },
      data: {
        status: 'PROSES',
        closed_at: null,
        closed_by: null,
        catatan_selesai: null,
        reopen_count: { increment: 1 }
      }
    });

    activityLogService.logEvent({
      event_type: 'CASE_REOPEN',
      tenant_id: tenantId,
      user_id: userId || null,
      entity: 'KasusBK',
      entity_id: id,
      metadata: { oldValue: oldVal, newValue: res }
    });

    return res;
  }

  static async getKasusBKById(tenantId: string, id: string, userContext: { id: string; capabilities: string[] }) {
    await this.verifyOwner('kasusBK', id, tenantId);
    const item = await prisma.kasusBK.findUnique({
      where: { id },
      include: {
        Siswa: {
          select: {
            id: true,
            nama_siswa: true,
            nis: true,
            Kelas: { select: { nama_kelas: true } }
          }
        },
        KonselingSiswa: {
          where: { deleted_at: null },
          include: {
            Petugas: { select: { id: true, full_name: true } }
          }
        },
        PemanggilanOrangTua: {
          where: { deleted_at: null },
          include: {
            Dokumen: true
          }
        },
        HomeVisit: {
          where: { deleted_at: null },
          include: {
            Dokumen: true
          }
        },
        AsesmenSiswa: {
          where: { deleted_at: null },
          include: {
            Dokumen: true
          }
        },
        RujukanKasus: {
          where: { deleted_at: null }
        }
      }
    });

    if (!item || item.deleted_at !== null) {
      throw new Error('Kasus tidak ditemukan');
    }

    const isWali = await this.isUserWaliKelasOfStudent(tenantId, userContext.id, item.siswa_id);
    const hasSensitive = userContext.capabilities.includes('bk.counseling.view.sensitive') ||
                         userContext.capabilities.includes('system.platform.full_access');

    if (item.visibility === 'SENSITIVE') {
      if (!hasSensitive) {
        throw new Error('Akses ditolak: Kasus ini bersifat sensitif');
      }
      activityLogService.logEvent({
        event_type: 'CASE_VIEW_SENSITIVE',
        tenant_id: tenantId,
        user_id: userContext.id,
        entity: 'KasusBK',
        entity_id: item.id,
        metadata: { judul: item.judul }
      });
    }
    if (item.visibility === 'LIMITED' && !hasSensitive && !isWali) {
      throw new Error('Akses ditolak: Kasus ini terbatas untuk BK dan Wali Kelas saja');
    }

    const filterByVisibility = <T extends { visibility?: string }>(children: T[]): T[] => {
      return children.filter(c => {
        const vis = c.visibility || 'PUBLIC';
        if (vis === 'SENSITIVE') return hasSensitive;
        if (vis === 'LIMITED') return hasSensitive || isWali;
        return true;
      });
    };

    return {
      ...item,
      KonselingSiswa: filterByVisibility(item.KonselingSiswa),
      PemanggilanOrangTua: filterByVisibility(item.PemanggilanOrangTua),
      HomeVisit: filterByVisibility(item.HomeVisit),
      AsesmenSiswa: filterByVisibility(item.AsesmenSiswa),
      RujukanKasus: filterByVisibility(item.RujukanKasus)
    };
  }

  static async getAllKasusBK(tenantId: string, userContext: { id: string; capabilities: string[] }, query: {
    page?: number;
    limit?: number;
    search?: string;
    siswa_id?: string;
    status?: string;
    prioritas?: string;
    kategori?: string;
    show_deleted?: string;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const offset = (page - 1) * limit;

    const visibilityFilter = await this.buildVisibilityFilter(tenantId, userContext);

    const where: Prisma.KasusBKWhereInput = {
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
    if (query.prioritas) {
      where.prioritas = query.prioritas;
    }
    if (query.kategori) {
      where.kategori = query.kategori;
    }
    if (query.search) {
      where.OR = [
        { judul: { contains: query.search, mode: 'insensitive' } },
        { keterangan: { contains: query.search, mode: 'insensitive' } },
        { Siswa: { nama_siswa: { contains: query.search, mode: 'insensitive' } } }
      ];
    }

    const [total, list] = await Promise.all([
      prisma.kasusBK.count({ where }),
      prisma.kasusBK.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { tanggal_kasus: 'desc' },
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

  // === Konseling Siswa ===
}
