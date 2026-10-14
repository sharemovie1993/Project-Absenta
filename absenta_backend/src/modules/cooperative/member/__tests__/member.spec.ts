import { MemberService } from '../member.service';
import { prisma } from '@/utils/prisma';
import { AccountingService } from '../../laporan/accounting.service';
import { SavingCategoryService } from '../../simpanan/saving-category.service';

jest.mock('@/utils/app-logger', () => ({
  appLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockImplementation((val: string) => Promise.resolve(`hashed_${val}`)),
  compare: jest.fn().mockImplementation((raw: string, hashed: string) => Promise.resolve(hashed === `hashed_${raw}`)),
}));

jest.mock('../../simpanan/saving-category.service', () => ({
  SavingCategoryService: {
    ensureDefaultCategories: jest.fn().mockResolvedValue([
      { id: 'cat-pokok', code: 'POKOK', name: 'Simpanan Pokok', accountCode: '2011' },
      { id: 'cat-wajib', code: 'WAJIB', name: 'Simpanan Wajib', accountCode: '2012' },
      { id: 'cat-sukarela', code: 'SUKARELA', name: 'Simpanan Sukarela', accountCode: '2013' }
    ])
  }
}));

jest.mock('../../laporan/accounting.service', () => ({
  AccountingService: {
    createJournalEntry: jest.fn().mockResolvedValue({ id: 'journal-123' })
  }
}));

jest.mock('@/utils/prisma', () => {
  const mockMember = {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockSiswa = {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  };

  const mockGuru = {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  };

  const mockUser = {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  const mockUserRole = {
    create: jest.fn(),
  };

  const mockRole = {
    findUnique: jest.fn().mockResolvedValue({ id: 'role-ext' }),
    findFirst: jest.fn().mockResolvedValue({ id: 'role-ext' }),
    create: jest.fn().mockResolvedValue({ id: 'role-ext' }),
  };

  const mockSavingCategory = {
    findMany: jest.fn().mockResolvedValue([
      { id: 'cat-pokok', code: 'POKOK', name: 'Simpanan Pokok', accountCode: '2011' },
      { id: 'cat-wajib', code: 'WAJIB', name: 'Simpanan Wajib', accountCode: '2012' },
      { id: 'cat-sukarela', code: 'SUKARELA', name: 'Simpanan Sukarela', accountCode: '2013' }
    ]),
    findFirst: jest.fn(),
  };

  const mockSaving = {
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  };

  const mockSavingTransaction = {
    create: jest.fn(),
  };

  const mockTx = {
    member: mockMember,
    siswa: mockSiswa,
    guru: mockGuru,
    user: mockUser,
    userRole: mockUserRole,
    role: mockRole,
    savingCategory: mockSavingCategory,
    saving: mockSaving,
    savingTransaction: mockSavingTransaction,
  };

  return {
    prisma: {
      member: mockMember,
      siswa: mockSiswa,
      guru: mockGuru,
      user: mockUser,
      userRole: mockUserRole,
      role: mockRole,
      savingCategory: mockSavingCategory,
      saving: mockSaving,
      savingTransaction: mockSavingTransaction,
      $transaction: jest.fn(async (callback: (tx: any) => Promise<any>) => {
        return await callback(mockTx);
      }),
    },
  };
});


describe('MemberService (Phase-3 Comprehensive Suite)', () => {
  const tenantId = 'tenant-test-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getNextMemberNo', () => {
    it('should return 001 if no members exist in tenant', async () => {
      (prisma.member.findMany as jest.Mock).mockResolvedValue([]);

      const nextNo = await MemberService.getNextMemberNo(tenantId);
      expect(nextNo).toBe('001');
    });

    it('should increment maximum memberNo with 3-digit padding', async () => {
      (prisma.member.findFirst as jest.Mock).mockResolvedValue({ memberNo: '042' });

      const nextNo = await MemberService.getNextMemberNo(tenantId);
      expect(nextNo).toBe('043');
    });

  });

  describe('getMembers & getMemberById', () => {
    it('should fetch and map member data with flat profile attributes', async () => {
      (prisma.member.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'mem-1',
          memberNo: '001',
          type: 'STUDENT',
          status: 'ACTIVE',
          Siswa: { nama_siswa: 'Budi Santoso', no_hp: '08123456789', alamat: 'Jl. Merdeka', nis: '1001' },
          Guru: null,
          User: { email: 'budi@school.id', full_name: 'Budi Santoso', no_hp: '08123456789' },
          savings: [{ id: 'sav-1', amount: 50000 }]
        }
      ]);

      const members = await MemberService.getMembers({ tenantId, tenantWide: true });
      expect(members).toHaveLength(1);
      expect(members[0].name).toBe('Budi Santoso');
      expect(members[0].identityNo).toBe('1001');
      expect(members[0].phone).toBe('08123456789');
      expect(members[0].address).toBe('Jl. Merdeka');
    });

    it('should return null if member does not exist in getMemberById', async () => {
      (prisma.member.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await MemberService.getMemberById('non-existent', { tenantId });
      expect(result).toBeNull();
    });

    it('should return active member for getMemberByUserId', async () => {
      (prisma.member.findFirst as jest.Mock).mockResolvedValue({
        id: 'mem-1',
        memberNo: '001',
        status: 'ACTIVE',
        User: { id: 'user-1', email: 'test@mail.com', full_name: 'Test Member' }
      });

      const result = await MemberService.getMemberByUserId(tenantId, 'user-1');
      expect(result).toBeDefined();
      expect(result?.memberNo).toBe('001');
    });
  });

  describe('createMember', () => {
    it('should throw error if member has no siswaId, guruId, or external flag', async () => {
      await expect(
        MemberService.createMember(tenantId, { name: 'No Link Member' })
      ).rejects.toThrow('Member must be linked to a Student, Teacher, or register as an External member');
    });

    it('should throw error if PIN format is invalid (not 6 digits)', async () => {
      await expect(
        MemberService.createMember(tenantId, { siswaId: 'siswa-1', pin: 'abc12' })
      ).rejects.toThrow('PIN harus berupa 6 digit angka');
    });

    it('should throw error if memberNo already exists', async () => {
      (prisma.member.findFirst as jest.Mock).mockResolvedValueOnce({ id: 'existing-mem', memberNo: '001' });

      await expect(
        MemberService.createMember(tenantId, { siswaId: 'siswa-1', memberNo: '001', pin: '123456' })
      ).rejects.toThrow('Member No 001 already exists');
    });

    it('should throw error if student is already a member', async () => {
      (prisma.member.findFirst as jest.Mock)
        .mockResolvedValueOnce(null) // memberNo check
        .mockResolvedValueOnce({ id: 'existing-mem', siswaId: 'siswa-1' }); // student uniqueness check

      await expect(
        MemberService.createMember(tenantId, { siswaId: 'siswa-1', pin: '123456' })
      ).rejects.toThrow('Student is already a member');
    });

    it('should create student member, initialize default savings accounts, and return member', async () => {
      (prisma.member.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.member.findMany as jest.Mock).mockResolvedValue([]); // getNextMemberNo -> 001
      (prisma.siswa.findUnique as jest.Mock).mockResolvedValue({
        id: 'siswa-1',
        user_id: 'user-siswa-1',
        nama_siswa: 'Siswa Test'
      });

      const createdMemberData = {
        id: 'mem-new',
        tenantId,
        memberNo: '001',
        type: 'STUDENT',
        status: 'ACTIVE',
        siswaId: 'siswa-1',
        userId: 'user-siswa-1'
      };

      (prisma.member.create as jest.Mock).mockResolvedValue(createdMemberData);

      const result = await MemberService.createMember(tenantId, {
        siswaId: 'siswa-1',
        pin: '123456'
      });

      expect(result).toBeDefined();
      expect(result.id).toBe('mem-new');
      expect(prisma.saving.create).toHaveBeenCalled();
    });

    it('should create external member with auto-generated user and role', async () => {
      (prisma.member.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.member.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'user-ext-1',
        email: 'warga@koperasi.local'
      });
      (prisma.role.findUnique as jest.Mock).mockResolvedValue({ id: 'role-ext' });

      (prisma.member.create as jest.Mock).mockResolvedValue({
        id: 'mem-ext',
        tenantId,
        memberNo: '001',
        type: 'EXTERNAL',
        status: 'ACTIVE',
        userId: 'user-ext-1'
      });

      const result = await MemberService.createMember(tenantId, {
        isExternal: true,
        name: 'Warga Sekitar',
        email: 'warga@koperasi.local',
        phone: '0855123456',
        pin: '654321'
      });

      expect(result).toBeDefined();
      expect(result.type).toBe('EXTERNAL');
      expect(prisma.user.create).toHaveBeenCalled();
    });

    it('should return cached member on idempotent request', async () => {
      (prisma.member.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.member.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.siswa.findUnique as jest.Mock).mockResolvedValue({ id: 's-1', user_id: 'u-1' });
      (prisma.member.create as jest.Mock).mockResolvedValue({ id: 'mem-idem', memberNo: '001' });

      const res1 = await MemberService.createMember(tenantId, { siswaId: 's-1' }, 'idem-mem-key-1');
      const res2 = await MemberService.createMember(tenantId, { siswaId: 's-1' }, 'idem-mem-key-1');

      expect(res1).toEqual(res2);
      expect(prisma.member.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateMember & deleteMember', () => {
    it('should update member with hashed PIN if PIN is updated', async () => {
      (prisma.member.findFirst as jest.Mock).mockResolvedValue({ id: 'mem-1', status: 'ACTIVE' });
      (prisma.member.update as jest.Mock).mockResolvedValue({
        id: 'mem-1',
        status: 'ACTIVE',
        pin: 'hashed_999888'
      });

      const updated = await MemberService.updateMember('mem-1', tenantId, {
        status: 'ACTIVE',
        pin: '999888'
      });

      expect(updated.pin).toBe('hashed_999888');
      expect(prisma.member.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'mem-1' },
          data: expect.objectContaining({ pin: 'hashed_999888' })
        })
      );
    });

    it('should throw error when deleting non-existent member', async () => {
      (prisma.member.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        MemberService.deleteMember('mem-not-found', tenantId)
      ).rejects.toThrow('Member not found');
    });

    it('should delete member when found', async () => {
      (prisma.member.findFirst as jest.Mock).mockResolvedValue({ id: 'mem-del' });
      (prisma.member.delete as jest.Mock).mockResolvedValue({ id: 'mem-del' });

      const res = await MemberService.deleteMember('mem-del', tenantId);
      expect(res.id).toBe('mem-del');
    });
  });

  describe('terminateMember', () => {
    it('should throw error if member not found or already inactive', async () => {
      (prisma.member.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(
        MemberService.terminateMember('mem-unknown', tenantId)
      ).rejects.toThrow('Member not found');

      (prisma.member.findFirst as jest.Mock).mockResolvedValue({ id: 'mem-inact', status: 'INACTIVE' });
      await expect(
        MemberService.terminateMember('mem-inact', tenantId)
      ).rejects.toThrow('Member is already terminated/inactive');
    });

    it('should withdraw all savings, create journal entries, and set status to INACTIVE', async () => {
      const activeMember = {
        id: 'mem-term',
        memberNo: '010',
        status: 'ACTIVE',
        savings: [
          { id: 'sav-1', amount: 100000, category: { code: 'POKOK', name: 'Simpanan Pokok', accountCode: '2011' } },
          { id: 'sav-2', amount: 50000, category: { code: 'WAJIB', name: 'Simpanan Wajib', accountCode: '2012' } },
          { id: 'sav-3', amount: 25000, category: { code: 'SUKARELA', name: 'Simpanan Sukarela', accountCode: '2013' } }
        ]
      };

      (prisma.member.findFirst as jest.Mock).mockResolvedValue(activeMember);
      (prisma.savingTransaction.create as jest.Mock).mockResolvedValue({ id: 'tx-withdraw-1' });
      (prisma.saving.update as jest.Mock).mockResolvedValue({ amount: 0 });
      (prisma.member.update as jest.Mock).mockResolvedValue({ ...activeMember, status: 'INACTIVE' });

      const payout = await MemberService.terminateMember('mem-term', tenantId, 'admin-1');

      expect(payout.pokok).toBe(100000);
      expect(payout.wajib).toBe(50000);
      expect(payout.sukarela).toBe(25000);
      expect(payout.total).toBe(175000);
      expect(AccountingService.createJournalEntry).toHaveBeenCalledTimes(3);
      expect(prisma.member.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'mem-term' },
          data: expect.objectContaining({ status: 'INACTIVE' })
        })
      );
    });
  });

  describe('createBulkMembers', () => {
    it('should throw error if ids array is empty', async () => {
      await expect(
        MemberService.createBulkMembers(tenantId, 'STUDENT', [])
      ).rejects.toThrow('List of IDs cannot be empty');
    });

    it('should bulk register students and create accounts', async () => {
      (prisma.member.findMany as jest.Mock).mockResolvedValue([{ memberNo: '002' }]);
      (prisma.siswa.findUnique as jest.Mock).mockImplementation(({ where }: any) => {
        return Promise.resolve({ id: where.id, nama_siswa: `Siswa ${where.id}`, user_id: `user-${where.id}` });
      });
      (prisma.member.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.member.create as jest.Mock).mockImplementation(({ data }: any) => {
        return Promise.resolve({ id: `mem-${data.memberNo}`, ...data });
      });

      const res = await MemberService.createBulkMembers(tenantId, 'STUDENT', ['siswa-1', 'siswa-2']);
      expect(res.success).toBe(true);
      expect(res.count).toBe(2);
      expect(SavingCategoryService.ensureDefaultCategories).toHaveBeenCalled();
      expect(prisma.member.create).toHaveBeenCalledTimes(2);
    });

    it('should throw error if one of the students is already registered', async () => {
      (prisma.member.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.siswa.findUnique as jest.Mock).mockResolvedValue({ id: 'siswa-dup', nama_siswa: 'Siswa Duplikat' });
      (prisma.member.findFirst as jest.Mock).mockResolvedValue({ id: 'existing-mem' });

      await expect(
        MemberService.createBulkMembers(tenantId, 'STUDENT', ['siswa-dup'])
      ).rejects.toThrow('sudah terdaftar sebagai anggota koperasi');
    });
  });

  describe('getNonMembers', () => {
    it('should return students who are not members yet', async () => {
      (prisma.siswa.findMany as jest.Mock).mockResolvedValue([
        {
          id: 's-10',
          nama_siswa: 'Calon Anggota',
          nis: '1099',
          Kelas: { nama_kelas: 'X-IPA-1' },
          user_id: 'u-10',
          email: 'calon@mail.com',
          no_hp: '08123456',
          alamat: 'Alamat'
        }
      ]);

      const list = await MemberService.getNonMembers(tenantId, 'STUDENT', { search: 'Calon' });
      expect(list).toHaveLength(1);
      expect(list[0].name).toBe('Calon Anggota');
      expect(list[0].className).toBe('X-IPA-1');
    });
  });

  describe('importBulkMembers', () => {
    it('should import valid rows and collect errors for missing identity', async () => {
      (prisma.siswa.findFirst as jest.Mock).mockResolvedValue({ id: 's-1', user_id: 'u-1' });
      (prisma.siswa.update as jest.Mock).mockResolvedValue({ id: 's-1' });
      (prisma.member.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.member.create as jest.Mock).mockResolvedValue({ id: 'mem-imp', tenantId, memberNo: '001' });

      const rows = [
        { memberNo: '001', type: 'STUDENT', identityNo: '1001' },
        { memberNo: '', type: 'STUDENT', identityNo: '1002' } // Invalid memberNo
      ];

      const result = await MemberService.importBulkMembers(tenantId, rows);
      expect(result.successCount).toBe(1);
      expect(result.failCount).toBe(1);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('Phase-4 Performance Caching & Invalidation', () => {
    it('should return cached members on subsequent getMembers call and query DB only once', async () => {
      MemberService.invalidateCache(tenantId);
      (prisma.member.findMany as jest.Mock).mockResolvedValueOnce([
        {
          id: 'mem-cache-1',
          memberNo: '001',
          type: 'STUDENT',
          status: 'ACTIVE',
          Siswa: { nama_siswa: 'Cached Student', no_hp: '-', alamat: '-', nis: '999' },
          Guru: null,
          User: null,
          savings: []
        }
      ]);

      const res1 = await MemberService.getMembers({ tenantId, tenantWide: true });
      const res2 = await MemberService.getMembers({ tenantId, tenantWide: true });

      expect(res1).toEqual(res2);
      expect(prisma.member.findMany).toHaveBeenCalledTimes(1);
    });

    it('should refresh from DB after invalidateCache is called', async () => {
      MemberService.invalidateCache(tenantId);
      (prisma.member.findMany as jest.Mock)
        .mockResolvedValueOnce([
          {
            id: 'mem-cache-1',
            memberNo: '001',
            type: 'STUDENT',
            status: 'ACTIVE',
            Siswa: { nama_siswa: 'Version 1', no_hp: '-', alamat: '-', nis: '999' },
            Guru: null,
            User: null,
            savings: []
          }
        ])
        .mockResolvedValueOnce([
          {
            id: 'mem-cache-1',
            memberNo: '001',
            type: 'STUDENT',
            status: 'ACTIVE',
            Siswa: { nama_siswa: 'Version 2 (Refreshed)', no_hp: '-', alamat: '-', nis: '999' },
            Guru: null,
            User: null,
            savings: []
          }
        ]);

      const res1 = await MemberService.getMembers({ tenantId, tenantWide: true });
      expect(res1[0].name).toBe('Version 1');

      // Invalidate cache
      MemberService.invalidateCache(tenantId);

      const res2 = await MemberService.getMembers({ tenantId, tenantWide: true });
      expect(res2[0].name).toBe('Version 2 (Refreshed)');
      expect(prisma.member.findMany).toHaveBeenCalledTimes(2);
    });
  });
});

