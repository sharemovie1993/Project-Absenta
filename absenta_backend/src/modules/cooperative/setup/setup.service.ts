// @ts-nocheck
import { prisma } from '../../../utils/prisma';
import { appLogger } from '@/utils/app-logger';
import { AccountService } from '../laporan/account.service';
import { AccountingService } from '../laporan/accounting.service';
import { JournalType } from '@prisma/client';

export interface ResetSimulationOptions {
  purgeTransactions?: boolean;
  purgeOpeningBalances?: boolean;
  purgeMembers?: boolean;
  purgeProducts?: boolean;
  resetSetupStatus?: boolean;
}

export interface SetupStatusResponse {
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  mode?: 'NEW' | 'ANNUAL_TRANSITION' | 'MID_YEAR_CUTOFF' | null;
  cutoffDate?: string | null;
  completedAt?: string | null;
  checklist: {
    profileConfigured: boolean;
    coaInitialized: boolean;
    openingBalancePosted: boolean;
    membersImported: boolean;
    storeProductsImported: boolean;
  };
  progressPercentage: number;
  simulationStats?: {
    hasSimulationData: boolean;
    totalJournals: number;
    totalSales: number;
    totalLoans: number;
    totalSavingsTransactions: number;
  };
}

export interface OpeningBalanceEntryInput {
  accountCode: string;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
}

export interface PostOpeningBalanceInput {
  mode: 'NEW' | 'ANNUAL_TRANSITION' | 'MID_YEAR_CUTOFF';
  cutoffDate: string; // ISO Date String e.g. "2026-09-30" or "2026-01-01"
  entries: OpeningBalanceEntryInput[];
  notes?: string;
}

export interface SubledgerMemberItem {
  memberNo: string;
  type: 'SISWA' | 'GURU' | 'STUDENT' | 'TEACHER' | 'GENERAL';
  identityNo: string; // NIS, NIP, or KTP
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  savings?: {
    pokok?: number;
    wajib?: number;
    sukarela?: number;
    [categoryCode: string]: number | undefined;
  };
  activeLoan?: {
    remainingPrincipal: number;
    monthlyInstallment?: number;
    remainingMonths?: number;
    interestRate?: number;
  };
}

export class SetupService {
  private static CONFIG_KEYS = {
    STATUS: 'coop_setup_status',
    MODE: 'coop_setup_mode',
    CUTOFF_DATE: 'coop_cutoff_date',
    COMPLETED_AT: 'coop_setup_completed_at',
    COMPLETED_BY: 'coop_setup_completed_by',
  };

  /**
   * Mengambil status kelengkapan onboarding / wizard koperasi (360 derajat)
   */
  static async getSetupStatus(tenantId: string): Promise<SetupStatusResponse> {
    const configs = await prisma.config.findMany({
      where: {
        tenant_id: tenantId,
        key: { in: Object.values(this.CONFIG_KEYS) },
      },
    });

    const configMap = configs.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {} as Record<string, string>);

    const status = (configMap[this.CONFIG_KEYS.STATUS] as any) || 'NOT_STARTED';
    const mode = (configMap[this.CONFIG_KEYS.MODE] as any) || null;
    const cutoffDate = configMap[this.CONFIG_KEYS.CUTOFF_DATE] || null;
    const completedAt = configMap[this.CONFIG_KEYS.COMPLETED_AT] || null;

    // Periksa kondisi riil database
    const [coopNameConfig, totalAccounts, openingJournal, totalMembers, totalProducts, totalJournals, totalSales, totalLoans, totalSavingsTransactions] = await Promise.all([
      prisma.config.findFirst({
        where: { tenant_id: tenantId, key: 'cooperative_name' },
      }),
      prisma.account.count({ where: { tenantId } }),
      prisma.journal.findFirst({
        where: {
          tenantId,
          reference: { startsWith: 'SETUP-OPENING' },
        },
      }),
      prisma.member.count({ where: { tenantId } }),
      prisma.product.count({ where: { tenantId } }),
      prisma.journal.count({
        where: {
          tenantId,
          NOT: { reference: { startsWith: 'SETUP-OPENING' } },
        },
      }),
      prisma.sale.count({ where: { tenantId } }),
      prisma.loan.count({ where: { member: { tenantId } } }),
      prisma.savingTransaction.count({ where: { saving: { member: { tenantId } } } }),
    ]);

    const hasSimulationData = totalJournals > 0 || totalSales > 0 || totalLoans > 0 || totalSavingsTransactions > 0;
    const simulationStats = {
      hasSimulationData,
      totalJournals,
      totalSales,
      totalLoans,
      totalSavingsTransactions,
    };

    const checklist = {
      profileConfigured: Boolean(coopNameConfig?.value?.trim()),
      coaInitialized: totalAccounts >= 15,
      openingBalancePosted: Boolean(openingJournal),
      membersImported: totalMembers > 0,
      storeProductsImported: totalProducts > 0,
    };

    // Hitung persentase kesiapan operasional
    const checkItems = [
      checklist.profileConfigured,
      checklist.coaInitialized,
      checklist.openingBalancePosted,
      checklist.membersImported,
    ];
    const completedItems = checkItems.filter(Boolean).length;
    const progressPercentage = Math.round((completedItems / checkItems.length) * 100);

    return {
      status: status === 'NOT_STARTED' && progressPercentage > 0 ? 'IN_PROGRESS' : status,
      mode,
      cutoffDate,
      completedAt,
      checklist,
      progressPercentage,
      simulationStats,
    };
  }

  /**
   * Helper upsert konfigurasi per tenant karena model Config tidak memiliki compound unique constraint
   */
  private static async upsertTenantConfig(
    client: any,
    tenantId: string,
    key: string,
    value: string
  ) {
    const existing = await client.config.findFirst({
      where: { tenant_id: tenantId, key },
    });
    if (existing) {
      return await client.config.update({
        where: { id: existing.id },
        data: { value },
      });
    } else {
      return await client.config.create({
        data: { tenant_id: tenantId, key, value },
      });
    }
  }

  /**
   * Langkah 1: Simpan Pilihan Mode & Profil Dasar Setup
   */
  static async setSetupMode(
    tenantId: string,
    mode: 'NEW' | 'ANNUAL_TRANSITION' | 'MID_YEAR_CUTOFF',
    cutoffDate?: string,
    operatorId?: string
  ) {
    await prisma.$transaction(async (tx) => {
      await this.upsertTenantConfig(tx, tenantId, this.CONFIG_KEYS.STATUS, 'IN_PROGRESS');
      await this.upsertTenantConfig(tx, tenantId, this.CONFIG_KEYS.MODE, mode);
      if (cutoffDate) {
        await this.upsertTenantConfig(tx, tenantId, this.CONFIG_KEYS.CUTOFF_DATE, cutoffDate);
      }
    });

    appLogger.info({ action: 'COOP_SETUP_MODE_SET', tenantId, mode, cutoffDate, operatorId });
    return this.getSetupStatus(tenantId);
  }

  /**
   * Langkah 2: Inisialisasi Otomatis Bagan Akun (COA) Standar SAK ETAP
   */
  static async initializeCoa(tenantId: string) {
    await AccountService.ensureDefaultHierarchy(tenantId);
    await AccountingService.getOrCreateDefaultAccounts(tenantId);

    const totalAccounts = await prisma.account.count({ where: { tenantId } });
    return {
      success: true,
      message: 'Bagan Akun standar SAK ETAP berhasil diinisialisasi',
      totalAccounts,
    };
  }

  /**
   * Langkah 3: Posting Jurnal Saldo Awal Konsolidasi (Double-Entry Balance Enforced)
   */
  static async postOpeningBalance(
    tenantId: string,
    input: PostOpeningBalanceInput,
    operatorId?: string
  ) {
    const { mode, cutoffDate, entries, notes } = input;

    if (!entries || entries.length === 0) {
      throw new Error('Entri saldo awal tidak boleh kosong.');
    }

    const dateObj = new Date(cutoffDate);
    if (isNaN(dateObj.getTime())) {
      throw new Error('Format tanggal cut-off tidak valid.');
    }

    // 1. Validasi Keseimbangan Total Debit vs Total Kredit
    let totalDebit = 0;
    let totalCredit = 0;

    const sanitizedItems: { accountCode: string; type: JournalType; amount: number }[] = [];

    for (const entry of entries) {
      const amount = Math.round(Number(entry.amount || 0));
      if (amount < 0) {
        throw new Error(`Nominal saldo untuk akun ${entry.accountCode} tidak boleh negatif.`);
      }
      if (amount === 0) continue; // Skip baris bernilai nol

      const type = entry.type.toUpperCase() as JournalType;
      if (type === 'DEBIT') totalDebit += amount;
      else if (type === 'CREDIT') totalCredit += amount;
      else throw new Error(`Tipe entri tidak valid untuk akun ${entry.accountCode}. Harus DEBIT atau CREDIT.`);

      sanitizedItems.push({
        accountCode: entry.accountCode.trim(),
        type,
        amount,
      });
    }

    const diff = Math.abs(totalDebit - totalCredit);
    if (diff !== 0) {
      throw new Error(
        `[AUDIT KONSOLIDASI] Neraca Saldo Awal TIDAK SEIMBANG! ` +
        `Total Debit: Rp ${totalDebit.toLocaleString('id-ID')}, ` +
        `Total Kredit: Rp ${totalCredit.toLocaleString('id-ID')}. ` +
        `Selisih: Rp ${diff.toLocaleString('id-ID')}. SAK ETAP mewajibkan posisi seimbang sempurna.`
      );
    }

    // 2. Pre-warm dan pastikan semua akun sudah terdaftar di database
    await AccountService.ensureDefaultHierarchy(tenantId);
    for (const item of sanitizedItems) {
      await AccountingService.resolveAccountId(tenantId, item.accountCode);
    }

    // 3. Simpan Jurnal Saldo Awal secara Atomik dalam transaksi database
    const dateFormatted = cutoffDate.replace(/[^0-9]/g, '').slice(0, 8);
    const reference = `SETUP-OPENING-${dateFormatted}`;

    const journalResult = await prisma.$transaction(async (tx) => {
      // Hapus jurnal saldo awal lama jika ada (idempotent re-run)
      const existingOpening = await tx.journal.findFirst({
        where: { tenantId, reference },
        include: { items: true },
      });

      if (existingOpening) {
        await tx.journalItem.deleteMany({ where: { journalId: existingOpening.id } });
        await tx.journal.delete({ where: { id: existingOpening.id } });
      }

      // Buat jurnal saldo awal resmi
      const createdJournal = await AccountingService.createJournalEntry(
        tenantId,
        notes || `[Saldo Awal] Neraca Saldo Awal Koperasi (${mode === 'MID_YEAR_CUTOFF' ? 'Cut-Off Berjalan' : 'Awal Tahun'})`,
        reference,
        sanitizedItems,
        tx,
        dateObj
      );

      // Update flag konfigurasi bahwa saldo awal telah diposting
      await SetupService.upsertTenantConfig(
        tx,
        tenantId,
        SetupService.CONFIG_KEYS.STATUS,
        'IN_PROGRESS'
      );

      return createdJournal;
    });

    appLogger.info({
      action: 'COOP_SETUP_OPENING_BALANCE_POSTED',
      tenantId,
      mode,
      cutoffDate,
      totalDebit,
      totalCredit,
      operatorId,
      journalId: journalResult.id,
    });

    return {
      success: true,
      message: 'Jurnal Saldo Awal berhasil dibukukan dengan posisi seimbang sempurna.',
      journalId: journalResult.id,
      reference,
      totalBalance: totalDebit,
    };
  }

  /**
   * Langkah 4: Impor Massal Sub-Ledger (Anggota + Saldo Awal Simpanan + Sisa Pinjaman Aktif)
   * Dilengkapi Rekonsiliasi Otomatis terhadap Akun GL Utama
   */
  static async importSubledger(
    tenantId: string,
    members: SubledgerMemberItem[],
    operatorId?: string
  ) {
    if (!members || members.length === 0) {
      throw new Error('Daftar anggota untuk impor subledger tidak boleh kosong.');
    }

    const { MemberService } = await import('../member/member.service');
    const { SavingCategoryService } = await import('../simpanan/saving-category.service');
    await SavingCategoryService.ensureDefaultCategories(tenantId);

    const activeCategories = await prisma.savingCategory.findMany({
      where: { tenantId, isActive: true },
    });

    const results = {
      total: members.length,
      successCount: 0,
      failCount: 0,
      reconciliation: {
        totalSimpananPokok: 0,
        totalSimpananWajib: 0,
        totalSimpananSukarela: 0,
        totalPinjamanAktif: 0,
      },
      errors: [] as { row: number; memberNo: string; error: string }[],
    };

    for (let i = 0; i < members.length; i++) {
      const item = members[i];
      const rowNum = i + 1;

      try {
        const memberNo = String(item.memberNo || '').trim();
        const identityNo = String(item.identityNo || '').trim();
        const typeStr = String(item.type || '').trim().toUpperCase();

        if (!memberNo) throw new Error('Nomor Anggota (memberNo) wajib diisi.');
        if (!identityNo) throw new Error('Nomor Identitas (NIS/NIP/NIK) wajib diisi.');

        // 1. Cari atau hubungkan siswa/guru
        let siswaId: string | null = null;
        let guruId: string | null = null;
        let userId: string | null = null;

        if (typeStr === 'SISWA' || typeStr === 'STUDENT') {
          const siswa = await prisma.siswa.findFirst({
            where: { tenant_id: tenantId, nis: identityNo },
          });
          if (siswa) {
            siswaId = siswa.id;
            userId = siswa.user_id;
          }
        } else if (typeStr === 'GURU' || typeStr === 'TEACHER') {
          const guru = await prisma.guru.findFirst({
            where: { tenant_id: tenantId, nip: identityNo },
          });
          if (guru) {
            guruId = guru.id;
            userId = guru.user_id;
          }
        }

        // 2. Buat atau perbarui anggota
        let member = await prisma.member.findFirst({ where: { tenantId, memberNo } });

        if (!member) {
          member = await MemberService.createMember(tenantId, {
            memberNo,
            type: (typeStr === 'SISWA' || typeStr === 'STUDENT') ? 'STUDENT' : (typeStr === 'GURU' || typeStr === 'TEACHER') ? 'TEACHER' : 'GENERAL',
            name: item.name || `Anggota ${memberNo}`,
            siswaId,
            guruId,
            userId,
            address: item.address,
            phone: item.phone,
            email: item.email,
            status: 'ACTIVE',
          });
        }

        // 3. Masukkan Saldo Simpanan Awal Anggota ke Sub-Ledger
        if (item.savings) {
          for (const cat of activeCategories) {
            const catCode = cat.code.toUpperCase();
            let amount = 0;

            if (catCode === 'POKOK' && item.savings.pokok !== undefined) amount = Number(item.savings.pokok);
            else if (catCode === 'WAJIB' && item.savings.wajib !== undefined) amount = Number(item.savings.wajib);
            else if (catCode === 'SUKARELA' && item.savings.sukarela !== undefined) amount = Number(item.savings.sukarela);
            else if (item.savings[cat.code] !== undefined) amount = Number(item.savings[cat.code]);

            if (amount > 0) {
              await prisma.saving.upsert({
                where: { memberId_categoryId: { memberId: member.id, categoryId: cat.id } },
                create: { memberId: member.id, categoryId: cat.id, amount },
                update: { amount },
              });

              if (catCode === 'POKOK') results.reconciliation.totalSimpananPokok += amount;
              else if (catCode === 'WAJIB') results.reconciliation.totalSimpananWajib += amount;
              else if (catCode === 'SUKARELA') results.reconciliation.totalSimpananSukarela += amount;
            }
          }
        }

        // 4. Masukkan Pinjaman Aktif Berjalan (Jika ada sisa pokok pinjaman)
        if (item.activeLoan && Number(item.activeLoan.remainingPrincipal) > 0) {
          const remPrincipal = Math.round(Number(item.activeLoan.remainingPrincipal));
          const remMonths = Math.max(1, Number(item.activeLoan.remainingMonths || 1));
          const monthlyInstallment = Math.round(Number(item.activeLoan.monthlyInstallment || (remPrincipal / remMonths)));
          const interestRate = Number(item.activeLoan.interestRate || 0);

          // Cek apakah sudah ada pinjaman aktif untuk member ini
          const existingLoan = await prisma.loan.findFirst({
            where: { memberId: member.id, status: 'APPROVED' },
          });

          if (!existingLoan) {
            const loan = await prisma.loan.create({
              data: {
                memberId: member.id,
                amount: remPrincipal,
                interestRate,
                duration: remMonths,
                status: 'APPROVED',
                notes: '[Migrasi Setup] Sisa pinjaman aktif berjalan saat migrasi sistem',
              },
            });

            // Buat cicilan berjalan
            const installmentsData = [];
            const now = new Date();

            for (let m = 1; m <= remMonths; m++) {
              const dueDate = new Date(now.getFullYear(), now.getMonth() + m, 10);
              installmentsData.push({
                loanId: loan.id,
                installmentNo: m,
                amount: monthlyInstallment,
                dueDate,
                status: 'PENDING',
              });
            }

            await prisma.installment.createMany({ data: installmentsData });
            results.reconciliation.totalPinjamanAktif += remPrincipal;
          }
        }

        results.successCount++;
      } catch (err: any) {
        results.failCount++;
        results.errors.push({
          row: rowNum,
          memberNo: item.memberNo || '-',
          error: err.message || 'Gagal memproses data subledger',
        });
      }
    }

    appLogger.info({
      action: 'COOP_SETUP_SUBLEDGER_IMPORTED',
      tenantId,
      results: {
        total: results.total,
        successCount: results.successCount,
        reconciliation: results.reconciliation,
      },
      operatorId,
    });

    return {
      success: true,
      message: `Berhasil mengimpor ${results.successCount} anggota beserta rekening subledger simpanan & pinjaman.`,
      data: results,
    };
  }

  /**
   * Langkah 5: Finalisasi Setup Koperasi
   */
  static async completeSetup(tenantId: string, operatorId?: string) {
    const nowIso = new Date().toISOString();

    await prisma.$transaction(async (tx) => {
      await this.upsertTenantConfig(tx, tenantId, this.CONFIG_KEYS.STATUS, 'COMPLETED');
      await this.upsertTenantConfig(tx, tenantId, this.CONFIG_KEYS.COMPLETED_AT, nowIso);
      await this.upsertTenantConfig(tx, tenantId, this.CONFIG_KEYS.COMPLETED_BY, operatorId || 'SYSTEM');
    });

    appLogger.info({ action: 'COOP_SETUP_COMPLETED', tenantId, operatorId, timestamp: nowIso });
    return this.getSetupStatus(tenantId);
  }

  /**
   * Reset & Purge Data Simulasi (Hanya untuk Bendahara / Ketua Koperasi)
   * Membersihkan transaksi demo/uji coba agar koperasi siap go-live dengan data riil.
   */
  static async resetSimulationData(
    tenantId: string,
    options: ResetSimulationOptions = {},
    operatorId?: string
  ) {
    const purgeTransactions = options.purgeTransactions !== false;
    const purgeOpeningBalances = options.purgeOpeningBalances !== false;
    const purgeMembers = options.purgeMembers === true;
    const purgeProducts = options.purgeProducts === true;
    const resetSetupStatus = options.resetSetupStatus !== false;

    return await prisma.$transaction(async (tx) => {
      let deletedSales = 0;
      let deletedStockIns = 0;
      let deletedStockOpnames = 0;
      let deletedLoans = 0;
      let deletedSavingsTransactions = 0;
      let deletedJournals = 0;
      let deletedExpenses = 0;
      let deletedCashDeposits = 0;
      let deletedFundTransfers = 0;
      let deletedMembers = 0;
      let deletedProducts = 0;

      // 1. Purge Transaksi Operasional & Simulasi
      if (purgeTransactions) {
        // Toko / POS
        await tx.saleItem.deleteMany({
          where: { sale: { tenantId } },
        });
        const delSales = await tx.sale.deleteMany({
          where: { tenantId },
        });
        deletedSales = delSales.count;

        // Stock Opname
        await tx.coopStockOpnameItem.deleteMany({
          where: { Opname: { tenantId } },
        });
        const delOpnames = await tx.coopStockOpname.deleteMany({
          where: { tenantId },
        });
        deletedStockOpnames = delOpnames.count;

        // Stock In
        await tx.coopStockInItem.deleteMany({
          where: { StockIn: { tenantId } },
        });
        const delStockIns = await tx.coopStockIn.deleteMany({
          where: { tenantId },
        });
        deletedStockIns = delStockIns.count;

        // PPOB & Point
        await tx.coopPointTransaction.deleteMany({
          where: { tenantId },
        });
        await tx.pPOBTransaction.deleteMany({
          where: { tenantId },
        });

        // Beban & Kas Masuk / Mutasi
        const delExpenses = await tx.coopExpense.deleteMany({
          where: { tenantId },
        });
        deletedExpenses = delExpenses.count;

        const delDeposits = await tx.coopCashDeposit.deleteMany({
          where: { tenantId },
        });
        deletedCashDeposits = delDeposits.count;

        const delTransfers = await tx.coopFundTransfer.deleteMany({
          where: { tenantId },
        });
        deletedFundTransfers = delTransfers.count;

        // Pinjaman: Installments & Loans
        await tx.installment.deleteMany({
          where: { loan: { member: { tenantId } } },
        });
        const delLoans = await tx.loan.deleteMany({
          where: { member: { tenantId } },
        });
        deletedLoans = delLoans.count;

        // Simpanan: SavingTransaction
        const delSavingTx = await tx.savingTransaction.deleteMany({
          where: { saving: { member: { tenantId } } },
        });
        deletedSavingsTransactions = delSavingTx.count;

        // Reset saldo simpanan jadi 0 jika member tidak dihapus
        if (!purgeMembers) {
          await tx.saving.updateMany({
            where: { member: { tenantId } },
            data: { amount: 0 },
          });
        }

        // Jurnal Umum & Buku Besar
        if (purgeOpeningBalances) {
          await tx.journalItem.deleteMany({
            where: { journal: { tenantId } },
          });
          const delJournals = await tx.journal.deleteMany({
            where: { tenantId },
          });
          deletedJournals = delJournals.count;
        } else {
          // Hanya hapus jurnal operasional non-opening
          await tx.journalItem.deleteMany({
            where: {
              journal: {
                tenantId,
                NOT: { reference: { startsWith: 'SETUP-OPENING' } },
              },
            },
          });
          const delJournals = await tx.journal.deleteMany({
            where: {
              tenantId,
              NOT: { reference: { startsWith: 'SETUP-OPENING' } },
            },
          });
          deletedJournals = delJournals.count;
        }
      }

      // 2. Opsi: Purge Master Produk
      if (purgeProducts) {
        await tx.saleItem.deleteMany({ where: { product: { tenantId } } });
        await tx.coopStockInItem.deleteMany({ where: { Product: { tenantId } } });
        await tx.coopStockOpnameItem.deleteMany({ where: { Product: { tenantId } } });
        const delProducts = await tx.product.deleteMany({ where: { tenantId } });
        deletedProducts = delProducts.count;
      } else {
        // Reset stock produk ke 0 jika barang simulasi sudah di-wipe
        await tx.product.updateMany({
          where: { tenantId },
          data: { stock: 0 },
        });
      }

      // 3. Opsi: Purge Master Member Koperasi
      if (purgeMembers) {
        await tx.saving.deleteMany({ where: { member: { tenantId } } });
        await tx.shuAllocation.deleteMany({ where: { member: { tenantId } } });
        await tx.voucher.deleteMany({ where: { member: { tenantId } } });
        await tx.coopMeetingAttendance.deleteMany({ where: { member: { tenantId } } });
        await tx.ticket.deleteMany({ where: { member: { tenantId } } });
        const delMembers = await tx.member.deleteMany({ where: { tenantId } });
        deletedMembers = delMembers.count;
      }

      // 4. Reset Status Setup Wizard jika diminta
      if (resetSetupStatus) {
        await SetupService.upsertTenantConfig(tx, tenantId, this.CONFIG_KEYS.STATUS, 'NOT_STARTED');
        await tx.config.deleteMany({
          where: {
            tenant_id: tenantId,
            key: {
              in: [
                this.CONFIG_KEYS.MODE,
                this.CONFIG_KEYS.CUTOFF_DATE,
                this.CONFIG_KEYS.COMPLETED_AT,
                this.CONFIG_KEYS.COMPLETED_BY,
              ],
            },
          },
        });
      }

      appLogger.warn({
        action: 'COOP_SIMULATION_DATA_RESET',
        tenantId,
        operatorId,
        purged: {
          sales: deletedSales,
          stockIns: deletedStockIns,
          stockOpnames: deletedStockOpnames,
          loans: deletedLoans,
          savingsTransactions: deletedSavingsTransactions,
          journals: deletedJournals,
          expenses: deletedExpenses,
          cashDeposits: deletedCashDeposits,
          fundTransfers: deletedFundTransfers,
          members: deletedMembers,
          products: deletedProducts,
        },
      });

      return {
        success: true,
        message: 'Data simulasi koperasi berhasil dibersihkan dengan aman.',
        purged: {
          sales: deletedSales,
          stockIns: deletedStockIns,
          stockOpnames: deletedStockOpnames,
          loans: deletedLoans,
          savingsTransactions: deletedSavingsTransactions,
          journals: deletedJournals,
          expenses: deletedExpenses,
          cashDeposits: deletedCashDeposits,
          fundTransfers: deletedFundTransfers,
          members: deletedMembers,
          products: deletedProducts,
        },
      };
    });
  }
}
