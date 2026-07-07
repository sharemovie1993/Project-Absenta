import axios from 'axios';
import { 
  SupportTicketCategory, 
  SupportTicketPriority, 
  SupportTicketStatus, 
  SupportTicketSenderType 
} from '@prisma/client';

export const supportTicketService = {
  /**
   * Helper to fetch license config
   */
  getLicenseConfig() {
    const licenseServerUrl = process.env.LICENSE_SERVER_URL || 'https://api.absenta.id';
    const licenseKey = process.env.LICENSE_KEY;
    if (!licenseKey) {
      throw new Error('LICENSE_KEY is not configured on this school instance.');
    }
    return { licenseServerUrl, licenseKey };
  },

  /**
   * Membuat Tiket Keluhan Baru dari Sisi Sekolah (Client Portal - Proxy to Central)
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
    const { licenseServerUrl, licenseKey } = this.getLicenseConfig();

    const response = await axios.post(`${licenseServerUrl}/api/tickets`, {
      subject: data.title,
      description: data.description,
      priority: data.priority?.toLowerCase() || 'medium'
    }, {
      headers: {
        'X-License-Key': licenseKey
      }
    });

    const result = response.data.data;
    
    // Return compatible local structure to avoid breaking router
    return {
      id: result.id,
      ticket_number: result.id.slice(0, 8).toUpperCase(),
      tenant_id: data.tenantId,
      creator_id: data.creatorId,
      title: data.title,
      description: data.description,
      category: data.category,
      priority: data.priority,
      status: SupportTicketStatus.OPEN,
      created_at: new Date(result.createdAt),
      updated_at: new Date(result.updatedAt)
    };
  },

  /**
   * Mendapatkan Daftar Tiket Khusus untuk Sekolah yang Berjalan (Proxy to Central)
   */
  async getTicketsForTenant(tenantId: string, _filters: {
    status?: SupportTicketStatus;
    category?: SupportTicketCategory;
  }) {
    const { licenseServerUrl, licenseKey } = this.getLicenseConfig();

    const response = await axios.get(`${licenseServerUrl}/api/tickets`, {
      headers: {
        'X-License-Key': licenseKey
      }
    });

    const centralTickets = response.data.data || [];

    // Map central schema to compatible local schema for frontend
    return centralTickets.map((t: any) => ({
      id: t.id,
      ticket_number: t.id.slice(0, 8).toUpperCase(),
      tenant_id: tenantId,
      title: t.subject,
      description: t.description,
      status: t.status.toUpperCase() as SupportTicketStatus,
      priority: t.priority.toUpperCase() as SupportTicketPriority,
      category: SupportTicketCategory.TECHNICAL,
      created_at: new Date(t.createdAt),
      updated_at: new Date(t.updatedAt),
      unread_count: 0
    }));
  },

  /**
   * Mendapatkan Detail Tiket beserta Thread Percakapan (Proxy to Central)
   */
  async getTicketDetail(ticketId: string, tenantId?: string) {
    const { licenseServerUrl, licenseKey } = this.getLicenseConfig();

    const response = await axios.get(`${licenseServerUrl}/api/tickets/${ticketId}`, {
      headers: {
        'X-License-Key': licenseKey
      }
    });

    const t = response.data.data;
    if (!t) return null;

    // Map central schema to compatible local detail schema
    return {
      id: t.id,
      ticket_number: t.id.slice(0, 8).toUpperCase(),
      tenant_id: tenantId,
      title: t.subject,
      description: t.description,
      status: t.status.toUpperCase() as SupportTicketStatus,
      priority: t.priority.toUpperCase() as SupportTicketPriority,
      category: SupportTicketCategory.TECHNICAL,
      created_at: new Date(t.createdAt),
      updated_at: new Date(t.updatedAt),
      Messages: (t.messages || []).map((msg: any) => ({
        id: msg.id,
        ticket_id: t.id,
        sender_id: msg.sender === 'tenant' ? 'client-user' : 'support-agent',
        sender_type: msg.sender === 'tenant' ? SupportTicketSenderType.CUSTOMER : SupportTicketSenderType.SUPPORT,
        message: msg.message,
        attachments: [],
        is_internal: false,
        created_at: new Date(msg.createdAt)
      }))
    };
  },

  /**
   * Membalas Tiket (Proxy to Central)
   */
  async replyTicket(data: {
    ticketId: string;
    senderId: string;
    senderType: SupportTicketSenderType;
    message: string;
    attachments?: string[];
    tenantId?: string;
    is_internal?: boolean;
  }) {
    const { licenseServerUrl, licenseKey } = this.getLicenseConfig();

    const response = await axios.post(`${licenseServerUrl}/api/tickets/${data.ticketId}/messages`, {
      message: data.message
    }, {
      headers: {
        'X-License-Key': licenseKey
      }
    });

    const msg = response.data.data;

    return {
      id: msg.id,
      ticket_id: data.ticketId,
      sender_id: data.senderId,
      sender_type: data.senderType,
      message: data.message,
      attachments: data.attachments || [],
      is_internal: false,
      created_at: new Date(msg.createdAt)
    };
  },

  /**
   * Menyelesaikan Tiket (Proxy to Central)
   */
  async resolveTicket(ticketId: string, _tenantId?: string) {
    const { licenseServerUrl, licenseKey } = this.getLicenseConfig();

    const response = await axios.post(`${licenseServerUrl}/api/tickets/${ticketId}/resolve`, {}, {
      headers: {
        'X-License-Key': licenseKey
      }
    });

    const t = response.data.data;
    return {
      id: t.id,
      status: SupportTicketStatus.RESOLVED
    };
  },

  /**
   * Memberikan Penilaian Layanan CSAT (Proxy to Central)
   */
  async rateTicket(data: {
    ticketId: string;
    tenantId: string;
    rating: number;
    comment?: string;
  }) {
    const { licenseServerUrl, licenseKey } = this.getLicenseConfig();

    const response = await axios.post(`${licenseServerUrl}/api/tickets/${data.ticketId}/rate`, {
      rating: data.rating,
      comment: data.comment
    }, {
      headers: {
        'X-License-Key': licenseKey
      }
    });

    const t = response.data.data;
    return {
      id: t.id,
      status: SupportTicketStatus.CLOSED
    };
  },

  /**
   * Dummy Admin methods to prevent compilation errors before they are deleted in Fase 4
   */
  async getAllTicketsAdmin() {
    return [];
  },
  async assignTicket() {
    return null;
  },
  async updateTicketStatus() {
    return null;
  }
};
