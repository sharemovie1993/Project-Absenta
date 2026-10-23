import { requestWithFallback } from '../apiUtils';

export interface PreviewMutasiKeluarPayload {
  siswa_id: string;
  sekolah_tujuan: string;
  alasan: string;
  tanggal_keluar: string;
  no_rekomendasi_dinas?: string;
  keterangan_tambahan?: string;
}

export interface IssueMutasiKeluarPayload extends PreviewMutasiKeluarPayload {
  nomor_surat: string;
  dossier_terlampir?: boolean;
}

export interface PreviewMutasiMasukPayload {
  siswa_id?: string;
  nama_siswa: string;
  nisn?: string;
  sekolah_asal: string;
  kelas_id?: string;
  kelas_tujuan?: string;
  tingkat?: number;
  tanggal_masuk: string;
  no_rekomendasi_dinas?: string;
  keterangan_tambahan?: string;
}

export interface IssueMutasiMasukPayload extends PreviewMutasiMasukPayload {
  nomor_surat: string;
}

export interface PreviewMutasiKeluarResponse {
  tipe: 'MUTASI_KELUAR';
  nomor_surat: string;
  tanggal_surat: string;
  sekolah_tujuan: string;
  alasan: string;
  no_rekomendasi_dinas: string | null;
  keterangan_tambahan: string | null;
  siswa: {
    id: string;
    nama_siswa: string;
    nis: string;
    nisn: string;
    gender: string;
    tempat_lahir: string;
    tanggal_lahir?: string | null;
    agama: string;
    kelas: string;
    tingkat: number;
    tahun_pelajaran: string;
    semester: string;
    nama_orang_tua: string;
    pekerjaan_orang_tua: string;
    alamat_orang_tua: string;
  };
  penandatangan: {
    nama_sekolah: string;
    npsn: string;
    kota: string;
    nama_kepala_sekolah: string;
    nip_kepala_sekolah: string;
  };
}

export interface PreviewMutasiMasukResponse {
  tipe: 'MUTASI_MASUK';
  nomor_surat: string;
  tanggal_surat: string;
  sekolah_asal: string;
  target_kelas: string;
  tingkat: number;
  no_rekomendasi_dinas: string | null;
  keterangan_tambahan: string | null;
  siswa: {
    id: string | null;
    nama_siswa: string;
    nisn: string;
  };
  penandatangan: {
    nama_sekolah: string;
    npsn: string;
    kota: string;
    nama_kepala_sekolah: string;
    nip_kepala_sekolah: string;
  };
}

export interface BukuRegisterEntry {
  id: string;
  tipe: 'MUTASI_KELUAR' | 'MUTASI_MASUK';
  nomor_surat: string;
  tanggal: string;
  siswa_id: string | null;
  nama_siswa: string;
  nis: string;
  nisn: string;
  gender: string;
  kelas: string;
  tingkat: number;
  sekolah_tujuan: string | null;
  sekolah_asal: string | null;
  alasan: string;
  no_rekomendasi_dinas: string;
}

export interface BukuRegisterResponse {
  entries: BukuRegisterEntry[];
  rekap: {
    total_masuk: number;
    total_keluar: number;
    total_mutasi: number;
  };
  penandatangan: {
    nama_sekolah: string;
    npsn: string;
    kota: string;
    nama_kepala_sekolah: string;
    nip_kepala_sekolah: string;
  };
}

export interface AgendaMutasiItem {
  id: string;
  nomor_surat: string;
  judul: string;
  tujuan_surat: string;
  tanggal_surat: string;
  created_at: string;
  created_by: string;
  siswa: {
    id: string;
    nis: string;
    nama_siswa: string;
    kelas: string;
  } | null;
  metadata: Record<string, any>;
}

export interface AgendaMutasiResponse {
  success: boolean;
  data: AgendaMutasiItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const mutasiQueryKeys = {
  all: ['correspondence-mutasi'] as const,
  bukuRegister: (filters: Record<string, any>) => [...mutasiQueryKeys.all, 'buku-register', filters] as const,
  agenda: (filters: Record<string, any>) => [...mutasiQueryKeys.all, 'agenda', filters] as const,
};

export const mutasiApi = {
  previewKeluar: async (payload: PreviewMutasiKeluarPayload): Promise<{ success: boolean; data: PreviewMutasiKeluarResponse }> => {
    return requestWithFallback<{ success: boolean; data: PreviewMutasiKeluarResponse }>(
      'post',
      '/correspondence/mutasi/preview-keluar',
      payload
    );
  },

  issueKeluar: async (payload: IssueMutasiKeluarPayload): Promise<{ success: boolean; message: string; data: any }> => {
    return requestWithFallback<{ success: boolean; message: string; data: any }>(
      'post',
      '/correspondence/mutasi/issue-keluar',
      payload
    );
  },

  previewMasuk: async (payload: PreviewMutasiMasukPayload): Promise<{ success: boolean; data: PreviewMutasiMasukResponse }> => {
    return requestWithFallback<{ success: boolean; data: PreviewMutasiMasukResponse }>(
      'post',
      '/correspondence/mutasi/preview-masuk',
      payload
    );
  },

  issueMasuk: async (payload: IssueMutasiMasukPayload): Promise<{ success: boolean; message: string; data: any }> => {
    return requestWithFallback<{ success: boolean; message: string; data: any }>(
      'post',
      '/correspondence/mutasi/issue-masuk',
      payload
    );
  },

  getBukuRegister: async (params?: {
    tahun_pelajaran_id?: string;
    semester_id?: string;
    tipe?: 'ALL' | 'MASUK' | 'KELUAR';
    search?: string;
  }): Promise<{ success: boolean; data: BukuRegisterResponse }> => {
    return requestWithFallback<{ success: boolean; data: BukuRegisterResponse }>(
      'get',
      '/correspondence/mutasi/buku-register',
      { params }
    );
  },

  getAgenda: async (params?: {
    tipe?: 'ALL' | 'MUTASI_KELUAR' | 'MUTASI_MASUK';
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<AgendaMutasiResponse> => {
    return requestWithFallback<AgendaMutasiResponse>(
      'get',
      '/correspondence/mutasi/agenda',
      { params }
    );
  },
};
