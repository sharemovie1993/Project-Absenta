import axiosInstance from '../lib/axiosInstance';
import { standardApiCall, type StandardApiResponse } from './apiUtils';

// =========================================================================
// 🎫 TYPES & INTERFACES
// =========================================================================

export type SupportTicketCategory = 'BILLING' | 'TECHNICAL' | 'DEVICE_HARDWARE' | 'FEATURE_REQUEST' | 'OTHER';
export type SupportTicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type SupportTicketStatus = 'OPEN' | 'IN_PROGRESS' | 'PENDING_CUSTOMER' | 'RESOLVED' | 'CLOSED';
export type SupportTicketSenderType = 'CUSTOMER' | 'SUPPORT';

export interface UserSummary {
  id: string;
  full_name: string;
  email?: string;
  no_hp?: string;
  role_id?: string;
}

export interface TenantSummary {
  id: string;
  name: string;
  logo_url?: string | null;
  status: string;
  subscription_package?: string;
  monthly_fee?: number;
  invoice_status?: string;
  ping_latency?: string;
  rfid_status?: string;
  dapodik_status?: string;
}

export interface SupportTicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_type: SupportTicketSenderType;
  message: string;
  attachments: string[];
  is_internal?: boolean;
  created_at: string;
  Sender?: UserSummary;
}

export interface SupportQuickReply {
  id: string;
  shortcut: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
  updated_at: string;
}

export interface SupportKnowledgeBase {
  id: string;
  title: string;
  content: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface SupportAnalytics {
  total_tickets: number;
  resolve_rate: number;
  average_response_time_minutes: number;
  category_distribution: Record<string, number>;
  priority_distribution: Record<string, number>;
  active_agents: Array<{ name: string; count: number }>;
}

export interface SupportTicket {
  id: string;
  ticket_number: string;
  tenant_id: string;
  creator_id: string;
  assigned_to_id: string | null;
  title: string;
  description: string;
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  created_at: string;
  updated_at: string;
  Tenant?: TenantSummary;
  Creator?: UserSummary;
  Assignee?: UserSummary | null;
  Messages?: SupportTicketMessage[];
  unread_count?: number;
  rating?: number | null;
  rating_comment?: string | null;
  rated_at?: string | null;
}

// =========================================================================
// 📡 API SERVICE IMPLEMENTATION
// =========================================================================

export const supportTicketApi = {
  
  // 👥 ENDPOINT PORTAL KLIEN (SEKOLAH - Multi-Tenant)

  /**
   * Mengambil daftar tiket keluhan milik sekolah saat ini
   */
  getSchoolTickets: (filters?: { status?: SupportTicketStatus; category?: SupportTicketCategory }) =>
    standardApiCall<StandardApiResponse<SupportTicket[]>>(
      () => axiosInstance.get('/support', { params: filters }),
      'getSchoolTickets'
    ),

  /**
   * Mengambil detail tiket keluhan milik sekolah (termasuk thread chat pesan)
   */
  getSchoolTicketDetail: (ticketId: string) =>
    standardApiCall<StandardApiResponse<SupportTicket>>(
      () => axiosInstance.get(`/support/${encodeURIComponent(ticketId)}`),
      'getSchoolTicketDetail',
      { meta: { ticketId } }
    ),

  /**
   * Mengajukan tiket keluhan baru dari sekolah ke platform
   */
  createSchoolTicket: (data: {
    title: string;
    description: string;
    category: SupportTicketCategory;
    priority: SupportTicketPriority;
    attachments?: string[];
  }) =>
    standardApiCall<StandardApiResponse<SupportTicket>>(
      () => axiosInstance.post('/support', data),
      'createSchoolTicket'
    ),

  /**
   * Membalas pesan keluhan sekolah di dalam thread
   */
  replySchoolTicket: (ticketId: string, message: string, attachments?: string[]) =>
    standardApiCall<StandardApiResponse<SupportTicketMessage>>(
      () => axiosInstance.post(`/support/${encodeURIComponent(ticketId)}/messages`, { message, attachments }),
      'replySchoolTicket',
      { meta: { ticketId } }
    ),

  /**
   * Menandai tiket teratasi / selesai dari sisi sekolah
   */
  resolveSchoolTicket: (ticketId: string) =>
    standardApiCall<StandardApiResponse<SupportTicket>>(
      () => axiosInstance.patch(`/support/${encodeURIComponent(ticketId)}/resolve`),
      'resolveSchoolTicket',
      { meta: { ticketId } }
    ),

  /**
   * Memberikan penilaian layanan CSAT (Rating & Feedback) dari sisi sekolah
   */
  rateSchoolTicket: (ticketId: string, rating: number, comment?: string) =>
    standardApiCall<StandardApiResponse<SupportTicket>>(
      () => axiosInstance.post(`/support/${encodeURIComponent(ticketId)}/rate`, { rating, comment }),
      'rateSchoolTicket',
      { meta: { ticketId, rating } }
    ),


  // 🛠️ ENDPOINT DASBOR HELPDESK SUPERADMIN (CS/CR - Lintas Tenant)

  /**
   * Mengambil semua antrean aduan secara nasional (CS)
   */
  getAdminTickets: (filters?: {
    status?: SupportTicketStatus;
    priority?: SupportTicketPriority;
    category?: SupportTicketCategory;
    search?: string;
  }) =>
    standardApiCall<StandardApiResponse<SupportTicket[]>>(
      () => axiosInstance.get('/support/admin', { params: filters }),
      'getAdminTickets'
    ),

  /**
   * Mengambil detail aduan sekolah + riwayat chat + diagnosa tenant untuk CS
   */
  getAdminTicketDetail: (ticketId: string) =>
    standardApiCall<StandardApiResponse<SupportTicket>>(
      () => axiosInstance.get(`/support/admin/${encodeURIComponent(ticketId)}`),
      'getAdminTicketDetail',
      { meta: { ticketId } }
    ),

  /**
   * Menugaskan tiket aduan ke agen CS tertentu
   */
  assignTicket: (ticketId: string, assignedToId: string) =>
    standardApiCall<StandardApiResponse<SupportTicket>>(
      () => axiosInstance.patch(`/support/admin/${encodeURIComponent(ticketId)}/assign`, { assigned_to_id: assignedToId }),
      'assignTicket',
      { meta: { ticketId, assignedToId } }
    ),

  /**
   * Memperbarui status / prioritas tiket keluhan sekolah
   */
  updateTicketStatusAndPriority: (
    ticketId: string,
    data: { status?: SupportTicketStatus; priority?: SupportTicketPriority }
  ) =>
    standardApiCall<StandardApiResponse<SupportTicket>>(
      () => axiosInstance.patch(`/support/admin/${encodeURIComponent(ticketId)}/status`, data),
      'updateTicketStatusAndPriority',
      { meta: { ticketId } }
    ),

  /**
   * Mengirim jawaban solusi dari tim CS (Support) ke sekolah (bisa berupa Catatan Internal)
   */
  replyAdminTicket: (ticketId: string, message: string, attachments?: string[], isInternal?: boolean) =>
    standardApiCall<StandardApiResponse<SupportTicketMessage>>(
      () => axiosInstance.post(`/support/admin/${encodeURIComponent(ticketId)}/messages`, { message, attachments, is_internal: isInternal }),
      'replyAdminTicket',
      { meta: { ticketId } }
    ),

  /**
   * Mengambil daftar template balasan cepat (CS)
   */
  getQuickReplies: () =>
    standardApiCall<StandardApiResponse<SupportQuickReply[]>>(
      () => axiosInstance.get('/support/admin/quick-replies'),
      'getQuickReplies'
    ),

  /**
   * Mencari panduan troubleshooting internal (CS)
   */
  getKnowledgeBase: (search?: string) =>
    standardApiCall<StandardApiResponse<SupportKnowledgeBase[]>>(
      () => axiosInstance.get('/support/admin/knowledge-base', { params: { search } }),
      'getKnowledgeBase'
    ),

  /**
   * Mengambil statistik SLA dan performa pelayanan support (CS)
   */
  getSupportAnalytics: () =>
    standardApiCall<StandardApiResponse<SupportAnalytics>>(
      () => axiosInstance.get('/support/admin/analytics'),
      'getSupportAnalytics'
    ),

  /**
   * Membuat FAQ baru (Admin)
   */
  createKnowledgeBase: (data: { title: string; content: string; tags: string[] }) =>
    standardApiCall<StandardApiResponse<SupportKnowledgeBase>>(
      () => axiosInstance.post('/support/admin/knowledge-base', data),
      'createKnowledgeBase'
    ),

  /**
   * Memperbarui FAQ (Admin)
   */
  updateKnowledgeBase: (id: string, data: { title?: string; content?: string; tags?: string[] }) =>
    standardApiCall<StandardApiResponse<SupportKnowledgeBase>>(
      () => axiosInstance.patch(`/support/admin/knowledge-base/${encodeURIComponent(id)}`, data),
      'updateKnowledgeBase',
      { meta: { id } }
    ),

  /**
   * Menghapus FAQ (Admin)
   */
  deleteKnowledgeBase: (id: string) =>
    standardApiCall<StandardApiResponse<void>>(
      () => axiosInstance.delete(`/support/admin/knowledge-base/${encodeURIComponent(id)}`),
      'deleteKnowledgeBase',
      { meta: { id } }
    ),

  /**
   * Membuat Balasan Cepat baru (Admin)
   */
  createQuickReply: (data: { shortcut: string; title: string; content: string; category: string }) =>
    standardApiCall<StandardApiResponse<SupportQuickReply>>(
      () => axiosInstance.post('/support/admin/quick-replies', data),
      'createQuickReply'
    ),

  /**
   * Memperbarui Balasan Cepat (Admin)
   */
  updateQuickReply: (id: string, data: { shortcut?: string; title?: string; content?: string; category?: string }) =>
    standardApiCall<StandardApiResponse<SupportQuickReply>>(
      () => axiosInstance.patch(`/support/admin/quick-replies/${encodeURIComponent(id)}`, data),
      'updateQuickReply',
      { meta: { id } }
    ),

  /**
   * Menghapus Balasan Cepat (Admin)
   */
  deleteQuickReply: (id: string) =>
    standardApiCall<StandardApiResponse<void>>(
      () => axiosInstance.delete(`/support/admin/quick-replies/${encodeURIComponent(id)}`),
      'deleteQuickReply',
      { meta: { id } }
    )
};

/**
 * Mapper Kategori tiket bantuan ke label ramah pengguna (Bahasa Indonesia)
 */
export const getCategoryLabel = (category: SupportTicketCategory): string => {
  switch (category) {
    case 'BILLING':
      return 'Keuangan & Tagihan';
    case 'TECHNICAL':
      return 'Kendala Sistem / Bug';
    case 'DEVICE_HARDWARE':
      return 'Mesin Absensi / Hardware';
    case 'FEATURE_REQUEST':
      return 'Request Fitur Baru';
    case 'OTHER':
      return 'Lainnya';
    default:
      return category;
  }
};
