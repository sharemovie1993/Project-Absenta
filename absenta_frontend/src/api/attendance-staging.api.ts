import api from '../lib/axiosInstance';

export interface AttendanceStagingItem {
  id: string;
  tenant_id: string;
  source_url: string;
  file_title?: string;
  tahun_pelajaran_id?: string;
  tahun_pelajaran_nama?: string;
  semester_id?: string;
  kelas_id?: string;
  nama_kelas: string;
  sheet_name: string;
  rentang_tanggal?: string;
  total_siswa: number;
  total_matched_siswa: number;
  raw_sheet_data: {
    sheetName: string;
    namaKelas: string;
    programKeahlian?: string;
    tahunPelajaran?: string;
    rentangTanggal?: string;
    sessionCount: number;
    sessions: Array<{
      colIndex: number;
      dateStr: string;
      dateIso: string;
      day: string;
      sessionCode: string;
      defaultType: 'UPACARA' | 'KETARUNAAN' | 'DUHA' | 'APEL_SORE';
    }>;
    studentCount: number;
    students: Array<{
      no: number;
      nis: string;
      nisn: string;
      nama: string;
      attendance: Record<string, 'HADIR' | 'SAKIT' | 'IZIN' | 'ALPA' | 'DISPENSASI'>;
    }>;
  };
  status: 'READY' | 'SYNCED' | 'ERROR';
  sync_summary?: {
    totalSesi: number;
    upacaraSessions: number;
    ketarunaanSessions: number;
    duhaSessions: number;
    apelSoreSessions: number;
    totalAttendanceRows: number;
  };
  last_synced_at?: string;
  created_at: string;
  updated_at: string;
}

export const attendanceStagingApi = {
  fetchSheet: async (url: string): Promise<{ success: boolean; message: string; data: { totalSheets: number; sheets: AttendanceStagingItem[] } }> => {
    const response = await api.post('/attendance/staging/fetch', { url }, { timeout: 120000 });
    return response.data;
  },

  listSheets: async (params?: { status?: string; search?: string }): Promise<{ success: boolean; data: AttendanceStagingItem[] }> => {
    const response = await api.get('/attendance/staging', { params });
    return response.data;
  },

  getSheetDetail: async (id: string): Promise<{ success: boolean; data: AttendanceStagingItem }> => {
    const response = await api.get(`/attendance/staging/${id}`);
    return response.data;
  },

  syncSheet: async (id: string): Promise<{ success: boolean; message: string; data: any }> => {
    const response = await api.post(`/attendance/staging/${id}/sync`, {}, { timeout: 120000 });
    return response.data;
  },

  bulkSync: async (ids: string[]): Promise<{ success: boolean; message: string; data: any }> => {
    const response = await api.post('/attendance/staging/bulk-sync', { ids }, { timeout: 300000 });
    return response.data;
  },

  deleteSheet: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/attendance/staging/${id}`);
    return response.data;
  },

  getClassOptions: async (): Promise<{ success: boolean; data: Array<{ id: string; nama_kelas: string; tingkat: number; jurusan_nama?: string }> }> => {
    const response = await api.get('/attendance/staging/class-options');
    return response.data;
  },

  remapClass: async (id: string, kelas_id: string): Promise<{ success: boolean; message: string; data: any }> => {
    const response = await api.put(`/attendance/staging/${id}/remap-class`, { kelas_id });
    return response.data;
  },

  bulkRemapClasses: async (mappings: Array<{ id: string; kelasId: string }>): Promise<{ success: boolean; message: string; data: any }> => {
    const response = await api.post('/attendance/staging/bulk-remap-classes', { mappings });
    return response.data;
  },

  bulkDelete: async (ids: string[]): Promise<{ success: boolean; message: string }> => {
    const response = await api.post('/attendance/staging/bulk-delete', { ids });
    return response.data;
  },

  getStudentsMapping: async (id: string): Promise<{
    success: boolean;
    data: {
      sheetId: string;
      sheetName: string;
      namaKelas: string;
      totalSiswa: number;
      totalMatchedSiswa: number;
      sheetStudents: Array<{
        no: number;
        nama: string;
        nis: string;
        nisn: string;
        isMatched: boolean;
        matchedStudent: {
          siswaId: string;
          nama: string;
          nis: string;
        } | null;
      }>;
      classStudents: Array<{
        siswaId: string;
        siswaAkademikId: string;
        nis: string;
        nisn: string;
        nama: string;
      }>;
    };
  }> => {
    const response = await api.get(`/attendance/staging/${id}/students-mapping`);
    return response.data;
  },

  mapStudents: async (
    id: string,
    mappings: Array<{ sheetNo: number; siswaId: string }>
  ): Promise<{ success: boolean; message: string; data: any }> => {
    const response = await api.put(`/attendance/staging/${id}/students-mapping`, { mappings });
    return response.data;
  },
};
