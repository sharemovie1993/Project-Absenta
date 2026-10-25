export interface MultiChannelDay {
  gerbang?: {
    status: string;
    waktu_masuk?: string | null;
    waktu_pulang?: string | null;
    is_terlambat?: boolean;
    is_tap_gantung?: boolean;
  };
  pembiasaan?: {
    status: string;
    nama?: string | null;
  };
  kbm?: {
    status: string;
    total_sesi: number;
    hadir_sesi: number;
    alpa_sesi: number;
    daftar_mapel?: Array<{ mapel: string; status: string; jam?: string }>;
  };
  pkl?: {
    status: string;
    mitra?: string | null;
    waktu_masuk?: string | null;
    waktu_pulang?: string | null;
  };
}

export interface AnomaliDay {
  is_anomali: boolean;
  tipe?: string;
  pesan?: string;
}

export interface CalendarDayDetail {
  id?: string;
  tanggal?: string;
  waktu?: string;
  status?: string;
  keterangan?: string;
  channels?: MultiChannelDay;
  anomali?: AnomaliDay;
}

export interface ChannelSummary {
  gerbang: { total_hadir: number; total_terlambat: number; total_tidak_tap: number; total_tap_gantung: number };
  pembiasaan: { total_hadir: number; total_alpa: number };
  kbm: { total_sesi: number; hadir_sesi: number; alpa_sesi: number; persentase: number };
  pkl: { is_active: boolean; total_hadir: number; total_alpa: number; mitra_nama?: string };
  anomali_count: number;
}

export interface CalendarStatistik {
  HADIR?: number;
  IZIN?: number;
  SAKIT?: number;
  ALPA?: number;
  TERLAMBAT?: number;
  DISPEN?: number;
  channel_summary?: ChannelSummary;
}
