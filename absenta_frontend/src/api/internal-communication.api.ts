import { requestWithFallback } from './apiUtils';

export type InternalThreadType = 'DIRECT' | 'GROUP' | 'DISPOSISI' | 'KONSULTASI';
export type InternalThreadCategory = 'UMUM' | 'PIKET' | 'WALIKELAS' | 'KURIKULUM' | 'KESISWAAN' | 'BK' | 'SARPRAS' | 'KEDISIPLINAN';
export type InternalThreadPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type InternalThreadStatus = 'ACTIVE' | 'RESOLVED' | 'CLOSED';

export interface InternalAttachment {
  type: 'IMAGE' | 'DOCUMENT' | 'AUDIO_VOICE_NOTE';
  url: string;
  name: string;
  size?: number;
  duration?: number; // Detik jika audio
}

export interface InternalMessageItem {
  id: string;
  thread_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  sender_avatar?: string | null;
  content: string;
  is_system_event: boolean;
  attachments?: InternalAttachment[];
  is_me: boolean;
  created_at: string;
}

export interface InternalParticipantItem {
  id: string;
  user_id: string;
  name: string;
  role?: string;
  role_label?: string;
  kelas?: string | null;
  avatar?: string | null;
}

export interface InternalThreadItem {
  id: string;
  tenant_id: string;
  title: string;
  type: InternalThreadType;
  category: InternalThreadCategory;
  priority: InternalThreadPriority;
  status: InternalThreadStatus;
  is_confidential: boolean;
  context_type?: string | null;
  context_id?: string | null;
  context_meta?: Record<string, any> | null;
  created_by: string;
  creator: {
    id: string;
    name: string;
    role: string;
  };
  participants: InternalParticipantItem[];
  lastMessage?: {
    id: string;
    content: string;
    sender_name: string;
    created_at: string;
    is_system_event: boolean;
  } | null;
  isUnread: boolean;
  created_at: string;
  updated_at: string;
}

export interface EligibleContactItem {
  id: string;
  name: string;
  email: string;
  role: string;
  role_label: string;
  sub_label?: string | null;
  avatar?: string | null;
}

export interface CreateThreadPayload {
  type?: InternalThreadType;
  title: string;
  category: InternalThreadCategory;
  priority?: InternalThreadPriority;
  is_confidential?: boolean;
  targetUserIds: string[];
  initialMessage: string;
  attachments?: InternalAttachment[];
  context_type?: string;
  context_id?: string;
  context_meta?: Record<string, any>;
}

export interface SendMessagePayload {
  content: string;
  attachments?: InternalAttachment[];
  is_system_event?: boolean;
}

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
    const res = await requestWithFallback<{ success: boolean; data: InternalThreadItem[] }>(
      'get',
      '/communication',
      { params: filters }
    );
    return (res as any)?.data || [];
  },

  /**
   * Ambil detail riwayat pesan dalam satu thread
   */
  async getThreadMessages(threadId: string): Promise<{ thread: InternalThreadItem; messages: InternalMessageItem[] }> {
    const res = await requestWithFallback<{ success: boolean; data: { thread: InternalThreadItem; messages: InternalMessageItem[] } }>(
      'get',
      `/communication/${threadId}`
    );
    return (res as any)?.data;
  },

  /**
   * Buat thread / percakapan baru
   */
  async createThread(payload: CreateThreadPayload): Promise<InternalThreadItem> {
    const res = await requestWithFallback<{ success: boolean; data: InternalThreadItem }>(
      'post',
      '/communication',
      { data: payload }
    );
    return (res as any)?.data;
  },

  /**
   * Kirim pesan baru ke dalam thread
   */
  async sendMessage(threadId: string, payload: SendMessagePayload): Promise<InternalMessageItem> {
    const res = await requestWithFallback<{ success: boolean; data: InternalMessageItem }>(
      'post',
      `/communication/${threadId}/messages`,
      { data: payload }
    );
    return (res as any)?.data;
  },

  /**
   * Update status thread (Selesai, Ditutup, Aktif)
   */
  async updateStatus(threadId: string, status: InternalThreadStatus): Promise<InternalThreadItem> {
    const res = await requestWithFallback<{ success: boolean; data: InternalThreadItem }>(
      'patch',
      `/communication/${threadId}/status`,
      { data: { status } }
    );
    return (res as any)?.data;
  },

  /**
   * Ambil daftar kontak yang sah dihubungi
   */
  async getContacts(): Promise<EligibleContactItem[]> {
    const res = await requestWithFallback<{ success: boolean; data: EligibleContactItem[] }>(
      'get',
      '/communication/contacts'
    );
    return (res as any)?.data || [];
  },

  /**
   * Ambil total unread counter
   */
  async getUnreadCount(): Promise<number> {
    try {
      const res = await requestWithFallback<{ success: boolean; data: { unread_count: number } }>(
        'get',
        '/communication/unread-count'
      );
      return (res as any)?.data?.unread_count || 0;
    } catch {
      return 0;
    }
  }
};
