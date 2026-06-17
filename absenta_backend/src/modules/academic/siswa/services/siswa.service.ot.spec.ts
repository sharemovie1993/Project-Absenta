import { SiswaService } from './siswa.service';
import { prisma } from '@/utils/prisma';
import { parentAuthService } from '@/modules/parent-app/services/parent-auth.service';

// Mock Prisma
jest.mock('@/utils/prisma', () => ({
  prisma: {
    siswa: {
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
    },
    orangTua: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    orangTuaSiswa: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
    },
    kelas: {
      findFirst: jest.fn(),
    },
    tahunPelajaran: {
      findFirst: jest.fn(),
    },
    semester: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(prisma)),
  },
}));

jest.mock('@/modules/parent-app/services/parent-auth.service', () => ({
  parentAuthService: {
    ensureToken: jest.fn(),
  },
}));

describe('SiswaService - OrangTua Relations', () => {
  const siswaService = new SiswaService();
  const mockTenantId = 'tenant-123';
  const mockSiswaId = 'siswa-123';
  const mockParentId = 'parent-123';
  const mockKelasId = 'kelas-123';
  const scope: any = { tenantId: mockTenantId };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createSiswa with OrangTua', () => {
    it('should create new OrangTua and link via OrangTuaSiswa', async () => {
      (prisma.kelas.findFirst as jest.Mock).mockResolvedValue({ id: mockKelasId, tenant_id: mockTenantId });
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: 'user-123', tenant_id: mockTenantId });
      
      (prisma.siswa.create as jest.Mock).mockResolvedValue({
        id: mockSiswaId,
        tenant_id: mockTenantId,
        nama_siswa: 'Test Siswa'
      });

      // Mock OrangTua creation
      (prisma.orangTua.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.orangTua.create as jest.Mock).mockResolvedValue({
        id: mockParentId,
        tenant_id: mockTenantId,
        nama: 'Parent 1',
        no_hp: '08123456789'
      });

      // Mock return with relations
      (prisma.siswa.findFirst as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: mockSiswaId,
          nama_siswa: 'Test Siswa',
          OrangTuaSiswa: [{ OrangTua: { id: mockParentId, nama: 'Parent 1' } }],
        });

      const input = {
        user_id: 'user-123',
        nama_siswa: 'Test Siswa',
        kelas_id: mockKelasId,
        nis: '12345',
        skipQuotaCheck: true,
        orang_tua: [
          { nama: 'Parent 1', no_hp: '08123456789', hubungan: 'AYAH' }
        ]
      };

      const result = await siswaService.createSiswa(input as any, scope);

      // Verify Siswa created
      expect(prisma.siswa.create).toHaveBeenCalled();

      // Verify OrangTua created
      expect(prisma.orangTua.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          nama: 'Parent 1',
          no_hp: '08123456789',
          tenant_id: mockTenantId
        })
      });

      // Verify Link created
      expect(prisma.orangTuaSiswa.create).toHaveBeenCalledWith({
        data: {
          orang_tua_id: mockParentId,
          siswa_id: mockSiswaId
        }
      });

      expect(parentAuthService.ensureToken).toHaveBeenCalledWith(mockParentId);

      // Verify response formatting
      expect(result.OrangTua).toHaveLength(1);
      expect(result.OrangTua![0].id).toBe(mockParentId);
    });

    it('should deduplicate OrangTua based on no_hp', async () => {
      (prisma.kelas.findFirst as jest.Mock).mockResolvedValue({ id: mockKelasId, tenant_id: mockTenantId });
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: 'user-123', tenant_id: mockTenantId });
      (prisma.siswa.create as jest.Mock).mockResolvedValue({
        id: mockSiswaId,
        tenant_id: mockTenantId
      });

      // Mock existing parent found by no_hp
      const existingParentId = 'existing-parent-id';
      (prisma.orangTua.findFirst as jest.Mock).mockResolvedValue({
        id: existingParentId,
        nama: 'Existing Parent',
        no_hp: '08123456789'
      });

      // Mock return
      (prisma.siswa.findFirst as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: mockSiswaId,
          OrangTuaSiswa: [{ OrangTua: { id: existingParentId, nama: 'Existing Parent' } }],
        });

      const input = {
        user_id: 'user-123',
        nama_siswa: 'Test Siswa',
        kelas_id: mockKelasId,
        nis: '12345',
        skipQuotaCheck: true,
        orang_tua: [
          { nama: 'New Name', no_hp: '08123456789', hubungan: 'AYAH' }
        ]
      };

      await siswaService.createSiswa(input as any, scope);

      // Verify search for existing parent
      expect(prisma.orangTua.findFirst).toHaveBeenCalledWith({
        where: { tenant_id: mockTenantId, no_hp: '08123456789' }
      });

      // Verify NO new OrangTua created
      expect(prisma.orangTua.create).not.toHaveBeenCalled();
      expect(prisma.orangTua.update).not.toHaveBeenCalled();

      // Verify Link created to EXISTING parent
      expect(prisma.orangTuaSiswa.create).toHaveBeenCalledWith({
        data: {
          orang_tua_id: existingParentId,
          siswa_id: mockSiswaId
        }
      });
    });
  });

  describe('updateSiswa with OrangTua', () => {
    it('should link existing parent when id is provided', async () => {
        // Mock find existing siswa
        (prisma.siswa.findFirst as jest.Mock).mockReset();
        (prisma.siswa.findFirst as jest.Mock)
            .mockResolvedValueOnce({ id: mockSiswaId, tenant_id: mockTenantId }) // for check
            .mockResolvedValueOnce({ id: mockSiswaId, tenant_id: mockTenantId, OrangTuaSiswa: [] }); // for return

        (prisma.orangTuaSiswa.findMany as jest.Mock).mockResolvedValue([]); // No current links

        // Mock existing parent check
        (prisma.orangTua.findUnique as jest.Mock).mockResolvedValue({
            id: mockParentId,
            nama: 'Parent'
        });

        // Mock link check (not exists)
        (prisma.orangTuaSiswa.findUnique as jest.Mock).mockResolvedValue(null);

        const input = {
            orang_tua: [
                { id: mockParentId, hubungan: 'IBU' }
            ]
        };

        await siswaService.updateSiswa(mockSiswaId, input as any, scope);

        // Verify update parent
        expect(prisma.orangTua.update).toHaveBeenCalledWith({
            where: { id: mockParentId },
            data: expect.objectContaining({ hubungan: 'IBU' })
        });

        // Verify link created
        expect(prisma.orangTuaSiswa.create).toHaveBeenCalledWith({
            data: {
                orang_tua_id: mockParentId,
                siswa_id: mockSiswaId
            }
        });
    });
  });
});
