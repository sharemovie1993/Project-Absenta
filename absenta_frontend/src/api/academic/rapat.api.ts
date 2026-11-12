import api from '../../lib/axiosInstance';

export type KategoriRapat =
  | 'SOSIALISASI'
  | 'DEWAN_GURU'
  | 'KURIKULUM'
  | 'KOMITE_ORANG_TUA'
  | 'PLENO_KENAIKAN_KELULUSAN'
  | 'JURUSAN_KAPROG'
  | 'KOORDINASI_BK'
  | 'LAINNYA';

export type TargetPesertaRapat =
  | 'SEMUA_GURU'
  | 'GURU_DAN_STAF'
  | 'WALI_MURID'
  | 'SISWA'
  | 'GURU_MAPEL'
  | 'WALI_KELAS'
  | 'KOMITE_SEKOLAH'
  | 'CAMPURAN_UNDANGAN';

export type StatusRapat = 'DIJADWALKAN' | 'BERLANGSUNG' | 'SELESAI' | 'DIBATALKAN';

export type TipePesertaRapat = 'GURU' | 'STAF_TU' | 'ORANG_TUA' | 'SISWA' | 'TAMU_LUAR';

export type MetodeHadirRapat =
  | 'BELUM_HADIR'
  | 'SCAN_QR_MANDIRI'
  | 'SCANNER_PANITIA'
  | 'MANUAL_PANITIA'
  | 'IZIN'
  | 'SAKIT'
  | 'DISPENSASI';

export interface RapatPesertaItem {
  id: string;
  tenant_id: string;
  rapat_id: string;
  tipe_peserta: TipePesertaRapat;
  peserta_id?: string;
  nama_peserta: string;
  nomor_identitas?: string;
  jabatan_keterangan?: string;
  no_hp?: string;
  is_hadir: boolean;
  waktu_hadir?: string;
  metode_kehadiran: MetodeHadirRapat;
  catatan?: string;
  created_at: string;
  updated_at: string;
}

export interface RapatMasterItem {
  id: string;
  tenant_id: string;
  nomor_surat?: string;
  judul_rapat: string;
  kategori_rapat: KategoriRapat;
  target_peserta: TargetPesertaRapat;
  deskripsi?: string;
  tanggal_rapat: string;
  jam_mulai: string;
  jam_selesai?: string;
  tempat: string;
  link_daring?: string;
  pimpinan_rapat?: string;
  notulis?: string;
  agenda?: string[] | any;
  notulen_hasil?: string;
  file_lampiran?: string[];
  qr_token: string;
  status: StatusRapat;
  created_by_user_id?: string;
  created_at: string;
  updated_at: string;
  stats?: {
    totalPeserta: number;
    hadirCount: number;
    izinCount?: number;
    sakitCount?: number;
    belumHadirCount: number;
    persentaseHadir: number;
  };
  PesertaRapat?: RapatPesertaItem[];
}

export interface RapatFilterParams {
  status?: string;
  kategori?: string;
  target?: string;
  search?: string;
  tanggalMulai?: string;
  tanggalAkhir?: string;
  page?: number;
  limit?: number;
}

export interface CreateRapatPayload {
  nomor_surat?: string;
  judul_rapat: string;
  kategori_rapat: KategoriRapat;
  target_peserta: TargetPesertaRapat;
  deskripsi?: string;
  tanggal_rapat: string; // YYYY-MM-DD
  jam_mulai: string;
  jam_selesai?: string;
  tempat: string;
  link_daring?: string;
  pimpinan_rapat?: string;
  notulis?: string;
  agenda?: string[];
  notulen_hasil?: string;
  status?: StatusRapat;
  autoPopulatePeserta?: boolean;
}

export const rapatQueryKeys = {
  all: ['rapat-global'] as const,
  list: (params?: RapatFilterParams) => [...rapatQueryKeys.all, 'list', params] as const,
  detail: (id: string) => [...rapatQueryKeys.all, 'detail', id] as const,
  active: () => [...rapatQueryKeys.all, 'active'] as const,
  beritaAcara: (id: string) => [...rapatQueryKeys.all, 'berita-acara', id] as const,
};

export const rapatApi = {
  /**
   * Mengambil daftar rapat institusi
   */
  async listRapat(params?: RapatFilterParams): Promise<{
    items: RapatMasterItem[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const res = await api.get('/academic/rapat', { params });
    return {
      items: res.data?.data || [],
      pagination: res.data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 },
    };
  },

  /**
   * Mengambil detail rapat & daftar seluruh pesertanya
   */
  async getRapatDetail(id: string): Promise<RapatMasterItem> {
    const res = await api.get(`/academic/rapat/${id}`);
    return res.data?.data;
  },

  /**
   * Membuat rapat baru
   */
  async createRapat(payload: CreateRapatPayload): Promise<RapatMasterItem> {
    const res = await api.post('/academic/rapat', payload);
    return res.data?.data;
  },

  /**
   * Update informasi rapat / status / notulen
   */
  async updateRapat(id: string, payload: Partial<CreateRapatPayload>): Promise<RapatMasterItem> {
    const res = await api.put(`/academic/rapat/${id}`, payload);
    return res.data?.data;
  },

  /**
   * Hapus rapat
   */
  async deleteRapat(id: string): Promise<{ success: boolean; message: string }> {
    const res = await api.delete(`/academic/rapat/${id}`);
    return res.data;
  },

  /**
   * Catat kehadiran peserta (Panitia / Manual)
   */
  async recordAttendance(
    rapatId: string,
    payload: {
      pesertaId: string;
      isHadir: boolean;
      metodeKehadiran?: MetodeHadirRapat;
      catatan?: string;
    }
  ): Promise<RapatPesertaItem> {
    const res = await api.post(`/academic/rapat/${rapatId}/attend`, payload);
    return res.data?.data;
  },

  /**
   * Mengambil rapat yang berstatus BERLANGSUNG untuk banner presensi
   */
  async getActiveMeeting(): Promise<any> {
    const res = await api.get('/academic/rapat/active');
    return res.data?.data;
  },

  /**
   * Data Berita Acara & Notulen PDF
   */
  async getBeritaAcaraData(id: string): Promise<{
    sekolah: {
      nama_sekolah: string;
      npsn: string;
      alamat: string;
      logo_url: string | null;
      kabupaten: string;
      provinsi: string;
    };
    rapat: RapatMasterItem;
  }> {
    const res = await api.get(`/academic/rapat/${id}/berita-acara`);
    return res.data?.data;
  },

  /**
   * Presensi Mandiri Peserta (Scan QR)
   */
  async selfAttend(payload: {
    qrToken: string;
    nomorIdentitasOrId: string;
  }): Promise<{
    success: boolean;
    message: string;
    rapat: { id: string; judul: string; tempat: string; tanggal: string };
    peserta: { id: string; nama: string; nomor_identitas: string; jabatan: string; waktuHadir: string };
  }> {
    const res = await api.post('/public/rapat/self-attend', payload);
    return res.data;
  },
};
