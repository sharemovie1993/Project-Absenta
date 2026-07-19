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
  uploadPerangkatAjar: async (data: { guru_id: string; mapel_id: string; tahun_pelajaran_id: string; semester_id: string; judul: string; jenis: string; file_url: string }) => {
    const response = await api.post('/kurikulum/perangkat', data);
    return response.data;
  },
  reviewPerangkatAjar: async (id: string, data: { status: 'APPROVED' | 'REJECTED'; catatan_reviewer?: string | null }) => {
    const response = await api.post(`/kurikulum/perangkat/${id}/review`, data);
    return response.data;
  },
  deletePerangkatAjar: async (id: string) => {
    const response = await api.delete(`/kurikulum/perangkat/${id}`);
    return response.data;
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
};