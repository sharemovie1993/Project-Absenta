import axiosInstance from '@/lib/axiosInstance';

export interface WhatsappConfig {
  id?: string;
  tenant_id?: string;
  provider_name: string;
  api_url: string;
  api_token: string;
  sender_number?: string;
  is_active: boolean;
  template_absen_masuk?: string;
  template_absen_pulang?: string;
  template_absen_mapel?: string;
  template_izin?: string;
  template_tagihan_spp?: string;
  template_pengumuman?: string;
}

export const getWhatsappConfig = async () => {
  const response = await axiosInstance.get('/whatsapp/config');
  return response.data;
};

export const saveWhatsappConfig = async (data: WhatsappConfig) => {
  const response = await axiosInstance.post('/whatsapp/config', data);
  return response.data;
};

export const testWhatsappConnection = async (testNumber: string) => {
  const response = await axiosInstance.post('/whatsapp/test', { test_number: testNumber });
  return response.data;
};

export const connectLocalWhatsapp = async () => {
  const response = await axiosInstance.post('/whatsapp/connect');
  return response.data;
};

export const disconnectLocalWhatsapp = async () => {
  const response = await axiosInstance.post('/whatsapp/disconnect');
  return response.data;
};

export const getLocalWhatsappStatus = async () => {
  const response = await axiosInstance.get('/whatsapp/status');
  return response.data;
};

export const getLocalWhatsappQR = async () => {
  const response = await axiosInstance.get('/whatsapp/qr');
  return response.data;
};

// ── WA Chat Log ────────────────────────────────────────────────────────────────

export interface WaChatContact {
  phone: string;
  nama: string | null;
  role: string | null;
  last_message: string;
  last_direction: 'IN' | 'OUT';
  last_at: string;
  total_in: number;
  total_out: number;
}

export interface WaChatMessage {
  id: string;
  direction: 'IN' | 'OUT';
  message: string;
  nama: string | null;
  role: string | null;
  created_at: string;
}

export const getWaChatLogContacts = async (params?: {
  search?: string;
  page?: number;
  limit?: number;
}) => {
  const response = await axiosInstance.get('/whatsapp/chat-logs', { params });
  return response.data as {
    success: boolean;
    data: WaChatContact[];
    total: number;
    page: number;
    limit: number;
  };
};

export const getWaChatLogDetail = async (
  phone: string,
  params?: { page?: number; limit?: number }
) => {
  const encodedPhone = encodeURIComponent(phone);
  const response = await axiosInstance.get(`/whatsapp/chat-logs/${encodedPhone}`, { params });
  return response.data as {
    success: boolean;
    data: WaChatMessage[];
    total: number;
    page: number;
    limit: number;
  };
};

// ── WA Participating Groups ───────────────────────────────────────────────────

export interface WaGroupInfo {
  id: string;
  subject: string;
  creation: string | null;
  owner: string | null;
  participantsCount: number;
  announce: boolean;
  isCommunity: boolean;
}

export const getWaParticipatingGroups = async (refresh = false) => {
  const response = await axiosInstance.get('/whatsapp/groups', {
    params: refresh ? { refresh: 'true' } : undefined,
  });
  return response.data as {
    success: boolean;
    data: WaGroupInfo[];
    message?: string;
  };
};

// ── WA Onboarding & Greeting Broadcast ────────────────────────────────────────

export interface WaOnboardingUser {
  id: string;
  userType: 'GURU' | 'SISWA' | 'ORTU';
  nama: string;
  no_hp: string;
  detailInfo: string;
  statusKomunikasi: 'SUDAH' | 'BELUM';
  lastCommAt: string | null;
}

export interface WaOnboardingSummary {
  totalTotal: number;
  totalGuru: number;
  totalSiswa: number;
  totalOrtu: number;
  totalBelum: number;
  totalSudah: number;
}

export const getWaOnboardingUsers = async (params: {
  role?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  const response = await axiosInstance.get('/whatsapp/onboarding-users', { params });
  return response.data as {
    success: boolean;
    data: WaOnboardingUser[];
    summary: WaOnboardingSummary;
    pagination: { page: number; limit: number; total: number; totalPages: number };
  };
};

export const sendWaGreeting = async (payload: {
  userType: 'GURU' | 'SISWA' | 'ORTU';
  nama: string;
  no_hp: string;
  detailInfo?: string;
  customMessage?: string;
}) => {
  const response = await axiosInstance.post('/whatsapp/send-greeting', payload);
  return response.data as { success: boolean; message: string };
};

export const sendWaGreetingBulk = async (payload: { role?: string; search?: string }) => {
  const response = await axiosInstance.post('/whatsapp/send-greeting-bulk', payload);
  return response.data as { success: boolean; sentCount: number; message: string };
};

export interface WaSessionSummary {
  status: string;
  connected: boolean;
  phoneNumber?: string | null;
  qr?: string | null;
  groups: WaGroupItem[];
}

export interface WaDocumentTargetsResponse {
  status: string;
  connected: boolean;
  phoneNumber?: string | null;
  groups: WaGroupItem[];
  warning?: string;
  gateway?: WaSessionSummary & {
    providerName?: string;
    externalActive?: boolean;
    platformFallbackAvailable?: boolean;
  };
  userSession?: WaSessionSummary;
}

export interface SendWaDocumentPayload {
  to: string;
  fileBase64: string;
  fileName: string;
  mimetype?: string;
  caption?: string;
  senderMode?: 'AUTO' | 'GATEWAY' | 'PLATFORM' | 'USER';
}

export type WaDocumentRecipientType = 'GURU' | 'SISWA' | 'ORTU';

export interface WaDocumentRecipientItem {
  id: string;
  recipientType: WaDocumentRecipientType;
  name: string;
  phone: string;
  normalizedPhone: string;
  subtitle: string;
  studentName?: string;
  kelasName?: string;
}

export const getWaDocumentTargets = async (refresh = false): Promise<WaDocumentTargetsResponse> => {
  const response = await axiosInstance.get('/whatsapp/document-targets', {
    params: refresh ? { refresh: 'true' } : undefined,
  });
  return response.data?.data ?? {
    status: 'disconnected',
    connected: false,
    phoneNumber: null,
    groups: [],
  };
};

export const connectWaUserSession = async (): Promise<Omit<WaSessionSummary, 'groups'>> => {
  const response = await axiosInstance.post('/whatsapp/user-session/connect');
  return response.data?.data ?? { status: 'disconnected', connected: false, phoneNumber: null, qr: null };
};

export const getWaUserSessionStatus = async (): Promise<Omit<WaSessionSummary, 'groups'>> => {
  const response = await axiosInstance.get('/whatsapp/user-session/status');
  return response.data?.data ?? { status: 'disconnected', connected: false, phoneNumber: null, qr: null };
};

export const disconnectWaUserSession = async (): Promise<{ success: boolean; message: string }> => {
  const response = await axiosInstance.post('/whatsapp/user-session/disconnect');
  return response.data;
};

export const getWaDocumentRecipients = async (params: {
  type?: 'ALL' | WaDocumentRecipientType;
  search?: string;
  limit?: number;
} = {}): Promise<WaDocumentRecipientItem[]> => {
  const response = await axiosInstance.get('/whatsapp/document-recipients', { params });
  return Array.isArray(response.data?.data) ? response.data.data : [];
};

export const sendWaDocument = async (payload: SendWaDocumentPayload) => {
  const response = await axiosInstance.post('/whatsapp/send-document', payload, {
    timeout: 60000,
  });
  return response.data as {
    success: boolean;
    message: string;
    data?: { sent: boolean; target: string; fileName: string; provider: string };
  };
};

