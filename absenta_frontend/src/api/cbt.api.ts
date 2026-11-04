import api from '../lib/axiosInstance';
import type {
  CbtBankSoal,
  CbtSoal,
  CbtJadwalUjian,
  CbtPesertaUjian,
  CbtStudentAnswerItem,
  CbtStudentExamItem,
} from '../types/cbt.types';

// ─── Query Key Factory ──────────────────────────────────────────────────────
export const cbtQueryKeys = {
  all: ['cbt'] as const,
  bankSoal: (params?: Record<string, any>) =>
    params !== undefined
      ? ([...cbtQueryKeys.all, 'bank-soal', params] as const)
      : ([...cbtQueryKeys.all, 'bank-soal'] as const),
  bankSoalDetail: (id?: string) =>
    id !== undefined
      ? ([...cbtQueryKeys.all, 'bank-soal-detail', id] as const)
      : ([...cbtQueryKeys.all, 'bank-soal-detail'] as const),
  soalList: (bankSoalId?: string) =>
    bankSoalId !== undefined
      ? ([...cbtQueryKeys.all, 'soal-list', bankSoalId] as const)
      : ([...cbtQueryKeys.all, 'soal-list'] as const),
  jadwal: (params?: Record<string, any>) =>
    params !== undefined
      ? ([...cbtQueryKeys.all, 'jadwal', params] as const)
      : ([...cbtQueryKeys.all, 'jadwal'] as const),
  jadwalDetail: (id?: string) =>
    id !== undefined
      ? ([...cbtQueryKeys.all, 'jadwal-detail', id] as const)
      : ([...cbtQueryKeys.all, 'jadwal-detail'] as const),
  pesertaList: (jadwalId?: string, params?: Record<string, any>) =>
    jadwalId !== undefined
      ? params !== undefined
        ? ([...cbtQueryKeys.all, 'peserta-list', jadwalId, params] as const)
        : ([...cbtQueryKeys.all, 'peserta-list', jadwalId] as const)
      : ([...cbtQueryKeys.all, 'peserta-list'] as const),
  myExams: () => [...cbtQueryKeys.all, 'my-exams'] as const,
};

// ─── API Client ─────────────────────────────────────────────────────────────
export const cbtApi = {
  // ==========================================
  // 1. BANK SOAL
  // ==========================================
  getBankSoalList: async (params?: Record<string, any>) => {
    const res = await api.get('/cbt/bank-soal', { params });
    return res.data?.data as {
      items: CbtBankSoal[];
      pagination: {
        page: number;
        limit: number;
        totalItems: number;
        totalPages: number;
      };
    };
  },

  getBankSoalById: async (id: string) => {
    const res = await api.get(`/cbt/bank-soal/${id}`);
    return res.data?.data as CbtBankSoal;
  },

  createBankSoal: async (payload: Partial<CbtBankSoal>) => {
    const res = await api.post('/cbt/bank-soal', payload);
    return res.data?.data as CbtBankSoal;
  },

  updateBankSoal: async (id: string, payload: Partial<CbtBankSoal>) => {
    const res = await api.put(`/cbt/bank-soal/${id}`, payload);
    return res.data?.data as CbtBankSoal;
  },

  deleteBankSoal: async (id: string) => {
    const res = await api.delete(`/cbt/bank-soal/${id}`);
    return res.data?.data;
  },

  // ==========================================
  // 2. BUTIR SOAL
  // ==========================================
  getSoalList: async (bankSoalId: string) => {
    const res = await api.get(`/cbt/bank-soal/${bankSoalId}/soal`);
    return res.data?.data as CbtSoal[];
  },

  createSoal: async (bankSoalId: string, payload: Partial<CbtSoal>) => {
    const res = await api.post(`/cbt/bank-soal/${bankSoalId}/soal`, payload);
    return res.data?.data as CbtSoal;
  },

  updateSoal: async (questionId: string, payload: Partial<CbtSoal>) => {
    const res = await api.put(`/cbt/soal/${questionId}`, payload);
    return res.data?.data as CbtSoal;
  },

  deleteSoal: async (questionId: string) => {
    const res = await api.delete(`/cbt/soal/${questionId}`);
    return res.data?.data;
  },

  bulkImportSoal: async (bankSoalId: string, items: Array<Partial<CbtSoal>>) => {
    const res = await api.post(`/cbt/bank-soal/${bankSoalId}/soal/bulk-import`, { items });
    return res.data?.data as { importedCount: number; totalSoal: number };
  },

  // ==========================================
  // 3. JADWAL UJIAN & SESI PROCTOR
  // ==========================================
  getJadwalList: async (params?: Record<string, any>) => {
    const res = await api.get('/cbt/jadwal', { params });
    return res.data?.data as {
      items: CbtJadwalUjian[];
      pagination: {
        page: number;
        limit: number;
        totalItems: number;
        totalPages: number;
      };
    };
  },

  getJadwalById: async (id: string) => {
    const res = await api.get(`/cbt/jadwal/${id}`);
    return res.data?.data as CbtJadwalUjian;
  },

  createJadwal: async (payload: Partial<CbtJadwalUjian>) => {
    const res = await api.post('/cbt/jadwal', payload);
    return res.data?.data as CbtJadwalUjian;
  },

  updateJadwal: async (id: string, payload: Partial<CbtJadwalUjian>) => {
    const res = await api.put(`/cbt/jadwal/${id}`, payload);
    return res.data?.data as CbtJadwalUjian;
  },

  regenerateToken: async (id: string) => {
    const res = await api.post(`/cbt/jadwal/${id}/regenerate-token`);
    return res.data?.data as { token_ujian: string };
  },

  activateJadwal: async (id: string) => {
    const res = await api.post(`/cbt/jadwal/${id}/activate`);
    return res.data?.data as CbtJadwalUjian;
  },

  pauseJadwal: async (id: string) => {
    const res = await api.post(`/cbt/jadwal/${id}/pause`);
    return res.data?.data as CbtJadwalUjian;
  },

  completeJadwal: async (id: string) => {
    const res = await api.post(`/cbt/jadwal/${id}/complete`);
    return res.data?.data as CbtJadwalUjian;
  },

  getPesertaList: async (jadwalId: string, params?: Record<string, any>) => {
    const res = await api.get(`/cbt/jadwal/${jadwalId}/peserta`, { params });
    return res.data?.data as CbtPesertaUjian[];
  },

  resetPeserta: async (jadwalId: string, siswaId: string) => {
    const res = await api.post(`/cbt/jadwal/${jadwalId}/peserta/${siswaId}/reset`);
    return res.data?.data;
  },

  // ==========================================
  // 4. STUDENT EXAM ENGINE
  // ==========================================
  getMyExams: async () => {
    const res = await api.get('/cbt/engine/my-exams');
    return (res.data?.data || []) as CbtStudentExamItem[];
  },

  verifyToken: async (tokenUjian: string) => {
    const res = await api.post('/cbt/engine/verify-token', { token_ujian: tokenUjian });
    return res.data?.data as {
      valid: boolean;
      jadwal_id: string;
      nama_sesi: string;
      mapel: string;
      judul_bank: string;
      durasi_menit: number;
      total_soal: number;
      existing_status: string;
    };
  },

  startExamSession: async (payload: {
    jadwal_ujian_id: string;
    token_masuk: string;
    metadata_perangkat?: Record<string, any>;
  }) => {
    const res = await api.post('/cbt/engine/start', payload);
    return res.data?.data as {
      peserta_id: string;
      jadwal_id: string;
      nama_sesi: string;
      durasi_menit: number;
      sisa_waktu_detik: number;
      waktu_mulai: string;
      setting_keamanan: any;
      soal: CbtSoal[];
      jawaban_tersimpan: CbtStudentAnswerItem[];
    };
  },

  syncAnswers: async (
    jadwalId: string,
    payload: {
      jawaban: CbtStudentAnswerItem[];
      sisa_waktu_detik: number;
    }
  ) => {
    const res = await api.post(`/cbt/engine/jadwal/${jadwalId}/sync`, payload);
    return res.data?.data;
  },

  recordViolation: async (
    jadwalId: string,
    payload: {
      tipe_pelanggaran: string;
      detail?: string;
      waktu?: string;
    }
  ) => {
    const res = await api.post(`/cbt/engine/jadwal/${jadwalId}/violation`, payload);
    return res.data?.data as {
      success: boolean;
      violation_count: number;
      is_disqualified: boolean;
    };
  },

  submitFinal: async (
    jadwalId: string,
    payload: {
      jawaban_final: CbtStudentAnswerItem[];
      log_pelanggaran?: any[];
    }
  ) => {
    const res = await api.post(`/cbt/engine/jadwal/${jadwalId}/submit`, payload);
    return res.data?.data as {
      success: boolean;
      message: string;
      status: string;
      total_soal: number;
      jumlah_terjawab: number;
      nilai_akhir?: number;
      jumlah_benar?: number;
      jumlah_salah?: number;
    };
  },
};
