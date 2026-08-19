import api from '../lib/axiosInstance';

export interface PermohonanIzinGuruItem {
  id: string;
  tenant_id: string;
  guru_id: string;
  tipe_izin: 'SAKIT' | 'IZIN_PRIBADI' | 'DINAS_LUAR' | 'CUTI' | 'LAINNYA';
  tipe_durasi: 'SEHARIAN' | 'MULTI_HARI' | 'SEBAGIAN_SESI';
  tanggal_mulai: string;
  tanggal_selesai: string;
  jam_mulai?: string | null;
  jam_selesai?: string | null;
  alasan: string;
  attachment_url?: string | null;
  attachment_type?: string | null;
  instruksi_tugas?: string | null;
  file_tugas_url?: string | null;
  tugas_per_kelas?: any;
  status: 'PENDING' | 'DISETUJUI' | 'DITOLAK' | 'DIBATALKAN';
  diajukan_oleh: string;
  diproses_oleh?: string | null;
  diproses_at?: string | null;
  catatan_penolakan?: string | null;
  created_at: string;
  updated_at: string;
  guru_inval_id?: string | null;
  Guru?: {
    id: string;
    nama_guru: string;
    nip?: string | null;
    foto?: string | null;
  };
  GuruInval?: {
    id: string;
    nama_guru: string;
    nip?: string | null;
    foto?: string | null;
  } | null;
  Pengaju?: {
    id: string;
    full_name: string;
  };
  Pemroses?: {
    id: string;
    full_name: string;
  };
}

export interface ImpactSession {
  id: string;
  kelas_id: string;
  nama_kelas: string;
  mapel_id?: string;
  nama_mapel?: string;
  jam_mulai: string;
  jam_selesai: string;
  jam_label?: string;
  total_jp?: number;
  status?: string;
}

export interface ImpactDay {
  date: string;
  hari: string;
  sessions: ImpactSession[];
}

export interface ImpactPreviewResponse {
  affectedDays: ImpactDay[];
  totalSessions: number;
  totalClasses: number;
}

export interface CreatePermohonanIzinGuruPayload {
  guru_id?: string;
  tipe_izin: string;
  tipe_durasi?: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  jam_mulai?: string;
  jam_selesai?: string;
  alasan: string;
  attachment_url?: string;
  attachment_type?: string;
  instruksi_tugas?: string;
  file_tugas_url?: string;
  tugas_per_kelas?: any;
}

export interface InvalRecommendationItem {
  id: string;
  nama_guru: string;
  nip?: string | null;
  foto?: string | null;
  mapelList: string[];
  isSameMapel: boolean;
  isPiket: boolean;
  posPiket?: string | null;
  isBusy: boolean;
  busyInfo?: string;
  priority: number;
  category: string;
  categoryLabel: string;
}

export interface InvalRecommendationResponse {
  recommendations: InvalRecommendationItem[];
  totalSameMapel: number;
  totalPiket: number;
  totalFree: number;
}

export const guruIzinApi = {
  /**
   * Ajukan Permohonan Izin / Dinas Guru
   */
  async submit(data: CreatePermohonanIzinGuruPayload): Promise<{ success: boolean; data: PermohonanIzinGuruItem; message?: string }> {
    const res = await api.post('/piket/guru-izin', data);
    return res.data;
  },

  /**
   * Ambil Preview Dampak KBM / Jamkos
   */
  async previewImpact(params: {
    guru_id: string;
    tanggal_mulai: string;
    tanggal_selesai: string;
    jam_mulai?: string;
    jam_selesai?: string;
    tipe_durasi?: string;
  }): Promise<{ success: boolean; data: ImpactPreviewResponse }> {
    const res = await api.get('/piket/guru-izin/preview-impact', { params });
    return res.data;
  },

  /**
   * Ambil Rekomendasi Guru Inval Cerdas (Same Mapel & Free)
   */
  async getInvalRecommendations(params: {
    guru_id: string;
    tanggal_mulai: string;
    tanggal_selesai: string;
    jam_mulai?: string;
    jam_selesai?: string;
    tipe_durasi?: string;
  }): Promise<{ success: boolean; data: InvalRecommendationResponse }> {
    const res = await api.get('/piket/guru-izin/inval-recommendations', { params });
    return res.data;
  },

  /**
   * Ambil Semua Permohonan (Meja Piket / Kepsek)
   */
  async getAll(params?: {
    status?: string;
    guru_id?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ success: boolean; data: PermohonanIzinGuruItem[]; meta: any }> {
    const res = await api.get('/piket/guru-izin', { params });
    return res.data;
  },

  /**
   * Ambil Riwayat Izin Guru Sendiri
   */
  async getMyList(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ success: boolean; data: PermohonanIzinGuruItem[]; meta: any }> {
    const res = await api.get('/piket/guru-izin/me', { params });
    return res.data;
  },

  /**
   * Setujui Permohonan (Approve)
   */
  async approve(id: string, payload?: { guru_inval_id?: string }): Promise<{ success: boolean; data: PermohonanIzinGuruItem; message?: string }> {
    const res = await api.patch(`/piket/guru-izin/${id}/approve`, payload || {});
    return res.data;
  },

  /**
   * Tolak Permohonan (Reject)
   */
  async reject(id: string, catatan?: string): Promise<{ success: boolean; data: PermohonanIzinGuruItem; message?: string }> {
    const res = await api.patch(`/piket/guru-izin/${id}/reject`, { catatan });
    return res.data;
  },

  /**
   * Hapus / Batalkan Permohonan (Delete)
   */
  async delete(id: string): Promise<{ success: boolean; message?: string }> {
    const res = await api.delete(`/piket/guru-izin/${id}`);
    return res.data;
  }
};
