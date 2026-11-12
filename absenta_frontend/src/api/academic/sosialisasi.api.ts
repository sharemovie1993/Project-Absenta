import api from '../../lib/axiosInstance';

export interface RapatSosialisasiSession {
  id: string;
  tenant_id: string;
  nama_acara: string;
  tanggal: string; // YYYY-MM-DD
  waktu_mulai: string; // HH:mm
  waktu_selesai: string; // HH:mm
  tempat: string;
  pimpinan_rapat: string;
  notulis: string;
  agenda: string[];
  notulen_hasil: string;
  status: 'AKTIF' | 'SELESAI';
  qr_token: string;
  created_at: string;
  updated_at: string;
}

export interface RapatAttendeeItem {
  guru_id: string;
  nama_guru: string;
  nip: string;
  mapel_jabatan: string;
  no_hp?: string;
  is_hadir: boolean;
  waktu_hadir?: string; // ISO
  metode_scan?: 'QR_MANDIRI' | 'SCANNER_PANITIA' | 'MANUAL';
  catatan?: string;
}

export interface SosialisasiSessionResponse {
  session: RapatSosialisasiSession;
  stats: {
    totalGuru: number;
    hadirCount: number;
    belumHadirCount: number;
    persentaseHadir: number;
  };
  attendees: RapatAttendeeItem[];
}

export const sosialisasiQueryKeys = {
  all: ['rapat-sosialisasi'] as const,
  active: () => [...sosialisasiQueryKeys.all, 'active'] as const,
};

export const sosialisasiApi = {
  /**
   * Mengambil sesi aktif rapat sosialisasi & seluruh daftar kehadiran guru
   */
  async getActiveSession(): Promise<SosialisasiSessionResponse> {
    const res = await api.get('/academic/sosialisasi/session');
    return res.data?.data;
  },

  /**
   * Menyimpan / memperbarui informasi sesi rapat & notulen
   */
  async updateSession(payload: Partial<RapatSosialisasiSession>): Promise<RapatSosialisasiSession> {
    const res = await api.post('/academic/sosialisasi/session', payload);
    return res.data?.data;
  },

  /**
   * Panitia menandai kehadiran seorang guru (manual atau scan kamera)
   */
  async recordAttendance(payload: {
    sessionId: string;
    guruId: string;
    isHadir: boolean;
    metodeScan?: 'QR_MANDIRI' | 'SCANNER_PANITIA' | 'MANUAL';
    catatan?: string;
  }): Promise<RapatAttendeeItem> {
    const res = await api.post('/academic/sosialisasi/attend', payload);
    return res.data?.data;
  },

  /**
   * Menginisialisasi sesi baru rapat sosialisasi
   */
  async resetSession(namaAcara?: string): Promise<RapatSosialisasiSession> {
    const res = await api.post('/academic/sosialisasi/reset', { namaAcara });
    return res.data?.data;
  },

  /**
   * (Publik) Verifikasi sesi rapat via token QR
   */
  async verifyPublicSession(params: { tenantId?: string; qrToken?: string }): Promise<{
    session: Partial<RapatSosialisasiSession>;
    teachers: Array<{ id: string; nama: string; nip: string; mapel_jabatan: string; is_hadir: boolean; waktu_hadir?: string }>;
  }> {
    const res = await api.get('/public/sosialisasi/verify-session', { params });
    return res.data?.data;
  },

  /**
   * (Publik) Konfirmasi kehadiran mandiri guru via Scan QR Cetak
   */
  async submitPublicSelfAttend(payload: {
    tenantId?: string;
    qrToken: string;
    guruIdOrNip: string;
  }): Promise<{
    success: boolean;
    message: string;
    guru: { id: string; nama: string; nip: string; jabatan: string; waktuHadir: string };
  }> {
    const res = await api.post('/public/sosialisasi/self-attend', payload);
    return res.data;
  },
};
