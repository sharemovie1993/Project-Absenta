import api from '../lib/axiosInstance';

// ── Query Key Factory ──────────────────────────────────────────────────────
export const bpbkQueryKeys = {
  all: ['bpbk'] as const,
  konseling: () => [...bpbkQueryKeys.all, 'konseling'] as const,
  konselingList: (filters: Record<string, any>) => [...bpbkQueryKeys.konseling(), 'list', filters] as const,
  homeVisit: () => [...bpbkQueryKeys.all, 'home-visit'] as const,
  homeVisitList: (filters: Record<string, any>) => [...bpbkQueryKeys.homeVisit(), 'list', filters] as const,
  cases: () => [...bpbkQueryKeys.all, 'cases'] as const,
  casesList: (filters: Record<string, any>) => [...bpbkQueryKeys.cases(), 'list', filters] as const,
  pemanggilan: () => [...bpbkQueryKeys.all, 'pemanggilan'] as const,
  pemanggilanList: (filters: Record<string, any>) => [...bpbkQueryKeys.pemanggilan(), 'list', filters] as const,
  rujukan: () => [...bpbkQueryKeys.all, 'rujukan'] as const,
  rujukanList: (filters: Record<string, any>) => [...bpbkQueryKeys.rujukan(), 'list', filters] as const,
  asesmen: () => [...bpbkQueryKeys.all, 'asesmen'] as const,
  asesmenList: (filters: Record<string, any>) => [...bpbkQueryKeys.asesmen(), 'list', filters] as const,
  ews: (params?: Record<string, any>) => [...bpbkQueryKeys.all, 'ews', params] as const,
  stats: () => [...bpbkQueryKeys.all, 'stats'] as const,
  reports: () => [...bpbkQueryKeys.all, 'reports'] as const,
  studentRiskTrend: (id: string) => [...bpbkQueryKeys.all, 'student-risk-trend', id] as const,
  auditLogs: (filters: Record<string, any>) => [...bpbkQueryKeys.all, 'audit-logs', filters] as const,
};



export interface KonselingSiswa {
  id: string;
  siswa_id: string;
  tanggal: string;
  tipe: 'INDIVIDU' | 'KELOMPOK';
  kelompok_id?: string;
  masalah: string;
  solusi?: string;
  status: 'PROSES' | 'SELESAI';
  petugas_id: string;
  kasus_bk_id?: string;
  visibility?: 'SENSITIVE' | 'LIMITED' | 'PUBLIC';
  Siswa?: {
    id: string;
    nama_siswa: string;
    nis: string;
    Kelas?: {
      nama_kelas: string;
    };
  };
  Petugas?: {
    id: string;
    full_name: string;
  };
  deleted_at?: string | null;
  deleted_by?: string | null;
}

export interface PemanggilanOrangTua {
  id: string;
  siswa_id: string;
  tanggal_pemanggilan: string;
  tanggal_pertemuan?: string;
  alasan: string;
  keterangan_pertemuan?: string;
  status: 'BARU' | 'DIKIRIM' | 'HADIR' | 'TIDAK_HADIR';
  surat_dokumen_id?: string;
  kasus_bk_id?: string;
  visibility?: 'SENSITIVE' | 'LIMITED' | 'PUBLIC';
  Siswa?: {
    id: string;
    nama_siswa: string;
    nis: string;
    no_hp?: string;
    Kelas?: {
      nama_kelas: string;
    };
    OrangTuaSiswa?: Array<{
      OrangTua?: {
        nama: string;
        no_hp?: string;
      };
    }>;
  };
  Dokumen?: {
    id: string;
    judul: string;
    file_original_name: string;
  };
  deleted_at?: string | null;
  deleted_by?: string | null;
  waktu_pertemuan?: string;
  tempat_pertemuan?: string;
}

export interface HomeVisit {
  id: string;
  siswa_id: string;
  tanggal: string;
  alasan: string;
  hasil?: string;
  foto_dokumen_id?: string;
  kasus_bk_id?: string;
  visibility?: 'SENSITIVE' | 'LIMITED' | 'PUBLIC';
  Siswa?: {
    id: string;
    nama_siswa: string;
    nis: string;
    Kelas?: {
      nama_kelas: string;
    };
  };
  Dokumen?: {
    id: string;
    judul: string;
    file_original_name: string;
  };
  deleted_at?: string | null;
  deleted_by?: string | null;
}

export interface AsesmenSiswa {
  id: string;
  siswa_id: string;
  tanggal: string;
  nama_asesmen: string;
  hasil_skor?: string;
  keterangan?: string;
  dokumen_id?: string;
  kasus_bk_id?: string;
  visibility?: 'SENSITIVE' | 'LIMITED' | 'PUBLIC';
  Siswa?: {
    id: string;
    nama_siswa: string;
    nis: string;
    Kelas?: {
      nama_kelas: string;
    };
  };
  Dokumen?: {
    id: string;
    judul: string;
    file_original_name: string;
  };
  deleted_at?: string | null;
  deleted_by?: string | null;
}

export interface RujukanKasus {
  id: string;
  siswa_id: string;
  tanggal: string;
  rujukan_ke: string;
  alasan: string;
  status: 'DIUSULKAN' | 'SELESAI';
  kasus_bk_id?: string;
  visibility?: 'SENSITIVE' | 'LIMITED' | 'PUBLIC';
  Siswa?: {
    id: string;
    nama_siswa: string;
    nis: string;
    Kelas?: {
      nama_kelas: string;
    };
  };
  deleted_at?: string | null;
  deleted_by?: string | null;
}

export interface KasusBK {
  id: string;
  tenant_id: string;
  siswa_id: string;
  judul: string;
  kategori: 'KEDISIPLINAN' | 'AKADEMIS' | 'PRIBADI' | 'SOSIAL';
  status: 'TERBUKA' | 'PROSES' | 'RUJUKAN' | 'SELESAI';
  prioritas: 'RENDAH' | 'SEDANG' | 'TINGGI';
  visibility: 'SENSITIVE' | 'LIMITED' | 'PUBLIC';
  tanggal_kasus: string;
  keterangan?: string;
  Siswa?: {
    id: string;
    nama_siswa: string;
    nis: string;
    Kelas?: {
      nama_kelas: string;
    };
  };
  KonselingSiswa?: KonselingSiswa[];
  PemanggilanOrangTua?: PemanggilanOrangTua[];
  HomeVisit?: HomeVisit[];
  AsesmenSiswa?: AsesmenSiswa[];
  RujukanKasus?: RujukanKasus[];
  deleted_at?: string | null;
  deleted_by?: string | null;
  closed_at?: string | null;
  closed_by?: string | null;
  catatan_selesai?: string | null;
}

export interface BpbkDashboardStats {
  activeCounselingCount: number;
  pendingCallsCount: number;
  monthHomeVisitsCount: number;
  recentViolations: any[];
  recentCounselings: any[];
  criticalStudents: Array<{
    id: string;
    nama_siswa: string;
    nis: string;
    kelas: string;
    violations: number;
    achievements: number;
    riskScore: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    alpaCount: number;
  }>;
}

export const bpbkApi = {
  // === Dashboard BK Stats ===
  getDashboardStats: async (): Promise<{ success: boolean; data: BpbkDashboardStats }> => {
    const response = await api.get('/bpbk/dashboard-stats');
    return response.data;
  },



  // === Sesi Konseling ===
  getKonseling: async (params?: any): Promise<{ success: boolean; data: { list: KonselingSiswa[]; pagination: any } }> => {
    const response = await api.get('/bpbk/konseling', { params });
    return response.data;
  },
  createKonseling: async (data: any) => {
    const response = await api.post('/bpbk/konseling', data);
    return response.data;
  },
  updateKonseling: async (id: string, data: any) => {
    const response = await api.put(`/bpbk/konseling/${id}`, data);
    return response.data;
  },
  deleteKonseling: async (id: string) => {
    const response = await api.delete(`/bpbk/konseling/${id}`);
    return response.data;
  },

  // === Pemanggilan Orang Tua ===
  getPemanggilan: async (params?: any): Promise<{ success: boolean; data: { list: PemanggilanOrangTua[]; pagination: any } }> => {
    const response = await api.get('/bpbk/pemanggilan', { params });
    return response.data;
  },
  createPemanggilan: async (data: any) => {
    const response = await api.post('/bpbk/pemanggilan', data);
    return response.data;
  },
  updatePemanggilan: async (id: string, data: any) => {
    const response = await api.put(`/bpbk/pemanggilan/${id}`, data);
    return response.data;
  },
  deletePemanggilan: async (id: string) => {
    const response = await api.delete(`/bpbk/pemanggilan/${id}`);
    return response.data;
  },
  sendWhatsAppParent: async (id: string) => {
    const response = await api.post(`/bpbk/pemanggilan/${id}/send-whatsapp-parent`);
    return response.data;
  },

  // === Home Visit ===
  getHomeVisits: async (params?: any): Promise<{ success: boolean; data: { list: HomeVisit[]; pagination: any } }> => {
    const response = await api.get('/bpbk/home-visit', { params });
    return response.data;
  },
  createHomeVisit: async (data: any) => {
    const response = await api.post('/bpbk/home-visit', data);
    return response.data;
  },
  updateHomeVisit: async (id: string, data: any) => {
    const response = await api.put(`/bpbk/home-visit/${id}`, data);
    return response.data;
  },
  deleteHomeVisit: async (id: string) => {
    const response = await api.delete(`/bpbk/home-visit/${id}`);
    return response.data;
  },

  // === Asesmen Siswa ===
  getAsesmen: async (params?: any): Promise<{ success: boolean; data: { list: AsesmenSiswa[]; pagination: any } }> => {
    const response = await api.get('/bpbk/asesmen', { params });
    return response.data;
  },
  createAsesmen: async (data: any) => {
    const response = await api.post('/bpbk/asesmen', data);
    return response.data;
  },
  updateAsesmen: async (id: string, data: any) => {
    const response = await api.put(`/bpbk/asesmen/${id}`, data);
    return response.data;
  },
  deleteAsesmen: async (id: string) => {
    const response = await api.delete(`/bpbk/asesmen/${id}`);
    return response.data;
  },

  // === Rujukan Kasus ===
  getRujukan: async (params?: any): Promise<{ success: boolean; data: { list: RujukanKasus[]; pagination: any } }> => {
    const response = await api.get('/bpbk/rujukan', { params });
    return response.data;
  },
  createRujukan: async (data: any) => {
    const response = await api.post('/bpbk/rujukan', data);
    return response.data;
  },
  updateRujukan: async (id: string, data: any) => {
    const response = await api.put(`/bpbk/rujukan/${id}`, data);
    return response.data;
  },
  deleteRujukan: async (id: string) => {
    const response = await api.delete(`/bpbk/rujukan/${id}`);
    return response.data;
  },

  // === Kasus BK ===
  getKasusBK: async (params?: any): Promise<{ success: boolean; data: { list: KasusBK[]; pagination: any } }> => {
    const response = await api.get('/bpbk/cases', { params });
    return response.data;
  },
  getKasusBKById: async (id: string): Promise<{ success: boolean; data: KasusBK }> => {
    const response = await api.get(`/bpbk/cases/${id}`);
    return response.data;
  },
  createKasusBK: async (data: any): Promise<{ success: boolean; data: KasusBK }> => {
    const response = await api.post('/bpbk/cases', data);
    return response.data;
  },
  updateKasusBK: async (id: string, data: any): Promise<{ success: boolean; data: KasusBK }> => {
    const response = await api.put(`/bpbk/cases/${id}`, data);
    return response.data;
  },
  deleteKasusBK: async (id: string): Promise<{ success: boolean }> => {
    const response = await api.delete(`/bpbk/cases/${id}`);
    return response.data;
  },
  closeKasusBK: async (id: string, catatan_selesai: string): Promise<{ success: boolean; data: KasusBK }> => {
    const response = await api.post(`/bpbk/cases/${id}/close`, { catatan_selesai });
    return response.data;
  },
  reopenKasusBK: async (id: string): Promise<{ success: boolean; data: KasusBK }> => {
    const response = await api.post(`/bpbk/cases/${id}/reopen`);
    return response.data;
  },
  restoreKasusBK: async (id: string): Promise<{ success: boolean; data: KasusBK }> => {
    const response = await api.post(`/bpbk/cases/${id}/restore`);
    return response.data;
  },
  restoreKonseling: async (id: string): Promise<{ success: boolean }> => {
    const response = await api.post(`/bpbk/konseling/${id}/restore`);
    return response.data;
  },
  restorePemanggilan: async (id: string): Promise<{ success: boolean }> => {
    const response = await api.post(`/bpbk/pemanggilan/${id}/restore`);
    return response.data;
  },
  restoreHomeVisit: async (id: string): Promise<{ success: boolean }> => {
    const response = await api.post(`/bpbk/home-visit/${id}/restore`);
    return response.data;
  },
  restoreAsesmen: async (id: string): Promise<{ success: boolean }> => {
    const response = await api.post(`/bpbk/asesmen/${id}/restore`);
    return response.data;
  },
  restoreRujukan: async (id: string): Promise<{ success: boolean }> => {
    const response = await api.post(`/bpbk/rujukan/${id}/restore`);
    return response.data;
  },
  getReports: async (): Promise<{ success: boolean; data: any }> => {
    const response = await api.get('/bpbk/reports');
    return response.data;
  },
  getStudentRiskTrend: async (siswaId: string): Promise<{ success: boolean; data: { snapshots: any[]; events: any[] } }> => {
    const response = await api.get(`/bpbk/reports/student-risk-trend/${siswaId}`);
    return response.data;
  },
  getWaliKelasReports: async (): Promise<{ success: boolean; data: any }> => {
    const response = await api.get('/bpbk/reports/walikelas');
    return response.data;
  },
  getBkAuditLogs: async (params?: any): Promise<{ success: boolean; data: { list: any[]; pagination: any } }> => {
    const response = await api.get('/bpbk/audit-logs', { params });
    return response.data;
  }
};

