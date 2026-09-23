import api, { resolvePublicApiBaseUrl } from '../lib/axiosInstance';
import { useAuthStore } from '../store/authStore';

const getAuthToken = () => {
  try {
    const fromStore = useAuthStore.getState().token;
    if (fromStore) return fromStore;
    const directToken = localStorage.getItem('access_token');
    if (directToken) return directToken;
    const rawStorage = localStorage.getItem('auth-storage');
    if (rawStorage) {
      const parsed = JSON.parse(rawStorage);
      if (parsed?.state?.token) return parsed.state.token;
    }
    return '';
  } catch {
    return localStorage.getItem('access_token') || '';
  }
};

const getPdfBaseUrl = () => {
  // resolvePublicApiBaseUrl() returns the base without trailing slash, e.g. http://localhost:3004/api
  return resolvePublicApiBaseUrl();
};

export const raporApi = {
  // === NILAI ===
  getNilai: async (params?: { siswa_id?: string; mapel_id?: string; tahun_pelajaran_id?: string; semester_id?: string; jenis_nilai_id?: string; kelas_id?: string }) => {
    const response = await api.get('/rapor/nilai', { params });
    return response.data;
  },
  getNilas: async (params?: { siswa_id?: string; mapel_id?: string; tahun_pelajaran_id?: string; semester_id?: string; jenis_nilai_id?: string; kelas_id?: string }) => {
    const response = await api.get('/rapor/nilai', { params });
    return response.data;
  },
  upsertNilai: async (data: { siswa_id: string; mapel_id: string; tahun_pelajaran_id: string; semester_id: string; jenis_nilai_id: string; nilai: number; catatan_deskripsi?: string | null; sesi_absensi_id?: string | null }) => {
    const response = await api.post('/rapor/nilai', data);
    return response.data;
  },
  upsertBulkNilai: async (data: { mapel_id: string; tahun_pelajaran_id: string; semester_id: string; jenis_nilai_id: string; sesi_absensi_id?: string | null; scores: Array<{ siswa_id: string; nilai: number; catatan_deskripsi?: string | null }> }) => {
    const response = await api.post('/rapor/nilai/bulk', data);
    return response.data;
  },
  upsertBatchSumatifNilai: async (data: { mapel_id: string; tahun_pelajaran_id: string; semester_id: string; scores: Array<{ siswa_id: string; sumatif_1?: number | null; sumatif_2?: number | null; sumatif_3?: number | null; nilai_akhir_sumatif?: number | null; capaian_kompetensi?: string | null }> }) => {
    const response = await api.post('/rapor/nilai/sumatif-batch', data);
    return response.data;
  },
  getExportEraporKemendikbudUrl: (params: { kelas_id: string; mapel_id: string; tahun_pelajaran_id: string; semester_id: string }) => {
    const query = new URLSearchParams(params).toString();
    return `${api.defaults.baseURL}/rapor/nilai/export-erapor-kemendikbud?${query}`;
  },
  exportEraporKemendikbudBlob: async (params: { kelas_id: string; mapel_id: string; tahun_pelajaran_id: string; semester_id: string }) => {
    const response = await api.get('/rapor/nilai/export-erapor-kemendikbud', {
      params,
      responseType: 'blob'
    });
    return response;
  },
  saveSumatifMassal: async (data: any) => {
    const response = await api.post('/rapor/nilai/sumatif-batch', data);
    return response.data;
  },
  saveNilaiBulk: async (data: any) => {
    const response = await api.post('/rapor/nilai/bulk', data);
    return response.data;
  },
  importExcel: async (formData: FormData) => {
    const response = await api.post('/rapor/nilai/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },
  getKategoriNilai: async () => {
    const response = await api.get('/rapor/nilai/jenis');
    return response.data;
  },
  getTeacherProgress: async (params?: { tahun_pelajaran_id?: string; semester_id?: string }) => {
    const response = await api.get('/rapor/nilai/progress', { params });
    return response.data;
  },
  getMonitoringProgressGuru: async (params?: { tahun_pelajaran_id?: string; semester_id?: string }) => {
    const response = await api.get('/rapor/nilai/monitoring/guru', { params });
    return response.data;
  },
  getClassSubjectProgress: async (kelasId: string, params?: { tahun_pelajaran_id?: string; semester_id?: string }) => {
    const response = await api.get(`/rapor/nilai/monitoring/kelas/${kelasId}`, { params });
    return response.data;
  },
  downloadTemplateBlob: async (params: { kelas_id: string; mapel_id: string; jenis_nilai_id?: string; mode?: string }) => {

    const response = await api.get('/rapor/nilai/import/template', {
      params,
      responseType: 'blob'
    });
    return response;
  },
  getJenisPenilaian: async () => {
    const response = await api.get('/rapor/nilai/jenis');
    return response.data;
  },
  createJenisPenilaian: async (data: { nama: string; kode: string; bobot: number; is_active?: boolean }) => {
    const response = await api.post('/rapor/nilai/jenis', data);
    return response.data;
  },
  updateJenisPenilaian: async (id: string, data: any) => {
    const response = await api.put(`/rapor/nilai/jenis/${id}`, data);
    return response.data;
  },
  deleteJenisPenilaian: async (id: string) => {
    const response = await api.delete(`/rapor/nilai/jenis/${id}`);
    return response.data;
  },
  getTemplateExcelUrl: (params: { kelas_id: string; mapel_id: string; jenis_nilai_id: string }) => {
    const query = new URLSearchParams(params).toString();
    return `${api.defaults.baseURL}/rapor/nilai/import/template?${query}`;
  },
  getExportEraforUrl: (params: { kelas_id: string; mapel_id: string; tahun_pelajaran_id: string; semester_id: string; jenis_nilai_id: string }) => {
    const query = new URLSearchParams(params).toString();
    return `${api.defaults.baseURL}/rapor/nilai/export-erafor?${query}`;
  },
  importNilaiExcel: async (formData: FormData) => {
    const response = await api.post('/rapor/nilai/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  // === RAPOR SUMMARY & LEGER ===
  upsertRaporSummary: async (data: {
    siswa_id: string;
    kelas_id: string;
    tahun_pelajaran_id: string;
    semester_id: string;
    sakit?: number;
    izin?: number;
    alpa?: number;
    catatan_wali?: string | null;
    keputusan_transisi?: string | null;
    catatan_kokurikuler?: string | null;
  }) => {
    const response = await api.post('/rapor', data);
    return response.data;
  },
  getRaporDetail: async (params: { siswa_id: string; tahun_pelajaran_id: string; semester_id: string }) => {
    const response = await api.get('/rapor/detail', { params });
    return response.data;
  },
  getLeger: async (params: { kelas_id: string; tahun_pelajaran_id: string; semester_id: string }) => {
    const response = await api.get('/rapor/leger', { params });
    return response.data;
  },
  getLegerExportUrl: (params: { kelas_id: string; tahun_pelajaran_id: string; semester_id: string }) => {
    const query = new URLSearchParams(params).toString();
    return `${api.defaults.baseURL}/rapor/leger/export?${query}`;
  },
  exportLegerBlob: async (params: { kelas_id: string; tahun_pelajaran_id: string; semester_id: string }) => {
    const response = await api.get('/rapor/leger/export', {
      params,
      responseType: 'blob',
    });
    return response;
  },
  getTranskripNilai: async (siswa_id: string) => {
    const response = await api.get('/rapor/transkrip', { params: { siswa_id } });
    return response.data;
  },

  // === UKK & SKL ===
  getUkk: async (params?: { siswa_id?: string; query?: string }) => {
    const response = await api.get('/rapor/ukk', { params });
    return response.data;
  },
  upsertUkk: async (data: any) => {
    const response = await api.post('/rapor/ukk', data);
    return response.data;
  },
  deleteUkk: async (id: string) => {
    const response = await api.delete(`/rapor/ukk/${id}`);
    return response.data;
  },
  getSkl: async (params?: { siswa_id?: string; query?: string }) => {
    const response = await api.get('/rapor/skl', { params });
    return response.data;
  },
  upsertSkl: async (data: any) => {
    const response = await api.post('/rapor/skl', data);
    return response.data;
  },
  deleteSkl: async (id: string) => {
    const response = await api.delete(`/rapor/skl/${id}`);
    return response.data;
  },

  // === P5 ===
  getP5Projek: async (params?: { tahun_pelajaran_id?: string; semester_id?: string }) => {
    const response = await api.get('/rapor/p5/projek', { params });
    return response.data;
  },
  createP5Projek: async (data: any) => {
    const response = await api.post('/rapor/p5/projek', data);
    return response.data;
  },
  updateP5Projek: async (id: string, data: any) => {
    const response = await api.put(`/rapor/p5/projek/${id}`, data);
    return response.data;
  },
  deleteP5Projek: async (id: string) => {
    const response = await api.delete(`/rapor/p5/projek/${id}`);
    return response.data;
  },
  getP5Nilai: async (params?: { projek_id?: string; siswa_id?: string; dimensi?: string }) => {
    const response = await api.get('/rapor/p5/nilai', { params });
    return response.data;
  },
  upsertP5Nilai: async (data: any) => {
    const response = await api.post('/rapor/p5/nilai', data);
    return response.data;
  },
  upsertBulkP5Nilai: async (data: any) => {
    const response = await api.post('/rapor/p5/nilai/bulk', data);
    return response.data;
  },
  upsertMatrixP5Nilai: async (data: {
    projek_id: string;
    grades: Array<{
      siswa_id: string;
      dimensi: string;
      sub_elemen: string;
      kualifikasi: string;
      catatan_proses?: string | null;
    }>;
  }) => {
    const response = await api.post('/rapor/p5/nilai/matrix', data);
    return response.data;
  },

  // === P5 FASILITATOR TIM ===
  getMyP5Projects: async (params?: { tahun_pelajaran_id?: string; semester_id?: string }) => {
    const response = await api.get('/rapor/p5/projek/my-projects', { params });
    return response.data;
  },
  getP5Fasilitator: async (projekId: string) => {
    const response = await api.get(`/rapor/p5/projek/${projekId}/fasilitator`);
    return response.data;
  },
  upsertP5Fasilitator: async (projekId: string, data: { guru_id: string; kelas_ids: string[] }) => {
    const response = await api.post(`/rapor/p5/projek/${projekId}/fasilitator`, data);
    return response.data;
  },
  removeP5Fasilitator: async (projekId: string, guruId: string) => {
    const response = await api.delete(`/rapor/p5/projek/${projekId}/fasilitator/${guruId}`);
    return response.data;
  },

  // === PDF DOWNLOAD URL GENERATORS ===
  getPdfRaporUrl: (siswaId: string, tahunPelajaranId: string, semesterId: string) => {
    const token = getAuthToken();
    const base = getPdfBaseUrl();
    return `${base}/reporting/pdf/rapor/${siswaId}?tahun_pelajaran_id=${tahunPelajaranId}&semester_id=${semesterId}&token=${encodeURIComponent(token)}`;
  },
  getPdfCoverUrl: (siswaId: string) => {
    const token = getAuthToken();
    const base = getPdfBaseUrl();
    return `${base}/reporting/pdf/cover/${siswaId}?token=${encodeURIComponent(token)}`;
  },
  getPdfBiodataUrl: (siswaId: string) => {
    const token = getAuthToken();
    const base = getPdfBaseUrl();
    return `${base}/reporting/pdf/biodata/${siswaId}?token=${encodeURIComponent(token)}`;
  },
  getPdfRaporSumatifUrl: (siswaId: string, tahunPelajaranId: string, semesterId: string) => {
    const token = getAuthToken();
    const base = getPdfBaseUrl();
    return `${base}/reporting/pdf/rapor-sumatif/${siswaId}?tahun_pelajaran_id=${tahunPelajaranId}&semester_id=${semesterId}&token=${encodeURIComponent(token)}`;
  },
  getPdfLegerUrl: (kelasId: string, tahunPelajaranId: string, semesterId: string) => {
    const token = getAuthToken();
    const base = getPdfBaseUrl();
    return `${base}/reporting/pdf/leger/${kelasId}?tahun_pelajaran_id=${tahunPelajaranId}&semester_id=${semesterId}&token=${encodeURIComponent(token)}`;
  },
  getPdfP5Url: (siswaId: string, tahunPelajaranId: string, semesterId: string) => {
    const token = getAuthToken();
    const base = getPdfBaseUrl();
    return `${base}/reporting/pdf/p5/${siswaId}?tahun_pelajaran_id=${tahunPelajaranId}&semester_id=${semesterId}&token=${encodeURIComponent(token)}`;
  },
  getPdfSklUrl: (siswaId: string) => {
    const token = getAuthToken();
    const base = getPdfBaseUrl();
    return `${base}/reporting/pdf/skl/${siswaId}?token=${encodeURIComponent(token)}`;
  },
  getPdfUkkUrl: (siswaId: string) => {
    const token = getAuthToken();
    const base = getPdfBaseUrl();
    return `${base}/reporting/pdf/ukk/${siswaId}?token=${encodeURIComponent(token)}`;
  },
  getPdfPklUrl: (siswaPklId: string) => {
    const token = getAuthToken();
    const base = getPdfBaseUrl();
    return `${base}/reporting/pdf/pkl/${siswaPklId}?token=${encodeURIComponent(token)}`;
  },

  // === AUTHENTICATED PDF BLOB DOWNLOADERS (ANTI-UNAUTHORIZED) ===
  getPdfRaporBlob: async (siswaId: string, tahunPelajaranId: string, semesterId: string) => {
    return api.get(`/reporting/pdf/rapor/${siswaId}`, {
      params: { tahun_pelajaran_id: tahunPelajaranId, semester_id: semesterId },
      responseType: 'blob',
    });
  },
  getPdfCoverBlob: async (siswaId: string) => {
    return api.get(`/reporting/pdf/cover/${siswaId}`, {
      responseType: 'blob',
    });
  },
  getPdfBiodataBlob: async (siswaId: string) => {
    return api.get(`/reporting/pdf/biodata/${siswaId}`, {
      responseType: 'blob',
    });
  },
  getPdfRaporSumatifBlob: async (siswaId: string, tahunPelajaranId: string, semesterId: string) => {
    return api.get(`/reporting/pdf/rapor-sumatif/${siswaId}`, {
      params: { tahun_pelajaran_id: tahunPelajaranId, semester_id: semesterId },
      responseType: 'blob',
    });
  },
  getPdfLegerBlob: async (kelasId: string, tahunPelajaranId: string, semesterId: string) => {
    return api.get(`/reporting/pdf/leger/${kelasId}`, {
      params: { tahun_pelajaran_id: tahunPelajaranId, semester_id: semesterId },
      responseType: 'blob',
    });
  },
  getPdfP5Blob: async (siswaId: string, tahunPelajaranId: string, semesterId: string) => {
    return api.get(`/reporting/pdf/p5/${siswaId}`, {
      params: { tahun_pelajaran_id: tahunPelajaranId, semester_id: semesterId },
      responseType: 'blob',
    });
  },
  getPdfSklBlob: async (siswaId: string) => {
    return api.get(`/reporting/pdf/skl/${siswaId}`, {
      responseType: 'blob',
    });
  },
  getPdfUkkBlob: async (siswaId: string) => {
    return api.get(`/reporting/pdf/ukk/${siswaId}`, {
      responseType: 'blob',
    });
  },
  getPdfPklBlob: async (siswaPklId: string) => {
    return api.get(`/reporting/pdf/pkl/${siswaPklId}`, {
      responseType: 'blob',
    });
  },
  // === RAPOR SETTINGS & REFERENSI PERSURATAN ===
  getRaporSettings: async (params?: { tahun_pelajaran_id?: string; semester_id?: string }) => {
    const response = await api.get('/rapor/settings', { params });
    return response.data;
  },
  updateRaporSettings: async (data: Partial<RaporSettings>) => {
    const response = await api.put('/rapor/settings', data);
    return response.data;
  },
};

export interface RaporSettings {
  tahun_pelajaran_id?: string | null;
  semester_id?: string | null;
  tempat_terbit: string;
  // Specific to current selected semester:
  tanggal_rapor?: string;
  tanggal_rapor_p5?: string;
  tanggal_rapor_pts?: string;
  tanggal_pleno?: string;

  // Explicit Ganjil & Genap:
  ganjil_semester_id?: string | null;
  genap_semester_id?: string | null;
  tanggal_rapor_ganjil?: string;
  tanggal_p5_ganjil?: string;
  tanggal_pts_ganjil?: string;
  tanggal_rapor_genap?: string;
  tanggal_p5_genap?: string;
  tanggal_pts_genap?: string;
  tanggal_pleno_genap?: string;
  tanggal_kelulusan?: string;

  kepsek_status: 'DEFINITIF' | 'PLT';
  kepsek_nama: string;
  kepsek_nip: string;
  ukuran_kertas: 'A4' | 'F4';
  tampilkan_kop: boolean;
  tampilkan_qr: boolean;
  tampilkan_kokurikuler?: boolean;
  aktifkan_sumatif_arsip?: boolean;
}

export interface P5FasilitatorItem {
  id: string;
  tenant_id: string;
  projek_id: string;
  guru_id: string;
  created_at: string;
  Guru?: {
    id: string;
    nama_guru: string;
    nip?: string;
  };
  Kelas?: Array<{
    fasilitator_id: string;
    kelas_id: string;
    Kelas: {
      id: string;
      nama_kelas: string;
      tingkat: number;
    };
  }>;
}
