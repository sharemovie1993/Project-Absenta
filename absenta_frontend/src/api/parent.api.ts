import parentAxiosInstance from '../lib/parentAxiosInstance';
import { requestWithFallback } from './apiUtils';

// --- Types ---

export interface ParentProfile {
  id: string;
  nama: string;
  no_hp: string;
}

export interface TodayStatus {
  status: string;
  label: string;
  waktu_masuk: string | null;
  waktu_pulang: string | null;
  color_hint: string;
  is_terlambat?: boolean;
}

export interface AttendanceSummary {
  hadir: number;
  sakit: number;
  izin: number;
  alpa: number;
  terlambat: number;
  dispen: number;
  total_poin: number;
}

export interface StudentDashboardData {
  siswa_id: string;
  nama_siswa: string;
  kelas: string;
  absensi_mode?: string;
  timezone?: string;
  status_kehadiran_hari_ini: TodayStatus;
  ringkasan_kehadiran: AttendanceSummary;
}

export interface DashboardResponse {
  orang_tua: ParentProfile;
  siswa: StudentDashboardData[];
}

export interface AttendanceRecord {
  id: string;
  tanggal: string;
  jenis: string;
  status: string;
  is_terlambat?: boolean;
  waktu_tap: string;
}

export interface AttendanceHistoryResponse {
  data: AttendanceRecord[];
  meta: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface NotificationRecord {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  data?: any;
}

export interface NotificationListResponse {
  data: NotificationRecord[];
  meta: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface MonthlyRecapResponse {
  nama_siswa: string;
  bulan: string;
  statistik: {
    HADIR: number;
    IZIN: number;
    SAKIT: number;
    ALPA: number;
    TERLAMBAT: number;
    DISPEN: number;
  };
  total_poin: number;
  detail: Array<{
    tanggal: string;
    status: string;
    // ... fields lainnya
  }>;
}

export interface TrackingHarianResponse {
  nama: string;
  tanggal: string;
  kegiatan: Array<{
    waktu: string;
    timestamp?: string;
    jenis_kegiatan: string;
    status: string;
  }>;
  session_presence?: Record<string, boolean>;
}

// --- API Functions ---

// Generic API Response Wrapper
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  meta?: any;
}

// 1. Dashboard
export const getParentDashboard = async () => {
  const { data } = await parentAxiosInstance.get<ApiResponse<DashboardResponse>>('/parent-app/me');
  return data.data;
};

// 2. Attendance History
export const getStudentAttendanceHistory = async (siswaId: string, page = 1, limit = 10, month?: string) => {
  const params: any = { page, limit };
  if (month) params.month = month;
  
  const { data } = await parentAxiosInstance.get<ApiResponse<AttendanceHistoryResponse>>(`/parent-app/siswa/${siswaId}/riwayat-kehadiran`, {
    params
  });
  return data.data;
};

// 3. Notifications
export const getStudentNotifications = async (siswaId: string, page = 1, limit = 10) => {
  const { data } = await parentAxiosInstance.get<ApiResponse<NotificationListResponse>>(`/parent-app/siswa/${siswaId}/notifikasi`, {
    params: { page, limit }
  });
  return data.data; 
};

// 4. Report Absence
export const reportStudentAbsence = async (
  siswaId: string, 
  payload: { status: 'SAKIT' | 'IZIN'; keterangan: string; attachment?: File }
) => {
  if (payload.attachment) {
    const formData = new FormData();
    formData.append('status', payload.status);
    formData.append('keterangan', payload.keterangan);
    formData.append('attachment', payload.attachment);

    const { data } = await parentAxiosInstance.post<ApiResponse<any>>(`/parent-app/siswa/${siswaId}/lapor-absen`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  }

  const { data } = await parentAxiosInstance.post<ApiResponse<any>>(`/parent-app/siswa/${siswaId}/lapor-absen`, {
    status: payload.status,
    keterangan: payload.keterangan,
  });
  return data;
};

// 5. Rekap & Tracking
export const getStudentMonthlyRecap = async (siswaId: string, bulan: string) => {
  const { data } = await parentAxiosInstance.get<ApiResponse<MonthlyRecapResponse>>(`/parent-app/siswa/${siswaId}/rekap-bulanan`, {
    params: { bulan }
  });
  return data.data;
};

export const getStudentDailyTracking = async (siswaId: string, tanggal: string) => {
  const { data } = await parentAxiosInstance.get<ApiResponse<TrackingHarianResponse>>(`/parent-app/siswa/${siswaId}/tracking-harian`, {
    params: { tanggal }
  });
  return data.data;
};

// 6. Push Notification
export const getVapidPublicKey = async () => {
  const { data } = await parentAxiosInstance.get<{ success: boolean; publicKey: string }>('/parent-app/notifications/push/vapid-public-key');
  return data.publicKey;
};

export const subscribeToPush = async (subscription: PushSubscription, orangTuaId: string) => {
  // Ensure subscription is serialized to JSON to include keys and endpoint
  const subscriptionJson = subscription.toJSON();
  
  const { data } = await parentAxiosInstance.post('/parent-app/notifications/push/subscribe', {
    subscription: subscriptionJson,
    orangTuaId
  });
  return data;
};

// 7. Native Push (FCM)
export const registerParentFcmToken = async (orangTuaId: string, fcmToken: string, platform = 'android', deviceInfo?: any) => {
  const { data } = await parentAxiosInstance.post('/parent-app/notifications/fcm/register', {
    orangTuaId,
    fcmToken,
    platform,
    deviceInfo
  });
  return data;
};

// 8. Rapor Online & P5
export const getStudentRapor = async (siswaId: string, tahunPelajaranId: string, semesterId: string) => {
  const { data } = await parentAxiosInstance.get<ApiResponse<any>>(`/parent-app/siswa/${siswaId}/rapor`, {
    params: { tahun_pelajaran_id: tahunPelajaranId, semester_id: semesterId }
  });
  return data.data;
};

export const getStudentP5 = async (siswaId: string) => {
  const { data } = await parentAxiosInstance.get<ApiResponse<any>>(`/parent-app/siswa/${siswaId}/p5`);
  return data.data;
};

// 9. Chat Wali Kelas
export const startChatSession = async (guruId: string) => {
  const { data } = await parentAxiosInstance.post<ApiResponse<any>>('/parent-app/chat/session', { guru_id: guruId });
  return data.data;
};

export const getParentChatSessions = async () => {
  const { data } = await parentAxiosInstance.get<ApiResponse<any[]>>('/parent-app/chat/sessions');
  return data.data;
};

export const getParentChatMessages = async (sessionId: string) => {
  const { data } = await parentAxiosInstance.get<ApiResponse<any[]>>(`/parent-app/chat/messages/${sessionId}`);
  return data.data;
};

export const sendParentChatMessage = async (sessionId: string, message: string) => {
  const { data } = await parentAxiosInstance.post<ApiResponse<any>>('/parent-app/chat/message', {
    session_id: sessionId,
    message
  });
  return data.data;
};
