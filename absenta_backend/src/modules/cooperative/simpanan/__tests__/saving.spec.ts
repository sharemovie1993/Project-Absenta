import { SavingService } from '../saving.service';
import { prisma } from '@/utils/prisma';
import { AccountingService } from '../../laporan/accounting.service';

jest.mock('@/utils/prisma', () => {
  const mockSaving = {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    aggregate: jest.fn(),
  };

  const mockSavingCategory = {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    createMany: jest.fn(),
    count: jest.fn(),
  };

  const mockSavingTransaction = {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    groupBy: jest.fn(),
    aggregate: jest.fn(),
  };

  const mockMember = {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  };

  const mockCoopPointTransaction = {
    create: jest.fn(),
  };

  return {
    prisma: {
      saving: mockSaving,
      savingCategory: mockSavingCategory,
      savingTransaction: mockSavingTransaction,
      member: mockMember,
      coopPointTransaction: mockCoopPointTransaction,
      shuConfig: {
        findUnique: jest.fn(),
      },
      shuAllocation: {
        findFirst: jest.fn(),
      },
      config: {
        findMany: jest.fn(),
      },
      organizationalAssignment: {
        findFirst: jest.fn(),
      },
      $transaction: jest.fn(async (callback: (tx: any) => Promise<any>) => {
        return callback({
          saving: mockSaving,
          savingCategory: mockSavingCategory,
          savingTransaction: mockSavingTransaction,
          member: mockMember,
          coopPointTransaction: mockCoopPointTransaction,
        });
      }),
    },
  };
});

jest.mock('../../laporan/accounting.service', () => ({
  AccountingService: {
    getOrCreateDefaultAccounts: jest.fn().mockResolvedValue(true),
    resolveAccountId: jest.fn().mockResolvedValue('acc-123'),
    createJournalEntry: jest.fn().mockResolvedValue(true),
  },
}));

jest.mock('../../fiscal-year.guard', () => ({
  FiscalYearGuard: {
    getActiveFiscalYear: jest.fn().mockResolvedValue({
      id: 'fy-2026',
      year: 2026,
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      endDate: new Date('2026-12-31T23:59:59.999Z'),
      isClosed: false,
    }),
    validateNotClosed: jest.fn().mockResolvedValue(true),
  },
}));

describe('SavingService - Simpanan Koperasi Unit Tests (Phase 3 TDD & SOLID)', () => {
  const mockTenantId = 'tenant-savings-test';
  const mockMemberId = 'member-001';
  const mockUserId = 'user-001';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. getSavings (Daftar Rekening Simpanan)', () => {
    it('harus mengambil semua rekening simpanan milik tenant dengan akumulasi setoran tahun buku', async () => {
      const mockSavings = [
        {
          id: 'sav-1',
          memberId: mockMemberId,
          amount: 500000,
          category: { id: 'cat-1', name: 'Simpanan Sukarela', code: 'SUKARELA' },
          member: {
            id: mockMemberId,
            memberNo: 'MBR-001',
            User: { full_name: 'Budi Santoso' },
          },
          transactions: [],
        },
      ];
      (prisma.saving.findMany as jest.Mock).mockResolvedValue(mockSavings);
      (prisma.savingTransaction.groupBy as jest.Mock).mockResolvedValue([
        { savingId: 'sav-1', _sum: { amount: 200000 } },
      ]);

      const result = await SavingService.getSavings(mockTenantId);

      expect(prisma.saving.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { member: { tenantId: mockTenantId } },
        })
      );
      expect(result).toHaveLength(1);
      expect(result[0].member.name).toBe('Budi Santoso');
      expect(result[0].fiscalYearDepositAmount).toBe(200000);
      expect(result[0].fiscalYearYear).toBe(2026);
    });

    it('harus mendukung filter userId untuk self-service Tabungan Saya', async () => {
      (prisma.saving.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.savingTransaction.groupBy as jest.Mock).mockResolvedValue([]);

      const result = await SavingService.getSavings(mockTenantId, { userId: mockUserId });

      expect(prisma.saving.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { member: { tenantId: mockTenantId, userId: mockUserId } },
        })
      );
      expect(result).toEqual([]);
    });
  });

  describe('2. createSaving (Pembuatan Rekening Simpanan)', () => {
    it('harus menolak jika kategori simpanan tidak aktif atau tidak ditemukan', async () => {
      (prisma.savingCategory.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        SavingService.createSaving(mockMemberId, 'cat-invalid', 0)
      ).rejects.toThrow('Kategori simpanan tidak ditemukan atau sudah tidak aktif.');
    });

    it('harus menolak pembuatan rekening jika anggota sudah memiliki rekening pada kategori tersebut', async () => {
      (prisma.savingCategory.findFirst as jest.Mock).mockResolvedValue({
        id: 'cat-wajib',
        name: 'Simpanan Wajib',
      });
      (prisma.saving.findFirst as jest.Mock).mockResolvedValue({ id: 'sav-existing' });

      await expect(
        SavingService.createSaving(mockMemberId, 'cat-wajib', 0)
      ).rejects.toThrow("Rekening simpanan 'Simpanan Wajib' sudah ada untuk anggota ini.");
    });

    it('harus menolak jika saldo awal bernilai negatif', async () => {
      (prisma.savingCategory.findFirst as jest.Mock).mockResolvedValue({
        id: 'cat-sukarela',
        name: 'Simpanan Sukarela',
      });
      (prisma.saving.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        SavingService.createSaving(mockMemberId, 'cat-sukarela', -50000)
      ).rejects.toThrow('Saldo awal tidak boleh negatif.');
    });

    it('harus sukses membuat rekening baru tanpa setoran awal (amount = 0)', async () => {
      (prisma.savingCategory.findFirst as jest.Mock).mockResolvedValue({
        id: 'cat-sukarela',
        name: 'Simpanan Sukarela',
      });
      (prisma.saving.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.saving.create as jest.Mock).mockResolvedValue({
        id: 'sav-new',
        memberId: mockMemberId,
        categoryId: 'cat-sukarela',
        amount: 0,
      });

      const result = await SavingService.createSaving(mockMemberId, 'cat-sukarela', 0);

      expect(prisma.saving.create).toHaveBeenCalledWith({
        data: { memberId: mockMemberId, categoryId: 'cat-sukarela', amount: 0 },
        include: { category: true },
      });
      expect(result.id).toBe('sav-new');
      expect(AccountingService.createJournalEntry).not.toHaveBeenCalled();
    });

    it('harus membuat rekening, transaksi awal, dan jurnal akuntansi jika initialAmount > 0', async () => {
      (prisma.savingCategory.findFirst as jest.Mock).mockResolvedValue({
        id: 'cat-pokok',
        name: 'Simpanan Pokok',
        accountCode: '2011',
      });
      (prisma.saving.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.member.findUnique as jest.Mock).mockResolvedValue({
        id: mockMemberId,
        tenantId: mockTenantId,
        memberNo: 'MBR-001',
      });
      (prisma.saving.create as jest.Mock).mockResolvedValue({
        id: 'sav-pokok-1',
        memberId: mockMemberId,
        categoryId: 'cat-pokok',
        amount: 100000,
      });

      const result = await SavingService.createSaving(mockMemberId, 'cat-pokok', 100000);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(AccountingService.createJournalEntry).toHaveBeenCalledWith(
        mockTenantId,
        expect.stringContaining('Setoran Awal Simpanan Pokok'),
        'SAV-INIT-sav-pokok-1',
        expect.arrayContaining([
          expect.objectContaining({ accountCode: '1010', type: 'DEBIT', amount: 100000 }),
          expect.objectContaining({ accountCode: '2011', type: 'CREDIT', amount: 100000 }),
        ]),
        expect.anything()
      );
      expect(result.id).toBe('sav-pokok-1');
    });
  });

  describe('3. processTransaction (Validasi & Guard Transaksi Simpanan)', () => {
    it('harus menolak jika nominal amount <= 0 atau bukan angka', async () => {
      await expect(
        SavingService.processTransaction('sav-1', 0, 'DEPOSIT')
      ).rejects.toThrow('Nominal transaksi harus lebih dari 0.');

      await expect(
        SavingService.processTransaction('sav-1', -10000, 'DEPOSIT')
      ).rejects.toThrow('Nominal transaksi harus lebih dari 0.');
    });

    it('harus menolak jika jenis transaksi tidak valid', async () => {
      await expect(
        SavingService.processTransaction('sav-1', 50000, 'INVALID_TYPE' as any)
      ).rejects.toThrow('Jenis transaksi tidak valid: INVALID_TYPE.');
    });

    it('harus menolak jika rekening simpanan tidak ditemukan', async () => {
      (prisma.saving.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        SavingService.processTransaction('sav-not-found', 50000, 'DEPOSIT')
      ).rejects.toThrow('Rekening simpanan tidak ditemukan.');
    });

    it('harus menolak transaksi jika operator mencoba melakukan setoran/tarikan pada akun sendiri (Anti-Self-Transaction)', async () => {
      (prisma.saving.findUnique as jest.Mock).mockResolvedValue({
        id: 'sav-self',
        member: { tenantId: mockTenantId, userId: 'operator-123' },
        category: { code: 'SUKARELA', name: 'Simpanan Sukarela', accountCode: '2013' },
      });

      await expect(
        SavingService.processTransaction('sav-self', 50000, 'DEPOSIT', 'Setor sendiri', 'operator-123')
      ).rejects.toThrow('Operator tidak diperbolehkan melakukan transaksi tabungan pada akun milik sendiri.');
    });

    it('harus menolak penarikan dana jika saldo saat ini tidak mencukupi', async () => {
      const mockSaving = {
        id: 'sav-sukarela',
        amount: 25000,
        member: { tenantId: mockTenantId, userId: 'user-other', memberNo: 'MBR-002' },
        category: { code: 'SUKARELA', name: 'Simpanan Sukarela', accountCode: '2013' },
      };
      (prisma.saving.findUnique as jest.Mock).mockResolvedValue(mockSaving);

      await expect(
        SavingService.processTransaction('sav-sukarela', 50000, 'WITHDRAWAL', 'Tarik dana', 'operator-admin')
      ).rejects.toThrow(/Saldo tidak mencukupi/);
    });

    it('harus menolak setoran Simpanan Pokok jika saldo sudah pernah terisi (hanya 1x pembayaran)', async () => {
      const mockSaving = {
        id: 'sav-pokok',
        amount: 100000,
        member: { tenantId: mockTenantId, userId: 'user-other' },
        category: { code: 'POKOK', name: 'Simpanan Pokok', accountCode: '2011' },
      };
      (prisma.saving.findUnique as jest.Mock).mockResolvedValue(mockSaving);

      await expect(
        SavingService.processTransaction('sav-pokok', 100000, 'DEPOSIT', 'Bayar pokok lagi', 'operator-admin')
      ).rejects.toThrow('Pembayaran Simpanan Pokok tidak diperbolehkan lebih dari satu kali.');
    });

    it('harus menolak penarikan tunai pada Simpanan Pokok dan Simpanan Wajib', async () => {
      const mockSavingPokok = {
        id: 'sav-pokok',
        amount: 100000,
        member: { tenantId: mockTenantId, userId: 'user-other' },
        category: { code: 'POKOK', name: 'Simpanan Pokok', accountCode: '2011' },
      };
      (prisma.saving.findUnique as jest.Mock).mockResolvedValue(mockSavingPokok);

      await expect(
        SavingService.processTransaction('sav-pokok', 50000, 'WITHDRAWAL', 'Tarik pokok', 'operator-admin')
      ).rejects.toThrow(/Tarik tunai tidak diperbolehkan untuk kategori Simpanan Simpanan Pokok/);

      const mockSavingWajib = {
        id: 'sav-wajib',
        amount: 200000,
        member: { tenantId: mockTenantId, userId: 'user-other' },
        category: { code: 'WAJIB', name: 'Simpanan Wajib', accountCode: '2012' },
      };
      (prisma.saving.findUnique as jest.Mock).mockResolvedValue(mockSavingWajib);

      await expect(
        SavingService.processTransaction('sav-wajib', 50000, 'WITHDRAWAL', 'Tarik wajib', 'operator-admin')
      ).rejects.toThrow(/Tarik tunai tidak diperbolehkan untuk kategori Simpanan Simpanan Wajib/);
    });

    it('harus menolak setoran Simpanan Wajib jika sudah lunas penuh 12x dalam 1 tahun buku', async () => {
      const mockSavingWajib = {
        id: 'sav-wajib-full',
        amount: 240000,
        member: { tenantId: mockTenantId, userId: 'user-other' },
        category: { code: 'WAJIB', name: 'Simpanan Wajib', accountCode: '2012', defaultAmount: 20000 },
      };
      (prisma.saving.findUnique as jest.Mock).mockResolvedValue(mockSavingWajib);
      (prisma.savingTransaction.aggregate as jest.Mock).mockResolvedValue({
        _count: { id: 12 },
        _sum: { amount: 240000 },
      });

      await expect(
        SavingService.processTransaction('sav-wajib-full', 20000, 'DEPOSIT', 'Iuran ke-13', 'operator-admin')
      ).rejects.toThrow(/Simpanan Wajib untuk Tahun Buku 2026 sudah lunas penuh \(12\/12 bulan\)/);
    });
  });

  describe('4. processTransaction - Eksekusi Sukses, Atomic Update, Akuntansi, & Poin Reward', () => {
    it('harus sukses memproses DEPOSIT Sukarela, mengupdate saldo, mencatat jurnal, dan memberi reward poin', async () => {
      const mockSaving = {
        id: 'sav-sukarela-1',
        amount: 100000,
        memberId: mockMemberId,
        member: { id: mockMemberId, tenantId: mockTenantId, userId: 'user-mbr', memberNo: 'MBR-001' },
        category: { code: 'SUKARELA', name: 'Simpanan Sukarela', accountCode: '2013' },
      };
      (prisma.saving.findUnique as jest.Mock).mockResolvedValue(mockSaving);
      (prisma.savingTransaction.create as jest.Mock).mockResolvedValue({
        id: 'tx-dep-1',
        savingId: 'sav-sukarela-1',
        amount: 150000,
        type: 'DEPOSIT',
        date: new Date(),
      });
      (prisma.saving.update as jest.Mock).mockResolvedValue({
        id: 'sav-sukarela-1',
        amount: 250000,
      });

      const result = await SavingService.processTransaction(
        'sav-sukarela-1',
        150000,
        'DEPOSIT',
        'Setoran sukarela tambahan',
        'operator-teller'
      );

      expect(prisma.saving.update).toHaveBeenCalledWith({
        where: { id: 'sav-sukarela-1' },
        data: { amount: { increment: 150000 } },
      });
      expect(AccountingService.createJournalEntry).toHaveBeenCalledWith(
        mockTenantId,
        'DEPOSIT - Simpanan Sukarela (MBR-001)',
        'SAV-tx-dep-1',
        [
          { accountCode: '1010', type: 'DEBIT', amount: 150000 },
          { accountCode: '2013', type: 'CREDIT', amount: 150000 },
        ],
        expect.anything()
      );

      // Poin reward: Math.floor(150000 / 50000) * 10 = 30 poin
      expect(prisma.member.update).toHaveBeenCalledWith({
        where: { id: mockMemberId },
        data: { points: { increment: 30 } },
      });
      expect(prisma.coopPointTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: mockTenantId,
          memberId: mockMemberId,
          amount: 30,
          type: 'EARN_SAVING',
        }),
      });

      expect(result.id).toBe('tx-dep-1');
    });

    it('harus mengembalikan hasil dari cache jika idempotencyKey dikirim ulang (Idempotency Replay)', async () => {
      const idempotencyKey = 'idem-unique-key-123';
      (prisma.savingTransaction.findFirst as jest.Mock).mockResolvedValue({
        id: 'tx-existing',
        savingId: 'sav-1',
        amount: 50000,
        type: 'DEPOSIT',
        description: `[IDEM:${idempotencyKey}]`,
      });

      const result = await SavingService.processTransaction(
        'sav-1',
        50000,
        'DEPOSIT',
        'Setoran',
        undefined,
        idempotencyKey
      );

      expect(result.id).toBe('tx-existing');
      expect(prisma.saving.update).not.toHaveBeenCalled();
    });
  });

  describe('5. getMemberSavingInsights (Analisis, Tren, & Estimasi SHU)', () => {
    it('harus mengembalikan tren bulanan, status akun, dan estimasi SHU anggota', async () => {
      const mockSavings = [
        {
          id: 'sav-pokok-insight',
          memberId: mockMemberId,
          amount: 100000,
          category: {
            id: 'c-pokok',
            code: 'POKOK',
            name: 'Simpanan Pokok',
            defaultAmount: 100000,
            isMandatory: false,
            isWithdrawable: false,
          },
        },
      ];
      (prisma.saving.findMany as jest.Mock).mockResolvedValue(mockSavings);
      (prisma.savingTransaction.findMany as jest.Mock).mockResolvedValue([
        { date: new Date(), amount: 100000, type: 'DEPOSIT' },
      ]);
      (prisma.savingTransaction.groupBy as jest.Mock).mockResolvedValue([
        { savingId: 'sav-pokok-insight', _sum: { amount: 100000 } },
      ]);
      (prisma.shuConfig.findUnique as jest.Mock).mockResolvedValue({
        tenantId: mockTenantId,
        porsiJasaModal: 30,
      });
      (prisma.savingCategory.findMany as jest.Mock).mockResolvedValue([{ id: 'c-pokok' }]);
      (prisma.saving.aggregate as jest.Mock).mockResolvedValue({
        _sum: { amount: 10_000_000 },
      });
      (prisma.member.findFirst as jest.Mock).mockResolvedValue({ id: mockMemberId });
      (prisma.config.findMany as jest.Mock).mockResolvedValue([
        { key: 'cooperative_name', value: 'Koperasi Sejahtera' },
      ]);
      (prisma.organizationalAssignment.findFirst as jest.Mock).mockResolvedValue(null);

      const insights = await SavingService.getMemberSavingInsights(mockUserId, mockTenantId);

      expect(insights.accountStatuses).toHaveLength(1);
      expect(insights.accountStatuses[0].isPokok).toBe(true);
      expect(insights.accountStatuses[0].isPaid).toBe(true);
      expect(insights.shuEstimation?.porsiJasaModal).toBe(30);
      expect(insights.coopContact?.name).toBe('Koperasi Sejahtera');
    });

    it('harus mengembalikan array kosong jika user tidak memiliki rekening simpanan', async () => {
      (prisma.saving.findMany as jest.Mock).mockResolvedValue([]);

      const insights = await SavingService.getMemberSavingInsights('user-empty', mockTenantId);

      expect(insights.monthlyTrend).toEqual([]);
      expect(insights.accountStatuses).toEqual([]);
    });
  });
});
