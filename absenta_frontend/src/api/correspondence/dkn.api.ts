import { requestWithFallback } from '../apiUtils';

export interface DknMapelColumn {
  id: string;
  nama_mapel: string;
  kode_mapel: string | null;
  kelompok_mapel: string; // 'A' | 'B' | 'C'
}

export interface DknSiswaRow {
  id: string;
  nomor_urut: number;
  nis: string;
  nisn: string;
  nama_siswa: string;
  gender: string;
  kelas: string;
  jurusan: string;
  nilai_per_mapel: Record<string, number>;
  nilai_ukk: number | null;
  predikat_ukk: string | null;
  nomor_sertifikat_ukk: string | null;
  rata_rata_nilai: number;
  status_kelulusan: string;
  nomor_skl: string;
  tanggal_lulus: string | null;
  rank: number;
}

export interface DknMatriksData {
  pejabat: {
    nama_sekolah: string;
    npsn: string;
    kota: string;
    alamat: string;
    kepala_sekolah: {
      nama: string;
      nip: string;
    };
    waka_kurikulum: {
      nama: string;
      nip: string;
    };
  };
  program_keahlian: string;
  kelas_terpilih: string;
  columns_mapel: DknMapelColumn[];
  rekapitulasi: {
    total_siswa: number;
    total_lulus: number;
    total_tidak_lulus: number;
    rata_rata_angkatan: number;
  };
  rows: DknSiswaRow[];
}

export interface DknMatriksResponse {
  success: boolean;
  data: DknMatriksData;
}

export interface PreviewSuratPengantarPayload {
  tahun_pelajaran_id: string;
  jurusan_id?: string;
  kelas_id?: string;
  tujuan_dinas: string;
  alamat_dinas?: string;
  nomor_surat_manual?: string;
  tanggal_surat?: string;
  lampiran?: string;
  catatan_pengantar?: string;
}

export interface PreviewSuratPengantarResponse {
  success: boolean;
  data: {
    nomor_surat: string;
    lampiran: string;
    perihal: string;
    tanggal_surat: string;
    tujuan_dinas: string;
    alamat_dinas: string;
    tahun_pelajaran: string;
    program_keahlian: string;
    rekapitulasi: {
      total_siswa: number;
      total_lulus: number;
      total_tidak_lulus: number;
      rata_rata_angkatan: number;
    };
    pejabat: {
      nama_sekolah: string;
      npsn: string;
      kota: string;
      alamat: string;
      kepala_sekolah: {
        nama: string;
        nip: string;
      };
      waka_kurikulum: {
        nama: string;
        nip: string;
      };
    };
    catatan_pengantar: string | null;
  };
}

export interface IssueSuratPengantarPayload extends PreviewSuratPengantarPayload {
  waka_kurikulum_nama?: string;
  waka_kurikulum_nip?: string;
  pengawas_pembina_nama?: string;
  pengawas_pembina_nip?: string;
}

export interface DknArsipItem {
  id: string;
  nomor_surat: string;
  judul: string;
  tujuan_surat: string;
  tanggal_surat: string;
  status: string;
  tahun_pelajaran: string;
  program_keahlian: string;
  total_siswa: number;
  total_lulus: number;
  rata_rata_angkatan: number;
  created_by_name: string;
  metadata: any;
}

export interface DknArsipResponse {
  success: boolean;
  data: DknArsipItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const dknQueryKeys = {
  all: ['correspondence', 'dkn'] as const,
  matriks: (params: Record<string, any>) => [...dknQueryKeys.all, 'matriks', params] as const,
  arsip: (params: Record<string, any>) => [...dknQueryKeys.all, 'arsip', params] as const,
};

export const dknApi = {
  getMatriks: async (params: {
    tahun_pelajaran_id?: string;
    kelas_id?: string;
    jurusan_id?: string;
    tingkat?: number;
    search?: string;
  }): Promise<DknMatriksResponse> => {
    return requestWithFallback<DknMatriksResponse>('get', '/correspondence/dkn/matriks', { params });
  },

  previewSuratPengantar: async (
    payload: PreviewSuratPengantarPayload
  ): Promise<PreviewSuratPengantarResponse> => {
    return requestWithFallback<PreviewSuratPengantarResponse>(
      'post',
      '/correspondence/dkn/preview-pengantar',
      payload
    );
  },

  issueSuratPengantar: async (payload: IssueSuratPengantarPayload): Promise<any> => {
    return requestWithFallback('post', '/correspondence/dkn/issue-pengantar', payload);
  },

  getArsip: async (params?: {
    tahun?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<DknArsipResponse> => {
    return requestWithFallback<DknArsipResponse>('get', '/correspondence/dkn/arsip', { params });
  },
};
