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
  const response = await axiosInstance.get('/api/whatsapp/config');
  return response.data;
};

export const saveWhatsappConfig = async (data: WhatsappConfig) => {
  const response = await axiosInstance.post('/api/whatsapp/config', data);
  return response.data;
};

export const testWhatsappConnection = async (testNumber: string) => {
  const response = await axiosInstance.post('/api/whatsapp/test', { test_number: testNumber });
  return response.data;
};
