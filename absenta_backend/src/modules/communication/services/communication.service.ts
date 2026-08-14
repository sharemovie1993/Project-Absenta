import { prisma } from '@/utils/prisma';
import { 
  InternalThreadType, 
  InternalThreadCategory, 
  InternalThreadPriority, 
  InternalThreadStatus 
} from '@prisma/client';

export interface CreateThreadDto {
  type?: InternalThreadType;
  title?: string;
  category?: InternalThreadCategory;
  priority?: InternalThreadPriority;
  targetUserIds: string[];
  initialMessage?: string;
  contextRef?: any;
  isConfidential?: boolean;
}

export interface SendMessageDto {
  content: string;
  attachments?: Array<{
    type: 'IMAGE' | 'DOCUMENT' | 'AUDIO_VOICE_NOTE';
    url: string;
    name: string;
    size?: number;
    duration?: number;
  }>;
}

export class CommunicationService {

  /**
   * 1. Ambil daftar thread percakapan milik pengguna (Tenant Scoped)
   */
  async getMyThreads(
    tenantId: string, 
    userId: string, 
    filters?: { type?: string; category?: string; status?: string; search?: string }
  ) {
    const whereClause: any = {
      tenant_id: tenantId,
      Participants: {
        some: { user_id: userId }
      }
    };

    if (filters?.type && filters.type !== 'ALL') {
      whereClause.type = filters.type as InternalThreadType;
    }
    if (filters?.category && filters.category !== 'ALL') {
      whereClause.category = filters.category as InternalThreadCategory;
    }
    if (filters?.status && filters.status !== 'ALL') {
      whereClause.status = filters.status as InternalThreadStatus;
    }
    if (filters?.search) {
      whereClause.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        {
          Participants: {
            some: {
              User: {
                full_name: { contains: filters.search, mode: 'insensitive' }
              }
            }
          }
        },
        {
          Messages: {
            some: {
              content: { contains: filters.search, mode: 'insensitive' }
            }
          }
        }
      ];
    }

    const threads = await (prisma as any).internalThread.findMany({
      where: whereClause,
      include: {
        Creator: {
          select: { id: true, full_name: true, role_id: true, Role: { select: { name: true } } }
        },
        Participants: {
          include: {
            User: {
              select: { 
                id: true, 
                full_name: true, 
                email: true, 
                no_hp: true,
                Role: { select: { name: true } },
                Guru: { select: { id: true, nip: true, nama_guru: true, jabatan: true } },
                Siswa: { select: { id: true, nisn: true, nama_lengkap: true, Kelas: { select: { nama_kelas: true } } } }
              }
            }
          }
        },
        Messages: {
          orderBy: { created_at: 'desc' },
          take: 1,
          include: {
            Sender: {
              select: { id: true, full_name: true }
            }
          }
        }
      },
      orderBy: { updated_at: 'desc' }
    });

    // Hitung unread count per thread
    return threads.map((t: any) => {
      const myParticipant = t.Participants?.find((p: any) => p.user_id === userId);
      const lastReadAt = myParticipant?.last_read_at || new Date(0);
      const lastMessage = t.Messages?.[0] || null;
      const isUnread = lastMessage && lastMessage.sender_id !== userId && new Date(lastMessage.created_at) > new Date(lastReadAt);

      // Cari lawan bicara jika direct chat
      const otherParticipant = t.Participants?.find((p: any) => p.user_id !== userId) || t.Participants?.[0];
      const otherUserName = otherParticipant?.User?.full_name || otherParticipant?.User?.Guru?.nama_guru || otherParticipant?.User?.Siswa?.nama_lengkap || 'Pengguna';

      return {
        id: t.id,
        type: t.type,
        title: t.title || otherUserName,
        category: t.category,
        priority: t.priority,
        status: t.status,
        is_confidential: t.is_confidential,
        context_ref: t.context_ref,
        created_at: t.created_at,
        updated_at: t.updated_at,
        lastMessage: lastMessage ? {
          id: lastMessage.id,
          sender_id: lastMessage.sender_id,
          sender_name: lastMessage.Sender?.full_name,
          content: lastMessage.content,
          created_at: lastMessage.created_at,
          attachments: lastMessage.attachments,
          is_system_event: lastMessage.is_system_event
        } : null,
        isUnread: Boolean(isUnread),
        myLastReadAt: myParticipant?.last_read_at,
        participants: (t.Participants || []).map((p: any) => ({
          id: p.id,
          user_id: p.user_id,
          name: p.User?.full_name || p.User?.Guru?.nama_guru || p.User?.Siswa?.nama_lengkap,
          role_label: p.role_label || p.User?.Role?.name || 'Pengguna',
          kelas: p.User?.Siswa?.Kelas?.nama_kelas || null
        })),
        otherUser: otherParticipant ? {
          id: otherParticipant.User?.id,
          name: otherUserName,
          role: otherParticipant.User?.Role?.name,
          role_label: otherParticipant.role_label,
          kelas: otherParticipant.User?.Siswa?.Kelas?.nama_kelas,
          phone_number: otherParticipant.User?.no_hp
        } : null
      };
    });
  }

  /**
   * 2. Ambil detail thread percakapan beserta seluruh pesannya
   */
  async getThreadMessages(tenantId: string, threadId: string, userId: string, limit = 100) {
    // Validasi apakah pengguna adalah peserta thread
    const participant = await (prisma as any).internalParticipant.findFirst({
      where: {
        tenant_id: tenantId,
        thread_id: threadId,
        user_id: userId
      }
    });

    if (!participant) {
      throw new Error('Anda tidak memiliki akses ke percakapan ini.');
    }

    // Update last_read_at pengguna saat membuka pesan
    await (prisma as any).internalParticipant.update({
      where: { id: participant.id },
      data: { last_read_at: new Date() }
    });

    const thread = await (prisma as any).internalThread.findFirst({
      where: { id: threadId, tenant_id: tenantId },
      include: {
        Creator: { select: { id: true, full_name: true } },
        Participants: {
          include: {
            User: {
              select: {
                id: true,
                full_name: true,
                email: true,
                no_hp: true,
                Role: { select: { name: true } },
                Guru: { select: { nip: true, nama_guru: true, jabatan: true } },
                Siswa: { select: { nisn: true, nama_lengkap: true, Kelas: { select: { nama_kelas: true } } } }
              }
            }
          }
        }
      }
    });

    if (!thread) {
      throw new Error('Percakapan tidak ditemukan.');
    }

    const messages = await (prisma as any).internalMessage.findMany({
      where: {
        tenant_id: tenantId,
        thread_id: threadId
      },
      include: {
        Sender: {
          select: {
            id: true,
            full_name: true,
            email: true,
            Role: { select: { name: true } }
          }
        }
      },
      orderBy: { created_at: 'asc' },
      take: limit
    });

    return {
      thread: {
        id: thread.id,
        type: thread.type,
        title: thread.title,
        category: thread.category,
        priority: thread.priority,
        status: thread.status,
        is_confidential: thread.is_confidential,
        context_ref: thread.context_ref,
        created_at: thread.created_at,
        updated_at: thread.updated_at,
        participants: (thread.Participants || []).map((p: any) => ({
          id: p.id,
          user_id: p.user_id,
          name: p.User?.full_name || p.User?.Guru?.nama_guru || p.User?.Siswa?.nama_lengkap,
          role: p.User?.Role?.name,
          role_label: p.role_label,
          kelas: p.User?.Siswa?.Kelas?.nama_kelas
        }))
      },
      messages: messages.map((m: any) => ({
        id: m.id,
        thread_id: m.thread_id,
        sender_id: m.sender_id,
        sender_name: m.Sender?.full_name,
        sender_role: m.Sender?.Role?.name,
        is_me: m.sender_id === userId,
        content: m.content,
        attachments: m.attachments,
        is_system_event: m.is_system_event,
        created_at: m.created_at
      }))
    };
  }

  /**
   * 3. Buat percakapan baru (Direct Chat atau Disposisi Tugas)
   */
  async createThread(tenantId: string, creatorId: string, dto: CreateThreadDto, io?: any) {
    const targetUserIds = Array.from(new Set(dto.targetUserIds.filter(id => id && id !== creatorId)));
    
    if (targetUserIds.length === 0) {
      throw new Error('Penerima percakapan wajib ditentukan minimal 1 orang.');
    }

    const type = dto.type || (targetUserIds.length === 1 && !dto.title ? InternalThreadType.DIRECT : InternalThreadType.DISPOSISI);

    // Jika DIRECT chat 1-on-1, periksa apakah thread sebelumnya sudah pernah dibuat
    if (type === InternalThreadType.DIRECT && targetUserIds.length === 1) {
      const targetUserId = targetUserIds[0];
      const existingThread = await (prisma as any).internalThread.findFirst({
        where: {
          tenant_id: tenantId,
          type: InternalThreadType.DIRECT,
          AND: [
            { Participants: { some: { user_id: creatorId } } },
            { Participants: { some: { user_id: targetUserId } } }
          ]
        },
        include: {
          Participants: true
        }
      });

      if (existingThread) {
        // Kirim pesan awal jika ada
        if (dto.initialMessage?.trim()) {
          await this.sendMessage(tenantId, existingThread.id, creatorId, { content: dto.initialMessage }, io);
        }
        return existingThread;
      }
    }

    // Buat thread baru
    const thread = await (prisma as any).internalThread.create({
      data: {
        tenant_id: tenantId,
        type,
        title: dto.title || null,
        category: dto.category || InternalThreadCategory.UMUM,
        priority: dto.priority || InternalThreadPriority.NORMAL,
        status: InternalThreadStatus.ACTIVE,
        is_confidential: Boolean(dto.isConfidential),
        context_ref: dto.contextRef || null,
        created_by_id: creatorId,
        Participants: {
          create: [
            { tenant_id: tenantId, user_id: creatorId, last_read_at: new Date() },
            ...targetUserIds.map(uid => ({
              tenant_id: tenantId,
              user_id: uid,
              last_read_at: null
            }))
          ]
        }
      },
      include: {
        Participants: {
          include: {
            User: { select: { id: true, full_name: true } }
          }
        }
      }
    });

    // Buat pesan pertama jika ada
    if (dto.initialMessage?.trim()) {
      await this.sendMessage(tenantId, thread.id, creatorId, { content: dto.initialMessage }, io);
    }

    // Notifikasi socket ke penerima
    if (io) {
      targetUserIds.forEach(targetId => {
        io.to(`user:${targetId}`).emit('internal_comm:new_thread', { threadId: thread.id, title: thread.title });
      });
    }

    return thread;
  }

  /**
   * 4. Kirim pesan ke dalam thread
   */
  async sendMessage(
    tenantId: string, 
    threadId: string, 
    senderId: string, 
    dto: SendMessageDto, 
    io?: any
  ) {
    if (!dto.content?.trim() && (!dto.attachments || dto.attachments.length === 0)) {
      throw new Error('Pesan atau lampiran tidak boleh kosong.');
    }

    // Validasi peserta thread
    const participant = await (prisma as any).internalParticipant.findFirst({
      where: {
        tenant_id: tenantId,
        thread_id: threadId,
        user_id: senderId
      }
    });

    if (!participant) {
      throw new Error('Anda bukan peserta dalam percakapan ini.');
    }

    // Simpan pesan
    const message = await (prisma as any).internalMessage.create({
      data: {
        tenant_id: tenantId,
        thread_id: threadId,
        sender_id: senderId,
        content: dto.content?.trim() || '',
        attachments: dto.attachments ? (dto.attachments as any) : null,
        is_system_event: false
      },
      include: {
        Sender: {
          select: { id: true, full_name: true, Role: { select: { name: true } } }
        }
      }
    });

    // Update updated_at thread dan last_read_at pengirim
    await (prisma as any).internalThread.update({
      where: { id: threadId },
      data: { 
        updated_at: new Date(),
        status: InternalThreadStatus.ACTIVE 
      }
    });

    await (prisma as any).internalParticipant.update({
      where: { id: participant.id },
      data: { last_read_at: new Date() }
    });

    // Broadcast ke seluruh peserta thread via WebSocket
    const allParticipants = await (prisma as any).internalParticipant.findMany({
      where: { tenant_id: tenantId, thread_id: threadId },
      select: { user_id: true }
    });

    if (io) {
      allParticipants.forEach((p: any) => {
        io.to(`user:${p.user_id}`).emit('internal_comm:new_message', {
          threadId,
          message: {
            id: message.id,
            thread_id: message.thread_id,
            sender_id: message.sender_id,
            sender_name: message.Sender?.full_name,
            content: message.content,
            attachments: message.attachments,
            is_system_event: message.is_system_event,
            created_at: message.created_at
          }
        });
      });
    }

    return message;
  }

  /**
   * 5. Update Status Disposisi / Thread (e.g. Selesai / Ditutup)
   */
  async updateThreadStatus(
    tenantId: string, 
    threadId: string, 
    userId: string, 
    newStatus: InternalThreadStatus, 
    io?: any
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { full_name: true }
    });

    const updated = await (prisma as any).internalThread.update({
      where: { id: threadId, tenant_id: tenantId },
      data: { 
        status: newStatus,
        updated_at: new Date()
      }
    });

    // Tambahkan system message
    const labelStatus = newStatus === InternalThreadStatus.RESOLVED 
      ? 'SELESAI' 
      : newStatus === InternalThreadStatus.CLOSED 
        ? 'DITUTUP' 
        : 'DIAKTIFKAN KEMBALI';

    const sysMessage = await (prisma as any).internalMessage.create({
      data: {
        tenant_id: tenantId,
        thread_id: threadId,
        sender_id: userId,
        content: `[SISTEM] Status topik telah diubah menjadi "${labelStatus}" oleh ${user?.full_name || 'Pengguna'}.`,
        is_system_event: true
      }
    });

    if (io) {
      const participants = await (prisma as any).internalParticipant.findMany({
        where: { tenant_id: tenantId, thread_id: threadId },
        select: { user_id: true }
      });
      participants.forEach((p: any) => {
        io.to(`user:${p.user_id}`).emit('internal_comm:status_updated', {
          threadId,
          status: newStatus,
          systemMessage: sysMessage
        });
      });
    }

    return updated;
  }

  /**
   * 6. Kontak Sah yang Boleh Dihubungi (Terpandu Relasi Akademik)
   */
  async getEligibleContacts(tenantId: string, userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        Role: { select: { name: true } },
        Siswa: {
          include: {
            Kelas: true
          }
        },
        Guru: true
      }
    });

    if (!user) {
      throw new Error('Pengguna tidak ditemukan.');
    }

    const roleName = user.Role?.name || 'GURU';

    // ── A. JIKA PENGGUNA ADALAH SISWA ──────────────────────────────────────────
    if (roleName === 'SISWA' && user.Siswa) {
      const siswa = user.Siswa;
      const contacts: Array<{ id: string; name: string; role_label: string; group: string; avatar?: string }> = [];

      // 1. Wali Kelas (Cari penugasan wali kelas via OrganizationalAssignment / Guru)
      if (siswa.kelas_id) {
        const walasAssign = await (prisma as any).organizationalAssignment.findFirst({
          where: {
            tenant_id: tenantId,
            kelas_id: siswa.kelas_id,
            is_active: true
          },
          include: {
            User: { select: { id: true, full_name: true } }
          }
        });

        if (walasAssign?.User) {
          contacts.push({
            id: walasAssign.User.id,
            name: walasAssign.User.full_name,
            role_label: `Wali Kelas (${siswa.Kelas?.nama_kelas || 'Kelas'})`,
            group: 'Wali Kelas'
          });
        }
      }

      // 2. Guru Mata Pelajaran di Kelas Siswa
      if (siswa.kelas_id) {
        const jadwals = await (prisma as any).jadwalKBM.findMany({
          where: { tenant_id: tenantId, kelas_id: siswa.kelas_id },
          include: {
            Guru: { include: { User: { select: { id: true, full_name: true } } } },
            Mapel: { select: { nama_mapel: true } }
          }
        });

        const addedGuruIds = new Set<string>();
        jadwals.forEach((j: any) => {
          if (j.Guru?.User && !addedGuruIds.has(j.Guru.User.id)) {
            addedGuruIds.add(j.Guru.User.id);
            contacts.push({
              id: j.Guru.User.id,
              name: j.Guru.User.full_name,
              role_label: `Guru ${j.Mapel?.nama_mapel || 'Mapel'}`,
              group: 'Guru Mata Pelajaran'
            });
          }
        });
      }

      // 3. Guru BP/BK
      const bkAssigns = await (prisma as any).organizationalAssignment.findMany({
        where: {
          tenant_id: tenantId,
          position: { code: 'BPBK' },
          is_active: true
        },
        include: { User: { select: { id: true, full_name: true } } }
      });

      bkAssigns.forEach((a: any) => {
        if (a.User) {
          contacts.push({
            id: a.User.id,
            name: a.User.full_name,
            role_label: 'Guru Bimbingan Konseling (BK)',
            group: 'Bimbingan Konseling'
          });
        }
      });

      return contacts;
    }

    // ── B. JIKA PENGGUNA ADALAH GURU / STAF / ADMIN ────────────────────────────
    const allStaff = await prisma.user.findMany({
      where: {
        tenant_id: tenantId,
        id: { not: userId },
        status: 'ACTIVE',
        Role: {
          name: { in: ['ADMIN', 'SUPERADMIN', 'GURU', 'TU', 'KEPALA_SEKOLAH'] }
        }
      },
      include: {
        Role: { select: { name: true } },
        Guru: { select: { jabatan: true } }
      },
      orderBy: { full_name: 'asc' }
    });

    return allStaff.map((s: any) => {
      let roleLabel = s.Role?.name || 'Staf';
      if (s.Guru?.jabatan) {
        roleLabel = s.Guru.jabatan;
      }

      let group = 'Guru & Tenaga Kependidikan';
      if (['ADMIN', 'SUPERADMIN'].includes(s.Role?.name || '')) {
        group = 'Manajemen & Administrator';
      } else if (s.Role?.name === 'TU') {
        group = 'Tata Usaha (TU)';
      }

      return {
        id: s.id,
        name: s.full_name,
        role_label: roleLabel,
        group
      };
    });
  }

  /**
   * 7. Total Unread Count Pengguna (Tenant-Scoped)
   */
  async getUnreadCount(tenantId: string, userId: string): Promise<number> {
    const participants = await (prisma as any).internalParticipant.findMany({
      where: { tenant_id: tenantId, user_id: userId },
      select: { thread_id: true, last_read_at: true }
    });

    if (participants.length === 0) return 0;

    let unreadTotal = 0;
    for (const p of participants) {
      const lastRead = p.last_read_at || new Date(0);
      const count = await (prisma as any).internalMessage.count({
        where: {
          tenant_id: tenantId,
          thread_id: p.thread_id,
          sender_id: { not: userId },
          created_at: { gt: lastRead }
        }
      });
      if (count > 0) unreadTotal += 1;
    }

    return unreadTotal;
  }
}

export const communicationService = new CommunicationService();
