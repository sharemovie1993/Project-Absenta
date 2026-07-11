import { Prisma } from '@prisma/client';
import { prisma } from '../../../utils/prisma';
import { generateAssetCode } from '../utils/sarpras.utils';
import { activityLogService } from '../../activity/services/activity-log.service';
import puppeteer from 'puppeteer';
import QRCode from 'qrcode';

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
    let categories = await prisma.sarprasCategory.findMany({
      where: { tenant_id: tenantId, deleted_at: null },
      orderBy: { nama: 'asc' }
    });

    if (categories.length === 0) {
      const totalCount = await prisma.sarprasCategory.count({
        where: { tenant_id: tenantId }
      });
      if (totalCount === 0) {
        const defaults = [
          { nama: 'Peralatan Elektronik & IT', deskripsi: 'Komputer, Laptop, Projector, Printer, Switch/Router, dll.' },
          { nama: 'Mebel / Furniture', deskripsi: 'Meja, Kursi, Lemari, Papan Tulis, Rak, dll.' },
          { nama: 'Alat Tulis Kantor & Cetak', deskripsi: 'Mesin Fotokopi, Paper Shredder, Mesin Laminating, dll.' },
          { nama: 'Alat Peraga & Praktik', deskripsi: 'Alat Lab IPA, Alat Lab Bahasa, Peralatan Bengkel, dll.' },
          { nama: 'Sarana Olahraga & Seni', deskripsi: 'Bola, Matras, Sound System, Alat Musik, dll.' },
          { nama: 'Perlengkapan Umum & Kebersihan', deskripsi: 'AC, Kipas Angin, Dispenser, Alat Kebersihan, P3K, dll.' },
        ];
        await prisma.sarprasCategory.createMany({
          data: defaults.map(d => ({
            tenant_id: tenantId,
            nama: d.nama,
            deskripsi: d.deskripsi
          })),
          skipDuplicates: true
        });
        categories = await prisma.sarprasCategory.findMany({
          where: { tenant_id: tenantId, deleted_at: null },
          orderBy: { nama: 'asc' }
        });
      }
    }

    return categories;
  }

  static async updateCategory(tenantId: string, id: string, data: { nama?: string; deskripsi?: string }) {
    return prisma.sarprasCategory.update({
      where: { id, tenant_id: tenantId },
      data
    });
  }

  static async deleteCategory(tenantId: string, id: string) {
    return prisma.sarprasCategory.update({
      where: { id, tenant_id: tenantId },
      data: { deleted_at: new Date() }
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
    const where: Prisma.SarprasLocationWhereInput = { tenant_id: tenantId, deleted_at: null };
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
    return prisma.sarprasLocation.update({
      where: { id, tenant_id: tenantId },
      data: { deleted_at: new Date() }
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
    sumber_dana?: string;
  }, scope?: any, userId?: string) {
    if (scope && !scope.tenant_wide && data.location_id) {
       if (!scope.unit_ids || !scope.unit_ids.includes(data.location_id)) {
           throw new Error("Anda tidak memiliki akses ke lokasi sarpras ini");
       }
     }

    const asset = await prisma.sarprasAsset.create({
      data: {
        tenant_id: tenantId,
        ...data,
        kode: data.kode || generateAssetCode(),
        price_purchase: data.price_purchase ? new Prisma.Decimal(data.price_purchase) : undefined
      }
    });

    if (userId) {
      activityLogService.logEvent({
        event_type: 'SARPRAS_ASSET_CREATE',
        tenant_id: tenantId,
        user_id: userId,
        entity: 'SarprasAsset',
        entity_id: asset.id,
        metadata: { nama: asset.nama, kode: asset.kode }
      });
    }

    this.publishRealtimeDashboardUpdate(tenantId);
    return asset;
  }

  static async updateAsset(tenantId: string, id: string, data: Partial<Prisma.SarprasAssetUncheckedCreateInput>, scope?: any, userId?: string) {
    const existing = await prisma.sarprasAsset.findFirst({ where: { id, tenant_id: tenantId, deleted_at: null } });
    if (!existing) throw new Error("Aset tidak ditemukan");
    
    if (scope && !scope.tenant_wide) {
      if (existing.location_id && (!scope.unit_ids || !scope.unit_ids.includes(existing.location_id))) {
        throw new Error("Anda tidak memiliki akses ke aset ini");
      }
      if (data.location_id && (!scope.unit_ids || !scope.unit_ids.includes(data.location_id))) {
        throw new Error("Anda tidak memiliki akses ke lokasi tujuan sarpras ini");
      }
    }

    const asset = await prisma.sarprasAsset.update({
      where: { id, tenant_id: tenantId },
      data
    });

    if (userId) {
      activityLogService.logEvent({
        event_type: 'SARPRAS_ASSET_UPDATE',
        tenant_id: tenantId,
        user_id: userId,
        entity: 'SarprasAsset',
        entity_id: asset.id,
        metadata: { id, nama: asset.nama, changes: Object.keys(data) }
      });
    }

    this.publishRealtimeDashboardUpdate(tenantId);
    return asset;
  }

  static async deleteAsset(tenantId: string, id: string, scope?: any, userId?: string) {
    const existing = await prisma.sarprasAsset.findFirst({ where: { id, tenant_id: tenantId, deleted_at: null } });
    if (!existing) throw new Error("Aset tidak ditemukan");

    if (existing && scope && !scope.tenant_wide && existing.location_id) {
        if (!scope.unit_ids || !scope.unit_ids.includes(existing.location_id)) {
            throw new Error("Anda tidak memiliki akses ke aset ini");
        }
    }

    const asset = await prisma.sarprasAsset.update({
      where: { id, tenant_id: tenantId },
      data: { deleted_at: new Date() }
    });

    if (userId) {
      activityLogService.logEvent({
        event_type: 'SARPRAS_ASSET_DELETE',
        tenant_id: tenantId,
        user_id: userId,
        entity: 'SarprasAsset',
        entity_id: id,
        metadata: { nama: asset.nama, kode: asset.kode }
      });
    }

    this.publishRealtimeDashboardUpdate(tenantId);
    return asset;
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
      deleted_at: null
    };

    if (scope && !scope.tenant_wide) {
      if (scope.unit_ids && scope.unit_ids.length > 0) {
        // Enforce jurisdictional scope: get location IDs belonging to user units
        const allowedLocations = await prisma.sarprasLocation.findMany({
          where: { tenant_id: tenantId, unit_id: { in: scope.unit_ids }, deleted_at: null },
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
    const where: Prisma.SarprasAssetWhereInput = { id, tenant_id: tenantId, deleted_at: null };

    if (scope && !scope.tenant_wide) {
       const allowedLocations = await prisma.sarprasLocation.findMany({
         where: { tenant_id: tenantId, unit_id: { in: scope.unit_ids || [] }, deleted_at: null },
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

  static async upsertAssets(tenantId: string, assets: any[], userId?: string) {
    const results = {
      created: 0,
      updated: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const assetData of assets) {
      try {
        const { nama, kode, brand, serial_number, kondisi, jumlah, is_loanable, price_purchase, purchase_date, deskripsi, category_nama, location_nama, sumber_dana } = assetData;
        
        if (!nama) throw new Error("Nama aset wajib diisi");

        // Resolve Category & Location by Name
        let category_id = undefined;
        let location_id = undefined;

        if (category_nama) {
          const cat = await prisma.sarprasCategory.upsert({
            where: { tenant_id_nama: { tenant_id: tenantId, nama: category_nama } },
            update: { deleted_at: null },
            create: { tenant_id: tenantId, nama: category_nama }
          });
          category_id = cat.id;
        }

        if (location_nama) {
          const loc = await prisma.sarprasLocation.upsert({
            where: { tenant_id_nama: { tenant_id: tenantId, nama: location_nama } },
            update: { deleted_at: null },
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
          location_id,
          sumber_dana
        };

        if (kode) {
          // Find asset even if soft-deleted to restore or update
          const existing = await prisma.sarprasAsset.findFirst({
            where: { kode }
          });

          if (existing) {
            // Security Check: Ensure the asset belongs to the same tenant
            if (existing.tenant_id !== tenantId) {
              throw new Error(`Kode aset '${kode}' sudah digunakan oleh unit/sekolah lain`);
            }

            await prisma.sarprasAsset.update({
              where: { id: existing.id },
              data: { ...data, deleted_at: null }
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

    if (userId && (results.created > 0 || results.updated > 0)) {
      activityLogService.logEvent({
        event_type: 'SARPRAS_ASSET_IMPORT',
        tenant_id: tenantId,
        user_id: userId,
        entity: 'SarprasAsset',
        metadata: { created: results.created, updated: results.updated, failed: results.failed }
      });
    }

    return results;
  }

  static async getStats(tenantId: string, scope?: any) {
    const where: any = { tenant_id: tenantId, deleted_at: null };

    if (scope && !scope.tenant_wide) {
      const allowedLocations = await (prisma as any).sarprasLocation.findMany({
        where: { tenant_id: tenantId, unit_id: { in: scope.unit_ids || [] }, deleted_at: null },
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
          Loans: { some: { status: 'ACTIVE' } } 
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

  static async generateQrCodePdf(tenantId: string, assetIds: string[]) {
    const assets = await prisma.sarprasAsset.findMany({
      where: { id: { in: assetIds }, tenant_id: tenantId, deleted_at: null },
      include: { Location: true }
    });

    if (assets.length === 0) {
      throw new Error('Aset tidak ditemukan');
    }

    const cardsHtml = await Promise.all(assets.map(async (asset) => {
      const qrCodeText = asset.kode || asset.id;
      const base64QR = await QRCode.toDataURL(qrCodeText, { margin: 1, width: 200 });
      return `
        <div class="label-card">
          <div class="label-title">${asset.nama}</div>
          <div class="label-code">${asset.kode || '-'}</div>
          <img src="${base64QR}" width="120" height="120" />
          <div class="label-loc">${asset.Location?.nama || '-'}</div>
        </div>
      `;
    }));

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          @page {
            size: A4;
            margin: 15mm;
          }
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 0;
            background: #fff;
            color: #333;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
          }
          .label-card {
            border: 1px dashed #777;
            padding: 12px;
            text-align: center;
            border-radius: 6px;
            background: #fff;
            box-sizing: border-box;
            page-break-inside: avoid;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 180px;
          }
          .label-title {
            font-size: 11px;
            font-weight: bold;
            margin-bottom: 4px;
            text-overflow: ellipsis;
            white-space: nowrap;
            overflow: hidden;
            width: 100%;
          }
          .label-code {
            font-size: 9px;
            font-family: monospace;
            color: #555;
            margin-bottom: 6px;
          }
          .label-loc {
            font-size: 9px;
            color: #888;
            margin-top: 4px;
          }
        </style>
      </head>
      <body>
        <div class="grid">
          ${cardsHtml.join('')}
        </div>
      </body>
      </html>
    `;

    let browser: any;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'load' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true
      });
      return pdfBuffer;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  static async getAssetDepreciationReport(tenantId: string, scope?: any) {
    const where: any = {
      tenant_id: tenantId,
      deleted_at: null,
      purchase_date: { not: null },
      price_purchase: { not: null }
    };

    if (scope && !scope.tenant_wide) {
      const allowedLocations = await prisma.sarprasLocation.findMany({
        where: { tenant_id: tenantId, unit_id: { in: scope.unit_ids || [] }, deleted_at: null },
        select: { id: true }
      });
      const allowedIds = allowedLocations.map((l: any) => l.id);
      where.location_id = { in: allowedIds };
    }

    const assets = await prisma.sarprasAsset.findMany({
      where,
      include: { Category: true, Location: true }
    });

    const now = new Date();

    return assets.map(asset => {
      const purchasePrice = Number(asset.price_purchase || 0);
      const purchaseDate = asset.purchase_date!;
      
      let usefulLifeYears = 5; // default 5 tahun
      const categoryName = String(asset.Category?.nama || '').toLowerCase();
      if (categoryName.includes('komputer') || categoryName.includes('laptop') || categoryName.includes('elektronik') || categoryName.includes('gadget') || categoryName.includes('hp')) {
        usefulLifeYears = 4;
      } else if (categoryName.includes('kendaraan') || categoryName.includes('motor') || categoryName.includes('mobil')) {
        usefulLifeYears = 8;
      } else if (categoryName.includes('bangunan') || categoryName.includes('gedung') || categoryName.includes('ruang')) {
        usefulLifeYears = 20;
      } else if (categoryName.includes('mebel') || categoryName.includes('furniture') || categoryName.includes('meja') || categoryName.includes('kursi')) {
        usefulLifeYears = 8;
      }

      const salvageValue = purchasePrice * 0.10; // Residu 10%
      const depreciableAmount = purchasePrice - salvageValue;
      const annualDepreciation = depreciableAmount / usefulLifeYears;

      const ageInMs = now.getTime() - purchaseDate.getTime();
      const ageInYears = Math.max(0, ageInMs / (1000 * 60 * 60 * 24 * 365.25));

      let accumulatedDepreciation = annualDepreciation * ageInYears;
      if (accumulatedDepreciation > depreciableAmount) {
        accumulatedDepreciation = depreciableAmount;
      }

      const currentBookValue = Math.round(purchasePrice - accumulatedDepreciation);

      return {
        id: asset.id,
        nama: asset.nama,
        kode: asset.kode,
        category: asset.Category?.nama || 'Tanpa Kategori',
        location: asset.Location?.nama || 'Tanpa Lokasi',
        purchase_date: purchaseDate,
        purchase_price: purchasePrice,
        useful_life_years: usefulLifeYears,
        annual_depreciation: Math.round(annualDepreciation),
        accumulated_depreciation: Math.round(accumulatedDepreciation),
        current_book_value: currentBookValue,
        age_years: parseFloat(ageInYears.toFixed(2))
      };
    });
  }

  static async getConsumables(tenantId: string, scope?: any) {
    const where: any = {
      tenant_id: tenantId,
      is_loanable: false,
      deleted_at: null
    };

    if (scope && !scope.tenant_wide) {
      const allowedLocations = await prisma.sarprasLocation.findMany({
        where: { tenant_id: tenantId, unit_id: { in: scope.unit_ids || [] }, deleted_at: null },
        select: { id: true }
      });
      const allowedIds = allowedLocations.map((l: any) => l.id);
      where.location_id = { in: allowedIds };
    }

    const [assets, config] = await Promise.all([
      prisma.sarprasAsset.findMany({
        where,
        include: { Category: true, Location: true }
      }),
      prisma.config.findFirst({
        where: { tenant_id: tenantId, key: 'sarpras_min_stock_thresholds' }
      })
    ]);

    let thresholds: Record<string, number> = {};
    if (config?.value) {
      try {
        thresholds = JSON.parse(config.value);
      } catch {}
    }

    return assets.map(asset => {
      const minStock = thresholds[asset.id] !== undefined ? thresholds[asset.id] : 5; // default threshold 5
      return {
        id: asset.id,
        nama: asset.nama,
        kode: asset.kode,
        brand: asset.brand,
        kondisi: asset.kondisi,
        jumlah: asset.jumlah,
        category: asset.Category?.nama || 'Tanpa Kategori',
        location: asset.Location?.nama || 'Tanpa Lokasi',
        min_stock: minStock,
        is_low_stock: asset.jumlah <= minStock
      };
    });
  }

  static async updateConsumableThreshold(tenantId: string, assetId: string, minStock: number) {
    const asset = await prisma.sarprasAsset.findFirst({
      where: { id: assetId, tenant_id: tenantId, is_loanable: false }
    });
    if (!asset) {
      throw new Error('Barang habis pakai tidak ditemukan atau tipe aset tidak valid');
    }

    const config = await prisma.config.findFirst({
      where: { tenant_id: tenantId, key: 'sarpras_min_stock_thresholds' }
    });

    let thresholds: Record<string, number> = {};
    if (config?.value) {
      try {
        thresholds = JSON.parse(config.value);
      } catch {}
    }

    thresholds[assetId] = minStock;
    const serialized = JSON.stringify(thresholds);

    if (config) {
      await prisma.config.update({
        where: { id: config.id },
        data: { value: serialized }
      });
    } else {
      await prisma.config.create({
        data: {
          tenant_id: tenantId,
          key: 'sarpras_min_stock_thresholds',
          value: serialized,
          description: 'Ambang batas stok minimum barang habis pakai'
        }
      });
    }

    return { asset_id: assetId, min_stock: minStock };
  }

  static async consumeAsset(tenantId: string, assetId: string, qty: number, userId?: string) {
    const asset = await prisma.sarprasAsset.findFirst({
      where: { id: assetId, tenant_id: tenantId, is_loanable: false }
    });
    if (!asset) {
      throw new Error('Barang habis pakai tidak ditemukan atau tipe aset tidak valid');
    }

    if (asset.jumlah < qty) {
      throw new Error(`Stok tidak mencukupi. Stok saat ini: ${asset.jumlah}, diminta: ${qty}`);
    }

    const updated = await prisma.sarprasAsset.update({
      where: { id: assetId },
      data: { jumlah: asset.jumlah - qty }
    });

    if (userId) {
      activityLogService.logEvent({
        event_type: 'SARPRAS_ASSET_CONSUME',
        tenant_id: tenantId,
        user_id: userId,
        entity: 'SarprasAsset',
        entity_id: asset.id,
        metadata: { nama: asset.nama, qty_consumed: qty, remaining_stock: updated.jumlah }
      });
    }

    return updated;
  }

  static async getRealtimeRepairStats(tenantId: string, scope?: any) {
    const whereLoc: any = { tenant_id: tenantId, deleted_at: null };
    if (scope && !scope.tenant_wide) {
      whereLoc.unit_id = { in: scope.unit_ids || [] };
    }

    const locations = await prisma.sarprasLocation.findMany({
      where: whereLoc,
      include: {
        Assets: {
          where: { deleted_at: null },
          include: {
            Repairs: {
              where: { status: 'PROSES' }
            }
          }
        }
      }
    });

    return locations.map(loc => {
      const totalAssets = loc.Assets.length;
      const goodAssets = loc.Assets.filter(a => a.kondisi === 'BAIK').length;
      const repairAssets = loc.Assets.filter(a => a.kondisi === 'PERBAIKAN' || a.Repairs.length > 0).length;
      const brokenAssets = loc.Assets.filter(a => a.kondisi === 'RUSAK').length;
      const lostAssets = loc.Assets.filter(a => a.kondisi === 'HILANG').length;

      return {
        location_id: loc.id,
        nama_lokasi: loc.nama,
        total_assets: totalAssets,
        assets_baik: goodAssets,
        assets_perbaikan: repairAssets,
        assets_rusak: brokenAssets,
        assets_hilang: lostAssets
      };
    });
  }

  static async publishRealtimeDashboardUpdate(tenantId: string) {
    try {
      const { getRedisConnection } = await import('@/queue/redis');
      const redis = getRedisConnection();
      const stats = await this.getRealtimeRepairStats(tenantId);
      
      const payload = {
        tenant_id: tenantId,
        event_type: 'REPAIR_STATS_UPDATE',
        timestamp: Date.now(),
        data: stats
      };
      
      await redis.publish('events:sarpras_dashboard_update', JSON.stringify(payload));
    } catch (err: any) {
      console.error('[WS SARPRAS LOG] Failed to publish real-time update:', err.message);
    }
  }

  static async scanAssetByCode(tenantId: string, code: string, scope?: any) {
    // Search by ID or Custom Code
    const asset = await prisma.sarprasAsset.findFirst({
      where: {
        tenant_id: tenantId,
        deleted_at: null,
        OR: [
          { id: { equals: code } },
          { kode: { equals: code } }
        ]
      },
      include: { Category: true, Location: true }
    });

    if (!asset) {
      throw new Error('Aset tidak ditemukan');
    }

    if (scope && !scope.tenant_wide && asset.Location?.unit_id) {
      if (!scope.unit_ids || !scope.unit_ids.includes(asset.Location.unit_id)) {
        throw new Error('Anda tidak memiliki akses ke aset di lokasi ini');
      }
    }

    return asset;
  }

  static async runStockOpname(tenantId: string, data: {
    asset_id: string;
    location_id: string;
    kondisi: string;
    catatan?: string;
  }, scope?: any, userId?: string) {
    const asset = await prisma.sarprasAsset.findFirst({
      where: { id: data.asset_id, tenant_id: tenantId, deleted_at: null },
      include: { Location: true }
    });

    if (!asset) {
      throw new Error('Aset tidak ditemukan');
    }

    // Verify location access
    const location = await prisma.sarprasLocation.findFirst({
      where: { id: data.location_id, tenant_id: tenantId, deleted_at: null }
    });
    if (!location) {
      throw new Error('Lokasi baru tidak ditemukan');
    }

    if (scope && !scope.tenant_wide) {
      if (asset.Location?.unit_id && (!scope.unit_ids || !scope.unit_ids.includes(asset.Location.unit_id))) {
        throw new Error('Anda tidak memiliki akses ke aset di lokasi asal ini');
      }
      if (location.unit_id && (!scope.unit_ids || !scope.unit_ids.includes(location.unit_id))) {
        throw new Error('Anda tidak memiliki akses ke lokasi tujuan ini');
      }
    }

    const updatedAsset = await prisma.sarprasAsset.update({
      where: { id: data.asset_id },
      data: {
        location_id: data.location_id,
        kondisi: data.kondisi
      },
      include: { Location: true }
    });

    if (userId) {
      activityLogService.logEvent({
        event_type: 'SARPRAS_STOCK_OPNAME',
        tenant_id: tenantId,
        user_id: userId,
        entity: 'SarprasAsset',
        entity_id: asset.id,
        metadata: {
          nama: asset.nama,
          old_location: asset.Location?.nama || 'Tanpa Lokasi',
          new_location: updatedAsset.Location?.nama || 'Tanpa Lokasi',
          old_kondisi: asset.kondisi,
          new_kondisi: updatedAsset.kondisi,
          catatan: data.catatan || ''
        }
      });
    }

    // Trigger realtime stats broadcast
    this.publishRealtimeDashboardUpdate(tenantId);

    return updatedAsset;
  }

  static async getCatalog(search?: string) {
    const where: any = {};
    if (search) {
      where.OR = [
        { nama: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { category_name: { contains: search, mode: 'insensitive' } }
      ];
    }
    return prisma.sarprasGlobalCatalog.findMany({
      where,
      orderBy: { nama: 'asc' },
      take: 200 // Let's increase limit so we can list more in CRUD
    });
  }

  static async createCatalogItem(data: any) {
    return prisma.sarprasGlobalCatalog.create({
      data: {
        nama: data.nama,
        brand: data.brand || null,
        category_name: data.category_name,
        is_loanable: data.is_loanable ?? true,
        deskripsi: data.deskripsi || null,
        image_url: data.image_url || null
      }
    });
  }

  static async updateCatalogItem(id: string, data: any) {
    return prisma.sarprasGlobalCatalog.update({
      where: { id },
      data: {
        nama: data.nama,
        brand: data.brand !== undefined ? data.brand : undefined,
        category_name: data.category_name,
        is_loanable: data.is_loanable,
        deskripsi: data.deskripsi,
        image_url: data.image_url
      }
    });
  }

  static async deleteCatalogItem(id: string) {
    return prisma.sarprasGlobalCatalog.delete({
      where: { id }
    });
  }
}
