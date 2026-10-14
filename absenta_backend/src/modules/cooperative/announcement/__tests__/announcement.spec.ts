import { AnnouncementService } from '../announcement.service';
import { prisma } from '@/utils/prisma';
import { activityLogService } from '../../../activity/services/activity-log.service';

// Mock dependencies
jest.mock('@/utils/prisma', () => ({
  prisma: {
    announcement: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

jest.mock('../../../activity/services/activity-log.service', () => ({
  activityLogService: {
    logEvent: jest.fn(),
  },
}));

describe('AnnouncementService - Pengumuman Koperasi Unit & Isolation Tests (Phase 3 TDD & Phase 5 QA)', () => {
  const mockTenantId = 'tenant-announcement-test';
  const mockOperatorId = 'user-admin-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. getAnnouncements & getAnnouncementById', () => {
    it('harus mengambil seluruh pengumuman aktif milik tenant dengan urutan createdAt descending', async () => {
      const mockAnnouncements = [
        {
          id: 'ann-1',
          tenantId: mockTenantId,
          title: 'Rapat Anggota Tahunan 2026',
          content: 'RAT akan diselenggarakan pada akhir bulan.',
          isActive: true,
          createdAt: new Date('2026-03-01'),
        },
        {
          id: 'ann-2',
          tenantId: mockTenantId,
          title: 'Diskon Belanja Ramadhan',
          content: 'Potongan belanja 10% untuk seluruh anggota.',
          isActive: true,
          createdAt: new Date('2026-02-15'),
        },
      ];
      (prisma.announcement.findMany as jest.Mock).mockResolvedValue(mockAnnouncements);

      const result = await AnnouncementService.getAnnouncements(mockTenantId);

      expect(prisma.announcement.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId, isActive: true },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('ann-1');
    });

    it('harus mengambil detail pengumuman tunggal jika ID ditemukan', async () => {
      const mockAnnouncement = {
        id: 'ann-1',
        tenantId: mockTenantId,
        title: 'Pengumuman Penting',
        content: 'Isi pengumuman penting',
        isActive: true,
      };
      (prisma.announcement.findFirst as jest.Mock).mockResolvedValue(mockAnnouncement);

      const result = await AnnouncementService.getAnnouncementById('ann-1', mockTenantId);

      expect(prisma.announcement.findFirst).toHaveBeenCalledWith({
        where: { id: 'ann-1', tenantId: mockTenantId, isActive: true },
      });
      expect(result).toEqual(mockAnnouncement);
    });

    it('harus melempar error jika pengumuman tidak ditemukan pada getAnnouncementById', async () => {
      (prisma.announcement.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        AnnouncementService.getAnnouncementById('ann-unknown', mockTenantId)
      ).rejects.toThrow('Pengumuman tidak ditemukan');
    });
  });

  describe('2. createAnnouncement - Validasi & Audit Trail', () => {
    it('harus sukses membuat pengumuman baru dan mencatat audit trail log', async () => {
      const payload = {
        title: '  Pengumuman Jam Operasional  ',
        content: '  Koperasi buka mulai pukul 08:00 hingga 16:00 WIB.  ',
      };

      const createdAnnouncement = {
        id: 'ann-new-1',
        tenantId: mockTenantId,
        title: 'Pengumuman Jam Operasional',
        content: 'Koperasi buka mulai pukul 08:00 hingga 16:00 WIB.',
        isActive: true,
      };

      (prisma.announcement.create as jest.Mock).mockResolvedValue(createdAnnouncement);

      const result = await AnnouncementService.createAnnouncement(mockTenantId, payload, mockOperatorId);

      expect(prisma.announcement.create).toHaveBeenCalledWith({
        data: {
          tenantId: mockTenantId,
          title: 'Pengumuman Jam Operasional',
          content: 'Koperasi buka mulai pukul 08:00 hingga 16:00 WIB.',
          isActive: true,
        },
      });

      expect(activityLogService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'COOP_ANNOUNCEMENT_CREATED',
          tenant_id: mockTenantId,
          user_id: mockOperatorId,
          entity: 'Announcement',
          entity_id: 'ann-new-1',
          metadata: expect.objectContaining({
            title: 'Pengumuman Jam Operasional',
          }),
        })
      );

      expect(result).toEqual(createdAnnouncement);
    });

    it('harus melempar error jika judul pengumuman kosong atau hanya whitespace', async () => {
      await expect(
        AnnouncementService.createAnnouncement(mockTenantId, { title: '   ', content: 'Konten valid' }, mockOperatorId)
      ).rejects.toThrow('Judul pengumuman wajib diisi.');

      await expect(
        AnnouncementService.createAnnouncement(mockTenantId, { title: '', content: 'Konten valid' }, mockOperatorId)
      ).rejects.toThrow('Judul pengumuman wajib diisi.');
    });

    it('harus melempar error jika konten pengumuman kosong atau hanya whitespace', async () => {
      await expect(
        AnnouncementService.createAnnouncement(mockTenantId, { title: 'Judul Valid', content: '   ' }, mockOperatorId)
      ).rejects.toThrow('Konten pengumuman wajib diisi.');

      await expect(
        AnnouncementService.createAnnouncement(mockTenantId, { title: 'Judul Valid', content: '' }, mockOperatorId)
      ).rejects.toThrow('Konten pengumuman wajib diisi.');
    });
  });

  describe('3. deleteAnnouncement - Penghapusan & Audit Trail', () => {
    it('harus sukses menghapus pengumuman dan mencatat audit trail log', async () => {
      const existing = {
        id: 'ann-to-del',
        tenantId: mockTenantId,
        title: 'Pengumuman Kedaluwarsa',
      };
      (prisma.announcement.findFirst as jest.Mock).mockResolvedValue(existing);
      (prisma.announcement.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

      const result = await AnnouncementService.deleteAnnouncement('ann-to-del', mockTenantId, mockOperatorId);

      expect(prisma.announcement.findFirst).toHaveBeenCalledWith({
        where: { id: 'ann-to-del', tenantId: mockTenantId },
      });
      expect(prisma.announcement.deleteMany).toHaveBeenCalledWith({
        where: { id: 'ann-to-del', tenantId: mockTenantId },
      });
      expect(activityLogService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'COOP_ANNOUNCEMENT_DELETED',
          tenant_id: mockTenantId,
          user_id: mockOperatorId,
          entity: 'Announcement',
          entity_id: 'ann-to-del',
          metadata: expect.objectContaining({
            title: 'Pengumuman Kedaluwarsa',
          }),
        })
      );
      expect(result).toEqual({ count: 1 });
    });

    it('harus melempar error jika pengumuman yang ingin dihapus tidak ditemukan', async () => {
      (prisma.announcement.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        AnnouncementService.deleteAnnouncement('ann-non-existent', mockTenantId, mockOperatorId)
      ).rejects.toThrow('Pengumuman tidak ditemukan');

      expect(prisma.announcement.deleteMany).not.toHaveBeenCalled();
      expect(activityLogService.logEvent).not.toHaveBeenCalled();
    });
  });
});
