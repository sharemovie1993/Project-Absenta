import { prisma } from '../../../utils/prisma';

export class ParentChatService {
  static async getOrCreateSession(tenantId: string, orangTuaId: string, guruId: string) {
    const existing = await prisma.parentTeacherChatSession.findUnique({
      where: {
        orang_tua_id_guru_id: {
          orang_tua_id: orangTuaId,
          guru_id: guruId
        }
      },
      include: {
        OrangTua: { select: { nama: true } },
        Guru: { select: { nama_guru: true } }
      }
    });

    if (existing) return existing;

    return prisma.parentTeacherChatSession.create({
      data: {
        tenant_id: tenantId,
        orang_tua_id: orangTuaId,
        guru_id: guruId
      },
      include: {
        OrangTua: { select: { nama: true } },
        Guru: { select: { nama_guru: true } }
      }
    });
  }

  static async getSessions(tenantId: string, participantId: string, type: 'PARENT' | 'TEACHER') {
    return prisma.parentTeacherChatSession.findMany({
      where: {
        tenant_id: tenantId,
        ...(type === 'PARENT' ? { orang_tua_id: participantId } : { guru_id: participantId })
      },
      include: {
        OrangTua: { select: { nama: true, no_hp: true } },
        Guru: { select: { nama_guru: true, nip: true } },
        Messages: {
          orderBy: { created_at: 'desc' },
          take: 1
        }
      },
      orderBy: { updated_at: 'desc' }
    });
  }

  static async getMessages(tenantId: string, sessionId: string) {
    const session = await prisma.parentTeacherChatSession.findFirst({
      where: { id: sessionId, tenant_id: tenantId }
    });

    if (!session) {
      throw new Error('Sesi chat tidak ditemukan');
    }

    return prisma.parentTeacherChatMessage.findMany({
      where: { session_id: sessionId },
      orderBy: { created_at: 'asc' }
    });
  }

  static async sendMessage(
    tenantId: string,
    sessionId: string,
    senderType: 'PARENT' | 'TEACHER',
    senderId: string,
    message: string
  ) {
    const session = await prisma.parentTeacherChatSession.findFirst({
      where: { id: sessionId, tenant_id: tenantId }
    });

    if (!session) {
      throw new Error('Sesi chat tidak ditemukan atau bukan milik tenant Anda');
    }

    // Gunakan transaction untuk membuat pesan dan memperbarui timestamps sesi secara atomik
    return prisma.$transaction(async (tx) => {
      const msg = await tx.parentTeacherChatMessage.create({
        data: {
          session_id: sessionId,
          sender_type: senderType,
          sender_id: senderId,
          message
        }
      });

      await tx.parentTeacherChatSession.update({
        where: { id: sessionId },
        data: { updated_at: new Date() }
      });

      return msg;
    });
  }

  static async markMessagesRead(tenantId: string, sessionId: string, senderTypeToMarkRead: 'PARENT' | 'TEACHER') {
    const session = await prisma.parentTeacherChatSession.findFirst({
      where: { id: sessionId, tenant_id: tenantId }
    });

    if (!session) {
      throw new Error('Sesi chat tidak ditemukan');
    }

    return prisma.parentTeacherChatMessage.updateMany({
      where: {
        session_id: sessionId,
        sender_type: senderTypeToMarkRead,
        is_read: false
      },
      data: { is_read: true }
    });
  }

  /**
   * Kirim log kehadiran siswa (Gerbang, KBM, Pembiasaan, Ketarunaan, Upacara, Apel)
   * otomatis ke jalur chat ParentTeacherChatSession (Wali Kelas <-> Orang Tua).
   */
  static async sendAttendanceLogToParentChat(input: {
    tenantId: string;
    orangTuaId: string;
    studentId?: string | null;
    title: string;
    message: string;
  }): Promise<void> {
    const { tenantId, orangTuaId, studentId, title, message } = input;
    if (!tenantId || !orangTuaId || !message) return;

    // 1. Cari guru Wali Kelas siswa terkait agar orang tua bisa langsung membalas ke Wali Kelas
    let guruId: string | null = null;

    if (studentId) {
      const siswa = await prisma.siswa.findUnique({
        where: { id: studentId },
        select: { kelas_id: true },
      });

      let kelasId = siswa?.kelas_id || null;
      if (!kelasId) {
        const sa = await prisma.siswaAkademik.findFirst({
          where: { siswa_id: studentId, status: 'AKTIF' },
          orderBy: { created_at: 'desc' },
          select: { kelas_id: true },
        });
        kelasId = sa?.kelas_id || null;
      }

      if (kelasId) {
        const walasAssign = await prisma.organizationalAssignment.findFirst({
          where: {
            tenant_id: tenantId,
            kelas_id: kelasId,
            is_active: true,
            Position: { code: 'WALIKELAS' },
          },
          include: {
            User: { select: { Guru: { select: { id: true } } } },
          },
        });
        guruId = walasAssign?.User?.Guru?.id || null;
      }
    }

    // 2. Fallback: sesi chat yang sudah ada untuk orang tua ini, atau guru aktif pertama
    if (!guruId) {
      const existingSession = await prisma.parentTeacherChatSession.findFirst({
        where: { tenant_id: tenantId, orang_tua_id: orangTuaId },
        orderBy: { updated_at: 'desc' },
        select: { guru_id: true },
      });
      guruId = existingSession?.guru_id || null;
    }

    if (!guruId) {
      const anyGuru = await prisma.guru.findFirst({
        where: { tenant_id: tenantId },
        select: { id: true },
      });
      guruId = anyGuru?.id || null;
    }

    if (!guruId) return;

    const session = await ParentChatService.getOrCreateSession(tenantId, orangTuaId, guruId);
    const formattedContent = `📋 [${title}]\n${message}`;
    await ParentChatService.sendMessage(tenantId, session.id, 'TEACHER', guruId, formattedContent);
  }
}
