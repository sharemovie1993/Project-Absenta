export interface NotificationLog {
  id: string;
  type: 'EMAIL' | 'WHATSAPP' | 'ATTENDANCE';
  recipient: string;
  subject?: string | null;
  message: string;
  status: 'SENT' | 'FAILED';
  created_at: string;
  tenant_id?: string;
  related_id?: string | null;
  error_message?: string | null;
}

export interface NotificationStatsResponse {
  success: boolean;
  message: string;
  data: {
    stats: {
      EMAIL?: { SENT?: number; FAILED?: number };
      WHATSAPP?: { SENT?: number; FAILED?: number };
    };
    recentNotifications: Array<{
      id: string;
      type: 'EMAIL' | 'WHATSAPP' | 'ATTENDANCE';
      recipient: string;
      subject?: string | null;
      message?: string | null;
      status: 'SENT' | 'FAILED';
      created_at: string;
      related_id?: string | null;
    }>;
    period: { start: string; end: string };
  };
}

export interface NotificationServiceStatusResponse {
  success: boolean;
  message: string;
  data: {
    email: { status: 'connected' | 'disconnected'; configured: boolean };
    whatsapp: { status: 'connected' | 'disconnected'; configured: boolean };
  };
}

export interface AttendanceFeedItem {
  id?: string | number;
  title?: string;
  message?: string;
  recipient?: string;
  created_at?: string;
  timestamp?: string;
  counts?: {
    HADIR?: number | string;
    TERLAMBAT?: number | string;
    IZIN?: number | string;
    SAKIT?: number | string;
    ALPA?: number | string;
  };
  status?: string;
  siswa_id?: string;
  kelas_id?: string;
  guru_id?: string;
}
