import { communicationService } from '../services/communication.service';
import { InternalThreadStatus } from '@prisma/client';

export async function communicationRoutes(fastify: any) {

  /**
   * 1. Ambil daftar percakapan aktif pengguna
   * GET /api/v1/communication
   */
  fastify.get('/', {
    handler: async (request: any, reply: any) => {
      try {
        const tenantId = request.tenantId ?? request.user?.tenantId ?? request.user?.tenant_id;
        const userId = request.user?.id;

        if (!tenantId || !userId) {
          reply.status(401);
          return { success: false, message: 'Autentikasi tidak valid.' };
        }

        const { type, category, status, search } = request.query || {};
        const threads = await communicationService.getMyThreads(tenantId, userId, {
          type,
          category,
          status,
          search
        });

        return { success: true, data: threads };
      } catch (err: any) {
        reply.status(500);
        return { success: false, message: err.message || 'Gagal mengambil daftar percakapan.' };
      }
    }
  });

  /**
   * 2. Ambil direktori kontak yang sah dihubungi (Terpandu Relasi Akademik)
   * GET /api/v1/communication/contacts
   */
  fastify.get('/contacts', {
    handler: async (request: any, reply: any) => {
      try {
        const tenantId = request.tenantId ?? request.user?.tenantId ?? request.user?.tenant_id;
        const userId = request.user?.id;

        if (!tenantId || !userId) {
          reply.status(401);
          return { success: false, message: 'Autentikasi tidak valid.' };
        }

        const contacts = await communicationService.getEligibleContacts(tenantId, userId);
        return { success: true, data: contacts };
      } catch (err: any) {
        reply.status(500);
        return { success: false, message: err.message || 'Gagal mengambil daftar kontak.' };
      }
    }
  });

  /**
   * 3. Ambil jumlah pesan belum dibaca (Unread Count)
   * GET /api/v1/communication/unread-count
   */
  fastify.get('/unread-count', {
    handler: async (request: any, reply: any) => {
      try {
        const tenantId = request.tenantId ?? request.user?.tenantId ?? request.user?.tenant_id;
        const userId = request.user?.id;

        if (!tenantId || !userId) {
          return { success: true, data: { unread_count: 0 } };
        }

        const count = await communicationService.getUnreadCount(tenantId, userId);
        return { success: true, data: { unread_count: count } };
      } catch (err: any) {
        reply.status(500);
        return { success: false, message: err.message || 'Gagal mengambil unread count.' };
      }
    }
  });

  /**
   * 4. Ambil detail thread dan riwayat pesannya
   * GET /api/v1/communication/:id
   */
  fastify.get('/:id', {
    handler: async (request: any, reply: any) => {
      try {
        const tenantId = request.tenantId ?? request.user?.tenantId ?? request.user?.tenant_id;
        const userId = request.user?.id;
        const { id: threadId } = request.params;

        if (!tenantId || !userId || !threadId) {
          reply.status(400);
          return { success: false, message: 'Parameter permintaan tidak valid.' };
        }

        const detail = await communicationService.getThreadMessages(tenantId, threadId, userId);
        return { success: true, data: detail };
      } catch (err: any) {
        reply.status(400);
        return { success: false, message: err.message || 'Gagal mengambil detail pesan.' };
      }
    }
  });

  /**
   * 5. Buat percakapan baru / disposisi tugas baru
   * POST /api/v1/communication
   */
  fastify.post('/', {
    handler: async (request: any, reply: any) => {
      try {
        const tenantId = request.tenantId ?? request.user?.tenantId ?? request.user?.tenant_id;
        const userId = request.user?.id;
        const io = fastify.io || (fastify as any).ioApi;

        if (!tenantId || !userId) {
          reply.status(401);
          return { success: false, message: 'Autentikasi tidak valid.' };
        }

        const thread = await communicationService.createThread(tenantId, userId, request.body || {}, io);
        reply.status(201);
        return { success: true, message: 'Percakapan berhasil dibuat.', data: thread };
      } catch (err: any) {
        reply.status(400);
        return { success: false, message: err.message || 'Gagal membuat percakapan.' };
      }
    }
  });

  /**
   * 6. Kirim pesan baru ke dalam thread
   * POST /api/v1/communication/:id/messages
   */
  fastify.post('/:id/messages', {
    handler: async (request: any, reply: any) => {
      try {
        const tenantId = request.tenantId ?? request.user?.tenantId ?? request.user?.tenant_id;
        const userId = request.user?.id;
        const { id: threadId } = request.params;
        const io = fastify.io || (fastify as any).ioApi;

        if (!tenantId || !userId || !threadId) {
          reply.status(400);
          return { success: false, message: 'Parameter permintaan tidak valid.' };
        }

        const message = await communicationService.sendMessage(tenantId, threadId, userId, request.body || {}, io);
        reply.status(201);
        return { success: true, message: 'Pesan berhasil terkirim.', data: message };
      } catch (err: any) {
        reply.status(400);
        return { success: false, message: err.message || 'Gagal mengirim pesan.' };
      }
    }
  });

  /**
   * 7. Update status thread / disposisi (Selesai, Ditutup, Aktif)
   * PATCH /api/v1/communication/:id/status
   */
  fastify.patch('/:id/status', {
    handler: async (request: any, reply: any) => {
      try {
        const tenantId = request.tenantId ?? request.user?.tenantId ?? request.user?.tenant_id;
        const userId = request.user?.id;
        const { id: threadId } = request.params;
        const { status } = request.body || {};
        const io = fastify.io || (fastify as any).ioApi;

        if (!tenantId || !userId || !threadId || !status) {
          reply.status(400);
          return { success: false, message: 'Parameter status tidak valid.' };
        }

        const updated = await communicationService.updateThreadStatus(
          tenantId, 
          threadId, 
          userId, 
          status as InternalThreadStatus, 
          io
        );
        return { success: true, message: 'Status berhasil diperbarui.', data: updated };
      } catch (err: any) {
        reply.status(400);
        return { success: false, message: err.message || 'Gagal memperbarui status.' };
      }
    }
  });
}
