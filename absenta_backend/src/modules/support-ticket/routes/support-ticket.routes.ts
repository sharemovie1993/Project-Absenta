import { requireCapability } from '@/middlewares/requireCapability';
import { supportTicketService } from '../services/support-ticket.service';
import { 
  SupportTicketCategory, 
  SupportTicketPriority, 
  SupportTicketStatus, 
  SupportTicketSenderType 
} from '@prisma/client';

export async function supportTicketRoutes(fastify: any) {
  
  // =========================================================================
  // 👥 PORTAL KLIEN (SEKOLAH - Multi-Tenant)
  // =========================================================================

  /**
   * 1. Membuat Tiket Bantuan Baru untuk Sekolah yang Sedang Berjalan
   */
  fastify.post('/', {
    preHandler: [requireCapability('support.tickets.create')],
    handler: async (request: any, reply: any) => {
      try {
        const tenantId = request.tenantId ?? request.user?.tenantId ?? request.user?.tenant_id;
        const creatorId = request.user?.id;

        if (!tenantId || !creatorId) {
          reply.status(400);
          return { success: false, message: 'Identitas Sekolah atau Pengguna tidak valid.' };
        }

        const { title, description, category, priority, attachments } = request.body || {};

        if (!title || !description) {
          reply.status(400);
          return { success: false, message: 'Judul dan Deskripsi keluhan wajib diisi.' };
        }

        const ticket = await supportTicketService.createTicket({
          tenantId,
          creatorId,
          title,
          description,
          category: category || SupportTicketCategory.TECHNICAL,
          priority: priority || SupportTicketPriority.MEDIUM,
          attachments: attachments || []
        });

        reply.status(201);
        return { success: true, message: 'Tiket keluhan berhasil dibuat.', data: ticket };
      } catch (err: any) {
        reply.status(500);
        return { success: false, message: err.message || 'Gagal membuat tiket.' };
      }
    }
  });

  /**
   * 2. Mendapatkan Daftar Tiket Milik Sekolah Berjalan
   */
  fastify.get('/', {
    preHandler: [requireCapability('support.tickets.view')],
    handler: async (request: any, reply: any) => {
      try {
        const tenantId = request.tenantId ?? request.user?.tenantId ?? request.user?.tenant_id;

        if (!tenantId) {
          reply.status(400);
          return { success: false, message: 'Identitas Sekolah tidak valid.' };
        }

        const { status, category } = request.query || {};

        const tickets = await supportTicketService.getTicketsForTenant(tenantId, {
          status: status as SupportTicketStatus,
          category: category as SupportTicketCategory
        });

        return { success: true, message: 'Daftar tiket berhasil diambil.', data: tickets };
      } catch (err: any) {
        reply.status(500);
        return { success: false, message: err.message || 'Gagal memuat tiket.' };
      }
    }
  });

  /**
   * 3. Mendapatkan Detail Tiket Milik Sekolah Berjalan (Terisolasi Tenant)
   */
  fastify.get('/:id', {
    preHandler: [requireCapability('support.tickets.view')],
    handler: async (request: any, reply: any) => {
      try {
        const tenantId = request.tenantId ?? request.user?.tenantId ?? request.user?.tenant_id;
        const ticketId = request.params.id;

        if (!tenantId || !ticketId) {
          reply.status(400);
          return { success: false, message: 'Parameter tidak valid.' };
        }

        const ticket = await supportTicketService.getTicketDetail(ticketId, tenantId);

        if (!ticket) {
          reply.status(404);
          return { success: false, message: 'Tiket tidak ditemukan atau Anda tidak memiliki akses.' };
        }

        return { success: true, message: 'Detail tiket berhasil dimuat.', data: ticket };
      } catch (err: any) {
        reply.status(500);
        return { success: false, message: err.message || 'Gagal memuat detail tiket.' };
      }
    }
  });

  /**
   * 4. Mengirim Pesan Balasan di Thread Keluhan Sekolah (Customer)
   */
  fastify.post('/:id/messages', {
    preHandler: [requireCapability('support.tickets.reply')],
    handler: async (request: any, reply: any) => {
      try {
        const tenantId = request.tenantId ?? request.user?.tenantId ?? request.user?.tenant_id;
        const ticketId = request.params.id;
        const senderId = request.user?.id;
        const { message, attachments } = request.body || {};

        if (!tenantId || !ticketId || !senderId || !message) {
          reply.status(400);
          return { success: false, message: 'Pesan wajib diisi dan parameter harus lengkap.' };
        }

        const msg = await supportTicketService.replyTicket({
          ticketId,
          senderId,
          senderType: SupportTicketSenderType.CUSTOMER,
          message,
          attachments: attachments || [],
          tenantId
        });

        reply.status(201);
        return { success: true, message: 'Balasan berhasil terkirim.', data: msg };
      } catch (err: any) {
        reply.status(500);
        return { success: false, message: err.message || 'Gagal mengirim balasan.' };
      }
    }
  });

  /**
   * 5. Menandai Tiket Selesai / Teratasi oleh Sekolah
   */
  fastify.patch('/:id/resolve', {
    preHandler: [requireCapability('support.tickets.resolve')],
    handler: async (request: any, reply: any) => {
      try {
        const tenantId = request.tenantId ?? request.user?.tenantId ?? request.user?.tenant_id;
        const ticketId = request.params.id;

        if (!tenantId || !ticketId) {
          reply.status(400);
          return { success: false, message: 'Parameter tidak valid.' };
        }

        const ticket = await supportTicketService.resolveTicket(ticketId, tenantId);

        return { success: true, message: 'Tiket keluhan berhasil ditandai selesai.', data: ticket };
      } catch (err: any) {
        reply.status(500);
        return { success: false, message: err.message || 'Gagal menyelesaikan tiket.' };
      }
    }
  });

  /**
   * 5.1. Memberikan Penilaian Layanan CSAT (Rating & Feedback) oleh Sekolah
   */
  fastify.post('/:id/rate', {
    preHandler: [requireCapability('support.tickets.resolve')],
    handler: async (request: any, reply: any) => {
      try {
        const tenantId = request.tenantId ?? request.user?.tenantId ?? request.user?.tenant_id;
        const ticketId = request.params.id;
        const { rating, comment } = request.body || {};

        if (!tenantId || !ticketId || !rating) {
          reply.status(400);
          return { success: false, message: 'Parameter tidak valid. Nilai bintang (rating) wajib diisi.' };
        }

        const numericRating = Number(rating);
        if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
          reply.status(400);
          return { success: false, message: 'Nilai bintang harus berkisar antara 1 hingga 5.' };
        }

        const ticket = await supportTicketService.rateTicket({
          ticketId,
          tenantId,
          rating: numericRating,
          comment
        });

        return { success: true, message: 'Terima kasih atas penilaian Anda!', data: ticket };
      } catch (err: any) {
        reply.status(500);
        return { success: false, message: err.message || 'Gagal memproses penilaian.' };
      }
    }
  });
}
