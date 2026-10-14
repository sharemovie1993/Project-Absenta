import { TicketService } from '../ticket.service';
import { prisma } from '@/utils/prisma';
import { activityLogService } from '../../../activity/services/activity-log.service';

// Mock dependencies
jest.mock('@/utils/prisma', () => ({
  prisma: {
    ticket: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    ticketMessage: {
      create: jest.fn(),
    },
  },
}));

jest.mock('../../../activity/services/activity-log.service', () => ({
  activityLogService: {
    logEvent: jest.fn(),
  },
}));

describe('TicketService - Pusat Aduan Unit & Isolation Tests (Phase 3 TDD & Phase 5 QA)', () => {
  const mockTenantId = 'tenant-ticket-test';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. getTickets & getTicketById', () => {
    it('harus mengambil seluruh tiket milik tenant jika memberId tidak ditentukan', async () => {
      const mockTickets = [
        { id: 't-1', subject: 'Kendala Simpanan', status: 'OPEN', member: { name: 'Ahmad' } },
        { id: 't-2', subject: 'Salah Potong Kasir', status: 'IN_PROGRESS', member: { name: 'Budi' } },
      ];
      (prisma.ticket.findMany as jest.Mock).mockResolvedValue(mockTickets);

      const result = await TicketService.getTickets(mockTenantId);

      expect(prisma.ticket.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
        include: { member: true, _count: { select: { messages: true } } },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(2);
    });

    it('harus memfilter tiket berdasarkan memberId jika ditentukan (Aduan Saya)', async () => {
      (prisma.ticket.findMany as jest.Mock).mockResolvedValue([]);

      await TicketService.getTickets(mockTenantId, 'member-123');

      expect(prisma.ticket.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId, memberId: 'member-123' },
        include: { member: true, _count: { select: { messages: true } } },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('harus mengembalikan detail tiket beserta relasi pesan jika ID valid', async () => {
      const mockTicket = {
        id: 't-1',
        subject: 'Kendala RFID',
        status: 'OPEN',
        member: { name: 'Siti' },
        messages: [{ id: 'm-1', content: 'Kartu tidak terbaca', isStaff: false }],
      };
      (prisma.ticket.findUnique as jest.Mock).mockResolvedValue(mockTicket);

      const result = await TicketService.getTicketById('t-1');

      expect(prisma.ticket.findUnique).toHaveBeenCalledWith({
        where: { id: 't-1' },
        include: {
          member: { select: { name: true } },
          messages: { orderBy: { createdAt: 'asc' } },
        },
      });
      expect(result.subject).toBe('Kendala RFID');
    });

    it('harus melempar error jika tiket tidak ditemukan', async () => {
      (prisma.ticket.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        TicketService.getTicketById('t-none')
      ).rejects.toThrow('Ticket not found');
    });
  });

  describe('2. createTicket', () => {
    it('harus menolak pembuatan tiket jika subjek kosong', async () => {
      await expect(
        TicketService.createTicket(mockTenantId, { subject: '   ', message: 'Ada kendala' })
      ).rejects.toThrow('Subjek aduan wajib diisi.');
    });

    it('harus menolak pembuatan tiket jika pesan aduan kosong', async () => {
      await expect(
        TicketService.createTicket(mockTenantId, { subject: 'Kendala', message: '' })
      ).rejects.toThrow('Pesan aduan wajib diisi.');
    });

    it('harus berhasil membuat tiket aduan baru dengan status OPEN dan mencatat audit log', async () => {
      const input = {
        subject: 'Struk Belanja Tidak Keluar',
        priority: 'HIGH',
        message: 'Kertas struk macet di printer kasir',
        memberId: 'member-001',
      };

      const createdMock = {
        id: 'ticket-new-1',
        tenantId: mockTenantId,
        subject: input.subject,
        priority: 'HIGH',
        status: 'OPEN',
        memberId: 'member-001',
        messages: [{ id: 'msg-1', content: input.message, isStaff: false }],
      };

      (prisma.ticket.create as jest.Mock).mockResolvedValue(createdMock);

      const result = await TicketService.createTicket(mockTenantId, input, 'user-operator-1');

      expect(prisma.ticket.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: mockTenantId,
            subject: 'Struk Belanja Tidak Keluar',
            priority: 'HIGH',
            status: 'OPEN',
            memberId: 'member-001',
          }),
        })
      );
      expect(activityLogService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'COOP_TICKET_CREATED',
          tenant_id: mockTenantId,
          entity: 'Ticket',
          entity_id: 'ticket-new-1',
        })
      );
      expect(result.id).toBe('ticket-new-1');
    });
  });

  describe('3. replyTicket', () => {
    it('harus menolak balasan jika konten pesan kosong', async () => {
      await expect(
        TicketService.replyTicket('t-1', '   ', true)
      ).rejects.toThrow('Isi balasan aduan tidak boleh kosong.');
    });

    it('harus melempar error jika tiket yang dibalas tidak ditemukan', async () => {
      (prisma.ticket.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        TicketService.replyTicket('t-nonexistent', 'Mohon ditunggu', true)
      ).rejects.toThrow('Ticket not found');
    });

    it('harus berhasil menambahkan balasan, mengupdate status tiket menjadi IN_PROGRESS jika OPEN, dan mencatat audit', async () => {
      const existingTicket = {
        id: 't-1',
        tenantId: mockTenantId,
        subject: 'Kendala Simpanan',
        status: 'OPEN',
      };

      (prisma.ticket.findUnique as jest.Mock).mockResolvedValue(existingTicket);
      (prisma.ticketMessage.create as jest.Mock).mockResolvedValue({
        id: 'msg-reply-1',
        ticketId: 't-1',
        content: 'Sedang kami proses pengecekan ke sistem akuntansi',
        isStaff: true,
      });

      const reply = await TicketService.replyTicket(
        't-1',
        'Sedang kami proses pengecekan ke sistem akuntansi',
        true,
        'user-staff-1'
      );

      expect(prisma.ticketMessage.create).toHaveBeenCalledWith({
        data: {
          ticketId: 't-1',
          content: 'Sedang kami proses pengecekan ke sistem akuntansi',
          isStaff: true,
        },
      });
      expect(prisma.ticket.update).toHaveBeenCalledWith({
        where: { id: 't-1' },
        data: { status: 'IN_PROGRESS' },
      });
      expect(activityLogService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'COOP_TICKET_REPLIED',
          tenant_id: mockTenantId,
          entity: 'TicketMessage',
        })
      );
      expect(reply.id).toBe('msg-reply-1');
    });
  });

  describe('4. updateStatus', () => {
    it('harus menolak update jika status yang diberikan tidak valid', async () => {
      await expect(
        TicketService.updateStatus('t-1', 'INVALID_STATUS' as any)
      ).rejects.toThrow('Status tiket tidak valid');
    });

    it('harus melempar error jika tiket tidak ditemukan saat update status', async () => {
      (prisma.ticket.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        TicketService.updateStatus('t-missing', 'CLOSED')
      ).rejects.toThrow('Ticket not found');
    });

    it('harus berhasil memperbarui status tiket dan mencatat audit status', async () => {
      const existingTicket = {
        id: 't-1',
        tenantId: mockTenantId,
        subject: 'Perbaikan Mesin POS',
        status: 'IN_PROGRESS',
      };

      (prisma.ticket.findUnique as jest.Mock).mockResolvedValue(existingTicket);
      (prisma.ticket.update as jest.Mock).mockResolvedValue({
        ...existingTicket,
        status: 'CLOSED',
      });

      const updated = await TicketService.updateStatus('t-1', 'CLOSED', 'user-manager-1');

      expect(prisma.ticket.update).toHaveBeenCalledWith({
        where: { id: 't-1' },
        data: { status: 'CLOSED' },
      });
      expect(activityLogService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'COOP_TICKET_STATUS_UPDATED',
          tenant_id: mockTenantId,
          entity: 'Ticket',
          entity_id: 't-1',
          metadata: expect.objectContaining({
            oldStatus: 'IN_PROGRESS',
            newStatus: 'CLOSED',
          }),
        })
      );
      expect(updated.status).toBe('CLOSED');
    });
  });
});
