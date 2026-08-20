import axiosInstance from '../lib/axiosInstance';

export interface TujuanPembelajaranItem {
  id?: string;
  kode_tp: string;
  judul_materi: string;
  deskripsi_tp: string;
  alokasi_jp: number;
  urutan: number;
  is_completed?: boolean;
}

export interface AlurTujuanPembelajaranData {
  id?: string;
  guru_id?: string;
  mapel_id: string;
  tahun_pelajaran_id?: string;
  semester_id?: string;
  fase: string;
  tingkat?: number;
  nama_atp: string;
  deskripsi?: string;
  total_alokasi_jp?: number;
  status?: string;
  Guru?: { id: string; nama_guru: string };
  Mapel?: { id: string; nama_mapel: string; kode_mapel?: string };
  TahunPelajaran?: { id: string; tahun: string; is_active: boolean };
  Semester?: { id: string; nama_semester: string; is_active: boolean };
  TujuanPembelajaran?: TujuanPembelajaranItem[];
}

export const getAtpList = async (params?: {
  guru_id?: string;
  mapel_id?: string;
  tahun_pelajaran_id?: string;
  semester_id?: string;
  fase?: string;
}) => {
  const response = await axiosInstance.get('/kurikulum/atp', { params });
  return response.data?.data || [];
};

export const getAtpById = async (id: string) => {
  const response = await axiosInstance.get(`/kurikulum/atp/${id}`);
  return response.data?.data;
};

export const upsertAtp = async (payload: AlurTujuanPembelajaranData & { tujuan_pembelajaran: TujuanPembelajaranItem[] }) => {
  const response = await axiosInstance.post('/kurikulum/atp', payload);
  return response.data?.data;
};

export const deleteAtp = async (id: string) => {
  const response = await axiosInstance.delete(`/kurikulum/atp/${id}`);
  return response.data;
};

export const getActiveTpForSesi = async (sesiId: string) => {
  if (!sesiId) return { atp: null, tujuan_pembelajaran: [] };
  const response = await axiosInstance.get(`/kurikulum/atp/for-session/${sesiId}`);
  return response.data?.data || { atp: null, tujuan_pembelajaran: [] };
};
