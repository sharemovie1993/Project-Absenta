import { requireCapability } from '@/middlewares/requireCapability';
import { supportTicketService } from '../services/support-ticket.service';
import { prisma } from '@/utils/prisma';
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

        // Ambil profil tiket lengkap beserta Tenant untuk dipancarkan ke WebSocket superadmin
        const fullTicket = await prisma.supportTicket.findUnique({
          where: { id: ticket.id },
          include: {
            Tenant: {
              select: {
                id: true,
                name: true,
                status: true
              }
            },
            Creator: {
              select: {
                id: true,
                full_name: true,
                email: true
              }
            }
          }
        });

        // Pancarkan event real-time ke Tim CS Nasional
        const io = request.server.io || request.server.ioApi;
        if (io) {
          io.to('role:SUPERADMIN').to('role:PLATFORM_SUPPORT').emit('support:ticket_created', fullTicket);

          // 🔥 AUTO-ESCALATION: SLA Breach Peringatan Darurat Real-Time untuk tiket URGENT
          if (fullTicket && fullTicket.priority === SupportTicketPriority.URGENT) {
            io.to('role:SUPERADMIN').to('role:PLATFORM_SUPPORT').emit('support:sla_warning', {
              ticketId: fullTicket.id,
              ticketNumber: fullTicket.ticket_number,
              schoolName: fullTicket.Tenant?.name || 'Sekolah',
              title: fullTicket.title,
              priority: fullTicket.priority,
              createdAt: fullTicket.created_at || new Date()
            });
            request.log.warn(`[SLA ESCALATION] Tiket URGENT baru diajukan oleh ${fullTicket.Tenant?.name || 'Sekolah'} - Tiket #${fullTicket.ticket_number}`);
          }
        }

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

        // Fetch sender profile details to build a complete real-time payload
        const sender = await prisma.user.findUnique({
          where: { id: senderId },
          select: { id: true, full_name: true, role_id: true }
        });

        // Broadcast the message real-time via Socket.io
        const io = request.server.io;
        const ioApi = request.server.ioApi;
        const socketPayload = {
          id: msg.id,
          ticket_id: msg.ticket_id,
          sender_id: msg.sender_id,
          sender_type: msg.sender_type,
          message: msg.message,
          attachments: msg.attachments,
          created_at: msg.created_at,
          Sender: sender
        };

        // Send to customer tenant room
        const tenantRoom = `tenant:${tenantId}`;
        if (io) io.to(tenantRoom).emit('support:message', socketPayload);
        if (ioApi) ioApi.to(tenantRoom).emit('support:message', socketPayload);

        // Send to support agents and superadmins
        const supportRoom = 'role:SUPERADMIN';
        if (io) {
          io.to(supportRoom).emit('support:message', socketPayload);
          io.to('role:PLATFORM_SUPPORT').emit('support:message', socketPayload);
        }
        if (ioApi) {
          ioApi.to(supportRoom).emit('support:message', socketPayload);
          ioApi.to('role:PLATFORM_SUPPORT').emit('support:message', socketPayload);
        }

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

        // Broadcast perubahan status CLOSED secara real-time ke Tim CS & Superadmin
        const io = request.server.io;
        const ioApi = request.server.ioApi;
        const socketPayload = {
          id: ticketId,
          status: 'CLOSED',
          rating: numericRating,
          rating_comment: comment,
          rated_at: ticket.rated_at
        };

        const supportRoom = 'role:SUPERADMIN';
        if (io) {
          io.to(supportRoom).emit('support:ticket_rated', socketPayload);
          io.to('role:PLATFORM_SUPPORT').emit('support:ticket_rated', socketPayload);
        }
        if (ioApi) {
          ioApi.to(supportRoom).emit('support:ticket_rated', socketPayload);
          ioApi.to('role:PLATFORM_SUPPORT').emit('support:ticket_rated', socketPayload);
        }

        return { success: true, message: 'Terima kasih atas penilaian Anda!', data: ticket };
      } catch (err: any) {
        reply.status(500);
        return { success: false, message: err.message || 'Gagal memproses penilaian.' };
      }
    }
  });


  // =========================================================================
  // 🛠️ DASBOR HELPDESK PLATFORM (CS/CR - Cross-Tenant)
  // =========================================================================

  /**
   * 6. Mengambil Seluruh Antrean Tiket Masuk secara Nasional
   */
  fastify.get('/admin', {
    preHandler: [requireCapability('admin.tickets.view.list')],
    handler: async (request: any, reply: any) => {
      try {
        const { status, priority, category, search } = request.query || {};

        const tickets = await supportTicketService.getAllTicketsAdmin({
          status: status as SupportTicketStatus,
          priority: priority as SupportTicketPriority,
          category: category as SupportTicketCategory,
          search: search as string
        });

        return { success: true, message: 'Daftar tiket nasional berhasil diambil.', data: tickets };
      } catch (err: any) {
        reply.status(500);
        return { success: false, message: err.message || 'Gagal memuat antrean tiket.' };
      }
    }
  });

  /**
   * 7. Mengambil Detail Tiket & Context Kesehatan Tenant untuk CS/CR
   */
  fastify.get('/admin/:id', {
    preHandler: [requireCapability('admin.tickets.view.detail')],
    handler: async (request: any, reply: any) => {
      try {
        const ticketId = request.params.id;

        if (!ticketId) {
          reply.status(400);
          return { success: false, message: 'Parameter ID tidak valid.' };
        }

        const ticket = await supportTicketService.getTicketDetail(ticketId);

        if (!ticket) {
          reply.status(404);
          return { success: false, message: 'Tiket tidak ditemukan.' };
        }

        return { success: true, message: 'Detail tiket admin berhasil diambil.', data: ticket };
      } catch (err: any) {
        reply.status(500);
        return { success: false, message: err.message || 'Gagal memuat detail tiket.' };
      }
    }
  });

  /**
   * 8. Menugaskan / Mengklaim Tiket Bantuan ke Agen CS
   */
  fastify.patch('/admin/:id/assign', {
    preHandler: [requireCapability('admin.tickets.manage.assign')],
    handler: async (request: any, reply: any) => {
      try {
        const ticketId = request.params.id;
        const { assigned_to_id } = request.body || {};

        if (!ticketId || !assigned_to_id) {
          reply.status(400);
          return { success: false, message: 'ID Tiket dan ID Agen wajib diisi.' };
        }

        const ticket = await supportTicketService.assignTicket(ticketId, assigned_to_id);

        return { success: true, message: 'Tiket berhasil didelegasikan.', data: ticket };
      } catch (err: any) {
        reply.status(500);
        return { success: false, message: err.message || 'Gagal Mendelegasikan Tiket.' };
      }
    }
  });

  /**
   * 9. Mengubah Status & Prioritas Tiket Secara Manual oleh Agen CS
   */
  fastify.patch('/admin/:id/status', {
    preHandler: [requireCapability('admin.tickets.manage.status')],
    handler: async (request: any, reply: any) => {
      try {
        const ticketId = request.params.id;
        const { status, priority } = request.body || {};

        if (!ticketId) {
          reply.status(400);
          return { success: false, message: 'ID Tiket tidak valid.' };
        }

        const ticket = await supportTicketService.updateStatusAndPriority(ticketId, {
          status: status as SupportTicketStatus,
          priority: priority as SupportTicketPriority
        });

        return { success: true, message: 'Status/Prioritas tiket berhasil diperbarui.', data: ticket };
      } catch (err: any) {
        reply.status(500);
        return { success: false, message: err.message || 'Gagal memperbarui status.' };
      }
    }
  });

  /**
   * 10. Mengirim Solusi / Tanggapan Percakapan oleh Agen CS (Support)
   */
  fastify.post('/admin/:id/messages', {
    preHandler: [requireCapability('admin.tickets.reply')],
    handler: async (request: any, reply: any) => {
      try {
        const ticketId = request.params.id;
        const senderId = request.user?.id;
        const { message, attachments, is_internal } = request.body || {};

        if (!ticketId || !senderId || !message) {
          reply.status(400);
          return { success: false, message: 'Balasan solusi dan parameter wajib diisi.' };
        }

        const msg = await supportTicketService.replyTicket({
          ticketId,
          senderId,
          senderType: SupportTicketSenderType.SUPPORT,
          message,
          attachments: attachments || [],
          is_internal: !!is_internal // 📝 Catatan internal khusus staf
        });

        // Fetch sender profile details to build a complete real-time payload
        const sender = await prisma.user.findUnique({
          where: { id: senderId },
          select: { id: true, full_name: true, role_id: true }
        });

        // Retrieve ticket to find target tenant ID
        const ticket = await prisma.supportTicket.findUnique({
          where: { id: ticketId },
          select: { tenant_id: true }
        });

        // Broadcast the message real-time via Socket.io
        const io = request.server.io;
        const ioApi = request.server.ioApi;
        const socketPayload = {
          id: msg.id,
          ticket_id: msg.ticket_id,
          sender_id: msg.sender_id,
          sender_type: msg.sender_type,
          message: msg.message,
          attachments: msg.attachments,
          is_internal: msg.is_internal, // 📝 Kirim status catatan internal
          created_at: msg.created_at,
          Sender: sender
        };

        // 🔐 KEAMANAN BROADCAST WEBSOCKET:
        // Jika catatan internal, DILARANG broadcast ke Klien Sekolah (tenantRoom)
        if (!msg.is_internal && ticket?.tenant_id) {
          const tenantRoom = `tenant:${ticket.tenant_id}`;
          if (io) io.to(tenantRoom).emit('support:message', socketPayload);
          if (ioApi) ioApi.to(tenantRoom).emit('support:message', socketPayload);
        }

        const supportRoom = 'role:SUPERADMIN';
        if (io) {
          io.to(supportRoom).emit('support:message', socketPayload);
          io.to('role:PLATFORM_SUPPORT').emit('support:message', socketPayload);
        }
        if (ioApi) {
          ioApi.to(supportRoom).emit('support:message', socketPayload);
          ioApi.to('role:PLATFORM_SUPPORT').emit('support:message', socketPayload);
        }

        reply.status(201);
        return { success: true, message: 'Balasan solusi berhasil dikirim.', data: msg };
      } catch (err: any) {
        reply.status(500);
        return { success: false, message: err.message || 'Gagal mengirim solusi.' };
      }
    }
  });

  /**
   * 11. Mengambil Template Balasan Cepat (Quick Replies) untuk CS
   */
  fastify.get('/admin/quick-replies', {
    preHandler: [requireCapability('admin.tickets.view.list')],
    handler: async (_request: any, reply: any) => {
      try {
        const replies = await supportTicketService.getQuickReplies();
        return { success: true, data: replies };
      } catch (err: any) {
        reply.status(500);
        return { success: false, message: err.message || 'Gagal mengambil template.' };
      }
    }
  });

  /**
   * 12. Mencari Panduan Troubleshooting Internal (Knowledge Base)
   */
  fastify.get('/admin/knowledge-base', {
    preHandler: [requireCapability('admin.tickets.view.list')],
    handler: async (request: any, reply: any) => {
      try {
        const { search } = request.query || {};
        const faq = await supportTicketService.getKnowledgeBase(search as string);
        return { success: true, data: faq };
      } catch (err: any) {
        reply.status(500);
        return { success: false, message: err.message || 'Gagal mencari panduan.' };
      }
    }
  });

  /**
   * 13. Mengambil SLA Dashboard & Analytics CS
   */
  fastify.get('/admin/analytics', {
    preHandler: [requireCapability('admin.tickets.view.list')],
    handler: async (_request: any, reply: any) => {
      try {
        const stats = await supportTicketService.getSupportAnalytics();
        return { success: true, data: stats };
      } catch (err: any) {
        reply.status(500);
        return { success: false, message: err.message || 'Gagal memuat analitik.' };
      }
    }
  });

  /**
   * 14. Membuat FAQ Baru (Admin)
   */
  fastify.post('/admin/knowledge-base', {
    preHandler: [requireCapability('admin.tickets.view.list')],
    handler: async (request: any, reply: any) => {
      try {
        const { title, content, tags } = request.body || {};
        if (!title || !content) {
          reply.status(400);
          return { success: false, message: 'Judul dan Konten FAQ wajib diisi.' };
        }
        const faq = await supportTicketService.createKnowledgeBase({ title, content, tags: tags || [] });
        return { success: true, message: 'FAQ berhasil ditambahkan.', data: faq };
      } catch (err: any) {
        reply.status(500);
        return { success: false, message: err.message || 'Gagal menambahkan FAQ.' };
      }
    }
  });

  /**
   * 15. Memperbarui FAQ (Admin)
   */
  fastify.patch('/admin/knowledge-base/:id', {
    preHandler: [requireCapability('admin.tickets.view.list')],
    handler: async (request: any, reply: any) => {
      try {
        const { id } = request.params;
        const { title, content, tags } = request.body || {};
        const faq = await supportTicketService.updateKnowledgeBase(id, { title, content, tags });
        return { success: true, message: 'FAQ berhasil diperbarui.', data: faq };
      } catch (err: any) {
        reply.status(500);
        return { success: false, message: err.message || 'Gagal memperbarui FAQ.' };
      }
    }
  });

  /**
   * 16. Menghapus FAQ (Admin)
   */
  fastify.delete('/admin/knowledge-base/:id', {
    preHandler: [requireCapability('admin.tickets.view.list')],
    handler: async (request: any, reply: any) => {
      try {
        const { id } = request.params;
        await supportTicketService.deleteKnowledgeBase(id);
        return { success: true, message: 'FAQ berhasil dihapus.' };
      } catch (err: any) {
        reply.status(500);
        return { success: false, message: err.message || 'Gagal menghapus FAQ.' };
      }
    }
  });

  /**
   * 17. Membuat Balasan Cepat Baru (Admin)
   */
  fastify.post('/admin/quick-replies', {
    preHandler: [requireCapability('admin.tickets.view.list')],
    handler: async (request: any, reply: any) => {
      try {
        const { shortcut, title, content, category } = request.body || {};
        if (!shortcut || !title || !content || !category) {
          reply.status(400);
          return { success: false, message: 'Semua kolom balasan cepat wajib diisi.' };
        }
        const replyItem = await supportTicketService.createQuickReply({ shortcut, title, content, category });
        return { success: true, message: 'Balasan cepat berhasil dibuat.', data: replyItem };
      } catch (err: any) {
        reply.status(500);
        return { success: false, message: err.message || 'Gagal membuat balasan cepat.' };
      }
    }
  });

  /**
   * 18. Memperbarui Balasan Cepat (Admin)
   */
  fastify.patch('/admin/quick-replies/:id', {
    preHandler: [requireCapability('admin.tickets.view.list')],
    handler: async (request: any, reply: any) => {
      try {
        const { id } = request.params;
        const { shortcut, title, content, category } = request.body || {};
        const replyItem = await supportTicketService.updateQuickReply(id, { shortcut, title, content, category });
        return { success: true, message: 'Balasan cepat berhasil diperbarui.', data: replyItem };
      } catch (err: any) {
        reply.status(500);
        return { success: false, message: err.message || 'Gagal memperbarui balasan cepat.' };
      }
    }
  });

  /**
   * 19. Menghapus Balasan Cepat (Admin)
   */
  fastify.delete('/admin/quick-replies/:id', {
    preHandler: [requireCapability('admin.tickets.view.list')],
    handler: async (request: any, reply: any) => {
      try {
        const { id } = request.params;
        await supportTicketService.deleteQuickReply(id);
        return { success: true, message: 'Balasan cepat berhasil dihapus.' };
      } catch (err: any) {
        reply.status(500);
        return { success: false, message: err.message || 'Gagal menghapus balasan cepat.' };
      }
    }
  });
}
