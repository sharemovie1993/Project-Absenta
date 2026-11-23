import { prisma } from '@/utils/prisma';
import { presenceService } from '@/infra/realtime/presence.service';
import { STRUKTUR_CAPABILITIES } from '@/config/position-capabilities';
import { STRUKTUR_CODES } from '@/config/organization-structure';
import { 
  InternalThreadType, 
  InternalThreadCategory, 
  InternalThreadPriority, 
  InternalThreadStatus 
} from '@prisma/client';

export type BroadcastAudienceType = 'ALL_USERS' | 'ALL_GURU_STAFF' | 'ALL_SISWA' | 'ONLINE_USERS';

export interface CreateBroadcastDto {
  title: string;
  content: string;
  targetAudience: BroadcastAudienceType;
  category?: InternalThreadCategory;
  priority?: InternalThreadPriority;
}

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

const autoGroupSyncCache = new Map<string, number>();
const AUTO_GROUP_SYNC_TTL_MS = 15 * 60 * 1000; // 15 minutes

export class CommunicationService {

  /**
   * 1. Ambil daftar thread percakapan milik pengguna (Tenant Scoped)
   */
  async getMyThreads(
    tenantId: string, 
    userId: string, 
    filters?: { type?: string; category?: string; status?: string; search?: string }
  ) {
    // Pastikan Grup Kelas & Grup Jabatan otomatis tersinkronisasi untuk tenant ini
    if (tenantId && tenantId !== 'system') {
      const lastSync = autoGroupSyncCache.get(tenantId) || 0;
      if (Date.now() - lastSync > AUTO_GROUP_SYNC_TTL_MS) {
        autoGroupSyncCache.set(tenantId, Date.now());
        try {
          await this.syncAutoGroups(tenantId, userId);
        } catch (err: any) {
          console.warn('[AutoGroupSync] Background sync warning:', err?.message);
        }
      }
    }

    const whereClause: any = {
      Participants: {
        some: { user_id: userId }
      }
    };

    if (tenantId && tenantId !== 'system') {
      whereClause.tenant_id = { in: [tenantId, 'system'] };
    }

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

    const [myParticipantRows, threads] = await Promise.all([
      (prisma as any).internalParticipant.findMany({
        where: { user_id: userId },
        select: { thread_id: true, last_read_at: true }
      }),
      (prisma as any).internalThread.findMany({
        where: whereClause,
        include: {
          Creator: {
            select: { id: true, full_name: true, role_id: true, Role: { select: { name: true } } }
          },
          Participants: {
            take: 15,
            include: {
              User: {
                select: { 
                  id: true, 
                  full_name: true, 
                  email: true, 
                  no_hp: true,
                  Role: { select: { name: true } },
                  Guru: { select: { id: true, nip: true, nama_guru: true, jabatan: true, foto: true } },
                  Siswa: { select: { id: true, nisn: true, nama_siswa: true, foto: true, Kelas: { select: { nama_kelas: true } } } }
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
      })
    ]);

    const myReadMap = new Map<string, Date | null>();
    for (const mp of myParticipantRows) {
      myReadMap.set(mp.thread_id, mp.last_read_at);
    }

    // Hitung unread count per thread
    return threads.map((t: any) => {
      const myLastReadRaw = myReadMap.has(t.id)
        ? myReadMap.get(t.id)
        : t.Participants?.find((p: any) => p.user_id === userId)?.last_read_at;
      const lastReadAt = myLastReadRaw || new Date(0);
      const lastMessage = t.Messages?.[0] || null;
      const isUnread = lastMessage && lastMessage.sender_id !== userId && new Date(lastMessage.created_at) > new Date(lastReadAt);

      // Cari lawan bicara jika direct chat
      const otherParticipant = t.Participants?.find((p: any) => p.user_id !== userId) || t.Participants?.[0];
      const otherUserName = otherParticipant?.User?.full_name || otherParticipant?.User?.Guru?.nama_guru || otherParticipant?.User?.Siswa?.nama_siswa || 'Pengguna';

      return {
        id: t.id,
        type: t.type,
        title: t.title || otherUserName,
        category: t.category,
        priority: t.priority,
        status: t.status,
        is_confidential: t.is_confidential,
        context_ref: t.context_ref,
        created_by: t.created_by_id,
        creator: t.Creator ? {
          id: t.Creator.id,
          name: t.Creator.full_name,
          role: t.Creator.Role?.name || 'ADMIN'
        } : null,
        created_at: t.created_at,
        updated_at: t.updated_at,
        last_message: lastMessage?.content || null,
        last_message_at: lastMessage?.created_at || t.updated_at,
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
        myLastReadAt: myLastReadRaw || null,
        avatar:
          t.type === InternalThreadType.DIRECT
            ? otherParticipant?.User?.Guru?.foto || otherParticipant?.User?.Siswa?.foto || null
            : null,
        participants: (t.Participants || []).map((p: any) => ({
          id: p.id,
          user_id: p.user_id,
          name: p.User?.full_name || p.User?.Guru?.nama_guru || p.User?.Siswa?.nama_siswa,
          role: p.User?.Role?.name || 'Pengguna',
          role_label: p.role_label || p.User?.Role?.name || 'Pengguna',
          kelas: p.User?.Siswa?.Kelas?.nama_kelas || null,
          avatar: p.User?.Guru?.foto || p.User?.Siswa?.foto || null
        })),
        otherUser: otherParticipant ? {
          id: otherParticipant.User?.id,
          name: otherUserName,
          role: otherParticipant.User?.Role?.name,
          role_label: otherParticipant.role_label,
          kelas: otherParticipant.User?.Siswa?.Kelas?.nama_kelas,
          phone_number: otherParticipant.User?.no_hp,
          avatar: otherParticipant.User?.Guru?.foto || otherParticipant.User?.Siswa?.foto || null
        } : null
      };
    });
  }

  /**
   * 2. Ambil detail thread percakapan beserta seluruh pesannya
   */
  async getThreadMessages(_tenantId: string, threadId: string, userId: string, limit = 100) {
    // Validasi apakah pengguna adalah peserta thread
    const participant = await (prisma as any).internalParticipant.findFirst({
      where: {
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
      where: { id: threadId },
      include: {
        Creator: { select: { id: true, full_name: true } },
        Participants: {
          take: 25,
          include: {
            User: {
              select: {
                id: true,
                full_name: true,
                email: true,
                no_hp: true,
                Role: { select: { name: true } },
                Guru: { select: { nip: true, nama_guru: true, jabatan: true, foto: true } },
                Siswa: { select: { nisn: true, nama_siswa: true, foto: true, Kelas: { select: { nama_kelas: true } } } }
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
        thread_id: threadId
      },
      include: {
        Sender: {
          select: {
            id: true,
            full_name: true,
            email: true,
            Role: { select: { name: true } },
            Guru: { select: { foto: true } },
            Siswa: { select: { foto: true } }
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
        created_by: thread.created_by_id,
        creator: thread.Creator ? {
          id: thread.Creator.id,
          name: thread.Creator.full_name
        } : null,
        created_at: thread.created_at,
        updated_at: thread.updated_at,
        participants: (thread.Participants || []).map((p: any) => ({
          id: p.id,
          user_id: p.user_id,
          name: p.User?.full_name || p.User?.Guru?.nama_guru || p.User?.Siswa?.nama_siswa,
          role: p.User?.Role?.name,
          role_label: p.role_label,
          kelas: p.User?.Siswa?.Kelas?.nama_kelas,
          avatar: p.User?.Guru?.foto || p.User?.Siswa?.foto || null
        }))
      },
      messages: messages.map((m: any) => ({
        id: m.id,
        thread_id: m.thread_id,
        sender_id: m.sender_id,
        sender_name: m.Sender?.full_name,
        sender_role: m.Sender?.Role?.name,
        sender_avatar: m.Sender?.Guru?.foto || m.Sender?.Siswa?.foto || null,
        is_me: m.sender_id === userId,
        content: m.content,
        attachments: m.attachments,
        is_system_event: m.is_system_event,
        created_at: m.created_at
      }))
    };
  }

  /**
   * 3. Buat percakapan baru (Direct Chat atau Disposisi Tugas) dengan Penegakan Batasan Role
   */
  async createThread(tenantId: string, creatorId: string, dto: CreateThreadDto, io?: any) {
    const targetUserIds = Array.from(new Set(dto.targetUserIds.filter(id => id && id !== creatorId)));
    
    if (targetUserIds.length === 0) {
      throw new Error('Penerima percakapan wajib ditentukan minimal 1 orang.');
    }

    const creator = await prisma.user.findUnique({
      where: { id: creatorId },
      include: { Role: { select: { name: true } } },
    });
    const creatorRole = (creator?.Role?.name || 'GURU').toUpperCase();

    // ── PENEGAKAN BATASAN ROLE SISWA (Anti-Cheating CBT & Anti-Disposisi) ──
    if (creatorRole === 'SISWA') {
      if (dto.type === InternalThreadType.DISPOSISI || targetUserIds.length > 1) {
        throw new Error('Akses ditolak: Siswa hanya diperkenankan membuat obrolan langsung (1-on-1) dengan Guru/Staf.');
      }

      const targetUsers = await prisma.user.findMany({
        where: { id: { in: targetUserIds } },
        include: { Role: { select: { name: true } } },
      });

      const hasStudentTarget = targetUsers.some(
        (u) => (u.Role?.name || '').toUpperCase() === 'SISWA'
      );
      if (hasStudentTarget) {
        throw new Error(
          'Akses ditolak: Siswa tidak diperkenankan mengirim pesan ke sesama siswa. Anda hanya dapat menghubungi Wali Kelas, Guru Mapel, Guru BK, atau Admin Sekolah.'
        );
      }
    }

    const type =
      creatorRole === 'SISWA'
        ? InternalThreadType.DIRECT
        : dto.type || (targetUserIds.length === 1 && !dto.title ? InternalThreadType.DIRECT : InternalThreadType.DISPOSISI);

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
        thread_id: threadId,
        user_id: senderId
      }
    });

    if (!participant) {
      throw new Error('Anda bukan peserta dalam percakapan ini.');
    }

    // ── PENEGAKAN SALURAN SIARAN SATU ARAH (One-Way Broadcast Guard) ──
    const [threadInfo, senderInfo] = await Promise.all([
      (prisma as any).internalThread.findUnique({
        where: { id: threadId },
        select: { id: true, title: true, created_by_id: true, context_ref: true },
      }),
      prisma.user.findUnique({
        where: { id: senderId },
        include: { Role: { select: { name: true } } },
      }),
    ]);

    const isBroadcastThread =
      Boolean(threadInfo?.context_ref?.isBroadcast) ||
      String(threadInfo?.title || '').startsWith('📢');

    if (isBroadcastThread) {
      const senderRole = (senderInfo?.Role?.name || '').toUpperCase();
      const isBroadcastOwnerOrAdmin =
        threadInfo?.created_by_id === senderId ||
        ['SUPERADMIN', 'ADMIN', 'KEPALA_SEKOLAH'].includes(senderRole);

      if (!isBroadcastOwnerOrAdmin) {
        throw new Error(
          'Saluran Siaran Resmi bersifat satu arah (Read-Only). Gunakan tombol "Balas Pribadi ke Pengirim" untuk menghubungi pengirim secara langsung.'
        );
      }
    }

    // Simpan pesan
    const message = await (prisma as any).internalMessage.create({
      data: {
        tenant_id: participant.tenant_id || tenantId,
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
      where: { thread_id: threadId },
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

      // 4. Admin / Operator Sekolah & Kepala Sekolah
      const schoolAdmins = await prisma.user.findMany({
        where: {
          tenant_id: tenantId,
          status: 'ACTIVE',
          Role: { name: { in: ['ADMIN', 'KEPALA_SEKOLAH', 'TU'] } },
        },
        include: { Role: { select: { name: true } } },
        take: 10,
      });

      const existingIds = new Set(contacts.map((c) => c.id));
      schoolAdmins.forEach((adm: any) => {
        if (!existingIds.has(adm.id)) {
          existingIds.add(adm.id);
          contacts.push({
            id: adm.id,
            name: adm.full_name,
            role_label: adm.Role?.name === 'KEPALA_SEKOLAH' ? 'Kepala Sekolah' : 'Administrator / Operator Sekolah',
            group: 'Layanan Administrasi & Helpdesk',
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
        Guru: { select: { jabatan: true, foto: true } }
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
        group,
        avatar: s.Guru?.foto || null
      };
    });
  }

  /**
   * 7. Total Unread Count Pengguna (Tenant-Scoped)
   */
  async getUnreadCount(_tenantId: string, userId: string): Promise<number> {
    const participants = await (prisma as any).internalParticipant.findMany({
      where: { user_id: userId },
      select: { thread_id: true, last_read_at: true }
    });

    if (participants.length === 0) return 0;

    let unreadTotal = 0;
    for (const p of participants) {
      const lastRead = p.last_read_at || new Date(0);
      const count = await (prisma as any).internalMessage.count({
        where: {
          thread_id: p.thread_id,
          sender_id: { not: userId },
          created_at: { gt: lastRead }
        }
      });
      if (count > 0) unreadTotal += 1;
    }

    return unreadTotal;
  }

  /**
   * 8. Kirim Pesan Broadcast Massal (Admin / Pimpinan Sekolah -> Seluruh Pengguna / Guru / Siswa / Online)
   */
  async createBroadcast(
    tenantId: string,
    senderId: string,
    dto: CreateBroadcastDto,
    io?: any
  ) {
    const cleanTitle = String(dto.title || '').trim();
    const cleanContent = String(dto.content || '').trim();
    const audience: BroadcastAudienceType = dto.targetAudience || 'ALL_USERS';

    if (!cleanTitle) {
      throw new Error('Judul pesan broadcast wajib diisi.');
    }
    if (!cleanContent) {
      throw new Error('Isi pesan broadcast tidak boleh kosong.');
    }

    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      include: {
        Role: { select: { name: true } },
        Guru: { select: { jabatan: true } },
      },
    });

    const senderName = sender?.full_name || 'Administrator';
    const senderRole = (sender?.Role?.name || 'ADMIN').toUpperCase();

    // ── PENEGAKAN BATASAN ROLE PENGIRIM BROADCAST ──
    if (senderRole === 'SISWA') {
      throw new Error('Akses ditolak: Siswa tidak diperkenankan mengirim siaran broadcast.');
    }

    const isTopAdmin = ['SUPERADMIN', 'ADMIN', 'KEPALA_SEKOLAH', 'TU'].includes(senderRole);
    if (!isTopAdmin) {
      // Jika role GURU, periksa apakah memiliki jabatan struktural (Waka / Kurikulum / Kesiswaan / Kaprog)
      const guruJabatan = String((sender as any)?.Guru?.jabatan || '').toUpperCase();
      const structuralTokens = ['KEPALA', 'WAKA', 'KURIKULUM', 'KESISWAAN', 'HUMAS', 'SARPRAS', 'KAPROG', 'KOORDINATOR'];
      let hasStructuralRole = structuralTokens.some((tok) => guruJabatan.includes(tok));

      if (!hasStructuralRole) {
        try {
          const activeAssigns = await (prisma as any).organizationalAssignment.findMany({
            where: { user_id: senderId, is_active: true },
            include: { position: { select: { code: true, name: true } } },
          });
          hasStructuralRole = (activeAssigns || []).some((a: any) => {
            const code = String(a?.position?.code || a?.position?.name || '').toUpperCase();
            return structuralTokens.some((tok) => code.includes(tok));
          });
        } catch {}
      }

      if (!hasStructuralRole) {
        throw new Error(
          'Akses ditolak: Hanya Administrator, Kepala Sekolah, TU, atau Pejabat Struktural (Waka/Kaprog) yang dapat mengirim siaran broadcast massal.'
        );
      }
    }

    // Kumpulkan daftar user penerima berdasarkan targetAudience
    let targetUserIds: string[] = [];

    if (audience === 'ONLINE_USERS') {
      const isGlobal = tenantId === 'system' || senderRole === 'SUPERADMIN';
      const clusterSummary = await presenceService.getClusterTenantSummary(tenantId, isGlobal);
      targetUserIds = (clusterSummary.users || [])
        .map((u) => u.userId)
        .filter((id) => Boolean(id) && id !== senderId);
    } else {
      const userWhere: any = {
        status: 'ACTIVE',
        id: { not: senderId },
      };

      if (tenantId && tenantId !== 'system') {
        userWhere.tenant_id = tenantId;
      }

      if (audience === 'ALL_GURU_STAFF') {
        userWhere.Role = {
          name: { in: ['ADMIN', 'SUPERADMIN', 'GURU', 'TU', 'KEPALA_SEKOLAH'] },
        };
      } else if (audience === 'ALL_SISWA') {
        userWhere.Role = {
          name: 'SISWA',
        };
      }

      const users = await prisma.user.findMany({
        where: userWhere,
        select: { id: true },
      });
      targetUserIds = users.map((u) => u.id);
    }

    targetUserIds = Array.from(new Set(targetUserIds));

    if (targetUserIds.length === 0) {
      throw new Error('Tidak ditemukan pengguna aktif pada kategori penerima yang dipilih.');
    }

    const audienceLabel =
      audience === 'ALL_USERS'
        ? 'Seluruh Pengguna'
        : audience === 'ALL_GURU_STAFF'
        ? 'Seluruh Guru & Staf'
        : audience === 'ALL_SISWA'
        ? 'Seluruh Siswa'
        : 'Pengguna Online';

    const broadcastTitle = cleanTitle.startsWith('📢')
      ? cleanTitle
      : `📢 ${cleanTitle}`;

    // 1. Buat Thread Broadcast
    const thread = await (prisma as any).internalThread.create({
      data: {
        tenant_id: tenantId,
        type: InternalThreadType.DISPOSISI,
        title: broadcastTitle,
        category: dto.category || InternalThreadCategory.UMUM,
        priority: dto.priority || InternalThreadPriority.HIGH,
        status: InternalThreadStatus.ACTIVE,
        is_confidential: false,
        context_ref: {
          isBroadcast: true,
          targetAudience: audience,
          audienceLabel,
          recipientCount: targetUserIds.length,
          senderName,
          senderRole,
        },
        created_by_id: senderId,
      },
    });

    // 2. Bulk insert seluruh penerima + pengirim ke InternalParticipant (1 query cepat)
    const participantRows = [
      {
        tenant_id: tenantId,
        thread_id: thread.id,
        user_id: senderId,
        role_label: `${senderRole} (Pengirim Siaran)`,
        last_read_at: new Date(),
      },
      ...targetUserIds.map((uid) => ({
        tenant_id: tenantId,
        thread_id: thread.id,
        user_id: uid,
        role_label: audienceLabel,
        last_read_at: null,
      })),
    ];

    await (prisma as any).internalParticipant.createMany({
      data: participantRows,
      skipDuplicates: true,
    });

    // 3. Simpan pesan pertama
    const message = await (prisma as any).internalMessage.create({
      data: {
        tenant_id: tenantId,
        thread_id: thread.id,
        sender_id: senderId,
        content: cleanContent,
        is_system_event: false,
      },
    });

    // 4. Pancarkan event real-time ke seluruh penerima agar Messenger pop-up langsung terbuka
    if (io) {
      const broadcastPayload = {
        threadId: thread.id,
        title: broadcastTitle,
        category: thread.category,
        priority: thread.priority,
        audienceLabel,
        recipientCount: targetUserIds.length,
        senderId,
        senderName,
        senderRole,
        message: {
          id: message.id,
          thread_id: thread.id,
          sender_id: senderId,
          sender_name: senderName,
          sender_role: senderRole,
          content: cleanContent,
          created_at: message.created_at,
          is_system_event: false,
        },
      };

      // Emit ke room tenant agar seluruh koneksi di tenant langsung menerima
      if (tenantId && tenantId !== 'system') {
        io.to(`tenant:${tenantId}`).emit('internal_comm:broadcast', broadcastPayload);
        io.to(`tenant:${tenantId}`).emit('internal_comm:new_message', broadcastPayload);
      } else {
        io.emit('internal_comm:broadcast', broadcastPayload);
        io.emit('internal_comm:new_message', broadcastPayload);
      }
    }

    return {
      ...thread,
      recipientCount: targetUserIds.length,
      audienceLabel,
    };
  }

  /**
   * 9. Auto-Provision & Sinkronisasi Grup Chat Otomatis (Scope Kelas & Scope Jabatan)
   */
  async syncAutoGroups(tenantId: string, triggerUserId?: string): Promise<{
    createdGroups: number;
    updatedGroups: number;
    kelasGroups: number;
    jabatanGroups: number;
  }> {
    if (!tenantId || tenantId === 'system') {
      return { createdGroups: 0, updatedGroups: 0, kelasGroups: 0, jabatanGroups: 0 };
    }

    autoGroupSyncCache.set(tenantId, Date.now());

    // 1. Cari user creator fallback (Admin / Kepala Sekolah / Trigger User)
    let defaultCreatorId = triggerUserId || '';
    if (!defaultCreatorId) {
      const adminUser = await prisma.user.findFirst({
        where: {
          tenant_id: tenantId,
          status: 'ACTIVE',
          Role: { name: { in: ['ADMIN', 'KEPALA_SEKOLAH', 'SUPERADMIN', 'GURU'] } },
        },
        select: { id: true },
      });
      defaultCreatorId = adminUser?.id || '';
    }
    if (!defaultCreatorId) {
      return { createdGroups: 0, updatedGroups: 0, kelasGroups: 0, jabatanGroups: 0 };
    }

    // 2. Ambil seluruh Grup yang sudah ada di tenant ini
    const existingGroupThreads = await (prisma as any).internalThread.findMany({
      where: {
        tenant_id: tenantId,
        type: InternalThreadType.GROUP,
      },
      select: {
        id: true,
        title: true,
        context_ref: true,
      },
    });

    const existingByKey = new Map<string, { id: string; title: string; context_ref: any }>();
    for (const gt of existingGroupThreads) {
      const gKey = gt.context_ref?.groupKey || gt.title;
      if (gKey) existingByKey.set(String(gKey), gt);
    }

    let createdGroups = 0;
    let updatedGroups = 0;
    let kelasGroupsCount = 0;
    let jabatanGroupsCount = 0;
    const validGroupKeys = new Set<string>();

    // Helper untuk membuat/memperbarui 1 Grup beserta anggotanya
    const upsertGroupWithMembers = async (opts: {
      groupKey: string;
      groupScope: 'KELAS' | 'JABATAN';
      title: string;
      category: InternalThreadCategory;
      members: Map<string, string>; // userId -> roleLabel
      extraMeta?: Record<string, any>;
      welcomeText: string;
    }) => {
      if (opts.members.size === 0) return;
      validGroupKeys.add(opts.groupKey);

      const existing = existingByKey.get(opts.groupKey) || existingByKey.get(opts.title);
      const contextPayload = {
        isAutoGroup: true,
        groupScope: opts.groupScope,
        groupKey: opts.groupKey,
        memberCount: opts.members.size,
        ...(opts.extraMeta || {}),
      };

      let threadId = existing?.id;

      if (!threadId) {
        const created = await (prisma as any).internalThread.create({
          data: {
            tenant_id: tenantId,
            type: InternalThreadType.GROUP,
            title: opts.title,
            category: opts.category,
            priority: InternalThreadPriority.NORMAL,
            status: InternalThreadStatus.ACTIVE,
            is_confidential: false,
            context_ref: contextPayload,
            created_by_id: defaultCreatorId,
          },
        });
        threadId = created.id;
        createdGroups += 1;
        existingByKey.set(opts.groupKey, { id: threadId!, title: opts.title, context_ref: contextPayload });

        // Buat pesan sambutan sistem pertama kali grup dibuat
        await (prisma as any).internalMessage.create({
          data: {
            tenant_id: tenantId,
            thread_id: threadId,
            sender_id: defaultCreatorId,
            content: opts.welcomeText,
            is_system_event: true,
          },
        });
      } else {
        updatedGroups += 1;
        await (prisma as any).internalThread.update({
          where: { id: threadId },
          data: {
            title: opts.title,
            context_ref: contextPayload,
          },
        });
      }

      // Sinkronkan seluruh anggota ke InternalParticipant (skipDuplicates menjaga last_read_at anggota lama!)
      const memberIds = Array.from(opts.members.keys());
      const participantRows = Array.from(opts.members.entries()).map(([uid, roleLabel]) => ({
        tenant_id: tenantId,
        thread_id: threadId,
        user_id: uid,
        role_label: roleLabel,
        last_read_at: new Date(),
      }));

      await (prisma as any).internalParticipant.createMany({
        data: participantRows,
        skipDuplicates: true,
      });

      // Hapus anggota lama yang tidak lagi berada dalam scope tahun pelajaran aktif / jabatan
      if (memberIds.length > 0) {
        await (prisma as any).internalParticipant.deleteMany({
          where: {
            thread_id: threadId,
            user_id: { notIn: memberIds },
          },
        });
      }
    };

    // Cari Tahun Pelajaran Aktif untuk membatasi scope anggota Jabatan & Kelas
    const activeTp =
      (await prisma.tahunPelajaran.findFirst({
        where: { tenant_id: tenantId, is_active: true },
        orderBy: { created_at: 'desc' },
        select: { id: true, tahun: true },
      })) ||
      (await prisma.tahunPelajaran.findFirst({
        where: { tenant_id: tenantId },
        orderBy: { created_at: 'desc' },
        select: { id: true, tahun: true },
      }));

    // ── A. AUTO-GENERATE GRUP SCOPE JABATAN (Sesuai Posisi di position-capabilities.ts & Tahun Pelajaran Aktif) ──
    const activeAssignments = await (prisma as any).organizationalAssignment.findMany({
      where: {
        tenant_id: tenantId,
        is_active: true,
        User: { status: 'ACTIVE' },
        ...(activeTp
          ? {
              OR: [{ tahun_pelajaran_id: activeTp.id }, { tahun_pelajaran_id: null }],
            }
          : {}),
      },
      include: {
        Position: { select: { code: true, name: true, scope_type: true } },
        Kelas: { select: { id: true, nama_kelas: true } },
        User: {
          select: {
            id: true,
            full_name: true,
            Guru: { select: { jabatan: true } },
          },
        },
      },
    });

    // Mapping 2-kata nama grup & kategori kanonikal per STRUKTUR_CODES di position-capabilities.ts
    const positionGroupMeta: Record<string, { title: string; category: InternalThreadCategory }> = {
      [STRUKTUR_CODES.PETUGAS_KELAS]: { title: 'Grp. Petugas', category: InternalThreadCategory.PIKET },
      [STRUKTUR_CODES.GERBANG]: { title: 'Grp. Gerbang', category: InternalThreadCategory.PIKET },
      [STRUKTUR_CODES.TOOLMAN]: { title: 'Grp. Toolman', category: InternalThreadCategory.SARPRAS },
      [STRUKTUR_CODES.TU_PERSURATAN]: { title: 'Grp. Persuratan', category: InternalThreadCategory.UMUM },
      [STRUKTUR_CODES.TU_KEUANGAN]: { title: 'Grp. Keuangan', category: InternalThreadCategory.UMUM },
      [STRUKTUR_CODES.TU_KEPEGAWAIAN]: { title: 'Grp. Kepegawaian', category: InternalThreadCategory.UMUM },
      [STRUKTUR_CODES.TU_SARPRAS]: { title: 'Grp. Inventaris', category: InternalThreadCategory.SARPRAS },
      [STRUKTUR_CODES.TU_KEPALA]: { title: 'Grp. TU', category: InternalThreadCategory.UMUM },
      [STRUKTUR_CODES.MANAJER_TOKO_KOPERASI]: { title: 'Grp. Toko', category: InternalThreadCategory.UMUM },
      [STRUKTUR_CODES.WALIKELAS]: { title: 'Grp. Walas', category: InternalThreadCategory.WALIKELAS },
      [STRUKTUR_CODES.BPBK]: { title: 'Grp. BK', category: InternalThreadCategory.BK },
      [STRUKTUR_CODES.PEMBINA_ESKUL]: { title: 'Grp. Eskul', category: InternalThreadCategory.KESISWAAN },
      [STRUKTUR_CODES.KAPROG]: { title: 'Grp. Kaprog', category: InternalThreadCategory.KURIKULUM },
      [STRUKTUR_CODES.KABENG]: { title: 'Grp. Kabeng', category: InternalThreadCategory.SARPRAS },
      [STRUKTUR_CODES.KURIKULUM]: { title: 'Grp. Kurikulum', category: InternalThreadCategory.KURIKULUM },
      [STRUKTUR_CODES.KESISWAAN]: { title: 'Grp. Kesiswaan', category: InternalThreadCategory.KESISWAAN },
      [STRUKTUR_CODES.HUBIN]: { title: 'Grp. Hubin', category: InternalThreadCategory.UMUM },
      [STRUKTUR_CODES.BKK]: { title: 'Grp. BKK', category: InternalThreadCategory.UMUM },
      [STRUKTUR_CODES.SARPRAS]: { title: 'Grp. Sarpras', category: InternalThreadCategory.SARPRAS },
      [STRUKTUR_CODES.KEPALA_SEKOLAH]: { title: 'Grp. Kepsek', category: InternalThreadCategory.UMUM },
      [STRUKTUR_CODES.BENDAHARA_KOPERASI]: { title: 'Grp. Bendahara', category: InternalThreadCategory.UMUM },
      [STRUKTUR_CODES.KETUA_KOPERASI]: { title: 'Grp. Koperasi', category: InternalThreadCategory.UMUM },
      [STRUKTUR_CODES.SEKRETARIS_KOPERASI]: { title: 'Grp. Sekretaris', category: InternalThreadCategory.UMUM },
      [STRUKTUR_CODES.PENGAWAS_KOPERASI]: { title: 'Grp. Pengawas', category: InternalThreadCategory.UMUM },
      [STRUKTUR_CODES.KETUA_PEMBINA_TARUNA]: { title: 'Grp. Taruna', category: InternalThreadCategory.KESISWAAN },
      [STRUKTUR_CODES.PEMBINA_TARUNA]: { title: 'Grp. Pembina', category: InternalThreadCategory.KESISWAAN },
      [STRUKTUR_CODES.KOORDINATOR_DHUHA]: { title: 'Grp. Dhuha', category: InternalThreadCategory.KESISWAAN },
    };

    // Kelompokkan anggota aktif berdasarkan posisi kanonikal di position-capabilities.ts
    const membersByPosition = new Map<string, Map<string, string>>();
    const positionNames = new Map<string, string>();
    for (const a of activeAssignments) {
      if (!a.user_id || !a.Position?.code) continue;
      const rawCode = String(a.Position.code).toUpperCase();
      const canonicalCode = rawCode === 'TU' ? STRUKTUR_CODES.TU_KEPALA : rawCode;
      if (!STRUKTUR_CAPABILITIES[canonicalCode]) continue;

      if (!membersByPosition.has(canonicalCode)) {
        membersByPosition.set(canonicalCode, new Map<string, string>());
      }
      if (a.Position.name && !positionNames.has(canonicalCode)) {
        positionNames.set(canonicalCode, a.Position.name);
      }

      const label =
        canonicalCode === STRUKTUR_CODES.WALIKELAS && a.Kelas?.nama_kelas
          ? `Wali Kelas ${a.Kelas.nama_kelas}`
          : a.custom_title || a.Position.name || canonicalCode;
      membersByPosition.get(canonicalCode)!.set(a.user_id, label);
    }

    for (const posCode of Object.keys(STRUKTUR_CAPABILITIES)) {
      const members = membersByPosition.get(posCode);
      if (!members || members.size < 1) continue;

      const meta = positionGroupMeta[posCode];
      const posName = positionNames.get(posCode) || posCode;
      const fallbackShort = posName.split(/\s+/)[0] || posCode;
      const title = meta?.title || `Grp. ${fallbackShort}`;
      const category = meta?.category || InternalThreadCategory.UMUM;

      await upsertGroupWithMembers({
        groupKey: `JABATAN:${posCode === STRUKTUR_CODES.WALIKELAS ? 'WALIKELAS' : posCode}`,
        groupScope: 'JABATAN',
        title,
        category,
        members,
        extraMeta: {
          positionCode: posCode,
          positionName: posName,
          ...(activeTp ? { tahunPelajaranId: activeTp.id, tahunPelajaran: activeTp.tahun } : {}),
        },
        welcomeText: `[SISTEM] Ruang koordinasi posisi ${posName} (${title}) telah aktif.`,
      });
      jabatanGroupsCount += 1;
    }

    // ── B. AUTO-GENERATE GRUP SCOPE KELAS (Tahun Pelajaran Aktif: Wali Kelas + Guru Mapel + Siswa Kelas) ──
    const allKelas = await prisma.kelas.findMany({
      where: {
        tenant_id: tenantId,
        is_active: true,
      },
      include: {
        SiswaAkademik: activeTp
          ? {
              where: {
                tahun_pelajaran_id: activeTp.id,
                status: 'AKTIF',
              },
              select: {
                siswa: {
                  select: { user_id: true, nama_siswa: true, status: true },
                },
              },
            }
          : false,
        Siswa: {
          where: {
            status: 'AKTIF',
            user_id: { not: null },
          },
          select: { user_id: true, nama_siswa: true, tahun_pelajaran_id: true },
        },
        OrganizationalAssignments: {
          where: {
            is_active: true,
            ...(activeTp
              ? {
                  OR: [{ tahun_pelajaran_id: activeTp.id }, { tahun_pelajaran_id: null }],
                }
              : {}),
          },
          include: {
            Position: { select: { name: true, code: true } },
          },
        },
        JadwalKBM: {
          where: activeTp ? { tahun_pelajaran_id: activeTp.id } : undefined,
          select: {
            Guru: { select: { user_id: true, nama_guru: true } },
            Mapel: { select: { nama_mapel: true } },
          },
        },
        GuruMapel: {
          where: activeTp ? { tahun_pelajaran_id: activeTp.id } : undefined,
          select: {
            Guru: { select: { user_id: true, nama_guru: true } },
            Mapel: { select: { nama_mapel: true } },
          },
        },
      },
      orderBy: { nama_kelas: 'asc' },
    });

    for (const k of allKelas as any[]) {
      const members = new Map<string, string>();

      // 1. Siswa aktif di kelas ini pada tahun pelajaran aktif
      const akademikList = Array.isArray(k.SiswaAkademik) ? k.SiswaAkademik : [];
      if (akademikList.length > 0) {
        for (const sa of akademikList) {
          if (sa.siswa?.user_id && sa.siswa?.status === 'AKTIF') {
            members.set(sa.siswa.user_id, `Siswa ${k.nama_kelas}`);
          }
        }
      } else {
        for (const s of k.Siswa || []) {
          if (s.user_id && (!activeTp || !s.tahun_pelajaran_id || s.tahun_pelajaran_id === activeTp.id)) {
            members.set(s.user_id, `Siswa ${k.nama_kelas}`);
          }
        }
      }

      // 2. Guru Mapel dari GuruMapel & JadwalKBM di kelas ini pada tahun pelajaran aktif
      for (const gm of k.GuruMapel || []) {
        const uid = gm.Guru?.user_id;
        if (uid) {
          members.set(uid, `Guru ${gm.Mapel?.nama_mapel || 'Mapel'}`);
        }
      }
      for (const jk of k.JadwalKBM || []) {
        const uid = jk.Guru?.user_id;
        if (uid && !members.has(uid)) {
          members.set(uid, `Guru ${jk.Mapel?.nama_mapel || 'Mapel'}`);
        }
      }

      // 3. Wali Kelas / Pembina dari OrganizationalAssignments kelas ini pada tahun pelajaran aktif
      for (const oa of k.OrganizationalAssignments || []) {
        if (oa.user_id) {
          members.set(oa.user_id, oa.Position?.name || `Wali Kelas ${k.nama_kelas}`);
        }
      }

      if (members.size >= 1) {
        await upsertGroupWithMembers({
          groupKey: `KELAS:${k.id}`,
          groupScope: 'KELAS',
          title: `Grp. ${k.nama_kelas}`,
          category: InternalThreadCategory.WALIKELAS,
          members,
          extraMeta: {
            kelasId: k.id,
            namaKelas: k.nama_kelas,
            ...(activeTp ? { tahunPelajaranId: activeTp.id, tahunPelajaran: activeTp.tahun } : {}),
          },
          welcomeText: `[SISTEM] Ruang Grup Kelas ${k.nama_kelas} telah aktif.`,
        });
        kelasGroupsCount += 1;
      }
    }

    // Bersihkan grup otomatis lama yang tidak lagi sesuai posisi di position-capabilities.ts (mis. JABATAN:MANAJEMEN / JABATAN:DEWAN_GURU)
    const obsoleteIds = existingGroupThreads
      .filter((gt: any) => gt.context_ref?.isAutoGroup && gt.context_ref?.groupKey && !validGroupKeys.has(String(gt.context_ref.groupKey)))
      .map((gt: any) => gt.id);

    if (obsoleteIds.length > 0) {
      await (prisma as any).internalThread.deleteMany({
        where: { id: { in: obsoleteIds } },
      });
    }

    return {
      createdGroups,
      updatedGroups,
      kelasGroups: kelasGroupsCount,
      jabatanGroups: jabatanGroupsCount,
    };
  }

  /**
   * 10. Ambil Profil Lengkap Thread / Grup / Lawan Bicara (Siswa, Guru, Wali Kelas, & Daftar Anggota)
   */
  async getThreadProfile(tenantId: string, threadId: string, userId: string) {
    const participant = await (prisma as any).internalParticipant.findFirst({
      where: {
        thread_id: threadId,
        user_id: userId,
      },
    });

    if (!participant) {
      throw new Error('Anda tidak memiliki akses ke profil percakapan ini.');
    }

    const thread = await (prisma as any).internalThread.findFirst({
      where: { id: threadId, tenant_id: tenantId },
      include: {
        Participants: {
          include: {
            User: {
              select: {
                id: true,
                full_name: true,
                email: true,
                no_hp: true,
                Role: { select: { name: true } },
                Guru: {
                  select: {
                    id: true,
                    nip: true,
                    nama_guru: true,
                    jabatan: true,
                    no_hp: true,
                    foto: true,
                  },
                },
                Siswa: {
                  select: {
                    id: true,
                    nis: true,
                    nisn: true,
                    nama_siswa: true,
                    no_hp: true,
                    jenis_kelamin: true,
                    foto: true,
                    kelas_id: true,
                    Kelas: { select: { id: true, nama_kelas: true, tingkat: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!thread) {
      throw new Error('Percakapan tidak ditemukan.');
    }

    const members = (thread.Participants || [])
      .map((p: any) => {
        const u = p.User;
        const role = u?.Role?.name || 'Pengguna';
        const avatar = u?.Guru?.foto || u?.Siswa?.foto || null;
        return {
          user_id: p.user_id,
          name: u?.full_name || u?.Guru?.nama_guru || u?.Siswa?.nama_siswa || 'Pengguna',
          role,
          role_label: p.role_label || u?.Guru?.jabatan || role,
          avatar,
          email: u?.email || null,
          no_hp: u?.no_hp || u?.Guru?.no_hp || u?.Siswa?.no_hp || null,
          nip: u?.Guru?.nip || null,
          jabatan: u?.Guru?.jabatan || null,
          nis: u?.Siswa?.nis || null,
          nisn: u?.Siswa?.nisn || null,
          kelas: u?.Siswa?.Kelas?.nama_kelas || null,
          kelas_id: u?.Siswa?.kelas_id || null,
          jenis_kelamin: u?.Siswa?.jenis_kelamin || null,
        };
      })
      .sort((a: any, b: any) => {
        const aIsSiswa = a.role === 'SISWA' ? 1 : 0;
        const bIsSiswa = b.role === 'SISWA' ? 1 : 0;
        if (aIsSiswa !== bIsSiswa) return aIsSiswa - bIsSiswa;
        return String(a.name).localeCompare(String(b.name));
      });

    const ctx = (thread.context_ref || {}) as Record<string, any>;
    let waliKelas: any = null;
    let kelasInfo: any = null;

    if (thread.type === InternalThreadType.GROUP && ctx.groupScope === 'KELAS' && ctx.kelasId) {
      const activeTp = await prisma.tahunPelajaran.findFirst({
        where: { tenant_id: tenantId, is_active: true },
        orderBy: { created_at: 'desc' },
        select: { id: true, tahun: true },
      });

      const kelasData = await prisma.kelas.findUnique({
        where: { id: ctx.kelasId },
        select: {
          id: true,
          nama_kelas: true,
          tingkat: true,
          Jurusan: { select: { nama: true } },
          OrganizationalAssignments: {
            where: {
              is_active: true,
              ...(activeTp ? { OR: [{ tahun_pelajaran_id: activeTp.id }, { tahun_pelajaran_id: null }] } : {}),
            },
            include: {
              Position: { select: { code: true, name: true } },
              User: {
                select: {
                  id: true,
                  full_name: true,
                  no_hp: true,
                  Guru: { select: { nip: true, nama_guru: true, jabatan: true, no_hp: true, foto: true } },
                },
              },
            },
          },
        },
      });

      if (kelasData) {
        kelasInfo = {
          id: kelasData.id,
          nama_kelas: kelasData.nama_kelas,
          tingkat: kelasData.tingkat,
          jurusan: kelasData.Jurusan?.nama || null,
          tahun_pelajaran: activeTp?.tahun || ctx.tahunPelajaran || null,
        };
        const walasAssign =
          kelasData.OrganizationalAssignments.find((oa) =>
            `${oa.Position?.code || ''} ${oa.Position?.name || ''}`.toUpperCase().includes('WALI')
          ) || kelasData.OrganizationalAssignments[0];
        if (walasAssign?.User) {
          waliKelas = {
            user_id: walasAssign.User.id,
            name: walasAssign.User.full_name || walasAssign.User.Guru?.nama_guru,
            nip: walasAssign.User.Guru?.nip || null,
            no_hp: walasAssign.User.no_hp || walasAssign.User.Guru?.no_hp || null,
            jabatan: walasAssign.Position?.name || 'Wali Kelas',
            avatar: walasAssign.User.Guru?.foto || null,
          };
        }
      }
    }

    // Untuk Direct Chat, cari lawan bicara & jika siswa cari wali kelasnya juga
    let targetUser: any = null;
    if (thread.type !== InternalThreadType.GROUP) {
      targetUser = members.find((m: any) => m.user_id !== userId) || members[0] || null;
      if (targetUser && targetUser.role === 'SISWA' && targetUser.kelas_id) {
        const walasAssign = await (prisma as any).organizationalAssignment.findFirst({
          where: {
            tenant_id: tenantId,
            kelas_id: targetUser.kelas_id,
            is_active: true,
          },
          include: {
            Position: { select: { name: true } },
            User: {
              select: {
                id: true,
                full_name: true,
                no_hp: true,
                Guru: { select: { nip: true, nama_guru: true, foto: true } },
              },
            },
          },
        });
        if (walasAssign?.User) {
          waliKelas = {
            user_id: walasAssign.User.id,
            name: walasAssign.User.full_name || walasAssign.User.Guru?.nama_guru,
            nip: walasAssign.User.Guru?.nip || null,
            no_hp: walasAssign.User.no_hp || null,
            jabatan: walasAssign.Position?.name || 'Wali Kelas',
            avatar: walasAssign.User.Guru?.foto || null,
          };
        }
      }
    }

    return {
      thread_id: thread.id,
      type: thread.type,
      title: thread.title,
      category: thread.category,
      groupScope: ctx.groupScope || null,
      isBroadcast: Boolean(ctx.isBroadcast),
      kelasInfo,
      waliKelas,
      targetUser,
      memberCount: members.length,
      members,
    };
  }

  /**
   * 11. Ambil Profil Lengkap Satu Anggota / Pengguna (Untuk tombol "Info" dari Group Slide-Up)
   */
  async getUserProfile(tenantId: string, targetUserId: string) {
    const u = await prisma.user.findFirst({
      where: {
        id: targetUserId,
        tenant_id: tenantId,
      },
      select: {
        id: true,
        full_name: true,
        email: true,
        no_hp: true,
        Role: { select: { name: true } },
        Guru: {
          select: {
            id: true,
            nip: true,
            nama_guru: true,
            jabatan: true,
            no_hp: true,
            foto: true,
          },
        },
        Siswa: {
          select: {
            id: true,
            nis: true,
            nisn: true,
            nama_siswa: true,
            no_hp: true,
            jenis_kelamin: true,
            foto: true,
            kelas_id: true,
            Kelas: { select: { id: true, nama_kelas: true, tingkat: true } },
          },
        },
      },
    });

    if (!u) {
      throw new Error('Profil pengguna tidak ditemukan.');
    }

    const role = u.Role?.name || 'Pengguna';
    const profile = {
      user_id: u.id,
      name: u.full_name || u.Guru?.nama_guru || u.Siswa?.nama_siswa || 'Pengguna',
      role,
      role_label: u.Guru?.jabatan || role,
      avatar: u.Guru?.foto || u.Siswa?.foto || null,
      email: u.email || null,
      no_hp: u.no_hp || u.Guru?.no_hp || u.Siswa?.no_hp || null,
      nip: u.Guru?.nip || null,
      jabatan: u.Guru?.jabatan || null,
      nis: u.Siswa?.nis || null,
      nisn: u.Siswa?.nisn || null,
      kelas: u.Siswa?.Kelas?.nama_kelas || null,
      kelas_id: u.Siswa?.kelas_id || null,
      jenis_kelamin: u.Siswa?.jenis_kelamin || null,
    };

    let waliKelas: any = null;
    if (role === 'SISWA' && u.Siswa?.kelas_id) {
      const walasAssign = await (prisma as any).organizationalAssignment.findFirst({
        where: {
          tenant_id: tenantId,
          kelas_id: u.Siswa.kelas_id,
          is_active: true,
        },
        include: {
          Position: { select: { name: true } },
          User: {
            select: {
              id: true,
              full_name: true,
              no_hp: true,
              Guru: { select: { nip: true, nama_guru: true, foto: true } },
            },
          },
        },
      });
      if (walasAssign?.User) {
        waliKelas = {
          user_id: walasAssign.User.id,
          name: walasAssign.User.full_name || walasAssign.User.Guru?.nama_guru,
          nip: walasAssign.User.Guru?.nip || null,
          no_hp: walasAssign.User.no_hp || null,
          jabatan: walasAssign.Position?.name || 'Wali Kelas',
          avatar: walasAssign.User.Guru?.foto || null,
        };
      }
    }

    return {
      user: profile,
      waliKelas,
    };
  }
}

export const communicationService = new CommunicationService();
