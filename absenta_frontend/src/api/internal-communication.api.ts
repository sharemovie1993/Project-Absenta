import axiosInstance from '../lib/axiosInstance';

export type InternalThreadType = 'DIRECT' | 'GROUP' | 'DISPOSISI' | 'KONSULTASI';
export type InternalThreadCategory = 'UMUM' | 'PIKET' | 'WALIKELAS' | 'KURIKULUM' | 'KESISWAAN' | 'BK' | 'SARPRAS' | 'KEDISIPLINAN';
export type InternalThreadPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type InternalThreadStatus = 'ACTIVE' | 'RESOLVED' | 'CLOSED' | 'ARCHIVED';

export interface InternalMessageAttachment {
  type: 'IMAGE' | 'DOCUMENT' | 'AUDIO_VOICE_NOTE';
  url: string;
  name: string;
  size?: number;
  duration?: number;
}

export interface InternalMessageItem {
  id: string;
  thread_id: string;
  sender_id: string;
  sender_name?: string;
  sender_role?: string;
  is_me: boolean;
  content: string;
  attachments?: InternalMessageAttachment[] | null;
  is_system_event?: boolean;
  created_at: string;
}

export interface InternalParticipantItem {
  id: string;
  user_id: string;
  name?: string;
  role?: string;
  role_label?: string;
  kelas?: string | null;
}

export interface InternalThreadItem {
  id: string;
  type: InternalThreadType;
  title: string;
  category: InternalThreadCategory;
  priority: InternalThreadPriority;
  status: InternalThreadStatus;
  is_confidential?: boolean;
  context_ref?: {
    type: 'SISWA' | 'SESI_KBM' | 'PELANGGARAN' | 'TUGAS';
    id: string;
    label: string;
    subLabel?: string;
  } | null;
  created_at: string;
  updated_at: string;
  lastMessage?: {
    id: string;
    sender_id: string;
    sender_name?: string;
    content: string;
    created_at: string;
    attachments?: InternalMessageAttachment[] | null;
    is_system_event?: boolean;
  } | null;
  isUnread?: boolean;
  myLastReadAt?: string | null;
  participants: InternalParticipantItem[];
  otherUser?: {
    id: string;
    name: string;
    role?: string;
    role_label?: string;
    kelas?: string | null;
    phone_number?: string | null;
  } | null;
}

export interface EligibleContactItem {
  id: string;
  name: string;
  role_label: string;
  group: string;
  avatar?: string;
}

export interface CreateThreadPayload {
  type?: InternalThreadType;
  title?: string;
  category?: InternalThreadCategory;
  priority?: InternalThreadPriority;
  targetUserIds: string[];
  initialMessage?: string;
  contextRef?: any;
  isConfidential?: boolean;
}

export interface SendMessagePayload {
  content: string;
  attachments?: InternalMessageAttachment[];
}

/**
 * ⚡ TanStack React Query Key Factory (Pilar 31 Hardening)
 */
export const communicationKeys = {
  all: ['internal-communication'] as const,
  threads: (filters?: Record<string, any>) => [...communicationKeys.all, 'threads', filters] as const,
  messages: (threadId: string) => [...communicationKeys.all, 'messages', threadId] as const,
  contacts: () => [...communicationKeys.all, 'contacts'] as const,
  unreadCount: () => [...communicationKeys.all, 'unread-count'] as const,
};

export const internalCommunicationApi = {
  /**
   * Ambil daftar thread percakapan
   */
  async getThreads(filters?: { type?: string; category?: string; status?: string; search?: string }): Promise<InternalThreadItem[]> {
    const res = await axiosInstance.get<{ success: boolean; data: InternalThreadItem[] }>('/communication', {
      params: filters
    });
    return res.data?.data || [];
  },

  /**
   * Ambil detail riwayat pesan dalam satu thread
   */
  async getThreadMessages(threadId: string): Promise<{ thread: InternalThreadItem; messages: InternalMessageItem[] }> {
    const res = await axiosInstance.get<{ success: boolean; data: { thread: InternalThreadItem; messages: InternalMessageItem[] } }>(
      `/communication/${threadId}`
    );
    return res.data?.data;
  },

  /**
   * Buat thread / percakapan baru
   */
  async createThread(payload: CreateThreadPayload): Promise<InternalThreadItem> {
    const res = await axiosInstance.post<{ success: boolean; data: InternalThreadItem }>('/communication', payload);
    return res.data?.data;
  },

  /**
   * Kirim pesan baru ke dalam thread
   */
  async sendMessage(threadId: string, payload: SendMessagePayload): Promise<InternalMessageItem> {
    const res = await axiosInstance.post<{ success: boolean; data: InternalMessageItem }>(
      `/communication/${threadId}/messages`,
      payload
    );
    return res.data?.data;
  },

  /**
   * Update status thread (Selesai, Ditutup, Aktif)
   */
  async updateStatus(threadId: string, status: InternalThreadStatus): Promise<InternalThreadItem> {
    const res = await axiosInstance.patch<{ success: boolean; data: InternalThreadItem }>(
      `/communication/${threadId}/status`,
      { status }
    );
    return res.data?.data;
  },

  /**
   * Ambil daftar kontak yang sah dihubungi
   */
  async getContacts(): Promise<EligibleContactItem[]> {
    const res = await axiosInstance.get<{ success: boolean; data: EligibleContactItem[] }>('/communication/contacts');
    return res.data?.data || [];
  },

  /**
   * Ambil total unread counter
   */
  async getUnreadCount(): Promise<number> {
    const res = await axiosInstance.get<{ success: boolean; data: { unread_count: number } }>('/communication/unread-count');
    return res.data?.data?.unread_count || 0;
  }
};
