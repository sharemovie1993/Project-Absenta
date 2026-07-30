import api from '../lib/axiosInstance';

export type Hari = 'SENIN' | 'SELASA' | 'RABU' | 'KAMIS' | 'JUMAT' | 'SABTU' | 'MINGGU';

export interface JadwalPiketGuru {
  id: string;
  tenant_id: string;
  tahun_pelajaran_id: string;
  semester_id: string;
  guru_id: string;
  hari: Hari;
  pos_piket?: string | null;
  slot_mulai?: number | null;
  slot_selesai?: number | null;
  jam_mulai?: string | null;
  jam_selesai?: string | null;
  catatan?: string | null;
  created_at: string;
  updated_at: string;
  Guru?: {
    id: string;
    nama_guru: string;
    nip?: string | null;
    foto?: string | null;
    no_hp?: string | null;
    jenis_ptk?: string | null;
  };
  TahunPelajaran?: {
    tahun: string;
    is_active: boolean;
  };
  Semester?: {
    nama_semester: string;
    is_active: boolean;
  };
}

export interface GuruPiketHariIniResponse {
  hari: Hari;
  tanggal: string;
  total_guru_piket: number;
  guru_piket: JadwalPiketGuru[];
}

export const piketGuruApi = {
  getList: async (params?: {
    tahun_pelajaran_id?: string;
    semester_id?: string;
    hari?: Hari;
    guru_id?: string;
  }): Promise<{ success: boolean; data: JadwalPiketGuru[] }> => {
    const response = await api.get('/kurikulum/jadwal-piket', { params });
    return response.data;
  },

  getHariIni: async (): Promise<{ success: boolean; data: GuruPiketHariIniResponse }> => {
    const response = await api.get('/kurikulum/jadwal-piket/hari-ini');
    return response.data;
  },

  getTeachingLoad: async (params?: {
    tahun_pelajaran_id?: string;
    semester_id?: string;
    hari?: Hari;
  }): Promise<{
    success: boolean;
    data: Record<string, { total_jp: number; busy_slots?: number[]; detail: Array<{ kelas: string; mapel: string; slot_index?: number; jam: string }> }>;
  }> => {
    const response = await api.get('/kurikulum/jadwal-piket/teaching-load', { params });
    return response.data;
  },

  create: async (data: {
    tahun_pelajaran_id: string;
    semester_id: string;
    guru_id: string;
    hari: Hari;
    pos_piket?: string;
    slot_mulai?: number;
    slot_selesai?: number;
    jam_mulai?: string;
    jam_selesai?: string;
    catatan?: string;
  }): Promise<{ success: boolean; message: string; data: JadwalPiketGuru }> => {
    const response = await api.post('/kurikulum/jadwal-piket', data);
    return response.data;
  },

  bulkCreate: async (data: {
    tahun_pelajaran_id: string;
    semester_id: string;
    hari: Hari;
    guru_ids: string[];
    pos_piket?: string;
    slot_mulai?: number;
    slot_selesai?: number;
    jam_mulai?: string;
    jam_selesai?: string;
  }): Promise<{ success: boolean; message: string; data: JadwalPiketGuru[] }> => {
    const response = await api.post('/kurikulum/jadwal-piket/bulk', data);
    return response.data;
  },

  update: async (
    id: string,
    data: {
      hari?: Hari;
      pos_piket?: string;
      slot_mulai?: number;
      slot_selesai?: number;
      jam_mulai?: string;
      jam_selesai?: string;
      catatan?: string;
    }
  ): Promise<{ success: boolean; message: string; data: JadwalPiketGuru }> => {
    const response = await api.put(`/kurikulum/jadwal-piket/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/kurikulum/jadwal-piket/${id}`);
    return response.data;
  },

  getNotifConfig: async (): Promise<{
    success: boolean;
    data: {
      config: {
        enabled: boolean;
        targetGroupId: string;
        targetGroupName: string;
        nightEnabled: boolean;
        nightTime: string;
        morningEnabled: boolean;
        morningTime: string;
      };
      groups: Array<{
        id: string;
        subject: string;
        participantsCount: number;
        announce: boolean;
      }>;
    };
  }> => {
    const response = await api.get('/kurikulum/jadwal-piket/notif-config');
    return response.data;
  },

  saveNotifConfig: async (data: {
    enabled?: boolean;
    targetGroupId?: string;
    targetGroupName?: string;
    nightEnabled?: boolean;
    nightTime?: string;
    morningEnabled?: boolean;
    morningTime?: string;
  }): Promise<{ success: boolean; message: string; data: any }> => {
    const response = await api.post('/kurikulum/jadwal-piket/notif-config', data);
    return response.data;
  },

  testNotif: async (data: {
    isNightReminder?: boolean;
    overrideTargetGroupId?: string;
  }): Promise<{ success: boolean; message: string }> => {
    const response = await api.post('/kurikulum/jadwal-piket/test-notif', data);
    return response.data;
  }
};

