import { requestWithFallback } from '../apiUtils';

export type PosClearanceKey = 'perpustakaan' | 'keuangan' | 'bengkel_jurusan' | 'bk' | 'wali_kelas';

export interface PosClearanceItem {
  status: 'BEBAS' | 'BELUM_BEBAS';
  petugas: string;
  catatan: string;
}

export interface StatusClearanceResponse {
  siswa: {
    id: string;
    nama_siswa: string;
    nis: string;
    nisn: string;
    kelas: string;
    tingkat: number;
    tahun_pelajaran: string;
  };
  pos_clearance: Record<PosClearanceKey, PosClearanceItem>;
  is_all_cleared: boolean;
  kelulusan: {
    nomor_skl: string;
    tanggal_lulus: string;
    rata_rata_nilai: number;
    status_kelulusan: string;
  } | null;
  sertifikat_ukk: {
    nomor_sertifikat: string;
    predikat: string;
    nilai_praktik: number;
  } | null;
}

export interface PreviewBebasAdministrasiResponse {
  tipe: 'BEBAS_ADMINISTRASI';
  nomor_surat: string;
  tanggal_surat: string;
  keperluan: string;
  catatan_tambahan: string | null;
  siswa: {
    id: string;
    nama_siswa: string;
    nis: string;
    nisn: string;
    kelas: string;
    tingkat: number;
    tahun_pelajaran: string;
  };
  pos_clearance: Record<PosClearanceKey, PosClearanceItem>;
  is_all_cleared: boolean;
  penandatangan: {
    nama_sekolah: string;
    npsn: string;
    kota: string;
    nama_kepala_sekolah: string;
    nip_kepala_sekolah: string;
  };
}

export interface PreviewBastResponse {
  tipe: 'BAST_IJAZAH';
  nomor_bast: string;
  nomor_seri_ijazah: string;
  tanggal_serah_terima: string;
  siswa: {
    id: string;
    nama_siswa: string;
    nis: string;
    nisn: string;
    kelas: string;
    tingkat: number;
    tahun_pelajaran: string;
  };
  nomor_skl: string;
  nomor_sertifikat_ukk: string;
  dokumen_diserahkan: string[];
  penerima: {
    status: 'SISWA_SENDIRI' | 'ORANG_TUA' | 'WALI_KUASA';
    nama: string;
    nik: string;
    hubungan: string;
    no_hp: string;
  };
  diserahkan_oleh: {
    nama: string;
    jabatan: string;
  };
  penandatangan: {
    nama_sekolah: string;
    npsn: string;
    kota: string;
    nama_kepala_sekolah: string;
    nip_kepala_sekolah: string;
  };
}

export interface BukuEkspedisiEntry {
  siswa_id: string;
  nama_siswa: string;
  nis: string;
  nisn: string;
  kelas: string;
  tingkat: number;
  nomor_skl: string;
  status_ambil: 'DIAMBIL' | 'BELUM';
  nomor_seri_ijazah: string;
  tanggal_ambil: string | null;
  penerima_nama: string | null;
  penerima_hubungan: string | null;
  nomor_bast: string | null;
}

export interface BukuEkspedisiResponse {
  entries: BukuEkspedisiEntry[];
  rekap: {
    total_lulusan: number;
    total_sudah_diambil: number;
    total_di_brankas: number;
  };
  penandatangan: {
    nama_sekolah: string;
    npsn: string;
    kota: string;
    nama_kepala_sekolah: string;
    nip_kepala_sekolah: string;
  };
}

export const bastIjazahQueryKeys = {
  all: ['correspondence-bast-ijazah'] as const,
  statusClearance: (siswaId: string) => [...bastIjazahQueryKeys.all, 'clearance', siswaId] as const,
  bukuEkspedisi: (filters: Record<string, any>) => [...bastIjazahQueryKeys.all, 'buku-ekspedisi', filters] as const,
};

export const bastIjazahApi = {
  getStatusClearance: async (siswaId: string): Promise<{ success: boolean; data: StatusClearanceResponse }> => {
    return requestWithFallback<{ success: boolean; data: StatusClearanceResponse }>(
      'get',
      `/correspondence/clearance-bast/status-clearance/${siswaId}`
    );
  },

  updateClearance: async (payload: {
    siswa_id: string;
    pos: 'PERPUSTAKAAN' | 'KEUANGAN' | 'BENGKEL_JURUSAN' | 'BK' | 'WALI_KELAS';
    status: 'BEBAS' | 'BELUM_BEBAS';
    catatan?: string;
    petugas_nama?: string;
  }): Promise<{ success: boolean; data: any }> => {
    return requestWithFallback<{ success: boolean; data: any }>(
      'post',
      '/correspondence/clearance-bast/update-clearance',
      payload
    );
  },

  previewBebasAdministrasi: async (payload: {
    siswa_id: string;
    keperluan?: string;
    catatan_tambahan?: string;
  }): Promise<{ success: boolean; data: PreviewBebasAdministrasiResponse }> => {
    return requestWithFallback<{ success: boolean; data: PreviewBebasAdministrasiResponse }>(
      'post',
      '/correspondence/clearance-bast/preview-bebas-administrasi',
      payload
    );
  },

  previewBast: async (payload: {
    siswa_id: string;
    nomor_seri_ijazah?: string;
    tanggal_serah_terima?: string;
    penerima?: {
      status: 'SISWA_SENDIRI' | 'ORANG_TUA' | 'WALI_KUASA';
      nama?: string;
      nik?: string;
      hubungan?: string;
      no_hp?: string;
    };
    dokumen_diserahkan?: string[];
  }): Promise<{ success: boolean; data: PreviewBastResponse }> => {
    return requestWithFallback<{ success: boolean; data: PreviewBastResponse }>(
      'post',
      '/correspondence/clearance-bast/preview-bast',
      payload
    );
  },

  issueBast: async (payload: {
    siswa_id: string;
    nomor_bast: string;
    nomor_seri_ijazah: string;
    tanggal_serah_terima: string;
    penerima: {
      status: 'SISWA_SENDIRI' | 'ORANG_TUA' | 'WALI_KUASA';
      nama: string;
      nik?: string;
      hubungan: string;
      no_hp?: string;
    };
    dokumen_diserahkan: string[];
    catatan?: string;
  }): Promise<{ success: boolean; message: string; data: any }> => {
    return requestWithFallback<{ success: boolean; message: string; data: any }>(
      'post',
      '/correspondence/clearance-bast/issue-bast',
      payload
    );
  },

  getBukuEkspedisi: async (params?: {
    tahun_pelajaran_id?: string;
    status_ambil?: 'ALL' | 'DIAMBIL' | 'BELUM';
    search?: string;
  }): Promise<{ success: boolean; data: BukuEkspedisiResponse }> => {
    return requestWithFallback<{ success: boolean; data: BukuEkspedisiResponse }>(
      'get',
      '/correspondence/clearance-bast/buku-ekspedisi',
      { params }
    );
  },
};
