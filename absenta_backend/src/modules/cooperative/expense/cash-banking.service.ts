// @ts-nocheck
import { prisma } from '../../../utils/prisma';
import { appLogger } from '@/utils/app-logger';
import { AccountingService } from '../laporan/accounting.service';

export interface CreateDepositInput {
  date: string | Date;
  amount: number;
  accountCode: string;
  accountName?: string;
  receivedVia?: 'CASH' | 'BANK_TRANSFER';
  payer?: string;
  description: string;
  receiptImageUrl?: string;
}

export interface CreateTransferInput {
  date: string | Date;
  amount: number;
  fromAccountCode: string;
  toAccountCode: string;
  description: string;
}

export const STANDARD_DEPOSIT_CATEGORIES = [
  { code: '4030', name: 'Pendapatan Sewa & Kerjasama', description: 'Sewa etalase, sewa kantin/lahan koperasi, bagi hasil mitra' },
  { code: '4040', name: 'Pendapatan Jasa Giro & Bunga Bank', description: 'Jasa giro rekening bank koperasi, bunga tabungan' },
  { code: '4090', name: 'Pendapatan Operasional Lain-lain', description: 'Penjualan kardus/kemasan bekas, penerimaan non-usaha toko' },
  { code: '3020', name: 'Dana Hibah & Sumbangan Modal', description: 'Penerimaan hibah pemerintah/sekolah, donasi modal cadangan' },
];

export class CashBankingService {
  /**
   * Menghasilkan nomor bukti kas masuk: BKM-YYYYMM-XXXX
   */
  static async generateDepositVoucherNumber(tenantId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `BKM-${year}${month}`;

    const count = await prisma.coopCashDeposit.count({
      where: {
        tenantId,
        voucherNumber: { startsWith: prefix }
      }
    });

    const seq = String(count + 1).padStart(4, '0');
    return `${prefix}-${seq}`;
  }

  /**
   * Menghasilkan nomor bukti transfer kas: TRF-YYYYMM-XXXX
   */
  static async generateTransferVoucherNumber(tenantId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `TRF-${year}${month}`;

    const count = await prisma.coopFundTransfer.count({
      where: {
        tenantId,
        voucherNumber: { startsWith: prefix }
      }
    });

    const seq = String(count + 1).padStart(4, '0');
    return `${prefix}-${seq}`;
  }

  static getDepositCategories() {
    return STANDARD_DEPOSIT_CATEGORIES;
  }

  // ─── BUKTI KAS MASUK (BKM) ────────────────────────────────────────────────

  static async listDeposits(tenantId: string, query: {
    page?: number;
    limit?: number;
    accountCode?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }) {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.max(1, Math.min(100, Number(query.limit || 10)));
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (query.accountCode && query.accountCode !== 'ALL') {
      where.accountCode = query.accountCode;
    }

    if (query.startDate && query.endDate) {
      where.date = {
        gte: new Date(`${query.startDate}T00:00:00.000Z`),
        lte: new Date(`${query.endDate}T23:59:59.999Z`)
      };
    } else if (query.startDate) {
      where.date = { gte: new Date(`${query.startDate}T00:00:00.000Z`) };
    } else if (query.endDate) {
      where.date = { lte: new Date(`${query.endDate}T23:59:59.999Z`) };
    }

    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      where.OR = [
        { voucherNumber: { contains: term, mode: 'insensitive' } },
        { payer: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { accountName: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [total, items, summaryAgg] = await Promise.all([
      prisma.coopCashDeposit.count({ where }),
      prisma.coopCashDeposit.findMany({
        where,
        orderBy: { date: 'desc' },
        skip,
        take: limit
      }),
      prisma.coopCashDeposit.aggregate({
        where: { tenantId },
        _sum: { amount: true },
        _count: { id: true }
      })
    ]);

    const totalDepositAmount = Number(summaryAgg._sum.amount || 0);
    const totalTransactions = summaryAgg._count.id || 0;

    return {
      summary: {
        totalDepositAmount,
        totalTransactions,
      },
      items: items.map(item => ({
        ...item,
        amount: Number(item.amount || 0)
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit))
      }
    };
  }

  static async createDeposit(tenantId: string, data: CreateDepositInput, userId?: string) {
    const voucherNumber = await this.generateDepositVoucherNumber(tenantId);
    const date = data.date ? new Date(data.date) : new Date();
    const amount = Math.round(Number(data.amount || 0));

    if (amount <= 0) {
      throw new Error('Nominal penerimaan kas harus lebih besar dari 0');
    }

    const categoryInfo = STANDARD_DEPOSIT_CATEGORIES.find(c => c.code === data.accountCode);
    const accountName = data.accountName || categoryInfo?.name || `Pendapatan ${data.accountCode}`;
    const receivedVia = data.receivedVia || 'CASH';

    // Debit: Kas Tunai (1010) atau Bank (1011)
    const debitAccountCode = receivedVia === 'BANK_TRANSFER' ? '1011' : '1010';
    const debitAccountName = receivedVia === 'BANK_TRANSFER' ? 'Kas Bank Koperasi' : 'Kas Koperasi';
    // Kredit: Akun Pendapatan (4030, 4040, 4090, atau 3020)
    const creditAccountCode = data.accountCode;

    // Pre-warm accounts sebelum prisma.$transaction
    await AccountingService.getOrCreateDefaultAccounts(tenantId);
    await AccountingService.resolveAccountId(tenantId, debitAccountCode, debitAccountName);
    await AccountingService.resolveAccountId(tenantId, creditAccountCode, accountName);

    const created = await prisma.$transaction(async (tx) => {
      const deposit = await tx.coopCashDeposit.create({
        data: {
          tenantId,
          voucherNumber,
          date,
          amount,
          accountCode: creditAccountCode,
          accountName,
          receivedVia,
          payer: data.payer || null,
          description: data.description,
          receiptImageUrl: data.receiptImageUrl || null,
          createdBy: userId || null,
        }
      });

      // Double-Entry: Debit Kas/Bank, Kredit Pendapatan
      const journalDescription = `[BKM] ${accountName} - ${data.description}${data.payer ? ` (Dari: ${data.payer})` : ''}`;
      const journal = await AccountingService.createJournalEntry(
        tenantId,
        journalDescription,
        voucherNumber,
        [
          { accountCode: debitAccountCode, amount, type: 'DEBIT' },
          { accountCode: creditAccountCode, amount, type: 'CREDIT' },
        ],
        tx,
        date
      );

      if (journal?.id) {
        await tx.coopCashDeposit.update({
          where: { id: deposit.id },
          data: { journalId: journal.id }
        });
      }

      return deposit;
    });

    appLogger.info({ tenantId, voucherNumber, amount }, '[CashBankingService] Berhasil mencatat BKM & posting jurnal');
    return created;
  }

  static async deleteDeposit(tenantId: string, id: string) {
    const deposit = await prisma.coopCashDeposit.findFirst({
      where: { id, tenantId }
    });

    if (!deposit) {
      throw new Error('Data bukti kas masuk tidak ditemukan');
    }

    await prisma.$transaction(async (tx) => {
      if (deposit.voucherNumber) {
        await tx.journal.deleteMany({
          where: { tenantId, reference: deposit.voucherNumber }
        });
      }
      await tx.coopCashDeposit.delete({ where: { id } });
    });

    return { success: true };
  }

  // ─── TRANSFER KAS & BANK ──────────────────────────────────────────────────

  static async listTransfers(tenantId: string, query: { page?: number; limit?: number; search?: string }) {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.max(1, Math.min(100, Number(query.limit || 10)));
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      where.OR = [
        { voucherNumber: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [total, items, summaryAgg] = await Promise.all([
      prisma.coopFundTransfer.count({ where }),
      prisma.coopFundTransfer.findMany({
        where,
        orderBy: { date: 'desc' },
        skip,
        take: limit
      }),
      prisma.coopFundTransfer.aggregate({
        where: { tenantId },
        _sum: { amount: true },
        _count: { id: true }
      })
    ]);

    const totalTransferAmount = Number(summaryAgg._sum.amount || 0);
    const totalTransactions = summaryAgg._count.id || 0;

    return {
      summary: {
        totalTransferAmount,
        totalTransactions,
      },
      items: items.map(item => ({
        ...item,
        amount: Number(item.amount || 0)
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit))
      }
    };
  }

  static async createTransfer(tenantId: string, data: CreateTransferInput, userId?: string) {
    if (data.fromAccountCode === data.toAccountCode) {
      throw new Error('Akun sumber kas dan akun tujuan kas tidak boleh sama');
    }

    const amount = Math.round(Number(data.amount || 0));
    if (amount <= 0) {
      throw new Error('Nominal transfer kas harus lebih besar dari 0');
    }

    const voucherNumber = await this.generateTransferVoucherNumber(tenantId);
    const date = data.date ? new Date(data.date) : new Date();

    const [fromAcc, toAcc] = await Promise.all([
      prisma.account.findFirst({ where: { tenantId, code: data.fromAccountCode } }),
      prisma.account.findFirst({ where: { tenantId, code: data.toAccountCode } })
    ]);

    const fromName = fromAcc?.name || (data.fromAccountCode === '1010' ? 'Kas Koperasi (Tunai)' : 'Kas Bank Koperasi');
    const toName = toAcc?.name || (data.toAccountCode === '1010' ? 'Kas Koperasi (Tunai)' : 'Kas Bank Koperasi');

    // Pre-warm accounts
    await AccountingService.getOrCreateDefaultAccounts(tenantId);
    await AccountingService.resolveAccountId(tenantId, data.fromAccountCode, fromName);
    await AccountingService.resolveAccountId(tenantId, data.toAccountCode, toName);

    const created = await prisma.$transaction(async (tx) => {
      const transfer = await tx.coopFundTransfer.create({
        data: {
          tenantId,
          voucherNumber,
          date,
          amount,
          fromAccountCode: data.fromAccountCode,
          toAccountCode: data.toAccountCode,
          description: data.description,
          createdBy: userId || null,
        }
      });

      // Double-Entry Transfer: Debit Kas Tujuan, Kredit Kas Sumber
      const journalDescription = `[TRF] Transfer Dana: ${fromName} -> ${toName} (${data.description})`;
      const journal = await AccountingService.createJournalEntry(
        tenantId,
        journalDescription,
        voucherNumber,
        [
          { accountCode: data.toAccountCode, amount, type: 'DEBIT' },
          { accountCode: data.fromAccountCode, amount, type: 'CREDIT' },
        ],
        tx,
        date
      );

      if (journal?.id) {
        await tx.coopFundTransfer.update({
          where: { id: transfer.id },
          data: { journalId: journal.id }
        });
      }

      return transfer;
    });

    appLogger.info({ tenantId, voucherNumber, amount }, '[CashBankingService] Berhasil transfer kas & posting jurnal');
    return created;
  }

  static async deleteTransfer(tenantId: string, id: string) {
    const transfer = await prisma.coopFundTransfer.findFirst({
      where: { id, tenantId }
    });

    if (!transfer) {
      throw new Error('Data bukti transfer kas tidak ditemukan');
    }

    await prisma.$transaction(async (tx) => {
      if (transfer.voucherNumber) {
        await tx.journal.deleteMany({
          where: { tenantId, reference: transfer.voucherNumber }
        });
      }
      await tx.coopFundTransfer.delete({ where: { id } });
    });

    return { success: true };
  }
}
