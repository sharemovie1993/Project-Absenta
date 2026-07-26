import api from '../lib/axiosInstance';

export interface GlobalKurikulumStandard {
  id: string;
  jenjang: string;
  category?: string;
  nama_mapel: string;
  kode_mapel: string;
  tingkat: number;
  jp_per_minggu: number;
  created_at?: string;
  updated_at?: string;
}

export interface StrukturKurikulum {
  id: string;
  mapel_id: string;
  tahun_pelajaran_id: string;
  tingkat: number;
  jurusan_id?: string;
  jp_per_minggu: number;
  kelompok?: string;
  Mapel?: {
    nama_mapel: string;
    kode_mapel: string;
  };
  Jurusan?: {
    nama: string;
  };
}

export interface Supervisi {
  id: string;
  guru_id: string;
  supervisor_id?: string | null;
  tanggal: string;
  jam_ke?: number;
  kelas?: string;
  mapel?: string;
  catatan?: string;
  nilai?: number;
  status: string;
  is_verified?: boolean;
  is_self_evaluated?: boolean;
  target_pembelajaran?: string;
  nilai_self?: number | null;
  catatan_self?: string;
  Guru?: {
    nama_guru: string;
    nip?: string;
  };
  Supervisor?: {
    nama_guru: string;
    nip?: string;
  };
}


export const kurikulumApi = {
  // Struktur Kurikulum
  getStruktur: async (params?: any) => {
    const response = await api.get('/kurikulum/struktur', { params });
    return response.data;
  },
  upsertStruktur: async (data: any) => {
    const response = await api.post('/kurikulum/struktur', data);
    return response.data;
  },
  deleteStruktur: async (id: string) => {
    const response = await api.delete(`/kurikulum/struktur/${id}`);
    return response.data;
  },

  // Supervisi
  getSupervisi: async (params?: any) => {
    const response = await api.get('/kurikulum/supervisi', { params });
    return response.data;
  },
  createSupervisi: async (data: any) => {
    const response = await api.post('/kurikulum/supervisi', data);
    return response.data;
  },
  updateSupervisi: async (id: string, data: any) => {
    const response = await api.put(`/kurikulum/supervisi/${id}`, data);
    return response.data;
  },
  deleteSupervisi: async (id: string) => {
    const response = await api.delete(`/kurikulum/supervisi/${id}`);
    return response.data;
  },

  // Dashboard Monitoring
  getKbmGlobalMonitoring: async (tanggal?: string) => {
    // Pastikan tanggal dikirim dalam format YYYY-MM-DD murni tanpa konversi zona waktu yang salah
    const dateParam = tanggal || new Date().toISOString().split('T')[0];
    const response = await api.get('/dashboard/kurikulum/monitoring-global', {
      params: { tanggal: dateParam }
    });
    return response.data;
  },

  // Dashboard Stats (agregasi data dari berbagai endpoint untuk dashboard)
  getDashboardStats: async () => {
    const response = await api.get('/dashboard/kurikulum/stats');
    return response.data;
  },

  // Beban mengajar per guru (JP per minggu)
  getBebanMengajar: async (params?: { tahun_pelajaran_id?: string; semester_id?: string }) => {
    const response = await api.get('/kurikulum/struktur/beban-guru', { params });
    return response.data;
  },

  // Progress supervisi semester berjalan
  getProgressSupervisi: async () => {
    const response = await api.get('/kurikulum/supervisi/progress');
    return response.data;
  },

  // Perangkat Ajar / RPP
  getPerangkatAjar: async (params?: { guru_id?: string; mapel_id?: string; tahun_pelajaran_id?: string; semester_id?: string; status?: string; jenis?: string }) => {
    const response = await api.get('/kurikulum/perangkat', { params });
    return response.data;
  },
  uploadPerangkatAjar: async (data: {
    guru_id: string;
    mapel_id: string;
    tahun_pelajaran_id: string;
    semester_id: string;
    judul: string;
    jenis: string;
    file: File;
    onProgress?: (percent: number) => void;
  }) => {
    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('guru_id', data.guru_id);
    formData.append('mapel_id', data.mapel_id);
    formData.append('tahun_pelajaran_id', data.tahun_pelajaran_id);
    formData.append('semester_id', data.semester_id);
    formData.append('judul', data.judul);
    formData.append('jenis', data.jenis);

    const response = await api.post('/kurikulum/perangkat', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (evt: any) => {
        if (!data.onProgress) return;
        const total = Number(evt?.total || 0);
        const loaded = Number(evt?.loaded || 0);
        if (total > 0) data.onProgress(Math.round((loaded * 100) / total));
      },
    });
    return response.data;
  },
  reviewPerangkatAjar: async (id: string, data: { status: 'APPROVED' | 'REJECTED'; catatan_reviewer?: string | null }) => {
    const response = await api.post(`/kurikulum/perangkat/${id}/review`, data);
    return response.data;
  },
  getPerangkatById: async (id: string) => {
    const response = await api.get(`/kurikulum/perangkat/${id}`);
    return response.data;
  },
  saveEditorPerangkat: async (data: {
    perangkat_id?: string;
    judul: string;
    jenis: string;
    mapel_id?: string;
    guru_id?: string;
    tahun_pelajaran_id?: string;
    semester_id?: string;
    html_content: string;
  }) => {
    const response = await api.post('/kurikulum/perangkat/save-editor', data);
    return response.data;
  },
  deletePerangkatAjar: async (id: string) => {
    const response = await api.delete(`/kurikulum/perangkat/${id}`);
    return response.data;
  },
  bulkDeletePerangkatAjar: async (ids: string[]) => {
    const response = await api.post('/kurikulum/perangkat/bulk-delete', { ids });
    return response.data;
  },

  downloadPerangkatAjarFile: async (id: string): Promise<{ blob: Blob; filename: string }> => {
    const response = await api.get(`/kurikulum/perangkat/${id}/download`, {
      responseType: 'blob'
    });
    const blob = response.data as Blob;
    if (blob.type && (blob.type.includes('json') || blob.type.includes('text'))) {
      const text = await blob.text();
      if (text.startsWith('{')) {
        try {
          const json = JSON.parse(text);
          if (json.message || json.error) {
            throw new Error(json.message || json.error || 'Gagal memuat berkas PDF');
          }
        } catch (e: unknown) {
          if (e instanceof Error && e.message !== 'Gagal memuat berkas PDF' && !e.message.includes('JSON')) {
            throw e;
          }
        }
      }
    }
    const cd = String(response.headers?.['content-disposition'] || '');
    const match = cd.match(/filename="?([^"]+)"?/);
    const filename = match?.[1] || 'document.pdf';
    return { blob, filename };
  },

  getStandardReferences: async (jenjang?: string) => {
    const response = await api.get('/kurikulum/struktur/standards', { params: { jenjang } });
    return response.data;
  },
  createStandardReference: async (data: any) => {
    const response = await api.post('/kurikulum/struktur/standards', data);
    return response.data;
  },
  updateStandardReference: async (id: string, data: any) => {
    const response = await api.put(`/kurikulum/struktur/standards/${id}`, data);
    return response.data;
  },
  deleteStandardReference: async (id: string) => {
    const response = await api.delete(`/kurikulum/struktur/standards/${id}`);
    return response.data;
  },
  // Kalender Akademik
  getKalenderAkademik: async (tahun_pelajaran_id) => {
    const params = tahun_pelajaran_id ? `?tahun_pelajaran_id=${tahun_pelajaran_id}` : '';
    const response = await api.get(`/kurikulum/kalender${params}`);
    return response.data;
  },
  getKalenderStats: async (tahun_pelajaran_id) => {
    const params = tahun_pelajaran_id ? `?tahun_pelajaran_id=${tahun_pelajaran_id}` : '';
    const response = await api.get(`/kurikulum/kalender/stats${params}`);
    return response.data;
  },
  createKalender: async (data) => {
    const response = await api.post('/kurikulum/kalender', data);
    return response.data;
  },
  updateKalender: async (id, data) => {
    const response = await api.put(`/kurikulum/kalender/${id}`, data);
    return response.data;
  },
  deleteKalender: async (id) => {
    const response = await api.delete(`/kurikulum/kalender/${id}`);
    return response.data;
  },

  // Rekap KBM
  getRekapKBM: async (params) => {
    const qs = new URLSearchParams();
    if (params?.semester_id) qs.set('semester_id', params.semester_id);
    if (params?.tahun_pelajaran_id) qs.set('tahun_pelajaran_id', params.tahun_pelajaran_id);
    const response = await api.get(`/kurikulum/rekap-kbm${qs.toString() ? '?' + qs.toString() : ''}`);
    return response.data;
  },

  // Calendar Presets
  getCalendarPresets: async (jenjang?: string) => {
    const response = await api.get('/kurikulum/kalender/presets', { params: { jenjang } });
    return response.data;
  },
  createCalendarPreset: async (data: any) => {
    const response = await api.post('/kurikulum/kalender/presets', data);
    return response.data;
  },
  updateCalendarPreset: async (id: string, data: any) => {
    const response = await api.put(`/kurikulum/kalender/presets/${id}`, data);
    return response.data;
  },
  deleteCalendarPreset: async (id: string) => {
    const response = await api.delete(`/kurikulum/kalender/presets/${id}`);
    return response.data;
  },
  bulkSeedCalendar: async (tahunPelajaranId: string) => {
    const response = await api.post('/kurikulum/kalender/bulk-seed', { tahun_pelajaran_id: tahunPelajaranId });
    return response.data;
  },
  exportICal: async (tahunPelajaranId?: string, tenantId?: string) => {
    const response = await api.get('/kurikulum/kalender/export', {
      params: { tahun_pelajaran_id: tahunPelajaranId, tenant_id: tenantId },
      responseType: 'blob'
    });
    return response.data;
  },
  bulkDeleteCalendar: async (ids: string[]) => {
    const response = await api.delete('/kurikulum/kalender/bulk-delete', { data: { ids } });
    return response.data;
  },

  checkBebanGuru: async (guruId: string, addMapelId?: string, addKelasId?: string) => {
    const response = await api.get('/kurikulum/struktur/check-beban-guru', {
      params: { guru_id: guruId, add_mapel_id: addMapelId, add_kelas_id: addKelasId }
    });
    return response.data;
  },

  getSupervisiAnalytics: async () => {
    const response = await api.get('/kurikulum/supervisi/analytics');
    return response.data;
  },

  submitSupervisiSelfAssessment: async (id: string, data: { target_pembelajaran: string; nilai_self?: number; catatan_self?: string }) => {
    const response = await api.put(`/kurikulum/supervisi/${id}/self-assessment`, data);
    return response.data;
  },

  getSupervisiRecommendations: async (guruId: string, tanggal: string) => {
    const response = await api.get('/kurikulum/supervisi/rekomendasi', {
      params: { guru_id: guruId, tanggal }
    });
    return response.data;
  },

  // AI-Powered Lesson Plan Generator
  generatePerangkatAjarAI: async (params: {
    jenis: string;
    mapel_name: string;
    kelas: string;
    topik: string;
    alokasi_waktu?: string;
  }) => {
    const response = await api.post('/kurikulum/perangkat/generate-ai', params);
    return response.data as { success: boolean; data: { content: string } };
  },

  savePerangkatAjarEditor: async (params: {
    judul: string;
    jenis: string;
    mapel_id: string;
    guru_id?: string;
    tahun_pelajaran_id: string;
    semester_id: string;
    html_content: string;
  }) => {
    const response = await api.post('/kurikulum/perangkat/save-editor', params);
    return response.data;
  },

  getTopikPresets: async (params?: { jenjang?: string; mapel_name?: string; fase?: string; kategori?: string }) => {
    const response = await api.get('/kurikulum/perangkat/topik-presets', { params });
    return response.data as {
      success: boolean;
      data: Array<{
        id: string;
        jenjang: string;
        nama_mapel: string;
        kode_mapel?: string;
        fase?: string;
        tingkat?: number;
        judul_topik: string;
        deskripsi?: string;
        kategori: string;
      }>;
    };
  },
  createTopikPreset: async (data: {
    jenjang: string;
    nama_mapel: string;
    kode_mapel?: string;
    fase?: string;
    tingkat?: number;
    judul_topik: string;
    deskripsi?: string;
    kategori?: string;
  }) => {
    const response = await api.post('/kurikulum/perangkat/topik-presets', data);
    return response.data;
  },
  updateTopikPreset: async (id: string, data: Partial<{
    jenjang: string;
    nama_mapel: string;
    kode_mapel?: string;
    fase?: string;
    tingkat?: number;
    judul_topik: string;
    deskripsi?: string;
    kategori?: string;
  }>) => {
    const response = await api.put(`/kurikulum/perangkat/topik-presets/${id}`, data);
    return response.data;
  },
  deleteTopikPreset: async (id: string) => {
    const response = await api.delete(`/kurikulum/perangkat/topik-presets/${id}`);
    return response.data;
  },


  getLibraryTemplates: async (params?: { jenjang?: string; nama_mapel?: string; jenis?: string; tingkat?: number; search?: string }) => {
    const response = await api.get('/kurikulum/perangkat/library', { params });
    return response.data as {
      success: boolean;
      data: Array<{
        id: string;
        jenjang: string;
        nama_mapel: string;
        kode_mapel?: string;
        tingkat?: number;
        fase?: string;
        jenis: string;
        judul: string;
        topik?: string;
        file_url: string;
        downloads_count: number;
        created_at: string;
      }>;
    };
  },

  claimLibraryTemplate: async (data: {
    library_id: string;
    mapel_id: string;
    tahun_pelajaran_id: string;
    semester_id: string;
    guru_id?: string;
  }) => {
    const response = await api.post('/kurikulum/perangkat/claim', data);
    return response.data;
  },

  createLibraryTemplate: async (data: {
    jenjang: string;
    nama_mapel: string;
    kode_mapel?: string;
    tingkat?: number;
    fase?: string;
    jenis: string;
    judul: string;
    topik?: string;
    html_content?: string;
  }) => {
    const response = await api.post('/kurikulum/perangkat/library', data);
    return response.data;
  },

  updateLibraryTemplate: async (id: string, data: Partial<{
    jenjang: string;
    nama_mapel: string;
    kode_mapel?: string;
    tingkat?: number;
    fase?: string;
    jenis: string;
    judul: string;
    topik?: string;
    html_content?: string;
  }>) => {
    const response = await api.put(`/kurikulum/perangkat/library/${id}`, data);
    return response.data;
  },

  deleteLibraryTemplate: async (id: string) => {
    const response = await api.delete(`/kurikulum/perangkat/library/${id}`);
    return response.data;
  },


  getGuruMapelAssignments: async (params?: { guru_id?: string; mapel_id?: string; kelas_id?: string }) => {
    const response = await api.get('/kurikulum/guru-mapel', { params });
    return response.data;
  },
};