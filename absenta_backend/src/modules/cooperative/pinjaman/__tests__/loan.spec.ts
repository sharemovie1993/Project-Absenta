import { LoanService } from '../loan.service';
import { prisma } from '@/utils/prisma';
import { AccountingService } from '../../laporan/accounting.service';

jest.mock('@/utils/prisma', () => {
  const mockLoan = {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  const mockInstallment = {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
  };

  const mockMember = {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
  };

  const mockSaving = {
    findMany: jest.fn(),
  };

  return {
    prisma: {
      loan: mockLoan,
      installment: mockInstallment,
      member: mockMember,
      saving: mockSaving,
      $transaction: jest.fn(async (callback: (tx: any) => Promise<any>) => {
        return callback({
          loan: mockLoan,
          installment: mockInstallment,
          member: mockMember,
          saving: mockSaving,
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

describe('LoanService - Pinjaman Koperasi Unit Tests (Phase 3 TDD & SOLID)', () => {
  const mockTenantId = 'tenant-loan-test';
  const mockMemberId = 'member-pinjam-001';
  const mockUserId = 'user-borrower-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. getLoans & getLoanById', () => {
    it('harus mengambil daftar pinjaman milik tenant dengan resolusi nama anggota', async () => {
      const mockLoans = [
        {
          id: 'loan-1',
          memberId: mockMemberId,
          amount: 5000000,
          interestRate: 10,
          duration: 10,
          status: 'APPROVED',
          member: {
            id: mockMemberId,
            memberNo: 'MBR-001',
            User: { full_name: 'Dewi Lestari' },
          },
          installments: [],
        },
      ];
      (prisma.loan.findMany as jest.Mock).mockResolvedValue(mockLoans);

      const result = await LoanService.getLoans(mockTenantId);

      expect(prisma.loan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { member: { tenantId: mockTenantId } },
        })
      );
      expect(result).toHaveLength(1);
      expect(result[0].member.name).toBe('Dewi Lestari');
    });

    it('harus mengambil pinjaman berdasarkan userId anggota', async () => {
      (prisma.member.findFirst as jest.Mock).mockResolvedValue({
        id: mockMemberId,
        tenantId: mockTenantId,
        userId: mockUserId,
      });
      (prisma.loan.findMany as jest.Mock).mockResolvedValue([]);

      const result = await LoanService.getLoansByUserId(mockTenantId, mockUserId);

      expect(prisma.member.findFirst).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId, userId: mockUserId },
      });
      expect(result).toEqual([]);
    });

    it('harus mengembalikan detail pinjaman beserta simpanan dan riwayat pinjaman anggota', async () => {
      const mockDetail = {
        id: 'loan-detail-1',
        memberId: mockMemberId,
        amount: 3000000,
        member: {
          memberNo: 'MBR-002',
          Siswa: { nama_siswa: 'Rian Pratama' },
        },
        installments: [],
      };
      (prisma.loan.findFirst as jest.Mock).mockResolvedValue(mockDetail);
      (prisma.saving.findMany as jest.Mock).mockResolvedValue([
        { amount: 500000, category: { name: 'Simpanan Pokok', code: 'POKOK', color: '#10B981' } },
      ]);
      (prisma.loan.findMany as jest.Mock).mockResolvedValue([]);

      const result = await LoanService.getLoanById('loan-detail-1', mockTenantId);

      expect(prisma.loan.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'loan-detail-1', member: { tenantId: mockTenantId } },
        })
      );
      expect(result.member.name).toBe('Rian Pratama');
      expect(result.member.totalSavings).toBe(500000);
    });

    it('harus melempar error jika loan tidak ditemukan pada getLoanById', async () => {
      (prisma.loan.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        LoanService.getLoanById('loan-none', mockTenantId)
      ).rejects.toThrow('Loan not found');
    });
  });

  describe('2. createLoan (Pengajuan Pinjaman & Proteksi Lapis Ganda)', () => {
    it('harus menolak jika amount <= 0 atau duration <= 0', async () => {
      await expect(
        LoanService.createLoan(mockMemberId, 0, 10, 6)
      ).rejects.toThrow('Jumlah pinjaman harus lebih dari 0.');

      await expect(
        LoanService.createLoan(mockMemberId, 1000000, 10, 0)
      ).rejects.toThrow('Tenor harus bilangan bulat positif.');

      await expect(
        LoanService.createLoan(mockMemberId, 1000000, -5, 6)
      ).rejects.toThrow('Suku bunga tidak boleh negatif.');
    });

    it('harus menolak pengajuan baru jika anggota masih memiliki pinjaman aktif (Single Active Loan Rule)', async () => {
      (prisma.loan.findFirst as jest.Mock).mockResolvedValueOnce({
        id: 'loan-active-1',
        status: 'APPROVED',
      });

      await expect(
        LoanService.createLoan(mockMemberId, 2000000, 10, 12)
      ).rejects.toThrow(/LOAN_RESTRICTION:ACTIVE/);
    });

    it('harus menolak pengajuan baru jika anggota masih memiliki pengajuan pending (Single Pending Rule)', async () => {
      (prisma.loan.findFirst as jest.Mock)
        .mockResolvedValueOnce(null) // no active loan
        .mockResolvedValueOnce({ id: 'loan-pending-1', status: 'PENDING' }); // has pending loan

      await expect(
        LoanService.createLoan(mockMemberId, 2000000, 10, 12)
      ).rejects.toThrow(/LOAN_RESTRICTION:PENDING/);
    });

    it('harus sukses membuat pengajuan pinjaman baru berstatus PENDING dengan createMany installment', async () => {
      (prisma.loan.findFirst as jest.Mock).mockResolvedValue(null); // no active, no pending
      const createdLoan = {
        id: 'loan-new-1',
        memberId: mockMemberId,
        amount: 1200000,
        interestRate: 10,
        duration: 12,
        status: 'PENDING',
      };
      (prisma.loan.create as jest.Mock).mockResolvedValue(createdLoan);
      (prisma.loan.findUnique as jest.Mock).mockResolvedValue({
        ...createdLoan,
        installments: Array(12).fill({ status: 'UNPAID' }),
      });

      const result = await LoanService.createLoan(mockMemberId, 1200000, 10, 12);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.loan.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          memberId: mockMemberId,
          amount: 1200000,
          interestRate: 10,
          duration: 12,
          status: 'PENDING',
        }),
      });

      expect(prisma.installment.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ loanId: 'loan-new-1', status: 'UNPAID' }),
        ]),
      });
      expect(result.id).toBe('loan-new-1');
    });
  });

  describe('3. updateLoanStatus (Persetujuan, Penolakan, & Jurnal Pencairan)', () => {
    it('harus menolak jika status yang diminta tidak valid', async () => {
      const mockLoanPending = {
        id: 'loan-1',
        status: 'PENDING',
        member: { tenantId: mockTenantId },
      };
      (prisma.loan.findFirst as jest.Mock).mockResolvedValue(mockLoanPending);

      await expect(
        LoanService.updateLoanStatus('loan-1', 'STATUS_NGASAL' as any, mockTenantId)
      ).rejects.toThrow(/Transisi status tidak valid/);
    });

    it('harus menolak transisi status yang tidak diizinkan oleh state machine', async () => {
      const mockLoanPaid = {
        id: 'loan-paid-1',
        status: 'PAID',
        member: { tenantId: mockTenantId },
      };
      (prisma.loan.findFirst as jest.Mock).mockResolvedValue(mockLoanPaid);

      await expect(
        LoanService.updateLoanStatus('loan-paid-1', 'APPROVED', mockTenantId)
      ).rejects.toThrow(/Transisi status tidak valid: PAID → APPROVED/);
    });

    it('harus sukses menyetujui pinjaman (PENDING -> APPROVED) dan mencatat jurnal pencairan kas', async () => {
      const mockLoanPending = {
        id: 'loan-approve-1',
        status: 'PENDING',
        amount: 2000000,
        member: {
          tenantId: mockTenantId,
          memberNo: 'MBR-003',
          Siswa: { nama_siswa: 'Siti Aminah' },
        },
      };
      (prisma.loan.findFirst as jest.Mock).mockResolvedValue(mockLoanPending);
      (prisma.loan.update as jest.Mock).mockResolvedValue({
        id: 'loan-approve-1',
        status: 'APPROVED',
      });

      const result = await LoanService.updateLoanStatus(
        'loan-approve-1',
        'APPROVED',
        mockTenantId,
        'ketua-123'
      );

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.loan.update).toHaveBeenCalledWith({
        where: { id: 'loan-approve-1' },
        data: expect.objectContaining({
          status: 'APPROVED',
        }),
      });

      // Jurnal pencairan dana pinjaman: Piutang Pinjaman Dr (1020) / Kas Cr (1010)
      expect(AccountingService.createJournalEntry).toHaveBeenCalledWith(
        mockTenantId,
        expect.stringContaining('Penyaluran Pinjaman Baru'),
        'LN-DISB-loan-approve-1',
        [
          { accountCode: '1020', type: 'DEBIT', amount: 2000000 },
          { accountCode: '1010', type: 'CREDIT', amount: 2000000 },
        ],
        expect.anything()
      );
      expect(result.status).toBe('APPROVED');
    });

    it('harus sukses menolak pinjaman (PENDING -> REJECTED)', async () => {
      const mockLoanPending = {
        id: 'loan-reject-1',
        status: 'PENDING',
        amount: 5000000,
        member: { tenantId: mockTenantId },
      };
      (prisma.loan.findFirst as jest.Mock).mockResolvedValue(mockLoanPending);
      (prisma.loan.update as jest.Mock).mockResolvedValue({
        id: 'loan-reject-1',
        status: 'REJECTED',
      });

      const result = await LoanService.updateLoanStatus(
        'loan-reject-1',
        'REJECTED',
        mockTenantId
      );

      expect(prisma.loan.update).toHaveBeenCalledWith({
        where: { id: 'loan-reject-1' },
        data: expect.objectContaining({
          status: 'REJECTED',
        }),
      });
      expect(result.status).toBe('REJECTED');
    });
  });

  describe('4. payInstallment (Pembayaran Cicilan Pinjaman & Auto-Settlement)', () => {
    it('harus menolak pembayaran jika cicilan sudah berstatus PAID tanpa idempotencyKey', async () => {
      const mockInstallment = {
        id: 'inst-paid',
        status: 'PAID',
        loan: { member: { tenantId: mockTenantId } },
      };
      (prisma.installment.findUnique as jest.Mock).mockResolvedValue(mockInstallment);

      await expect(
        LoanService.payInstallment('inst-paid')
      ).rejects.toThrow('Installment already paid');
    });

    it('harus sukses membayar cicilan, mencatat jurnal akuntansi, dan otomatis melunasi pinjaman jika seluruh cicilan lunas', async () => {
      const mockInstallment = {
        id: 'inst-unpaid',
        amount: 550000,
        status: 'UNPAID',
        loanId: 'loan-auto-settle',
        loan: {
          id: 'loan-auto-settle',
          amount: 6000000,
          interestRate: 10,
          duration: 12,
          member: {
            tenantId: mockTenantId,
            memberNo: 'MBR-004',
            User: { full_name: 'Hadi' },
          },
        },
      };
      (prisma.installment.findUnique as jest.Mock).mockResolvedValue(mockInstallment);
      (prisma.installment.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.installment.count as jest.Mock).mockResolvedValue(0); // 0 unpaid remaining
      (prisma.loan.update as jest.Mock).mockResolvedValue({ id: 'loan-auto-settle', status: 'PAID' });

      const result = await LoanService.payInstallment('inst-unpaid');

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.installment.updateMany).toHaveBeenCalledWith({
        where: { id: 'inst-unpaid', status: 'UNPAID' },
        data: expect.objectContaining({
          status: 'PAID',
        }),
      });

      // Double-entry journal: Kas Dr (1010) / Piutang Cr (1020) + Pendapatan Bunga Cr (4020)
      expect(AccountingService.createJournalEntry).toHaveBeenCalledWith(
        mockTenantId,
        expect.stringContaining('Pembayaran Angsuran Bulanan'),
        'LN-REP-inst-unpaid',
        expect.arrayContaining([
          expect.objectContaining({ accountCode: '1010', type: 'DEBIT' }),
          expect.objectContaining({ accountCode: '1020', type: 'CREDIT' }),
          expect.objectContaining({ accountCode: '4020', type: 'CREDIT' }),
        ]),
        expect.anything()
      );

      // Pinjaman utama otomatis di-update menjadi PAID
      expect(prisma.loan.update).toHaveBeenCalledWith({
        where: { id: 'loan-auto-settle' },
        data: { status: 'PAID' },
      });

      expect(result).toBeDefined();
    });
  });
});
