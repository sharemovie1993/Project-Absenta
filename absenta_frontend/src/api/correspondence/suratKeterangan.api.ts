import { requestWithFallback } from '../apiUtils';

export type TemplateSuratType = 'SISWA_AKTIF' | 'SKKB' | 'REKOMENDASI';

export interface PreviewSuratKeteranganPayload {
  template_type: TemplateSuratType;
  siswa_id: string;
  keperluan?: string;
  keterangan_tambahan?: string;
}

export interface IssueSuratKeteranganPayload {
  template_type: TemplateSuratType;
  siswa_id: string;
  nomor_surat: string;
  keperluan: string;
  isi_surat: string;
  keterangan_tambahan?: string;
}

export interface DisciplineCheckResult {
  is_clean: boolean;
  has_violations: boolean;
  total_poin: number;
  unresolved_count: number;
  recent_violations: Array<{
    id: string;
    nama: string;
    poin: number;
    tanggal: string;
    status: string;
  }>;
}

export interface PreviewSuratKeteranganResponse {
  template_type: TemplateSuratType;
  judul_surat: string;
  nomor_surat: string;
  tanggal_surat: string;
  tanggal_surat_formatted: string;
  kota_sekolah: string;
  penandatangan: {
    jabatan: string;
    nama: string;
    nip: string;
  };
  siswa: {
    id: string;
    nama_siswa: string;
    nis: string;
    nisn: string;
    ttl: string;
    jenis_kelamin: string;
    agama: string;
    kelas: string;
    tingkat: number;
    tahun_pelajaran: string;
    nama_ortu: string;
    pekerjaan_ortu: string;
    alamat: string;
  };
  keperluan: string;
  keterangan_tambahan?: string;
  klausul_pernyataan: string;
  discipline_check: DisciplineCheckResult;
}

export interface SuratKeteranganHistoryItem {
  id: string;
  nomor_surat: string;
  judul: string;
  tujuan_surat?: string | null;
  tanggal_surat: string;
  isi_ringkas?: string | null;
  status: string;
  siswa_id?: string | null;
  Siswa?: {
    id: string;
    nama_siswa: string;
    nis: string;
    nisn?: string | null;
    Kelas?: { id: string; nama_kelas: string } | null;
  } | null;
  CreatedBy?: { id: string; full_name: string } | null;
  created_at: string;
}

export interface SuratKeteranganHistoryResponse {
  success: boolean;
  data: SuratKeteranganHistoryItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const suratKeteranganQueryKeys = {
  all: ['surat-keterangan'] as const,
  preview: (payload: PreviewSuratKeteranganPayload) => [...suratKeteranganQueryKeys.all, 'preview', payload] as const,
  history: (filters: Record<string, any>) => [...suratKeteranganQueryKeys.all, 'history', filters] as const,
};

export const suratKeteranganApi = {
  preview: async (payload: PreviewSuratKeteranganPayload): Promise<{ success: boolean; data: PreviewSuratKeteranganResponse }> => {
    return requestWithFallback<{ success: boolean; data: PreviewSuratKeteranganResponse }>(
      'post',
      '/correspondence/surat-keterangan/preview',
      { data: payload }
    );
  },

  issue: async (payload: IssueSuratKeteranganPayload): Promise<{ success: boolean; message: string; data: any }> => {
    return requestWithFallback<{ success: boolean; message: string; data: any }>(
      'post',
      '/correspondence/surat-keterangan/issue',
      { data: payload }
    );
  },

  getHistory: async (params?: {
    siswa_id?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<SuratKeteranganHistoryResponse> => {
    return requestWithFallback<SuratKeteranganHistoryResponse>(
      'get',
      '/correspondence/surat-keterangan/history',
      { params }
    );
  },
};
