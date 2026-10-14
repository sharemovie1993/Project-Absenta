import { ShuService } from '../shu.service';
import { prisma } from '@/utils/prisma';
import { activityLogService } from '../../../activity/services/activity-log.service';

jest.mock('@/utils/prisma', () => {
  const mockShuAllocation = {
    findMany: jest.fn(),
    updateMany: jest.fn(),
  };

  const mockSaving = {
    create: jest.fn(),
    update: jest.fn(),
  };

  const mockSavingTransaction = {
    create: jest.fn(),
  };

  return {
    prisma: {
      shuConfig: {
        findUnique: jest.fn(),
        create: jest.fn(),
        upsert: jest.fn(),
      },
      shuPeriod: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      shuAllocation: mockShuAllocation,
      savingCategory: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      saving: mockSaving,
      savingTransaction: mockSavingTransaction,
      member: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      $transaction: jest.fn(async (callback: (tx: any) => Promise<any>) => {
        return callback({
          shuAllocation: mockShuAllocation,
          saving: mockSaving,
          savingTransaction: mockSavingTransaction,
        });
      }),
    },
  };
});

jest.mock('../../laporan/accounting.service', () => ({
  AccountingService: {
    createJournalEntry: jest.fn().mockResolvedValue(true),
  },
}));

jest.mock('../../../activity/services/activity-log.service', () => ({
  activityLogService: {
    logEvent: jest.fn(),
  },
}));

describe('ShuService - SHU Koperasi Unit & Business Logic Tests (Phase 3 TDD & SOLID)', () => {
  const mockTenantId = 'tenant-shu-test';
  const mockUserId = 'user-chairman-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. getConfig & updateConfig (Aturan Distribusi SHU)', () => {
    it('harus mengembalikan konfigurasi yang sudah ada jika ditemukan', async () => {
      const mockConfig = {
        tenantId: mockTenantId,
        porsiJasaModal: 30,
        porsiJasaTransaksi: 30,
        porsiCadangan: 20,
        porsiPengurus: 5,
        porsiSosial: 5,
        porsiPembangunan: 10,
      };
      (prisma.shuConfig.findUnique as jest.Mock).mockResolvedValue(mockConfig);

      const result = await ShuService.getConfig(mockTenantId);

      expect(prisma.shuConfig.findUnique).toHaveBeenCalledWith({ where: { tenantId: mockTenantId } });
      expect(result).toEqual(mockConfig);
    });

    it('harus membuat konfigurasi default 100% jika belum pernah dikonfigurasi', async () => {
      (prisma.shuConfig.findUnique as jest.Mock).mockResolvedValue(null);
      const createdConfig = {
        tenantId: mockTenantId,
        porsiJasaModal: 30,
        porsiJasaTransaksi: 30,
        porsiCadangan: 20,
        porsiPengurus: 5,
        porsiSosial: 5,
        porsiPembangunan: 10,
        includeStorePurchases: true,
        includeLoans: true,
        includeSavingsDeposit: false,
        enableLiveEstimation: false,
      };
      (prisma.shuConfig.create as jest.Mock).mockResolvedValue(createdConfig);

      const result = await ShuService.getConfig(mockTenantId);

      expect(prisma.shuConfig.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: mockTenantId,
          porsiJasaModal: 30,
          porsiJasaTransaksi: 30,
          porsiCadangan: 20,
        }),
      });
      expect(result).toEqual(createdConfig);
    });

    it('harus sukses mengupdate konfigurasi jika total alokasi persentase pas 100%', async () => {
      const existingConfig = {
        tenantId: mockTenantId,
        porsiJasaModal: 30,
        porsiJasaTransaksi: 30,
        porsiCadangan: 20,
        porsiPengurus: 5,
        porsiSosial: 5,
        porsiPembangunan: 10,
        includeStorePurchases: true,
        includeLoans: true,
        includeSavingsDeposit: false,
        enableLiveEstimation: false,
      };
      (prisma.shuConfig.findUnique as jest.Mock).mockResolvedValue(existingConfig);

      const updateDto = {
        porsiJasaModal: 40,
        porsiJasaTransaksi: 30,
        porsiCadangan: 15,
        porsiPengurus: 5,
        porsiSosial: 5,
        porsiPembangunan: 5, // Total = 100%
      };
      (prisma.shuConfig.upsert as jest.Mock).mockResolvedValue({ tenantId: mockTenantId, ...updateDto });

      const result = await ShuService.updateConfig(mockTenantId, updateDto, 'operator-123');

      expect(prisma.shuConfig.upsert).toHaveBeenCalled();
      expect(result.porsiJasaModal).toBe(40);
      expect(activityLogService.logEvent).toHaveBeenCalledWith(expect.objectContaining({
        event_type: 'COOP_SHU_CONFIG_UPDATED',
        tenant_id: mockTenantId,
        user_id: 'operator-123',
      }));
    });

    it('harus menolak update konfigurasi jika total persentase tidak sama dengan 100%', async () => {
      const existingConfig = {
        tenantId: mockTenantId,
        porsiJasaModal: 30,
        porsiJasaTransaksi: 30,
        porsiCadangan: 20,
        porsiPengurus: 5,
        porsiSosial: 5,
        porsiPembangunan: 10,
      };
      (prisma.shuConfig.findUnique as jest.Mock).mockResolvedValue(existingConfig);

      const invalidDto = {
        porsiJasaModal: 50,
        porsiJasaTransaksi: 50,
        porsiCadangan: 20, // Total = 140%
      };

      await expect(ShuService.updateConfig(mockTenantId, invalidDto)).rejects.toThrow(
        /Total persentase alokasi SHU harus 100%/
      );
      expect(prisma.shuConfig.upsert).not.toHaveBeenCalled();
    });
  });

  describe('2. getPeriods & createPeriod', () => {
    it('harus mengambil daftar periode SHU terurut dari tahun terbaru', async () => {
      const mockPeriods = [
        { id: 'p-2026', year: 2026, status: 'DRAFT', _count: { Allocations: 0 } },
        { id: 'p-2025', year: 2025, status: 'DISTRIBUTED', _count: { Allocations: 150 } },
      ];
      (prisma.shuPeriod.findMany as jest.Mock).mockResolvedValue(mockPeriods);

      const result = await ShuService.getPeriods(mockTenantId);

      expect(prisma.shuPeriod.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
        orderBy: { year: 'desc' },
        include: { _count: { select: { Allocations: true } } },
      });
      expect(result).toHaveLength(2);
      expect(result[0].year).toBe(2026);
    });

    it('harus sukses membuat periode SHU baru dengan status DRAFT dan kalkulasi totalShu', async () => {
      (prisma.shuPeriod.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.shuConfig.findUnique as jest.Mock).mockResolvedValue({
        porsiJasaModal: 30,
        porsiJasaTransaksi: 30,
        porsiCadangan: 20,
        porsiPengurus: 5,
        porsiSosial: 5,
        porsiPembangunan: 10,
        includeStorePurchases: true,
        includeLoans: true,
        includeSavingsDeposit: false,
      });

      const createDto = {
        year: 2026,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        totalRevenue: 50_000_000,
        totalExpense: 20_000_000,
        notes: 'Tahun buku 2026',
      };

      const createdPeriod = {
        id: 'period-2026',
        tenantId: mockTenantId,
        year: 2026,
        totalRevenue: 50_000_000,
        totalExpense: 20_000_000,
        totalShu: 30_000_000,
        status: 'DRAFT',
      };
      (prisma.shuPeriod.create as jest.Mock).mockResolvedValue(createdPeriod);

      const result = await ShuService.createPeriod(mockTenantId, createDto, 'operator-create-1');

      expect(prisma.shuPeriod.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: mockTenantId,
          year: 2026,
          totalRevenue: 50_000_000,
          totalExpense: 20_000_000,
          totalShu: 30_000_000,
          status: 'DRAFT',
        }),
      });
      expect(result.totalShu).toBe(30_000_000);
      expect(activityLogService.logEvent).toHaveBeenCalledWith(expect.objectContaining({
        event_type: 'COOP_SHU_PERIOD_CREATED',
        tenant_id: mockTenantId,
        user_id: 'operator-create-1',
      }));
    });

    it('harus menolak pembuatan periode jika tahun buku sudah pernah dibuat', async () => {
      (prisma.shuPeriod.findFirst as jest.Mock).mockResolvedValue({ id: 'p-exist', year: 2026 });

      await expect(
        ShuService.createPeriod(mockTenantId, {
          year: 2026,
          startDate: '2026-01-01',
          endDate: '2026-12-31',
        })
      ).rejects.toThrow('Periode SHU tahun 2026 sudah ada.');

      expect(prisma.shuPeriod.create).not.toHaveBeenCalled();
    });
  });

  describe('3. updatePeriodRules & deletePeriod - Proteksi Status & Aturan RAT', () => {
    it('harus sukses mengubah aturan RAT jika periode berstatus DRAFT dan total = 100%', async () => {
      const mockPeriod = {
        id: 'p-1',
        tenantId: mockTenantId,
        status: 'DRAFT',
        porsiJasaModal: 30,
        porsiJasaTransaksi: 30,
        porsiCadangan: 20,
        porsiPengurus: 5,
        porsiSosial: 5,
        porsiPembangunan: 10,
        includeStorePurchases: true,
        includeLoans: true,
        includeSavingsDeposit: false,
      };
      (prisma.shuPeriod.findFirst as jest.Mock).mockResolvedValue(mockPeriod);
      (prisma.shuPeriod.update as jest.Mock).mockResolvedValue({ ...mockPeriod, porsiJasaModal: 35, porsiJasaTransaksi: 25 });

      const result = await ShuService.updatePeriodRules('p-1', mockTenantId, {
        porsiJasaModal: 35,
        porsiJasaTransaksi: 25,
      });

      expect(prisma.shuPeriod.update).toHaveBeenCalled();
      expect(result.porsiJasaModal).toBe(35);
    });

    it('harus menolak mengubah aturan RAT jika periode sudah disetujui (APPROVED)', async () => {
      (prisma.shuPeriod.findFirst as jest.Mock).mockResolvedValue({
        id: 'p-1',
        tenantId: mockTenantId,
        status: 'APPROVED',
      });

      await expect(
        ShuService.updatePeriodRules('p-1', mockTenantId, { porsiJasaModal: 40 })
      ).rejects.toThrow(/sudah disetujui atau didistribusikan telah terkunci/);

      expect(prisma.shuPeriod.update).not.toHaveBeenCalled();
    });

    it('harus menolak menghapus periode yang sudah APPROVED atau DISTRIBUTED', async () => {
      (prisma.shuPeriod.findFirst as jest.Mock).mockResolvedValue({
        id: 'p-1',
        tenantId: mockTenantId,
        status: 'DISTRIBUTED',
      });

      await expect(ShuService.deletePeriod('p-1', mockTenantId)).rejects.toThrow(
        /sudah disetujui atau didistribusikan tidak dapat dihapus/
      );

      expect(prisma.shuPeriod.delete).not.toHaveBeenCalled();
    });

    it('harus mengizinkan penghapusan periode jika berstatus DRAFT atau CALCULATED', async () => {
      (prisma.shuPeriod.findFirst as jest.Mock).mockResolvedValue({
        id: 'p-1',
        tenantId: mockTenantId,
        status: 'DRAFT',
      });
      (prisma.shuPeriod.delete as jest.Mock).mockResolvedValue({ id: 'p-1' });

      const result = await ShuService.deletePeriod('p-1', mockTenantId);

      expect(prisma.shuPeriod.delete).toHaveBeenCalledWith({ where: { id: 'p-1' } });
      expect(result).toEqual({ id: 'p-1' });
    });
  });

  describe('4. getPeriodDetail', () => {
    it('harus mengembalikan detail periode dan alokasi anggota dengan nama yang teresolusi', async () => {
      const mockDetail = {
        id: 'p-1',
        year: 2026,
        status: 'CALCULATED',
        totalShu: 25_000_000,
        Allocations: [
          {
            id: 'alloc-1',
            memberId: 'm-1',
            totalShu: 500_000,
            Member: {
              memberNo: 'MBR-001',
              Siswa: { nama_siswa: 'Budi Santoso' },
              Guru: null,
              User: null,
            },
          },
          {
            id: 'alloc-2',
            memberId: 'm-2',
            totalShu: 750_000,
            Member: {
              memberNo: 'MBR-002',
              Siswa: null,
              Guru: { nama_guru: 'Dra. Sri Wahyuni' },
              User: null,
            },
          },
        ],
      };
      (prisma.shuPeriod.findFirst as jest.Mock).mockResolvedValue(mockDetail);

      const result = await ShuService.getPeriodDetail('p-1', mockTenantId);

      expect(result.period.id).toBe('p-1');
      expect(result.allocations).toHaveLength(2);
      expect(result.allocations[0].Member.name).toBe('Budi Santoso');
      expect(result.allocations[1].Member.name).toBe('Dra. Sri Wahyuni');
    });

    it('harus melempar error jika periode tidak ditemukan pada getPeriodDetail', async () => {
      (prisma.shuPeriod.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(ShuService.getPeriodDetail('p-unknown', mockTenantId)).rejects.toThrow(
        'Periode SHU tidak ditemukan.'
      );
    });
  });

  describe('5. approvePeriod (Persetujuan Ketua)', () => {
    it('harus sukses menyetujui periode jika berstatus CALCULATED', async () => {
      (prisma.shuPeriod.findFirst as jest.Mock).mockResolvedValue({
        id: 'p-1',
        tenantId: mockTenantId,
        status: 'CALCULATED',
      });
      (prisma.shuPeriod.update as jest.Mock).mockResolvedValue({
        id: 'p-1',
        status: 'APPROVED',
        approvedBy: mockUserId,
      });

      const result = await ShuService.approvePeriod('p-1', mockTenantId, mockUserId);

      expect(prisma.shuPeriod.update).toHaveBeenCalledWith({
        where: { id: 'p-1' },
        data: expect.objectContaining({
          status: 'APPROVED',
          approvedBy: mockUserId,
        }),
      });
      expect(result.status).toBe('APPROVED');
      expect(activityLogService.logEvent).toHaveBeenCalledWith(expect.objectContaining({
        event_type: 'COOP_SHU_PERIOD_APPROVED',
        tenant_id: mockTenantId,
        user_id: mockUserId,
      }));
    });

    it('harus menolak persetujuan jika periode belum berstatus CALCULATED (masih DRAFT)', async () => {
      (prisma.shuPeriod.findFirst as jest.Mock).mockResolvedValue({
        id: 'p-1',
        tenantId: mockTenantId,
        status: 'DRAFT',
      });

      await expect(ShuService.approvePeriod('p-1', mockTenantId, mockUserId)).rejects.toThrow(
        'SHU harus dikalkulasi terlebih dahulu sebelum disetujui.'
      );
      expect(prisma.shuPeriod.update).not.toHaveBeenCalled();
    });
  });

  describe('6. distributeShu (Distribusi ke Simpanan Sukarela & Idempotency)', () => {
    it('harus menolak distribusi jika periode belum berstatus APPROVED', async () => {
      (prisma.shuPeriod.findFirst as jest.Mock).mockResolvedValue({
        id: 'p-1',
        tenantId: mockTenantId,
        status: 'CALCULATED',
      });

      await expect(ShuService.distributeShu('p-1', mockTenantId)).rejects.toThrow(
        'SHU harus disetujui Ketua sebelum dapat didistribusikan.'
      );
    });

    it('harus sukses mendistribusikan dividen SHU ke tabungan sukarela anggota', async () => {
      const mockPeriod = {
        id: 'p-1',
        year: 2026,
        tenantId: mockTenantId,
        status: 'APPROVED',
      };
      (prisma.shuPeriod.findFirst as jest.Mock).mockResolvedValue(mockPeriod);

      const mockAllocations = [
        {
          id: 'alloc-1',
          memberId: 'm-1',
          totalShu: 250_000,
          Member: {
            id: 'm-1',
            savings: [
              { id: 'sav-1', amount: 1_000_000, category: { code: 'SUKARELA' } },
            ],
          },
        },
      ];
      (prisma.shuAllocation.findMany as jest.Mock).mockResolvedValue(mockAllocations);
      (prisma.savingCategory.findFirst as jest.Mock).mockResolvedValue({ id: 'cat-sukarela', code: 'SUKARELA' });
      (prisma.shuAllocation.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.saving.update as jest.Mock).mockResolvedValue({ id: 'sav-1', amount: 1_250_000 });
      (prisma.savingTransaction.create as jest.Mock).mockResolvedValue({ id: 'tx-1' });

      const result = await ShuService.distributeShu('p-1', mockTenantId, undefined, 'operator-distribute-1');

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.saving.update).toHaveBeenCalledWith({
        where: { id: 'sav-1' },
        data: { amount: { increment: 250_000 } },
      });
      expect(prisma.savingTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          savingId: 'sav-1',
          amount: 250_000,
          type: 'INTEREST',
        }),
      });
      expect(result.distributed).toBe(1);
      expect(activityLogService.logEvent).toHaveBeenCalledWith(expect.objectContaining({
        event_type: 'COOP_SHU_PERIOD_DISTRIBUTED',
        tenant_id: mockTenantId,
        user_id: 'operator-distribute-1',
      }));
    });
  });

  describe('7. getMyShuHistory (Riwayat SHU Anggota)', () => {
    it('harus mengembalikan riwayat SHU anggota yang sudah DISTRIBUTED', async () => {
      const mockMember = {
        id: 'm-me-1',
        userId: mockUserId,
        tenantId: mockTenantId,
      };
      (prisma.member.findFirst as jest.Mock).mockResolvedValue(mockMember);

      const mockHistory = [
        {
          id: 'alloc-2025',
          totalShu: 350_000,
          jasaModal: 200_000,
          jasaTransaksi: 150_000,
          status: 'DISTRIBUTED',
          Period: { year: 2025 },
        },
      ];
      (prisma.shuAllocation.findMany as jest.Mock).mockResolvedValue(mockHistory);

      const result = await ShuService.getMyShuHistory(mockTenantId, mockUserId);

      expect(prisma.member.findFirst).toHaveBeenCalledWith({
        where: { userId: mockUserId, tenantId: mockTenantId },
      });
      expect(result).toHaveLength(1);
      expect(result[0].totalShu).toBe(350_000);
    });

    it('harus mengembalikan array kosong jika user bukan anggota koperasi aktif', async () => {
      (prisma.member.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await ShuService.getMyShuHistory(mockTenantId, 'unknown-user');

      expect(result).toEqual([]);
      expect(prisma.shuAllocation.findMany).not.toHaveBeenCalled();
    });
  });

  describe('8. Hardening & Security Audit Trail (Phase 4 Standards)', () => {
    it('harus mencatat audit log COOP_SHU_PERIOD_DELETED saat periode dihapus', async () => {
      (prisma.shuPeriod.findFirst as jest.Mock).mockResolvedValue({
        id: 'p-draft',
        year: 2026,
        tenantId: mockTenantId,
        status: 'DRAFT',
      });
      (prisma.shuPeriod.delete as jest.Mock).mockResolvedValue({ id: 'p-draft' });

      await ShuService.deletePeriod('p-draft', mockTenantId, 'admin-delete-user');

      expect(activityLogService.logEvent).toHaveBeenCalledWith(expect.objectContaining({
        event_type: 'COOP_SHU_PERIOD_DELETED',
        tenant_id: mockTenantId,
        user_id: 'admin-delete-user',
        entity: 'ShuPeriod',
      }));
    });

    it('harus mencatat audit log COOP_SHU_PERIOD_RULES_UPDATED saat aturan RAT periode diperbarui', async () => {
      (prisma.shuPeriod.findFirst as jest.Mock).mockResolvedValue({
        id: 'p-draft-rules',
        year: 2026,
        tenantId: mockTenantId,
        status: 'DRAFT',
        porsiJasaModal: 30,
        porsiJasaTransaksi: 30,
        porsiCadangan: 20,
        porsiPengurus: 5,
        porsiSosial: 5,
        porsiPembangunan: 10,
      });
      (prisma.shuPeriod.update as jest.Mock).mockResolvedValue({ id: 'p-draft-rules', porsiJasaModal: 40 });

      await ShuService.updatePeriodRules(
        'p-draft-rules',
        mockTenantId,
        { porsiJasaModal: 40, porsiPembangunan: 0 },
        'admin-rules-user'
      );

      expect(activityLogService.logEvent).toHaveBeenCalledWith(expect.objectContaining({
        event_type: 'COOP_SHU_PERIOD_RULES_UPDATED',
        tenant_id: mockTenantId,
        user_id: 'admin-rules-user',
        entity: 'ShuPeriod',
      }));
    });
  });
});
