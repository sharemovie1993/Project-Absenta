import { Prisma } from '@prisma/client';
import { prisma } from '../../../utils/prisma';

export class RepairService {
  static async createRepair(tenantId: string, data: {
    asset_id: string;
    teknisi?: string;
    biaya?: number;
    deskripsi?: string;
  }, scope?: any) {
    // Verify asset exists and belongs to tenant
    const asset = await prisma.sarprasAsset.findFirst({
      where: { id: data.asset_id, tenant_id: tenantId }
    });

    if (!asset) throw new Error('Aset tidak ditemukan');
    
    if (scope && !scope.tenant_wide) {
      if (asset.location_id && (!scope.unit_ids || !scope.unit_ids.includes(asset.location_id))) {
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
          status: 'PROSES'
        }
      }),
      prisma.sarprasAsset.update({
        where: { id: data.asset_id },
        data: { kondisi: 'PERBAIKAN' }
      })
    ]);

    return repair;
  }

  static async updateRepair(tenantId: string, id: string, data: {
    status?: string;
    teknisi?: string;
    biaya?: number;
    deskripsi?: string;
    tanggal_selesai?: Date;
  }, scope?: any) {
    const repair = await prisma.sarprasAssetRepair.findFirst({
      where: { id, tenant_id: tenantId }
    });

    if (!repair) throw new Error('Data perbaikan tidak ditemukan');

    if (scope && !scope.tenant_wide) {
       const asset = await prisma.sarprasAsset.findFirst({ where: { id: repair.asset_id }});
       if (asset && asset.location_id && (!scope.unit_ids || !scope.unit_ids.includes(asset.location_id))) {
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

    return prisma.sarprasAssetRepair.update({
      where: { id },
      data: updateData
    });
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
          location_id: { in: scope.unit_ids }
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
        where: { tenant_id: tenantId, status: 'PROSES', ...(scope && !scope.tenant_wide ? { Asset: { location_id: { in: scope.unit_ids || [] } } } : {}) }
      }),
      prisma.sarprasAssetRepair.count({
        where: { tenant_id: tenantId, status: 'SELESAI', ...(scope && !scope.tenant_wide ? { Asset: { location_id: { in: scope.unit_ids || [] } } } : {}) }
      }),
      prisma.sarprasAssetRepair.aggregate({
        where: { tenant_id: tenantId, ...(scope && !scope.tenant_wide ? { Asset: { location_id: { in: scope.unit_ids || [] } } } : {}) },
        _sum: { biaya: true }
      })
    ]);

    return {
      inProgress,
      completed,
      totalCost: totalCost._sum.biaya?.toNumber() || 0
    };
  }
}
