// @ts-nocheck
import { prisma } from '../../../utils/prisma';
import { appLogger } from '@/utils/app-logger';
import { AccountingService } from '../laporan/accounting.service';

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
  fundingSource?: 'CASH' | 'RESERVE_CAPITAL';
  postToLedger?: boolean;
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
  /**
   * Daftarkan aset baru dan posting ke Jurnal Akuntansi (Aktiva Tetap)
   */
  static async createAsset(tenantId: string, data: CreateAssetInput) {
    const code = await this.generateAssetCode(tenantId);
    const purchaseDate = data.purchaseDate ? new Date(data.purchaseDate) : new Date();
    const purchasePrice = Math.round(Number(data.purchasePrice || 0));
    const shouldPostJournal = data.postToLedger !== false && purchasePrice > 0;
    const creditAccountCode = data.fundingSource === 'CASH' ? '1010' : '3020'; // 1010 = Kas Koperasi, 3020 = Dana Cadangan / Modal Ekuitas

    // Pre-warm accounts sebelum prisma.$transaction
    if (shouldPostJournal) {
      await AccountingService.getOrCreateDefaultAccounts(tenantId);
      await AccountingService.resolveAccountId(tenantId, '1510', 'Aktiva Tetap & Peralatan Koperasi');
      await AccountingService.resolveAccountId(
        tenantId, 
        creditAccountCode, 
        creditAccountCode === '1010' ? 'Kas Koperasi' : 'Dana Cadangan Koperasi'
      );
    }

    const created = await prisma.$transaction(async (tx) => {
      const asset = await tx.coopAsset.create({
        data: {
          tenantId,
          code,
          name: data.name,
          category: (data.category as any) || 'EQUIPMENT',
          location: data.location,
          purchaseDate,
          purchasePrice,
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

      if (shouldPostJournal) {
        await AccountingService.createJournalEntry(
          tenantId,
          `Pengadaan Aset Koperasi: ${data.name} (${code})`,
          `AST-${code}`,
          [
            { accountCode: '1510', type: 'DEBIT', amount: purchasePrice },
            { accountCode: creditAccountCode, type: 'CREDIT', amount: purchasePrice },
          ],
          tx,
          purchaseDate
        );
      }

      return asset;
    });

    appLogger.info({ tenantId, assetId: created.id, code }, '[AssetService] Berhasil mendaftarkan aset koperasi dan memposting ke jurnal akuntansi');
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
   * Hapus aset dan bersihkan entri jurnal terkait
   */
  static async deleteAsset(tenantId: string, id: string) {
    const existing = await prisma.coopAsset.findFirst({
      where: { id, tenantId }
    });
    if (!existing) {
      throw new Error('Aset tidak ditemukan');
    }

    await prisma.$transaction(async (tx) => {
      // Bersihkan jurnal terkait pengadaan aset ini jika ada
      const ref = `AST-${existing.code}`;
      const journal = await tx.journal.findFirst({
        where: { reference: ref, tenantId }
      });
      if (journal) {
        await tx.journalItem.deleteMany({ where: { journalId: journal.id } });
        await tx.journal.delete({ where: { id: journal.id } });
      }

      await tx.coopAsset.delete({
        where: { id }
      });
    });

    return true;
  }

  /**
   * Sinkronisasi Aset Eksisting ke Jurnal Neraca (Idempotent)
   */
  static async syncExistingAssetsToJournal(tenantId: string) {
    await AccountingService.getOrCreateDefaultAccounts(tenantId);
    await AccountingService.resolveAccountId(tenantId, '1510', 'Aktiva Tetap & Peralatan Koperasi');
    await AccountingService.resolveAccountId(tenantId, '3020', 'Dana Cadangan Koperasi');

    const assets = await prisma.coopAsset.findMany({
      where: { tenantId }
    });

    let syncedCount = 0;
    let totalSyncedValue = 0;

    for (const asset of assets) {
      const price = Math.round(Number(asset.purchasePrice || 0));
      if (price <= 0) continue;

      const ref = `AST-${asset.code}`;
      const existingJournal = await prisma.journal.findFirst({
        where: { reference: ref, tenantId }
      });

      if (!existingJournal) {
        await prisma.$transaction(async (tx) => {
          await AccountingService.createJournalEntry(
            tenantId,
            `Sinkronisasi Neraca: Aset Koperasi ${asset.name} (${asset.code})`,
            ref,
            [
              { accountCode: '1510', type: 'DEBIT', amount: price },
              { accountCode: '3020', type: 'CREDIT', amount: price },
            ],
            tx,
            asset.purchaseDate || new Date()
          );
        });
        syncedCount++;
        totalSyncedValue += price;
      }
    }

    appLogger.info({ tenantId, syncedCount, totalSyncedValue }, '[AssetService] Selesai sinkronisasi aset ke neraca');
    return { syncedCount, totalSyncedValue };
  }

  /**
   * Menghitung dan membukukan penyusutan bulanan seluruh aset aktif (Straight-Line Method)
   */
  static async runMonthlyDepreciation(tenantId: string, year: number, month: number) {
    const y = Number(year);
    const m = Number(month);
    const periodStr = `${y}-${String(m).padStart(2, '0')}`;
    const voucherNumber = `AJP-DEP-${periodStr.replace('-', '')}`;

    await AccountingService.getOrCreateDefaultAccounts(tenantId);
    await AccountingService.resolveAccountId(tenantId, '5030', 'Beban Penyusutan Aktiva Tetap');
    await AccountingService.resolveAccountId(tenantId, '1520', 'Akumulasi Penyusutan Aktiva Tetap');

    // Cek idempotensi
    const existingJournal = await prisma.journal.findFirst({
      where: { tenantId, reference: voucherNumber }
    });

    if (existingJournal) {
      throw new Error(`Penyusutan aset periode ${periodStr} sudah pernah diposting (${voucherNumber}).`);
    }

    const assets = await prisma.coopAsset.findMany({
      where: {
        tenantId,
        status: 'IN_USE',
        purchasePrice: { gt: 0 }
      }
    });

    if (assets.length === 0) {
      return {
        period: periodStr,
        voucherNumber,
        assetCount: 0,
        totalDepreciation: 0,
        message: 'Tidak ada aset aktif yang memerlukan penyusutan'
      };
    }

    let totalMonthlyDepreciation = 0;
    const details = [];

    for (const asset of assets) {
      const price = Number(asset.purchasePrice || 0);
      const salvage = Number(asset.salvageValue || 0);
      const usefulMonths = Number(asset.usefulLifeMonths || 48);

      if (price <= salvage || usefulMonths <= 0) continue;

      const monthlyDepr = Math.round((price - salvage) / usefulMonths);
      if (monthlyDepr > 0) {
        totalMonthlyDepreciation += monthlyDepr;
        details.push({
          code: asset.code,
          name: asset.name,
          monthlyDepreciation: monthlyDepr
        });
      }
    }

    if (totalMonthlyDepreciation <= 0) {
      return {
        period: periodStr,
        voucherNumber,
        assetCount: 0,
        totalDepreciation: 0,
        message: 'Nilai penyusutan aset periode ini adalah Rp 0'
      };
    }

    const date = new Date(y, m - 1, 28);
    const journalDescription = `[AJP] Penyusutan Aktiva Tetap Koperasi Periode ${periodStr} (${details.length} aset)`;

    const journal = await prisma.$transaction(async (tx) => {
      return AccountingService.createJournalEntry(
        tenantId,
        journalDescription,
        voucherNumber,
        [
          { accountCode: '5030', amount: totalMonthlyDepreciation, type: 'DEBIT' },
          { accountCode: '1520', amount: totalMonthlyDepreciation, type: 'CREDIT' },
        ],
        tx,
        date
      );
    });

    appLogger.info({ tenantId, periodStr, totalMonthlyDepreciation, assetCount: details.length }, '[AssetService] Berhasil membukukan depresiasi bulanan');

    return {
      period: periodStr,
      voucherNumber,
      assetCount: details.length,
      totalDepreciation: totalMonthlyDepreciation,
      journalId: journal?.id,
      details
    };
  }

  /**
   * Cek status apakah penyusutan aset untuk periode tertentu sudah dibukukan
   */
  static async getDepreciationStatus(tenantId: string, year?: number, month?: number) {
    const now = new Date();
    const y = year ? Number(year) : now.getFullYear();
    const m = month ? Number(month) : now.getMonth() + 1;
    const periodStr = `${y}-${String(m).padStart(2, '0')}`;
    const voucherNumber = `AJP-DEP-${periodStr.replace('-', '')}`;

    const journal = await prisma.journal.findFirst({
      where: { tenantId, reference: voucherNumber },
      include: { items: true }
    });

    const isDepreciated = !!journal;
    const totalDepreciation = journal
      ? journal.items
          .filter(i => i.type === 'DEBIT')
          .reduce((acc, curr) => acc + Number(curr.amount || 0), 0)
      : 0;

    return {
      year: y,
      month: m,
      period: periodStr,
      isDepreciated,
      voucherNumber,
      postedAt: journal?.date || null,
      totalDepreciation
    };
  }
}

