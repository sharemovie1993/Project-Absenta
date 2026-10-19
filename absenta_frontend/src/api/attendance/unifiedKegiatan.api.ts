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
    by_tingkat: Array<{
      tingkat: number;
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
  };
}

export interface UnifiedLaporanTimRow {
  no: number;
  jabatan: string;
  nama_guru: string;
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
  return requestWithFallback<UnifiedGuardStatus>(
    'get',
    '/attendance/unified-kegiatan/guard-status',
    {
      params,
      headers: { 'X-Skip-403-Redirect': 'true' }
    }
  ).catch(() => ({
    is_active: false,
    jadwal_kegiatan_id: null,
    jadwal_nama: null,
    jadwal_waktu_mulai: null,
    jadwal_waktu_selesai: null,
    hari_aktif: [],
  }));
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

export async function getUnifiedPendamping(params: {
  tanggal?: string;
  sesi_id?: string;
  jadwal_kegiatan_id?: string;
  jenis_kegiatan?: string;
}): Promise<{ success: boolean; data: UnifiedPendampingItem[]; sesi_id: string | null }> {
  return requestWithFallback<{ success: boolean; data: UnifiedPendampingItem[]; sesi_id: string | null }>(
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

export async function getUnifiedStats(params?: {
  tahun_pelajaran_id?: string;
  semester_id?: string;
  jadwal_kegiatan_id?: string;
  jenis_kegiatan?: string;
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
}): Promise<{ success: boolean; data: UnifiedLaporanKelasRow[] }> {
  return requestWithFallback<{ success: boolean; data: UnifiedLaporanKelasRow[] }>(
    'get',
    '/attendance/unified-kegiatan/laporan-kelas',
    { params, headers: { 'X-Skip-403-Redirect': 'true' } }
  ).catch(() => ({ success: false, data: [] }));
}
