import { Prisma } from '@prisma/client';
import { prisma } from '../../../utils/prisma';
import { activityLogService } from '../../activity/services/activity-log.service';
import { AssetService } from './asset.service';
import { cacheInvalidationService } from '../../../utils/cache-invalidation.service';

export class RepairService {
  static async createRepair(tenantId: string, data: {
    asset_id: string;
    teknisi?: string;
    biaya?: number;
    deskripsi?: string;
    foto_kerusakan?: string;
  }, scope?: any, userId?: string) {
    // Verify asset exists and belongs to tenant
    const asset = await prisma.sarprasAsset.findFirst({
      where: { id: data.asset_id, tenant_id: tenantId, deleted_at: null },
      include: { Location: true }
    });

    if (!asset) throw new Error('Aset tidak ditemukan');
    
    if (scope && !scope.tenant_wide) {
      if (asset.Location?.unit_id && (!scope.unit_ids || !scope.unit_ids.includes(asset.Location.unit_id))) {
        throw new Error('Anda tidak memiliki akses untuk menambah perbaikan pada aset ini');
      }
    }

    // Create repair record and update asset condition
    const [repair] = await prisma.$transaction([
      prisma.sarprasAssetRepair.create({
        data: {
          tenant_id: tenantId,
          asset_id: data.asset_id,
          teknisi: data.teknisi,
          biaya: data.biaya ? new Prisma.Decimal(data.biaya) : undefined,
          deskripsi: data.deskripsi,
          status: 'PROSES',
          foto_kerusakan: data.foto_kerusakan
        }
      }),
      prisma.sarprasAsset.update({
        where: { id: data.asset_id },
        data: { kondisi: 'PERBAIKAN' }
      })
    ]);

    if (userId) {
      activityLogService.logEvent({
        event_type: 'SARPRAS_REPAIR_CREATE',
        tenant_id: tenantId,
        user_id: userId,
        entity: 'SarprasAssetRepair',
        entity_id: repair.id,
        metadata: { asset_id: data.asset_id, asset_nama: asset.nama }
      });
    }

    AssetService.publishRealtimeDashboardUpdate(tenantId);
    await cacheInvalidationService.invalidateSarprasCache(tenantId);
    return repair;
  }

  static async updateRepair(tenantId: string, id: string, data: {
    status?: string;
    teknisi?: string;
    biaya?: number;
    deskripsi?: string;
    tanggal_selesai?: Date;
    foto_kerusakan?: string;
  }, scope?: any, userId?: string) {
    const repair = await prisma.sarprasAssetRepair.findFirst({
      where: { id, tenant_id: tenantId }
    });

    if (!repair) throw new Error('Data perbaikan tidak ditemukan');

    if (scope && !scope.tenant_wide) {
       const asset = await prisma.sarprasAsset.findFirst({ 
         where: { id: repair.asset_id },
         include: { Location: true }
       });
       if (asset && asset.Location?.unit_id && (!scope.unit_ids || !scope.unit_ids.includes(asset.Location.unit_id))) {
           throw new Error('Anda tidak memiliki akses untuk mengelola perbaikan aset ini');
       }
    }

    const updateData: any = { ...data };

    if (data.biaya !== undefined) {
      updateData.biaya = new Prisma.Decimal(data.biaya);
    }

    // If repair is completed, update asset condition back to BAIK
    if (data.status === 'SELESAI') {
      updateData.tanggal_selesai = data.tanggal_selesai || new Date();
      
      // Check if there are other active repairs for this asset
      const otherActiveRepairs = await prisma.sarprasAssetRepair.count({
        where: {
          asset_id: repair.asset_id,
          tenant_id: tenantId,
          id: { not: id },
          status: 'PROSES'
        }
      });

      // Only restore condition if no other active repairs
      if (otherActiveRepairs === 0) {
        await prisma.sarprasAsset.update({
          where: { id: repair.asset_id },
          data: { kondisi: 'BAIK' }
        });
      }
    }

    // If repair is cancelled, also check condition
    if (data.status === 'BATAL') {
      const otherActiveRepairs = await prisma.sarprasAssetRepair.count({
        where: {
          asset_id: repair.asset_id,
          tenant_id: tenantId,
          id: { not: id },
          status: 'PROSES'
        }
      });

      if (otherActiveRepairs === 0) {
        await prisma.sarprasAsset.update({
          where: { id: repair.asset_id },
          data: { kondisi: 'RUSAK' }
        });
      }
    }

    const updatedRepair = await prisma.sarprasAssetRepair.update({
      where: { id },
      data: updateData
    });

    if (userId) {
      activityLogService.logEvent({
        event_type: 'SARPRAS_REPAIR_UPDATE',
        tenant_id: tenantId,
        user_id: userId,
        entity: 'SarprasAssetRepair',
        entity_id: id,
        metadata: { status: data.status, asset_id: repair.asset_id }
      });
    }

    AssetService.publishRealtimeDashboardUpdate(tenantId);
    await cacheInvalidationService.invalidateSarprasCache(tenantId);
    return updatedRepair;
  }

  static async getRepairs(tenantId: string, query: {
    page?: number;
    limit?: number;
    status?: string;
    asset_id?: string;
  }, scope?: any) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const offset = (page - 1) * limit;

    const where: Prisma.SarprasAssetRepairWhereInput = {
      tenant_id: tenantId
    };

    if (query.status) where.status = query.status;
    if (query.asset_id) where.asset_id = query.asset_id;

    if (scope && !scope.tenant_wide) {
      if (scope.unit_ids && scope.unit_ids.length > 0) {
        where.Asset = {
          Location: {
            unit_id: { in: scope.unit_ids }
          }
        };
      } else {
        return { list: [], pagination: { total: 0, page, limit, totalPages: 0 } };
      }
    }

    const [total, list] = await Promise.all([
      prisma.sarprasAssetRepair.count({ where }),
      prisma.sarprasAssetRepair.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { created_at: 'desc' },
        include: {
          Asset: {
            select: { id: true, nama: true, kode: true, kondisi: true }
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

  static async getRepairStats(tenantId: string, scope?: any) {
    const [inProgress, completed, totalCost] = await Promise.all([
      prisma.sarprasAssetRepair.count({
        where: { tenant_id: tenantId, status: 'PROSES', ...(scope && !scope.tenant_wide ? { Asset: { Location: { unit_id: { in: scope.unit_ids || [] } } } } : {}) }
      }),
      prisma.sarprasAssetRepair.count({
        where: { tenant_id: tenantId, status: 'SELESAI', ...(scope && !scope.tenant_wide ? { Asset: { Location: { unit_id: { in: scope.unit_ids || [] } } } } : {}) }
      }),
      prisma.sarprasAssetRepair.aggregate({
        where: { tenant_id: tenantId, ...(scope && !scope.tenant_wide ? { Asset: { Location: { unit_id: { in: scope.unit_ids || [] } } } } : {}) },
        _sum: { biaya: true }
      })
    ]);

    return {
      inProgress,
      completed,
      totalCost: totalCost._sum.biaya?.toNumber() || 0
    };
  }

  static async getRepairsCalendar(tenantId: string, scope?: any) {
    const where: any = {
      tenant_id: tenantId
    };

    if (scope && !scope.tenant_wide) {
      where.Asset = {
        Location: {
          unit_id: { in: scope.unit_ids || [] }
        }
      };
    }

    const repairs = await prisma.sarprasAssetRepair.findMany({
      where,
      include: {
        Asset: {
          include: { Location: true }
        }
      }
    });

    return repairs.map(repair => {
      let color = '#3b82f6';
      if (repair.status === 'SELESAI') color = '#10b981';
      else if (repair.status === 'BATAL') color = '#ef4444';

      return {
        id: repair.id,
        title: `Perbaikan: ${repair.Asset.nama}`,
        start: repair.tanggal_mulai,
        end: repair.tanggal_selesai || new Date(),
        color,
        allDay: false,
        extendedProps: {
          asset_kode: repair.Asset.kode,
          location: repair.Asset.Location?.nama || 'Tanpa Lokasi',
          status: repair.status,
          teknisi: repair.teknisi || '-',
          biaya: repair.biaya ? Number(repair.biaya) : 0,
          deskripsi: repair.deskripsi || '',
          foto_kerusakan: repair.foto_kerusakan || null
        }
      };
    });
  }
}
