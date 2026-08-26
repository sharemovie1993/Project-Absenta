// @ts-nocheck
import { prisma } from '@/utils/prisma';
import crypto from 'crypto';
import { activityLogService } from '@/modules/activity/services/activity-log.service';
import { studentResolverService } from '@/services/student-resolver.service';
import { waGatewayService } from '@/services/wa-gateway.service';
import { getRedisConnection } from '@/queue/redis';
import { cacheService } from '@/utils/cache.service';
import { cacheInvalidationService } from '@/utils/cache-invalidation.service';
import { CACHE_KEYS, CACHE_TTL } from '@/constants/cache-keys';
import { HubinCommonHelper } from './hubin-common.helper';

export class HubinMitraService {
  async getMitra(tenantId: string, params?: { search?: string; page?: number; limit?: number }) {
    const page = params?.page || 1;
    const limit = params?.limit || 100;
    const skip = (page - 1) * limit;
    
    const where: any = { tenant_id: tenantId };
    
    if (params?.search) {
      where.OR = [
        { nama: { contains: params.search, mode: 'insensitive' } },
        { bidang: { contains: params.search, mode: 'insensitive' } },
        { alamat: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.mitraIndustri.count({ where }),
      prisma.mitraIndustri.findMany({
        where,
        orderBy: { nama: 'asc' },
        skip,
        take: limit,
      })
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getMitraDetail(tenantId: string, id: string) {
    return await prisma.mitraIndustri.findFirst({
      where: { id, tenant_id: tenantId },
    });
  }

  async createMitra(tenantId: string, data: any, actorUserId?: string | null) {
    const result = await prisma.mitraIndustri.create({
      data: {
        ...data,
        tenant_id: tenantId,
      },
    });
    this.log(tenantId, actorUserId || null, 'HUBIN_MITRA_CREATE', 'MitraIndustri', result.id, { nama: result.nama });
    await cacheInvalidationService.invalidateHubinCache(tenantId);
    return result;
  }

  async updateMitra(tenantId: string, id: string, data: any, userId?: string, org?: any) {
    if (userId) {
      let isGlobalHubin = org?.tenant_wide === true;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { 
          Guru: true,
          Role: { include: { rolePermissions: true } },
          organizationalAssignments: {
            where: { is_active: true },
            include: { Position: true }
          }
        }
      });

      if (!org) {
        isGlobalHubin = !!(
          user?.Role?.name === 'ADMIN' || 
          user?.Role?.name === 'SUPERADMIN' ||
          user?.organizationalAssignments?.some((oa: any) => oa.Position?.code === 'HUBIN') ||
          user?.Role?.rolePermissions?.some((rp: any) => rp.permission_id === 'hubin.partners.manage')
        );
      }

      if (!isGlobalHubin) {
        // Jika bukan Hubin Global, cek apakah dia pembimbing di mitra ini
        const isPembimbingHere = await prisma.siswaPkl.findFirst({
          where: { mitra_id: id, pembimbing_id: user?.Guru?.id, tenant_id: tenantId }
        });

        if (!isPembimbingHere) {
          throw new Error('Anda tidak memiliki otoritas untuk memperbarui data mitra ini');
        }

        // Proteksi Data: Pembimbing hanya boleh update kontak/lokasi
        const safeData = {
          alamat: data.alamat,
          kontak: data.kontak,
          latitude: data.latitude,
          longitude: data.longitude,
          radius: data.radius
        };
        
        return await prisma.mitraIndustri.update({
          where: { id, tenant_id: tenantId },
          data: safeData,
        });
      }
    }

    const result = await prisma.mitraIndustri.update({
      where: { id, tenant_id: tenantId },
      data,
    });
    this.log(tenantId, userId || null, 'HUBIN_MITRA_UPDATE', 'MitraIndustri', id, { nama: result.nama });
    await cacheInvalidationService.invalidateHubinCache(tenantId);
    return result;
  }

  async deleteMitra(tenantId: string, id: string, actorUserId?: string | null) {
    const result = await prisma.mitraIndustri.delete({
      where: { id, tenant_id: tenantId },
    });
    this.log(tenantId, actorUserId || null, 'HUBIN_MITRA_DELETE', 'MitraIndustri', id, { nama: result.nama });
    await cacheInvalidationService.invalidateHubinCache(tenantId);
    return result;
  }

  /**
   * --- 2. MANAJEMEN PENEMPATAN PKL ---
   */

  async getMoUHistory(tenantId: string, mitraId: string) {
    return await prisma.hubinMoUHistory.findMany({
      where: { tenant_id: tenantId, mitra_id: mitraId, deleted_at: null },
      orderBy: { tanggal_mulai: 'desc' }
    });
  }

  async createMoUHistory(tenantId: string, mitraId: string, data: any, actorUserId?: string | null) {
    const history = await prisma.hubinMoUHistory.create({
      data: {
        ...data,
        mitra_id: mitraId,
        tenant_id: tenantId,
        tanggal_mulai: data.tanggal_mulai ? new Date(data.tanggal_mulai) : new Date(),
        tanggal_selesai: data.tanggal_selesai ? new Date(data.tanggal_selesai) : new Date()
      }
    });

    await prisma.mitraIndustri.update({
      where: { id: mitraId },
      data: {
        mou_nomor: data.mou_nomor,
        mou_tanggal_mulai: data.tanggal_mulai ? new Date(data.tanggal_mulai) : null,
        mou_tanggal_berakhir: data.tanggal_selesai ? new Date(data.tanggal_selesai) : null,
        mou_status: 'AKTIF'
      }
    });

    this.log(tenantId, actorUserId || null, 'HUBIN_MOU_CREATE', 'HubinMoUHistory', history.id, { mou_nomor: history.mou_nomor });
    await cacheInvalidationService.invalidateHubinCache(tenantId);
    return history;
  }

  async deleteMoUHistory(tenantId: string, id: string, actorUserId?: string | null) {
    const result = await prisma.hubinMoUHistory.update({
      where: { id, tenant_id: tenantId },
      data: { deleted_at: new Date() }
    });
    this.log(tenantId, actorUserId || null, 'HUBIN_MOU_DELETE', 'HubinMoUHistory', id, { mou_nomor: result.mou_nomor });
    await cacheInvalidationService.invalidateHubinCache(tenantId);
    return result;
  }

  // --- 6. BURSA KERJA KHUSUS (BKK) - LOWONGAN ---
}
