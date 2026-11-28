import { requestWithFallback } from '../apiUtils';

// ─── Unified Types ────────────────────────────────────────────────────────────

export interface UnifiedActivitySession {
  id: string;
  tanggal: string;
  jenis_kegiatan: string;
  jadwal_kegiatan_id: string | null;
  kelas_id?: string;
  kelas_nama?: string;
  waktu_mulai: string;
  waktu_selesai?: string | null;
  status: string;
  hadir_siswa: number;
  total_siswa: number;
  hadir_guru: number;
  total_guru: number;
}

export interface UnifiedPendampingItem {
  guru_id: string;
  nama_guru: string;
  jabatan: string;
  jabatan_kode: string;
  kelas_nama?: string;
  mapel_nama?: string;
  jam_kbm?: string;
  status: 'HADIR' | 'IZIN' | 'SAKIT' | 'ALPA' | 'BELUM_TAP';
  waktu_tap?: string | null;
  catatan?: string | null;
  sesi_id?: string | null;
  is_overlapping_kbm?: boolean;
  kbm_sesi_id?: string | null;
  kbm_status?: 'MENDATANG' | 'BERLANGSUNG' | 'SELESAI' | string | null;
}

export interface UnifiedGuardStatus {
  is_active: boolean;
  jadwal_kegiatan_id: string | null;
  jadwal_nama: string | null;
  jadwal_waktu_mulai: string | null;
  jadwal_waktu_selesai: string | null;
  hari_aktif: string[];
  jadwal_hari_spesifik?: string[];
  siklus_aktif?: string;
  siklus_pilar_label?: string;
  today_hari?: string;
  is_today_scheduled_day?: boolean;
  is_within_time_window?: boolean;
  current_time?: string;
}

export interface UnifiedTapPayload {
  guru_id: string;
  sesi_id: string;
  status: 'HADIR' | 'IZIN' | 'SAKIT' | 'DINAS_LUAR' | 'ALPA';
  catatan?: string;
}

export interface UnifiedTapResponse {
  success: boolean;
  message: string;
  synced_kbm?: boolean;
  kbm_sesi_id?: string;
}

export interface UnifiedRfidTapPayload {
  rfid_token: string;
  sesi_id?: string;
  jenis_kegiatan?: string;
  jadwal_kegiatan_id?: string;
}

export interface UnifiedRfidTapResponse extends UnifiedTapResponse {
  action?: string;
  entity_type?: 'GURU' | 'SISWA';
  status?: string;
  is_terlambat?: boolean;
  guru?: {
    id: string;
    nama_guru: string;
    nip?: string | null;
    foto?: string | null;
    jenis_ptk?: string | null;
  };
  siswa?: {
    id: string;
    nama_siswa: string;
    nis?: string | null;
    nisn?: string | null;
    foto?: string | null;
    nama_kelas?: string | null;
  };
}

export interface UnifiedTrendItem {
  tanggal: string;
  sesi_ke: number;
  total_siswa: number;
  hadir_siswa: number;
  persen_hadir_siswa: number;
  hadir_guru: number;
  total_pendamping: number;
  persen_hadir_guru: number;
  delta_siswa?: number;
  delta_guru?: number;
}

export interface UnifiedPeriodSummary {
  total_sesi: number;
  total_pertemuan_taruna?: number;
  total_sesi_kelas?: number;
  target_kelas_count?: number;
  avg_persen_siswa: number;
  avg_persen_guru: number;
  total_hadir_siswa: number;
  total_target_siswa: number;
  arah_perkembangan: 'NAIK' | 'STABIL' | 'TURUN';
  evaluasi: string;
  tanggal_mulai: string | null;
  tanggal_selesai: string | null;
}

export interface UnifiedTarunaRankingItem {
  rank: number;
  is_tied?: boolean;
  tied_count?: number;
  siswa_id: string;
  nama_siswa: string;
  nis: string;
  foto?: string | null;
  kelas_id: string;
  nama_kelas: string;
  jurusan_id: string;
  nama_jurusan: string;
  total_sesi: number;
  hadir: number;
  hadir_tepat_waktu?: number;
  terlambat?: number;
  total_menit_terlambat?: number;
  dispensasi: number;
  sakit: number;
  izin: number;
  alpa: number;
  persen_hadir: number;
  persen_apel_pendukung: number;
  skor_disiplin: number;
  predikat: string;
  sumber_data?: 'BACKFILL' | 'REALTIME' | 'HYBRID';
}

export interface UnifiedStatsResponse {
  success: boolean;
  data: {
    trend: UnifiedTrendItem[];
    latest: {
      total_siswa: number;
      hadir_siswa: number;
      persen_hadir_siswa: number;
      total_pendamping: number;
      hadir_pendamping: number;
      persen_hadir_pendamping: number;
    };
    ringkasan_periode?: UnifiedPeriodSummary;
    total_siswa_master?: number;
    by_tingkat: Array<{
      tingkat: string | number;
      total: number;
      hadir: number;
      persen: number;
    }>;
    by_kelas: Array<{
      kelas_id: string;
      kelas_nama: string;
      total: number;
      hadir: number;
      persen: number;
    }>;
    status_breakdown?: {
      HADIR: number;
      SAKIT: number;
      IZIN: number;
      ALPA: number;
      DISPENSASI: number;
      total: number;
    };
    agenda_breakdown?: Array<{
      kode: 'UPACARA' | 'KETARUNAAN' | 'DUHA' | 'APEL_SORE';
      nama: string;
      hari_label: string;
      deskripsi: string;
      total_pertemuan: number;
      total_sesi_kelas: number;
      hadir: number;
      total_target: number;
      persen_hadir: number;
    }>;
    by_jurusan?: Array<{
      jurusan_id: string;
      nama_jurusan: string;
      logo_url?: string | null;
      total: number;
      hadir: number;
      persen: number;
    }>;
    pola_hari?: Array<{
      day_index: number;
      hari: string;
      total_pertemuan: number;
      avg_persen: number;
      total_hadir: number;
      total_target: number;
    }>;
    at_risk_students?: Array<{
      siswa_id: string;
      nama_siswa: string;
      nis: string;
      foto?: string | null;
      nama_kelas: string;
      total_alpa: number;
    }>;
    at_risk_total?: number;
    barometer_sertifikasi?: {
      indeks_disiplin: number;
      total_taruna: number;
      siap_sertifikasi: number;
      butuh_pembinaan: number;
      persen_kelayakan: number;
    };
    available_months?: string[];
    taruna_ranking?: {
      ranking_metadata?: {
        total_sesi_dievaluasi: number;
        sesi_realtime_count: number;
        sesi_backfill_count: number;
        persen_data_backfill: number;
        is_backfill_dominant: boolean;
        total_kandidat_sempurna: number;
        is_tie_at_top: boolean;
        top_tied_score: number;
      };
      top_global: UnifiedTarunaRankingItem[];
      all_tied_global?: UnifiedTarunaRankingItem[];
      best_per_jurusan: UnifiedTarunaRankingItem[];
      top_by_jurusan: Record<string, UnifiedTarunaRankingItem[]>;
      best_per_kelas: UnifiedTarunaRankingItem[];
      top_by_kelas: Record<string, UnifiedTarunaRankingItem[]>;
    };
  };
}

export interface UnifiedLaporanTimRow {
  no: number;
  jabatan: string;
  jabatan_kode?: string;
  nama_guru: string;
  kelas_nama?: string | null;
  mapel_nama?: string | null;
  jam_kbm?: string | null;
  status: string;
  waktu_tap?: string | null;
  keterangan: string;
}

export interface UnifiedLaporanKelasRow {
  no: number;
  kelas_id: string;
  kelas_nama: string;
  kaprog?: { nama_guru: string; status: string };
  wali_kelas?: { nama_guru: string; status: string };
  guru_mapel_beririsan?: Array<{ nama_guru: string; mapel: string; status: string }>;
  siswa: Array<{
    no: number;
    nama_siswa: string;
    nis: string;
    status: string;
    waktu_tap?: string | null;
    catatan?: string | null;
  }>;
  rekap: {
    hadir: number;
    sakit: number;
    izin: number;
    alpa: number;
    total: number;
  };
}

// ─── Unified API Client Functions ─────────────────────────────────────────────

export async function getUnifiedGuardStatus(params?: {
  jenis_kegiatan?: string;
}): Promise<UnifiedGuardStatus> {
  const jenisTarget = (params?.jenis_kegiatan || 'KETARUNAAN').toUpperCase();

  // 1. Coba endpoint utama Unified Kegiatan
  try {
    const res = await requestWithFallback<any>(
      'get',
      '/attendance/unified-kegiatan/guard-status',
      {
        params,
        headers: { 'X-Skip-403-Redirect': 'true' },
        unwrapData: true,
      }
    );
    const unwrapped = (res?.data && typeof res.data === 'object' && 'is_active' in res.data)
      ? res.data
      : (res && typeof res === 'object' && 'is_active' in res ? res : null);

    if (unwrapped) {
      return unwrapped as UnifiedGuardStatus;
    }
  } catch {
    // Abaikan dan gunakan fallback
  }

  // 2. Coba endpoint adapter lama Program Ketarunaan
  try {
    const res = await requestWithFallback<any>(
      'get',
      '/kesiswaan/program-ketarunaan/guard-status',
      {
        params,
        headers: { 'X-Skip-403-Redirect': 'true' },
        unwrapData: true,
      }
    );
    const unwrapped = (res?.data && typeof res.data === 'object' && 'is_active' in res.data)
      ? res.data
      : (res && typeof res === 'object' && 'is_active' in res ? res : null);

    if (unwrapped) {
      return unwrapped as UnifiedGuardStatus;
    }
  } catch {
    // Abaikan dan gunakan fallback jadwal
  }

  // 3. Fallback tangguh: Ambil langsung dari daftar Jadwal Kegiatan aktif sekolah
  try {
    const allRes = await requestWithFallback<any>(
      'get',
      '/kesiswaan/jadwal-kegiatan',
      { params: { aktif: true }, headers: { 'X-Skip-403-Redirect': 'true' }, unwrapData: true }
    );
    const list = allRes?.data || (Array.isArray(allRes) ? allRes : []);
    const jadwal = list.find((j: any) =>
      j.nama?.toUpperCase().includes(jenisTarget) ||
      j.jenis_kegiatan?.toUpperCase().includes(jenisTarget) ||
      j.tipe?.toUpperCase() === jenisTarget
    );
    if (jadwal) {
      return {
        is_active: Boolean(jadwal.aktif),
        jadwal_kegiatan_id: jadwal.id,
        jadwal_nama: jadwal.nama,
        jadwal_waktu_mulai: jadwal.waktu_mulai,
        jadwal_waktu_selesai: jadwal.waktu_selesai,
        hari_aktif: Array.isArray(jadwal.hari)
          ? jadwal.hari
          : (typeof jadwal.hari === 'string' ? jadwal.hari.split(',').map((h: string) => h.trim()) : []),
      };
    }
  } catch {
    // Semua fallback gagal
  }

  return {
    is_active: false,
    jadwal_kegiatan_id: null,
    jadwal_nama: null,
    jadwal_waktu_mulai: null,
    jadwal_waktu_selesai: null,
    hari_aktif: [],
  };
}

export async function getUnifiedSesiHariIni(params?: {
  tanggal?: string;
  jadwal_kegiatan_id?: string;
  jenis_kegiatan?: string;
}): Promise<{ success: boolean; data: UnifiedActivitySession | null }> {
  return requestWithFallback<{ success: boolean; data: UnifiedActivitySession | null }>(
    'get',
    '/attendance/unified-kegiatan/sesi-hari-ini',
    { params, headers: { 'X-Skip-403-Redirect': 'true' } }
  ).catch(() => ({ success: false, data: null }));
}

export interface UnifiedTerminalFeedItem {
  id: string;
  nama: string;
  idNumber?: string;
  subLabel?: string;
  entityType: 'GURU' | 'SISWA';
  status: string;
  jam: string;
  foto?: string;
  syncedKbm?: boolean;
  metode: 'RFID' | 'QR' | 'MANUAL';
}

export interface UnifiedTerminalFeedResponse {
  feed: UnifiedTerminalFeedItem[];
  summary: {
    siswa_hadir: number;
    siswa_terlambat: number;
    guru_hadir: number;
    total_hadir: number;
  };
}

export async function getUnifiedTerminalFeed(params?: {
  tanggal?: string;
  jadwal_kegiatan_id?: string;
  jenis_kegiatan?: string;
}): Promise<{ success: boolean; data: UnifiedTerminalFeedResponse }> {
  return requestWithFallback<{ success: boolean; data: UnifiedTerminalFeedResponse }>(
    'get',
    '/attendance/unified-kegiatan/terminal-feed',
    { params, headers: { 'X-Skip-403-Redirect': 'true' } }
  ).catch(() => ({
    success: false,
    data: { feed: [], summary: { siswa_hadir: 0, siswa_terlambat: 0, guru_hadir: 0, total_hadir: 0 } },
  }));
}

export async function getUnifiedPendamping(params: {
  tanggal?: string;
  sesi_id?: string;
  jadwal_kegiatan_id?: string;
  jenis_kegiatan?: string;
}): Promise<{ success: boolean; data: UnifiedPendampingItem[]; sesi_id: string | null; wajib_tap_terminal_guru?: boolean }> {
  return requestWithFallback<{ success: boolean; data: UnifiedPendampingItem[]; sesi_id: string | null; wajib_tap_terminal_guru?: boolean }>(
    'get',
    '/attendance/unified-kegiatan/pendamping',
    { params, headers: { 'X-Skip-403-Redirect': 'true' } }
  ).catch(() => ({ success: false, data: [], sesi_id: null }));
}

export async function tapUnifiedPendamping(payload: UnifiedTapPayload): Promise<UnifiedTapResponse> {
  return requestWithFallback<UnifiedTapResponse>(
    'post',
    '/attendance/unified-kegiatan/tap',
    { data: payload }
  );
}

export async function tapUnifiedPendampingRfid(payload: UnifiedRfidTapPayload): Promise<UnifiedRfidTapResponse> {
  return requestWithFallback<UnifiedRfidTapResponse>(
    'post',
    '/attendance/unified-kegiatan/tap-rfid',
    { data: payload }
  );
}

export interface SelfieGuruKegiatanPayload {
  sesi_id?: string;
  jadwal_kegiatan_id?: string;
  jenis_kegiatan?: string;
  foto_bukti: string;
  catatan?: string;
}

export interface SelfieGuruKegiatanResponse {
  success: boolean;
  message: string;
  sesi_id?: string;
  guru_id?: string;
  foto_bukti?: string;
  waktu_tap?: string;
  already_present?: boolean;
}

export async function selfieGuruKegiatan(payload: SelfieGuruKegiatanPayload): Promise<SelfieGuruKegiatanResponse> {
  return requestWithFallback<SelfieGuruKegiatanResponse>(
    'post',
    '/attendance/unified-kegiatan/selfie-guru',
    { data: payload }
  );
}

export async function getUnifiedStats(params?: {
  tahun_pelajaran_id?: string;
  semester_id?: string;
  jadwal_kegiatan_id?: string;
  jenis_kegiatan?: string;
  tanggal_mulai?: string;
  tanggal_selesai?: string;
  scope_periode?: '1_tahun' | '1_semester' | '1_bulan' | 'kustom';
  bulan_ym?: string;
  mode_agenda?: 'SEMUA_SIKLUS' | 'APEL_PAGI' | 'UPACARA' | 'KETARUNAAN' | 'LATIHAN_KETARUNAAN' | 'DUHA' | 'APEL_SORE';
  limit?: number;
}): Promise<UnifiedStatsResponse> {
  return requestWithFallback<UnifiedStatsResponse>(
    'get',
    '/attendance/unified-kegiatan/stats',
    { params, headers: { 'X-Skip-403-Redirect': 'true' } }
  ).catch(() => ({
    success: false,
    data: {
      trend: [],
      latest: { total_siswa: 0, hadir_siswa: 0, persen_hadir_siswa: 0, total_pendamping: 0, hadir_pendamping: 0, persen_hadir_pendamping: 0 },
      by_tingkat: [],
      by_kelas: [],
    }
  }));
}

export async function getUnifiedLaporanTim(params: {
  tanggal?: string;
  sesi_id?: string;
  jadwal_kegiatan_id?: string;
  jenis_kegiatan?: string;
  tahun_pelajaran_id?: string;
  semester_id?: string;
}): Promise<{ success: boolean; data: UnifiedLaporanTimRow[]; tanggal: string; jenis_kegiatan: string }> {
  return requestWithFallback<{ success: boolean; data: UnifiedLaporanTimRow[]; tanggal: string; jenis_kegiatan: string }>(
    'get',
    '/attendance/unified-kegiatan/laporan-tim',
    { params, headers: { 'X-Skip-403-Redirect': 'true' } }
  ).catch(() => ({ success: false, data: [], tanggal: '', jenis_kegiatan: 'Kegiatan Terpadu' }));
}

export async function getUnifiedLaporanKelas(params: {
  tanggal?: string;
  kelas_id?: string;
  jadwal_kegiatan_id?: string;
  jenis_kegiatan?: string;
  tahun_pelajaran_id?: string;
  semester_id?: string;
}): Promise<{ success: boolean; data: UnifiedLaporanKelasRow[] }> {
  return requestWithFallback<{ success: boolean; data: UnifiedLaporanKelasRow[] }>(
    'get',
    '/attendance/unified-kegiatan/laporan-kelas',
    { params, headers: { 'X-Skip-403-Redirect': 'true' } }
  ).catch(() => ({ success: false, data: [] }));
}
