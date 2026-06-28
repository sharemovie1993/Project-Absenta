import api from '../lib/axiosInstance';

export interface UserDetail {
  id: string;
  full_name: string;
  email: string;
  Guru?: {
    nama_guru: string;
  } | null;
}

export interface StudentDetail {
  id: string;
  nama_siswa: string;
  nis: string;
  Kelas?: {
    nama_kelas: string;
  } | null;
}

export interface SuratMasuk {
  id: string;
  nomor_surat: string;
  judul: string;
  asal_surat?: string | null;
  tanggal_surat: string;
  tanggal_terima: string;
  ringkasan?: string | null;
  dokumen_url?: string | null;
  disposisi_instruksi?: string | null;
  penerima_disposisi_id?: string | null;
  status: string;
  PenerimaDisposisi?: UserDetail | null;
  created_at: string;
}

export interface SuratKeluar {
  id: string;
  nomor_surat: string;
  judul: string;
  tujuan_surat?: string | null;
  tanggal_surat: string;
  isi_ringkas?: string | null;
  dokumen_url?: string | null;
  kategori_surat: string;
  status: string;
  siswa_id?: string | null;
  created_by_id?: string | null;
  approved_by_id?: string | null;
  Siswa?: StudentDetail | null;
  CreatedBy?: { id: string; full_name: string } | null;
  ApprovedBy?: { id: string; full_name: string } | null;
  created_at: string;
}

export const correspondenceApi = {
  // Surat Masuk
  getSuratMasuk: async (params?: any): Promise<{ success: boolean; data: { list: SuratMasuk[]; pagination: any } }> => {
    const res = await api.get('/correspondence/surat-masuk', { params });
    return res.data;
  },
  getSuratMasukById: async (id: string): Promise<{ success: boolean; data: SuratMasuk }> => {
    const res = await api.get(`/correspondence/surat-masuk/${id}`);
    return res.data;
  },
  createSuratMasuk: async (data: any): Promise<{ success: boolean; data: SuratMasuk }> => {
    const res = await api.post('/correspondence/surat-masuk', data);
    return res.data;
  },
  updateSuratMasuk: async (id: string, data: any): Promise<{ success: boolean; data: SuratMasuk }> => {
    const res = await api.put(`/correspondence/surat-masuk/${id}`, data);
    return res.data;
  },
  deleteSuratMasuk: async (id: string): Promise<{ success: boolean }> => {
    const res = await api.delete(`/correspondence/surat-masuk/${id}`);
    return res.data;
  },
  disposisiSuratMasuk: async (id: string, data: { instruksi: string; penerima_id: string }): Promise<{ success: boolean; data: SuratMasuk }> => {
    const res = await api.post(`/correspondence/surat-masuk/${id}/disposisi`, data);
    return res.data;
  },

  // Surat Keluar
  getSuratKeluar: async (params?: any): Promise<{ success: boolean; data: { list: SuratKeluar[]; pagination: any } }> => {
    const res = await api.get('/correspondence/surat-keluar', { params });
    return res.data;
  },
  getSuratKeluarById: async (id: string): Promise<{ success: boolean; data: SuratKeluar }> => {
    const res = await api.get(`/correspondence/surat-keluar/${id}`);
    return res.data;
  },
  createSuratKeluar: async (data: any): Promise<{ success: boolean; data: SuratKeluar }> => {
    const res = await api.post('/correspondence/surat-keluar', data);
    return res.data;
  },
  updateSuratKeluar: async (id: string, data: any): Promise<{ success: boolean; data: SuratKeluar }> => {
    const res = await api.put(`/correspondence/surat-keluar/${id}`, data);
    return res.data;
  },
  deleteSuratKeluar: async (id: string): Promise<{ success: boolean }> => {
    const res = await api.delete(`/correspondence/surat-keluar/${id}`);
    return res.data;
  },
  signSuratKeluar: async (id: string, data: { status: 'DIKIRIM' | 'DITOLAK' }): Promise<{ success: boolean; data: SuratKeluar }> => {
    const res = await api.post(`/correspondence/surat-keluar/${id}/sign`, data);
    return res.data;
  }
};