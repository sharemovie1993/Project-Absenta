import axiosInstance from '../lib/axiosInstance';

export interface TpTemplateItem {
  id?: string;
  atp_template_id?: string;
  kode_tp: string;
  judul_materi: string;
  deskripsi_tp: string;
  alokasi_jp: number;
  urutan: number;
}

export interface AtpTemplateData {
  id: string;
  kode_mapel_ref: string;
  nama_mapel_ref: string;
  fase: string;
  tingkat?: number;
  nama_template: string;
  deskripsi?: string;
  sumber?: string;
  url_sumber?: string;
  tags?: string[];
  total_alokasi_jp: number;
  status: 'DRAFT' | 'PUBLISHED';
  created_by?: string;
  created_at: string;
  updated_at: string;
  TpTemplate?: TpTemplateItem[];
}

export interface ImportAtpTemplatePayload {
  mapel_id: string;
  tahun_pelajaran_id: string;
  semester_id: string;
  guru_id?: string;
  fase?: string;
}

/**
 * Mengambil daftar template ATP
 */
export const getAtpTemplates = async (params?: {
  fase?: string;
  kode_mapel_ref?: string;
  search?: string;
}): Promise<AtpTemplateData[]> => {
  const response = await axiosInstance.get('/kurikulum/atp-templates', { params });
  return response.data?.data || [];
};

/**
 * Detail satu template ATP by ID
 */
export const getAtpTemplateById = async (id: string): Promise<AtpTemplateData> => {
  const response = await axiosInstance.get(`/kurikulum/atp-templates/${id}`);
  return response.data?.data;
};

/**
 * Import (clone) template ATP ke ATP personal guru
 */
export const importAtpTemplate = async (
  templateId: string,
  payload: ImportAtpTemplatePayload
) => {
  const response = await axiosInstance.post(`/kurikulum/atp-templates/${templateId}/import`, payload);
  return response.data?.data;
};
