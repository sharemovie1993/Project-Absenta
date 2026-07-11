import { sendResponse, sendError } from '../../../utils/response';
import { ParentChatService } from '../services/parent-chat.service';
import { prisma } from '../../../utils/prisma';
import { z } from 'zod';

const sendMessageSchema = z.object({
  session_id: z.string().uuid('ID Sesi harus berupa UUID yang valid'),
  message: z.string().min(1, 'Pesan tidak boleh kosong').max(5000),
});

const startSessionSchema = z.object({
  guru_id: z.string().uuid('ID Guru harus berupa UUID yang valid'),
});

export class ParentChatController {
  
  // === ORANG TUA SIDE ===

  static async startSession(req: any, reply: any) {
    try {
      const parent = req.parent;
      const parsed = startSessionSchema.parse(req.body);

      const childrenIds = parent.OrangTuaSiswa?.map((link: any) => link.Siswa?.id).filter(Boolean) || [];
      
      // Ambil kelas aktif anak-anak orang tua
      const studentAcad = await prisma.siswaAkademik.findMany({
        where: { siswa_id: { in: childrenIds } },
        select: { kelas_id: true }
      });
      const childKelasIds = studentAcad.map((sa) => sa.kelas_id).filter(Boolean) as string[];

      const targetGuru = await prisma.guru.findUnique({
        where: { id: parsed.guru_id }
      });

      if (!targetGuru) {
        return reply.status(404).send({ success: false, message: 'Guru tidak ditemukan' });
      }

      // Cari OrganizationalAssignment WALIKELAS
      const isWali = await prisma.organizationalAssignment.findFirst({
        where: {
          tenant_id: parent.tenant_id,
          user_id: targetGuru.user_id,
          kelas_id: { in: childKelasIds },
          is_active: true,
          Position: { code: 'WALIKELAS' }
        }
      });

      if (!isWali) {
        return reply.status(403).send({
          success: false,
          message: 'Anda hanya dapat memulai obrolan dengan Wali Kelas anak Anda saja.'
        });
      }

      const session = await ParentChatService.getOrCreateSession(parent.tenant_id, parent.id, parsed.guru_id);
      return sendResponse(reply, 201, true, 'Sesi obrolan berhasil dibuat', session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: error.errors.map((e) => e.message).join(', '),
          errors: error.errors,
        });
      }
      return sendError(reply, 500, 'Gagal memulai sesi obrolan', error);
    }
  }

  static async getParentSessions(req: any, reply: any) {
    try {
      const parent = req.parent;
      const result = await ParentChatService.getSessions(parent.tenant_id, parent.id, 'PARENT');
      return sendResponse(reply, 200, true, 'Daftar obrolan berhasil dimuat', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal memuat daftar obrolan', error);
    }
  }

  static async getParentMessages(req: any, reply: any) {
    try {
      const parent = req.parent;
      const { sessionId } = req.params;

      const result = await ParentChatService.getMessages(parent.tenant_id, sessionId);
      
      // Tandai pesan dari GURU (TEACHER) sebagai dibaca oleh orang tua
      await ParentChatService.markMessagesRead(parent.tenant_id, sessionId, 'TEACHER');

      return sendResponse(reply, 200, true, 'Riwayat pesan berhasil dimuat', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal memuat pesan obrolan', error);
    }
  }

  static async sendParentMessage(req: any, reply: any) {
    try {
      const parent = req.parent;
      const parsed = sendMessageSchema.parse(req.body);

      const result = await ParentChatService.sendMessage(
        parent.tenant_id,
        parsed.session_id,
        'PARENT',
        parent.id,
        parsed.message
      );

      return sendResponse(reply, 201, true, 'Pesan berhasil dikirim', result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: error.errors.map((e) => e.message).join(', '),
          errors: error.errors,
        });
      }
      return sendError(reply, 500, 'Gagal mengirim pesan', error);
    }
  }

  // === GURU / GURU BK SIDE (Menggunakan User Context JWT Biasa) ===

  static async getTeacherSessions(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      // Cari Guru ID berdasarkan user login
      const guru = await prisma.guru.findUnique({
        where: { user_id: req.user!.id }
      });

      if (!guru) {
        return reply.status(404).send({ success: false, message: 'Data profil Guru Anda tidak ditemukan' });
      }

      const result = await ParentChatService.getSessions(tenant_id, guru.id, 'TEACHER');
      return sendResponse(reply, 200, true, 'Daftar obrolan wali murid berhasil dimuat', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal memuat daftar obrolan', error);
    }
  }

  static async getTeacherMessages(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { sessionId } = req.params;

      const result = await ParentChatService.getMessages(tenant_id, sessionId);
      
      // Tandai pesan dari ORANG TUA (PARENT) sebagai dibaca oleh guru
      await ParentChatService.markMessagesRead(tenant_id, sessionId, 'PARENT');

      return sendResponse(reply, 200, true, 'Riwayat pesan wali murid berhasil dimuat', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal memuat pesan obrolan', error);
    }
  }

  static async sendTeacherMessage(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const parsed = sendMessageSchema.parse(req.body);

      const guru = await prisma.guru.findUnique({
        where: { user_id: req.user!.id }
      });

      if (!guru) {
        return reply.status(404).send({ success: false, message: 'Profil guru tidak valid' });
      }

      const result = await ParentChatService.sendMessage(
        tenant_id,
        parsed.session_id,
        'TEACHER',
        guru.id,
        parsed.message
      );

      return sendResponse(reply, 201, true, 'Pesan berhasil dikirim', result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: error.errors.map((e) => e.message).join(', '),
          errors: error.errors,
        });
      }
      return sendError(reply, 500, 'Gagal mengirim pesan', error);
    }
  }
}
