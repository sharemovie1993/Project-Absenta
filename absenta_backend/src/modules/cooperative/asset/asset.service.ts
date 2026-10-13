// @ts-nocheck
import { prisma } from '../../../utils/prisma';
import { appLogger } from '@/utils/app-logger';

export interface CreateAssetInput {
  name: string;
  category: string;
  location: string;
  purchaseDate: string | Date;
  purchasePrice: number;
  condition?: string;
  status?: string;
  usefulLifeMonths?: number;
  salvageValue?: number;
  serialNumber?: string;
  picName?: string;
  photoUrl?: string;
  notes?: string;
}

export interface UpdateAssetInput {
  name?: string;
  category?: string;
  location?: string;
  purchaseDate?: string | Date;
  purchasePrice?: number;
  condition?: string;
  status?: string;
  usefulLifeMonths?: number;
  salvageValue?: number;
  serialNumber?: string;
  picName?: string;
  photoUrl?: string;
  notes?: string;
}

export class AssetService {
  /**
   * Menghasilkan kode unik aset baru: AST-KOP-YYYY-001
   */
  static async generateAssetCode(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `AST-KOP-${year}`;
    const count = await prisma.coopAsset.count({
      where: {
        tenantId,
        code: { startsWith: prefix }
      }
    });
    const seq = String(count + 1).padStart(4, '0');
    return `${prefix}-${seq}`;
  }

  /**
   * Mengambil daftar aset dengan filter, search, pagination, dan ringkasan eksekutif
   */
  static async listAssets(tenantId: string, query: {
    page?: number;
    limit?: number;
    category?: string;
    condition?: string;
    status?: string;
    search?: string;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (query.category && query.category !== 'ALL') {
      where.category = query.category;
    }
    if (query.condition && query.condition !== 'ALL') {
      where.condition = query.condition;
    }
    if (query.status && query.status !== 'ALL') {
      where.status = query.status;
    }
    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { code: { contains: term, mode: 'insensitive' } },
        { location: { contains: term, mode: 'insensitive' } },
        { picName: { contains: term, mode: 'insensitive' } },
        { serialNumber: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.coopAsset.count({ where }),
      prisma.coopAsset.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      })
    ]);

    // Ringkasan Eksekutif Nilai & Kondisi Aset
    const allTenantAssets = await prisma.coopAsset.findMany({
      where: { tenantId },
      select: { purchasePrice: true, condition: true, status: true }
    });

    let totalAcquisitionValue = 0;
    let goodCount = 0;
    let damagedCount = 0;
    let inUseCount = 0;

    for (const a of allTenantAssets) {
      totalAcquisitionValue += Number(a.purchasePrice || 0);
      if (a.condition === 'GOOD') goodCount++;
      if (a.condition === 'DAMAGED') damagedCount++;
      if (a.status === 'IN_USE') inUseCount++;
    }

    return {
      summary: {
        totalAssets: allTenantAssets.length,
        totalAcquisitionValue,
        goodCount,
        damagedCount,
        inUseCount
      },
      items: items.map(item => ({
        ...item,
        purchasePrice: Number(item.purchasePrice || 0),
        salvageValue: Number(item.salvageValue || 0)
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit))
      }
    };
  }

  /**
   * Detail satu aset
   */
  static async getAssetById(tenantId: string, id: string) {
    const asset = await prisma.coopAsset.findFirst({
      where: { id, tenantId }
    });
    if (!asset) return null;
    return {
      ...asset,
      purchasePrice: Number(asset.purchasePrice || 0),
      salvageValue: Number(asset.salvageValue || 0)
    };
  }

  /**
   * Daftarkan aset baru
   */
  static async createAsset(tenantId: string, data: CreateAssetInput) {
    const code = await this.generateAssetCode(tenantId);
    const purchaseDate = data.purchaseDate ? new Date(data.purchaseDate) : new Date();

    const created = await prisma.coopAsset.create({
      data: {
        tenantId,
        code,
        name: data.name,
        category: (data.category as any) || 'EQUIPMENT',
        location: data.location,
        purchaseDate,
        purchasePrice: Number(data.purchasePrice || 0),
        condition: (data.condition as any) || 'GOOD',
        status: (data.status as any) || 'IN_USE',
        usefulLifeMonths: Number(data.usefulLifeMonths || 48),
        salvageValue: Number(data.salvageValue || 0),
        serialNumber: data.serialNumber || null,
        picName: data.picName || null,
        photoUrl: data.photoUrl || null,
        notes: data.notes || null,
      }
    });

    appLogger.info({ tenantId, assetId: created.id, code }, '[AssetService] Berhasil mendaftarkan aset koperasi baru');
    return {
      ...created,
      purchasePrice: Number(created.purchasePrice || 0),
      salvageValue: Number(created.salvageValue || 0)
    };
  }

  /**
   * Perbarui informasi atau kondisi aset
   */
  static async updateAsset(tenantId: string, id: string, data: UpdateAssetInput) {
    const existing = await prisma.coopAsset.findFirst({
      where: { id, tenantId }
    });
    if (!existing) {
      throw new Error('Aset tidak ditemukan');
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.purchaseDate !== undefined) updateData.purchaseDate = new Date(data.purchaseDate);
    if (data.purchasePrice !== undefined) updateData.purchasePrice = Number(data.purchasePrice);
    if (data.condition !== undefined) updateData.condition = data.condition;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.usefulLifeMonths !== undefined) updateData.usefulLifeMonths = Number(data.usefulLifeMonths);
    if (data.salvageValue !== undefined) updateData.salvageValue = Number(data.salvageValue);
    if (data.serialNumber !== undefined) updateData.serialNumber = data.serialNumber;
    if (data.picName !== undefined) updateData.picName = data.picName;
    if (data.photoUrl !== undefined) updateData.photoUrl = data.photoUrl;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const updated = await prisma.coopAsset.update({
      where: { id },
      data: updateData
    });

    return {
      ...updated,
      purchasePrice: Number(updated.purchasePrice || 0),
      salvageValue: Number(updated.salvageValue || 0)
    };
  }

  /**
   * Hapus aset
   */
  static async deleteAsset(tenantId: string, id: string) {
    const existing = await prisma.coopAsset.findFirst({
      where: { id, tenantId }
    });
    if (!existing) {
      throw new Error('Aset tidak ditemukan');
    }

    await prisma.coopAsset.delete({
      where: { id }
    });
    return true;
  }
}
