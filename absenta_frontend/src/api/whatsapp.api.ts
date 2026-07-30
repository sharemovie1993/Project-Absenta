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
