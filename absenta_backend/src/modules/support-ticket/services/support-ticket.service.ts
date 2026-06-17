import { prisma } from '@/utils/prisma';
import { 
  SupportTicketCategory, 
  SupportTicketPriority, 
  SupportTicketStatus, 
  SupportTicketSenderType 
} from '@prisma/client';

export const supportTicketService = {
  /**
   * Pembuat Nomor Tiket Unik Berurutan secara Harian
   * Format: TKT-YYYYMMDD-XXXX (Contoh: TKT-20260517-0001)
   */
  async generateTicketNumber(): Promise<string> {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}${mm}${dd}`;

    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    const count = await prisma.supportTicket.count({
      where: {
        created_at: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });

    const serial = String(count + 1).padStart(4, '0');
    return `TKT-${dateStr}-${serial}`;
  },

  /**
   * Membuat Tiket Keluhan Baru dari Sisi Sekolah (Client Portal)
   */
  async createTicket(data: {
    tenantId: string;
    creatorId: string;
    title: string;
    description: string;
    category: SupportTicketCategory;
    priority: SupportTicketPriority;
    attachments?: string[];
  }) {
    const ticketNumber = await this.generateTicketNumber();

    return await prisma.$transaction(async (tx) => {
      // 1. Buat Header Tiket
      const ticket = await tx.supportTicket.create({
        data: {
          ticket_number: ticketNumber,
          tenant_id: data.tenantId,
          creator_id: data.creatorId,
          title: data.title,
          description: data.description,
          category: data.category,
          priority: data.priority,
          status: SupportTicketStatus.OPEN
        }
      });

      // 2. Buat Pesan Pertama (First Thread Message) Berdasarkan Deskripsi
      await tx.supportTicketMessage.create({
        data: {
          ticket_id: ticket.id,
          sender_id: data.creatorId,
          sender_type: SupportTicketSenderType.CUSTOMER,
          message: data.description,
          attachments: data.attachments || []
        }
      });

      return ticket;
    });
  },

  /**
   * Mendapatkan Daftar Tiket Khusus untuk Sekolah yang Berjalan (Client Portal - Multi-Tenant)
   */
  async getTicketsForTenant(tenantId: string, filters: {
    status?: SupportTicketStatus;
    category?: SupportTicketCategory;
  }) {
    const tickets = await prisma.supportTicket.findMany({
      where: {
        tenant_id: tenantId,
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.category ? { category: filters.category } : {})
      },
      include: {
        Creator: {
          select: {
            id: true,
            full_name: true,
            email: true
          }
        },
        Assignee: {
          select: {
            id: true,
            full_name: true
          }
        },
        Messages: {
          select: {
            id: true,
            sender_type: true,
            created_at: true,
            is_internal: true
          },
          orderBy: {
            created_at: 'desc'
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // Petakan tiket untuk menyematkan unread_count secara dinamis di server untuk Tenant
    return tickets.map(t => {
      let unreadCount = 0;

      // Jika status tiket bukan RESOLVED atau CLOSED, hitung pesan SUPPORT yang belum dibaca/dibalas
      if (t.status !== SupportTicketStatus.RESOLVED && t.status !== SupportTicketStatus.CLOSED) {
        for (const msg of t.Messages) {
          // Abaikan internal note karena client tidak boleh melihatnya
          if (msg.is_internal) continue;

          if (msg.sender_type === SupportTicketSenderType.SUPPORT) {
            unreadCount++;
          } else {
            // Hentikan hitungan begitu menemukan pesan balasan CUSTOMER
            break;
          }
        }
      }

      // Hapus data array Messages untuk menghemat bandwidth transmisi
      const { Messages, ...ticketData } = t;

      return {
        ...ticketData,
        unread_count: unreadCount
      };
    });
  },

  /**
   * Mendapatkan Detail Tiket beserta Thread Percakapan (Sisi Client / Admin)
   */
  async getTicketDetail(ticketId: string, tenantId?: string) {
    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id: ticketId,
        ...(tenantId ? { tenant_id: tenantId } : {}) // Isolasi tenant jika dilewatkan (Klien)
      },
      include: {
        Tenant: {
          select: {
            id: true,
            name: true,
            logo_url: true,
            status: true
          }
        },
        Creator: {
          select: {
            id: true,
            full_name: true,
            email: true,
            no_hp: true
          }
        },
        Assignee: {
          select: {
            id: true,
            full_name: true,
            email: true
          }
        },
        Messages: {
          where: {
            ...(tenantId ? { is_internal: false } : {}) // 🔐 Saring pesan internal agar tidak terkirim ke Klien Sekolah
          },
          include: {
            Sender: {
              select: {
                id: true,
                full_name: true,
                role_id: true
              }
            }
          },
          orderBy: {
            created_at: 'asc'
          }
        }
      }
    });

    return ticket;
  },

  /**
   * Membalas Tiket (Kirim Pesan Baru di Thread Chat)
   */
  async replyTicket(data: {
    ticketId: string;
    senderId: string;
    senderType: SupportTicketSenderType;
    message: string;
    attachments?: string[];
    tenantId?: string; // Untuk validasi keamanan sisi Klien
    is_internal?: boolean; // 📝 Dukungan Catatan Internal
  }) {
    // Validasi kepemilikan jika tenantId dilewatkan (Sekolah)
    const ticketExists = await prisma.supportTicket.findFirst({
      where: {
        id: data.ticketId,
        ...(data.tenantId ? { tenant_id: data.tenantId } : {})
      }
    });

    if (!ticketExists) {
      throw new Error('Tiket tidak ditemukan atau Anda tidak memiliki akses.');
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Simpan pesan chat baru
      const msg = await tx.supportTicketMessage.create({
        data: {
          ticket_id: data.ticketId,
          sender_id: data.senderId,
          sender_type: data.senderType,
          message: data.message,
          attachments: data.attachments || [],
          is_internal: data.is_internal || false // 📝 Catatan internal khusus staf
        }
      });

      // 2. Transisi Status Otomatis Mengikuti Aturan SLA (Hanya jika BUKAN catatan internal!)
      let nextStatus = ticketExists.status;
      if (!data.is_internal) {
        if (data.senderType === SupportTicketSenderType.SUPPORT) {
          // CS Membalas: Status otomatis menjadi IN_PROGRESS (jika tadinya OPEN)
          if (ticketExists.status === SupportTicketStatus.OPEN) {
            nextStatus = SupportTicketStatus.IN_PROGRESS;
          }
        } else {
          // Customer Membalas: Jika statusnya PENDING_CUSTOMER, naikkan lagi ke IN_PROGRESS
          if (ticketExists.status === SupportTicketStatus.PENDING_CUSTOMER) {
            nextStatus = SupportTicketStatus.IN_PROGRESS;
          }
        }
      }

      await tx.supportTicket.update({
        where: { id: data.ticketId },
        data: {
          status: nextStatus,
          updated_at: new Date()
        }
      });

      return msg;
    });
  },

  /**
   * Menyelesaikan Tiket (RESOLVED)
   */
  async resolveTicket(ticketId: string, tenantId?: string) {
    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id: ticketId,
        ...(tenantId ? { tenant_id: tenantId } : {})
      }
    });

    if (!ticket) {
      throw new Error('Tiket tidak ditemukan.');
    }

    return await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: SupportTicketStatus.RESOLVED
      }
    });
  },

  /**
   * Memberikan Penilaian Layanan CSAT oleh Sekolah (Status menjadi CLOSED)
   */
  async rateTicket(data: {
    ticketId: string;
    tenantId: string;
    rating: number;
    comment?: string;
  }) {
    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id: data.ticketId,
        tenant_id: data.tenantId
      }
    });

    if (!ticket) {
      throw new Error('Tiket tidak ditemukan atau Anda tidak memiliki akses.');
    }

    if (ticket.status !== SupportTicketStatus.RESOLVED) {
      throw new Error('Penilaian hanya dapat diberikan untuk tiket yang telah diselesaikan (RESOLVED).');
    }

    return await prisma.supportTicket.update({
      where: { id: data.ticketId },
      data: {
        rating: data.rating,
        rating_comment: data.comment || null,
        rated_at: new Date(),
        status: SupportTicketStatus.CLOSED
      }
    });
  },

  /**
   * Mendapatkan Seluruh Tiket Lintas-Tenant untuk Dasbor CS/CR Superadmin
   */
  async getAllTicketsAdmin(filters: {
    status?: SupportTicketStatus;
    priority?: SupportTicketPriority;
    category?: SupportTicketCategory;
    search?: string;
  }) {
    const tickets = await prisma.supportTicket.findMany({
      where: {
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.priority ? { priority: filters.priority } : {}),
        ...(filters.category ? { category: filters.category } : {}),
        ...(filters.search ? {
          OR: [
            { ticket_number: { contains: filters.search, mode: 'insensitive' } },
            { title: { contains: filters.search, mode: 'insensitive' } },
            { Tenant: { name: { contains: filters.search, mode: 'insensitive' } } }
          ]
        } : {})
      },
      include: {
        Tenant: {
          select: {
            id: true,
            name: true
          }
        },
        Creator: {
          select: {
            id: true,
            full_name: true
          }
        },
        Assignee: {
          select: {
            id: true,
            full_name: true
          }
        },
        Messages: {
          select: {
            id: true,
            sender_type: true,
            created_at: true
          },
          orderBy: {
            created_at: 'desc'
          }
        }
      },
      orderBy: {
        updated_at: 'desc'
      }
    });

    // Petakan tiket untuk menyematkan unread_count secara dinamis di server
    return tickets.map(t => {
      let unreadCount = 0;

      // Jika status tiket bukan RESOLVED atau CLOSED, hitung pesan CUSTOMER yang belum dibalas
      if (t.status !== SupportTicketStatus.RESOLVED && t.status !== SupportTicketStatus.CLOSED) {
        for (const msg of t.Messages) {
          if (msg.sender_type === SupportTicketSenderType.CUSTOMER) {
            unreadCount++;
          } else {
            // Hentikan hitungan begitu menemukan pesan balasan SUPPORT
            break;
          }
        }
      }

      // Hapus data array Messages untuk menghemat bandwidth transmisi
      const { Messages, ...ticketData } = t;

      return {
        ...ticketData,
        unread_count: unreadCount
      };
    });
  },

  /**
   * Mengklaim / Menugaskan Tiket ke Agen CS Tertentu
   */
  async assignTicket(ticketId: string, assignedToId: string) {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId }
    });

    if (!ticket) {
      throw new Error('Tiket tidak ditemukan.');
    }

    const nextStatus = ticket.status === SupportTicketStatus.OPEN 
      ? SupportTicketStatus.IN_PROGRESS 
      : ticket.status;

    return await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        assigned_to_id: assignedToId,
        status: nextStatus
      }
    });
  },

  /**
   * Mengubah Status & Prioritas Tiket Secara Manual oleh Agen CS
   */
  async updateStatusAndPriority(ticketId: string, data: {
    status?: SupportTicketStatus;
    priority?: SupportTicketPriority;
  }) {
    return await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        ...(data.status ? { status: data.status } : {}),
        ...(data.priority ? { priority: data.priority } : {})
      }
    });
  },

  /**
   * Mengambil Seluruh Balasan Cepat (Quick Replies)
   */
  async getQuickReplies() {
    return await prisma.supportQuickReply.findMany({
      orderBy: { shortcut: 'asc' }
    });
  },

  /**
   * Mengambil Seluruh Panduan Knowledge Base (FAQ Internal)
   */
  async getKnowledgeBase(search?: string) {
    return await prisma.supportKnowledgeBase.findMany({
      where: search ? {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { content: { contains: search, mode: 'insensitive' } },
          { tags: { has: search.toLowerCase() } }
        ]
      } : {},
      orderBy: { title: 'asc' }
    });
  },

  /**
   * Membuat FAQ / Knowledge Base Baru
   */
  async createKnowledgeBase(data: { title: string; content: string; tags: string[] }) {
    return await prisma.supportKnowledgeBase.create({
      data: {
        title: data.title,
        content: data.content,
        tags: data.tags.map(t => t.toLowerCase())
      }
    });
  },

  /**
   * Memperbarui FAQ / Knowledge Base
   */
  async updateKnowledgeBase(id: string, data: { title?: string; content?: string; tags?: string[] }) {
    return await prisma.supportKnowledgeBase.update({
      where: { id },
      data: {
        ...(data.title ? { title: data.title } : {}),
        ...(data.content ? { content: data.content } : {}),
        ...(data.tags ? { tags: data.tags.map(t => t.toLowerCase()) } : {})
      }
    });
  },

  /**
   * Menghapus FAQ / Knowledge Base
   */
  async deleteKnowledgeBase(id: string) {
    return await prisma.supportKnowledgeBase.delete({
      where: { id }
    });
  },

  /**
   * Membuat Balasan Cepat Baru
   */
  async createQuickReply(data: { shortcut: string; title: string; content: string; category: string }) {
    return await prisma.supportQuickReply.create({
      data: {
        shortcut: data.shortcut,
        title: data.title,
        content: data.content,
        category: data.category
      }
    });
  },

  /**
   * Memperbarui Balasan Cepat
   */
  async updateQuickReply(id: string, data: { shortcut?: string; title?: string; content?: string; category?: string }) {
    return await prisma.supportQuickReply.update({
      where: { id },
      data: {
        ...(data.shortcut ? { shortcut: data.shortcut } : {}),
        ...(data.title ? { title: data.title } : {}),
        ...(data.content ? { content: data.content } : {}),
        ...(data.category ? { category: data.category } : {})
      }
    });
  },

  /**
   * Menghapus Balasan Cepat
   */
  async deleteQuickReply(id: string) {
    return await prisma.supportQuickReply.delete({
      where: { id }
    });
  },

  /**
   * Mengambil Statistik & SLA Analitik CS
   */
  async getSupportAnalytics() {
    const totalTickets = await prisma.supportTicket.count();
    const resolvedTickets = await prisma.supportTicket.count({
      where: {
        status: { in: [SupportTicketStatus.RESOLVED, SupportTicketStatus.CLOSED] }
      }
    });

    const resolveRate = totalTickets > 0 
      ? Math.round((resolvedTickets / totalTickets) * 100) 
      : 100;

    // Hitung Rata-rata Waktu Tanggap Pertama (First Response Time)
    // Rata-rata selisih waktu antara SupportTicket.created_at dengan pesan pertama dari SUPPORT
    const tickets = await prisma.supportTicket.findMany({
      select: {
        created_at: true,
        Messages: {
          where: { sender_type: SupportTicketSenderType.SUPPORT },
          orderBy: { created_at: 'asc' },
          take: 1
        }
      }
    });

    let totalDiffMinutes = 0;
    let countedTickets = 0;

    for (const t of tickets) {
      if (t.Messages.length > 0) {
        const firstReply = t.Messages[0];
        const diffMs = firstReply.created_at.getTime() - t.created_at.getTime();
        totalDiffMinutes += diffMs / (1000 * 60);
        countedTickets++;
      }
    }

    const averageResponseTimeMinutes = countedTickets > 0 
      ? Math.round(totalDiffMinutes / countedTickets) 
      : 0;

    // Distribusi Tiket Per Kategori
    const categories = Object.values(SupportTicketCategory);
    const categoryDistribution: Record<string, number> = {};
    for (const cat of categories) {
      categoryDistribution[cat] = await prisma.supportTicket.count({
        where: { category: cat }
      });
    }

    // Distribusi Tiket Per Urgensi
    const priorities = Object.values(SupportTicketPriority);
    const priorityDistribution: Record<string, number> = {};
    for (const prio of priorities) {
      priorityDistribution[prio] = await prisma.supportTicket.count({
        where: { priority: prio }
      });
    }

    // Agen Teraktif (Berdasarkan jumlah tiket yang di-assign)
    const activeAgentsRaw = await prisma.supportTicket.groupBy({
      by: ['assigned_to_id'],
      _count: { id: true },
      where: { assigned_to_id: { not: null } },
      orderBy: { _count: { id: 'desc' } },
      take: 5
    });

    const activeAgents = [];
    for (const agent of activeAgentsRaw) {
      if (agent.assigned_to_id) {
        const user = await prisma.user.findUnique({
          where: { id: agent.assigned_to_id },
          select: { full_name: true }
        });
        activeAgents.push({
          name: user?.full_name || 'Agen Tidak Dikenal',
          count: agent._count.id
        });
      }
    }

    return {
      total_tickets: totalTickets,
      resolve_rate: resolveRate,
      average_response_time_minutes: averageResponseTimeMinutes,
      category_distribution: categoryDistribution,
      priority_distribution: priorityDistribution,
      active_agents: activeAgents
    };
  }
};
