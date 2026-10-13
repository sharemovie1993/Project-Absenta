// @ts-nocheck
import { prisma } from '../../../utils/prisma';
import { appLogger } from '@/utils/app-logger';
import { AccountingService } from '../laporan/accounting.service';

export interface CreateExpenseInput {
  date: string | Date;
  amount: number;
  categoryCode: string;
  categoryName?: string;
  paymentMethod?: 'CASH' | 'BANK_TRANSFER';
  payee?: string;
  description: string;
  receiptImageUrl?: string;
}

export const STANDARD_EXPENSE_CATEGORIES = [
  { code: '5021', name: 'Beban Listrik, Air & Utilitas', description: 'Tagihan PLN, token listrik, PDAM toko/kantor' },
  { code: '5022', name: 'Beban Komunikasi & Internet', description: 'Wi-Fi, kuota internet, telepon operasional' },
  { code: '5023', name: 'Beban Aplikasi, Perangkat Lunak & TI', description: 'Langganan software POS, server SaaS, domain, lisensi' },
  { code: '5024', name: 'Beban ATK & Perlengkapan Kantor', description: 'Kertas struk kasir, alat tulis kantor, form kuitansi' },
  { code: '5025', name: 'Beban Pemeliharaan & Servis Sarana', description: 'Servis AC, rak toko, etalase, kendaraan inventaris' },
  { code: '5026', name: 'Beban Rapat & Operasional Pengurus', description: 'Konsumsi rapat rutin, akomodasi, RAT koperasi' },
  { code: '5090', name: 'Beban Operasional Lain-lain', description: 'Pengeluaran operasional umum lainnya' },
];

export class ExpenseService {
  /**
   * Menghasilkan nomor bukti kas keluar: BKK-YYYYMM-XXXX
   */
  static async generateVoucherNumber(tenantId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `BKK-${year}${month}`;

    const count = await prisma.coopExpense.count({
      where: {
        tenantId,
        voucherNumber: { startsWith: prefix }
      }
    });

    const seq = String(count + 1).padStart(4, '0');
    return `${prefix}-${seq}`;
  }

  /**
   * Mengambil daftar kategori beban standar
   */
  static getExpenseCategories() {
    return STANDARD_EXPENSE_CATEGORIES;
  }

  /**
   * Mengambil daftar bukti pengeluaran operasional (BKK) dengan filter dan ringkasan
   */
  static async listExpenses(tenantId: string, query: {
    page?: number;
    limit?: number;
    categoryCode?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }) {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.max(1, Math.min(100, Number(query.limit || 10)));
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (query.categoryCode && query.categoryCode !== 'ALL') {
      where.categoryCode = query.categoryCode;
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
        { payee: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { categoryName: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [total, items, allExpensesForSummary] = await Promise.all([
      prisma.coopExpense.count({ where }),
      prisma.coopExpense.findMany({
        where,
        orderBy: { date: 'desc' },
        skip,
        take: limit
      }),
      prisma.coopExpense.findMany({
        where: { tenantId },
        select: { amount: true, categoryCode: true }
      })
    ]);

    const totalExpenseAmount = allExpensesForSummary.reduce(
      (sum, e) => sum + Number(e.amount || 0), 
      0
    );

    return {
      summary: {
        totalExpenseAmount,
        totalTransactions: allExpensesForSummary.length,
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

  /**
   * Catat pengeluaran kas operasional baru dan posting otomatis ke Jurnal Akuntansi
   */
  static async createExpense(tenantId: string, data: CreateExpenseInput, userId?: string) {
    const voucherNumber = await this.generateVoucherNumber(tenantId);
    const date = data.date ? new Date(data.date) : new Date();
    const amount = Math.round(Number(data.amount || 0));

    if (amount <= 0) {
      throw new Error('Nominal pengeluaran operasional harus lebih besar dari 0');
    }

    // Resolusi nama kategori beban
    const categoryInfo = STANDARD_EXPENSE_CATEGORIES.find(c => c.code === data.categoryCode);
    const categoryName = data.categoryName || categoryInfo?.name || `Beban ${data.categoryCode}`;
    const paymentMethod = data.paymentMethod || 'CASH';

    // Akun Debit: Beban (502x), Akun Kredit: Kas Tunai (1010) atau Kas Bank (1011)
    const debitAccountCode = data.categoryCode;
    const creditAccountCode = paymentMethod === 'BANK_TRANSFER' ? '1011' : '1010';
    const creditAccountName = paymentMethod === 'BANK_TRANSFER' ? 'Kas Bank Koperasi' : 'Kas Koperasi';

    // Inisialisasi akun sebelum prisma.$transaction
    await AccountingService.getOrCreateDefaultAccounts(tenantId);
    await AccountingService.resolveAccountId(tenantId, debitAccountCode, categoryName);
    await AccountingService.resolveAccountId(tenantId, creditAccountCode, creditAccountName);

    const created = await prisma.$transaction(async (tx) => {
      // 1. Simpan Master Bukti Kas Keluar
      const expense = await tx.coopExpense.create({
        data: {
          tenantId,
          voucherNumber,
          date,
          amount,
          categoryCode: debitAccountCode,
          categoryName,
          paymentMethod,
          payee: data.payee || null,
          description: data.description,
          receiptImageUrl: data.receiptImageUrl || null,
          createdBy: userId || null,
        }
      });

      // 2. Double-Entry Journaling: Debit Beban, Kredit Kas/Bank
      const journalDescription = `[BKK] ${categoryName} - ${data.description}${data.payee ? ` (Penerima: ${data.payee})` : ''}`;
      const journal = await AccountingService.createJournalEntry(
        tx,
        tenantId,
        date,
        journalDescription,
        voucherNumber,
        [
          { accountCode: debitAccountCode, amount, type: 'DEBIT' },
          { accountCode: creditAccountCode, amount, type: 'CREDIT' },
        ]
      );

      // Hubungkan ID jurnal ke bukti kas keluar
      if (journal?.id) {
        await tx.coopExpense.update({
          where: { id: expense.id },
          data: { journalId: journal.id }
        });
      }

      return expense;
    });

    appLogger.info({
      tenantId,
      voucherNumber,
      amount,
      categoryCode: debitAccountCode
    }, '[ExpenseService] Berhasil mencatat pengeluaran operasional & posting jurnal');

    return created;
  }

  /**
   * Hapus bukti pengeluaran dan bersihkan jurnal terkait di Buku Besar
   */
  static async deleteExpense(tenantId: string, id: string) {
    const expense = await prisma.coopExpense.findFirst({
      where: { id, tenantId }
    });

    if (!expense) {
      throw new Error('Data bukti kas keluar tidak ditemukan');
    }

    await prisma.$transaction(async (tx) => {
      // 1. Hapus entri jurnal terkait jika ada
      if (expense.voucherNumber) {
        await tx.journal.deleteMany({
          where: {
            tenantId,
            reference: expense.voucherNumber
          }
        });
      }

      // 2. Hapus record pengeluaran
      await tx.coopExpense.delete({
        where: { id }
      });
    });

    appLogger.info({
      tenantId,
      voucherNumber: expense.voucherNumber
    }, '[ExpenseService] Berhasil menghapus pengeluaran dan entri jurnal');

    return { success: true };
  }
}
