import api from '../lib/axiosInstance';

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
  upsertRaporSummary: async (data: { siswa_id: string; kelas_id: string; tahun_pelajaran_id: string; semester_id: string; sakit?: number; izin?: number; alpa?: number; catatan_wali?: string | null; keputusan_transisi?: string | null }) => {
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

  // === PDF DOWLOAD URL GENERATORS ===
  getPdfRaporUrl: (siswaId: string, tahunPelajaranId: string, semesterId: string) => {
    return `${api.defaults.baseURL}/reporting/pdf/rapor/${siswaId}?tahun_pelajaran_id=${tahunPelajaranId}&semester_id=${semesterId}`;
  },
  getPdfP5Url: (siswaId: string, tahunPelajaranId: string, semesterId: string) => {
    return `${api.defaults.baseURL}/reporting/pdf/p5/${siswaId}?tahun_pelajaran_id=${tahunPelajaranId}&semester_id=${semesterId}`;
  },
  getPdfSklUrl: (siswaId: string) => {
    return `${api.defaults.baseURL}/reporting/pdf/skl/${siswaId}`;
  },
  getPdfUkkUrl: (siswaId: string) => {
    return `${api.defaults.baseURL}/reporting/pdf/ukk/${siswaId}`;
  },
  getPdfPklUrl: (siswaPklId: string) => {
    return `${api.defaults.baseURL}/reporting/pdf/pkl/${siswaPklId}`;
  },
};
