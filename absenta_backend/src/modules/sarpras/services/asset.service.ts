import { Prisma } from '@prisma/client';
import { prisma } from '../../../utils/prisma';
import { generateAssetCode } from '../utils/sarpras.utils';

export class AssetService {
  // --- Category ---
  static async createCategory(tenantId: string, data: { nama: string; deskripsi?: string }) {
    return prisma.sarprasCategory.create({
      data: {
        tenant_id: tenantId,
        ...data
      }
    });
  }

  static async getCategories(tenantId: string) {
    return prisma.sarprasCategory.findMany({
      where: { tenant_id: tenantId },
      orderBy: { nama: 'asc' }
    });
  }

  static async updateCategory(tenantId: string, id: string, data: { nama?: string; deskripsi?: string }) {
    return prisma.sarprasCategory.update({
      where: { id, tenant_id: tenantId },
      data
    });
  }

  static async deleteCategory(tenantId: string, id: string) {
    return prisma.sarprasCategory.delete({
      where: { id, tenant_id: tenantId }
    });
  }

  // --- Location ---
  static async createLocation(tenantId: string, data: { nama: string; deskripsi?: string; unit_id?: string }) {
    return prisma.sarprasLocation.create({
      data: {
        tenant_id: tenantId,
        ...data
      }
    });
  }

  static async getLocations(tenantId: string, scope?: any) {
    const where: Prisma.SarprasLocationWhereInput = { tenant_id: tenantId };
    if (scope && !scope.tenant_wide && scope.unit_ids && scope.unit_ids.length > 0) {
      where.unit_id = { in: scope.unit_ids };
    } else if (scope && !scope.tenant_wide) {
        // Restricted scope but no unit assigned -> sees nothing
        where.unit_id = 'NONE';
    }
    return prisma.sarprasLocation.findMany({
      where,
      orderBy: { nama: 'asc' }
    });
  }

  static async updateLocation(tenantId: string, id: string, data: { nama?: string; deskripsi?: string }) {
    return prisma.sarprasLocation.update({
      where: { id, tenant_id: tenantId },
      data
    });
  }

  static async deleteLocation(tenantId: string, id: string) {
    return prisma.sarprasLocation.delete({
      where: { id, tenant_id: tenantId }
    });
  }

  // --- Asset ---
  static async createAsset(tenantId: string, data: {
    nama: string;
    category_id?: string;
    location_id?: string;
    brand?: string;
    serial_number?: string;
    kode?: string;
    kondisi?: string;
    jumlah?: number;
    is_loanable?: boolean;
    purchase_date?: Date;
    price_purchase?: number;
    image_url?: string;
    deskripsi?: string;
  }, scope?: any) {
    if (scope && !scope.tenant_wide && data.location_id) {
       if (!scope.unit_ids || !scope.unit_ids.includes(data.location_id)) {
           throw new Error("Anda tidak memiliki akses ke lokasi sarpras ini");
       }
    }

    return prisma.sarprasAsset.create({
      data: {
        tenant_id: tenantId,
        ...data,
        kode: data.kode || generateAssetCode(),
        price_purchase: data.price_purchase ? new Prisma.Decimal(data.price_purchase) : undefined
      }
    });
  }

  static async updateAsset(tenantId: string, id: string, data: Partial<Prisma.SarprasAssetUncheckedCreateInput>, scope?: any) {
    const existing = await prisma.sarprasAsset.findFirst({ where: { id, tenant_id: tenantId } });
    if (!existing) throw new Error("Aset tidak ditemukan");
    
    if (scope && !scope.tenant_wide) {
      if (existing.location_id && (!scope.unit_ids || !scope.unit_ids.includes(existing.location_id))) {
        throw new Error("Anda tidak memiliki akses ke aset ini");
      }
      if (data.location_id && (!scope.unit_ids || !scope.unit_ids.includes(data.location_id))) {
        throw new Error("Anda tidak memiliki akses ke lokasi tujuan sarpras ini");
      }
    }

    return prisma.sarprasAsset.update({
      where: { id, tenant_id: tenantId },
      data
    });
  }

  static async deleteAsset(tenantId: string, id: string, scope?: any) {
    const existing = await prisma.sarprasAsset.findFirst({ where: { id, tenant_id: tenantId } });
    if (existing && scope && !scope.tenant_wide && existing.location_id) {
        if (!scope.unit_ids || !scope.unit_ids.includes(existing.location_id)) {
            throw new Error("Anda tidak memiliki akses ke aset ini");
        }
    }

    return prisma.sarprasAsset.delete({
      where: { id, tenant_id: tenantId }
    });
  }

  static async getAssets(tenantId: string, query: {
    page?: number;
    limit?: number;
    search?: string;
    category_id?: string;
    location_id?: string;
    kondisi?: string;
    is_loanable?: boolean;
  }, scope?: any) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const offset = (page - 1) * limit;

    const where: Prisma.SarprasAssetWhereInput = {
      tenant_id: tenantId,
    };

    if (scope && !scope.tenant_wide) {
      if (scope.unit_ids && scope.unit_ids.length > 0) {
        // Enforce jurisdictional scope: get location IDs belonging to user units
        const allowedLocations = await prisma.sarprasLocation.findMany({
          where: { tenant_id: tenantId, unit_id: { in: scope.unit_ids } },
          select: { id: true }
        });
        const allowedIds = allowedLocations.map(l => l.id);

        if (query.location_id) {
          if (!allowedIds.includes(query.location_id)) {
            return { list: [], pagination: { total: 0, page, limit, totalPages: 0 } };
          }
          where.location_id = query.location_id;
        } else {
          where.location_id = { in: allowedIds };
        }
      } else {
        // No units assigned, sees nothing
        return { list: [], pagination: { total: 0, page, limit, totalPages: 0 } };
      }
    } else {
      if (query.location_id) where.location_id = query.location_id;
    }

    if (query.category_id) where.category_id = query.category_id;
    if (query.kondisi) where.kondisi = query.kondisi;
    if (typeof query.is_loanable === 'boolean') where.is_loanable = query.is_loanable;

    if (query.search) {
      where.OR = [
        { nama: { contains: query.search, mode: 'insensitive' } },
        { brand: { contains: query.search, mode: 'insensitive' } },
        { kode: { contains: query.search, mode: 'insensitive' } },
        { serial_number: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, list] = await Promise.all([
      prisma.sarprasAsset.count({ where }),
      prisma.sarprasAsset.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { created_at: 'desc' },
        include: {
          Category: true,
          Location: true
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

  static async getAssetById(tenantId: string, id: string, scope?: any) {
    const where: Prisma.SarprasAssetWhereInput = { id, tenant_id: tenantId };

    if (scope && !scope.tenant_wide) {
       const allowedLocations = await prisma.sarprasLocation.findMany({
         where: { tenant_id: tenantId, unit_id: { in: scope.unit_ids || [] } },
         select: { id: true }
       });
       const allowedIds = allowedLocations.map(l => l.id);
       where.location_id = { in: allowedIds };
    }

    return prisma.sarprasAsset.findFirst({
      where,
      include: {
        Category: true,
        Location: true,
        Loans: {
          take: 5,
          orderBy: { tanggal_pinjam: 'desc' },
          include: {
            Peminjam: {
              select: { id: true, full_name: true }
            }
          }
        },
        Repairs: {
          take: 5,
          orderBy: { tanggal_mulai: 'desc' }
        }
      }
    });
  }

  static async upsertAssets(tenantId: string, assets: any[]) {
    const results = {
      created: 0,
      updated: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const assetData of assets) {
      try {
        const { nama, kode, brand, serial_number, kondisi, jumlah, is_loanable, price_purchase, purchase_date, deskripsi, category_nama, location_nama } = assetData;
        
        if (!nama) throw new Error("Nama aset wajib diisi");

        // Resolve Category & Location by Name
        let category_id = undefined;
        let location_id = undefined;

        if (category_nama) {
          const cat = await prisma.sarprasCategory.upsert({
            where: { tenant_id_nama: { tenant_id: tenantId, nama: category_nama } },
            update: {},
            create: { tenant_id: tenantId, nama: category_nama }
          });
          category_id = cat.id;
        }

        if (location_nama) {
          const loc = await prisma.sarprasLocation.upsert({
            where: { tenant_id_nama: { tenant_id: tenantId, nama: location_nama } },
            update: {},
            create: { tenant_id: tenantId, nama: location_nama }
          });
          location_id = loc.id;
        }

        const data: any = {
          tenant_id: tenantId,
          nama,
          brand,
          serial_number,
          kondisi: kondisi || 'BAIK',
          jumlah: Number(jumlah) || 1,
          is_loanable: is_loanable !== undefined ? !!is_loanable : true,
          price_purchase: price_purchase ? new Prisma.Decimal(price_purchase) : undefined,
          purchase_date: purchase_date ? new Date(purchase_date) : undefined,
          deskripsi,
          category_id,
          location_id
        };

        if (kode) {
          // Robust check for globally unique 'kode'
          const existing = await prisma.sarprasAsset.findUnique({
            where: { kode }
          });

          if (existing) {
            // Security Check: Ensure the asset belongs to the same tenant
            if (existing.tenant_id !== tenantId) {
              throw new Error(`Kode aset '${kode}' sudah digunakan oleh unit/sekolah lain`);
            }

            await prisma.sarprasAsset.update({
              where: { id: existing.id },
              data
            });
            results.updated++;
          } else {
            await prisma.sarprasAsset.create({
              data: { ...data, kode }
            });
            results.created++;
          }
        } else {
          await prisma.sarprasAsset.create({
            data: { ...data, kode: generateAssetCode() }
          });
          results.created++;
        }
      } catch (err: any) {
        results.failed++;
        results.errors.push(`${assetData.nama || 'Tanpa Nama'}: ${err.message}`);
      }
    }

    return results;
  }

  static async getStats(tenantId: string, scope?: any) {
    const where: any = { tenant_id: tenantId };

    if (scope && !scope.tenant_wide) {
      const allowedLocations = await (prisma as any).sarprasLocation.findMany({
        where: { tenant_id: tenantId, unit_id: { in: scope.unit_ids || [] } },
        select: { id: true }
      });
      const allowedIds = allowedLocations.map((l: any) => l.id);
      where.location_id = { in: allowedIds };
    }

    const [total, available, borrowed, repair] = await Promise.all([
      (prisma as any).sarprasAsset.count({ where }),
      (prisma as any).sarprasAsset.count({ where: { ...where, kondisi: 'BAIK', is_loanable: true } }),
      (prisma as any).sarprasAsset.count({ 
        where: { 
          ...where, 
          Loans: { some: { status: 'BORROWED' } } 
        } 
      }),
      (prisma as any).sarprasAsset.count({ where: { ...where, kondisi: { in: ['RUSAK_RINGAN', 'RUSAK_BERAT'] } } })
    ]);

    return {
      total,
      available,
      borrowed,
      repair
    };
  }
}
