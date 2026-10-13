import { requestWithFallback } from '../apiUtils';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface KetarunaanSession {
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

export interface KetarunaanPendamping {
  guru_id: string;
  nama_guru: string;
  jabatan: string;        // Tim Ketarunaan / Kaprog / Wali Kelas / Guru Mapel
  jabatan_kode: string;  // KETUA_PEMBINA_TARUNA / KAPROG / WALIKELAS / GURU_MAPEL
  kelas_nama?: string;
  status: 'HADIR' | 'IZIN' | 'SAKIT' | 'ALPA' | 'BELUM_TAP';
  waktu_tap?: string | null;
  catatan?: string | null;
  sesi_id?: string | null;
}

export interface KetarunaanTrendItem {
  tanggal: string;
  sesi_ke: number;
  total_siswa: number;
  hadir_siswa: number;
  persen_hadir_siswa: number;
  hadir_guru: number;
  total_pendamping: number;
  persen_hadir_guru: number;
  delta_siswa?: number;  // Selisih % dibanding pertemuan sebelumnya
  delta_guru?: number;
}

export interface KetarunaanStatsResponse {
  success: boolean;
  data: {
    trend: KetarunaanTrendItem[];
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

export interface TapKetarunaanPayload {
  guru_id: string;
  sesi_id: string;  // ID SesiAbsensi Ketarunaan hari ini
  status: 'HADIR' | 'IZIN' | 'SAKIT' | 'DINAS_LUAR' | 'ALPA';
  catatan?: string;
}

export interface KetarunaanGuardStatus {
  is_active: boolean;
  jadwal_kegiatan_id: string | null;
  jadwal_nama: string | null;
  jadwal_waktu_mulai: string | null;
  jadwal_waktu_selesai: string | null;
  hari_aktif: string[];
}

export interface KetarunaanLaporanKelasRow {
  no: number;
  kelas_id: string;
  kelas_nama: string;
  kaprog?: { nama_guru: string; status: string };
  wali_kelas?: { nama_guru: string; status: string };
  guru_mapel_beririsan: Array<{ nama_guru: string; mapel: string; status: string }>;
  siswa: Array<{
    no: number;
    nama_siswa: string;
    nis: string;
    status: string;
    waktu_tap?: string;
    catatan?: string;
  }>;
  rekap: { hadir: number; sakit: number; izin: number; alpa: number; total: number };
}

export interface KetarunaanLaporanTimRow {
  no: number;
  jabatan: string;
  nama_guru: string;
  status: 'HADIR' | 'IZIN' | 'SAKIT' | 'ALPA' | 'BELUM_TAP';
  waktu_tap?: string;
  keterangan?: string;
}

// ─── Guard Status ─────────────────────────────────────────────────────────────

/**
 * Memeriksa apakah JadwalKegiatan bernama/jenis Ketarunaan sedang aktif.
 * Digunakan oleh Guard halaman Program Ketarunaan.
 */
export async function getKetarunaanGuardStatus(): Promise<KetarunaanGuardStatus> {
  try {
    const res = await requestWithFallback<{ success: boolean; data: KetarunaanGuardStatus }>(
      'get',
      '/kesiswaan/jadwal-kegiatan/ketarunaan-guard',
      { headers: { 'X-Skip-403-Redirect': 'true' } }
    );
    if (res?.data) return res.data;
  } catch {
    // fallback: query semua jadwal kegiatan dan cari yang namanya mengandung KETARUNAAN
  }
  // Fallback: query daftar jadwal kegiatan dan filter secara client-side
  try {
    const allRes = await requestWithFallback<{ success: boolean; data: Array<any> }>(
      'get',
      '/kesiswaan/jadwal-kegiatan',
      { params: { aktif: true }, headers: { 'X-Skip-403-Redirect': 'true' } }
    );
    const list = allRes?.data || (Array.isArray(allRes) ? allRes : []);
    const jadwal = list.find((j: any) =>
      j.nama?.toUpperCase().includes('KETARUNAAN') ||
      j.jenis_kegiatan?.toUpperCase().includes('KETARUNAAN') ||
      j.tipe?.toUpperCase() === 'KETARUNAAN'
    );
    if (jadwal) {
      return {
        is_active: Boolean(jadwal.aktif),
        jadwal_kegiatan_id: jadwal.id,
        jadwal_nama: jadwal.nama,
        jadwal_waktu_mulai: jadwal.waktu_mulai,
        jadwal_waktu_selesai: jadwal.waktu_selesai,
        hari_aktif: Array.isArray(jadwal.hari) ? jadwal.hari : (jadwal.hari || '').split(',').map((h: string) => h.trim()),
      };
    }
  } catch {
    // semua endpoint gagal
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

// ─── Statistik & Tren ─────────────────────────────────────────────────────────

/**
 * Mengambil data statistik & tren kehadiran Ketarunaan dari SSOT SesiAbsensi + AbsenSiswa + AbsenGuru.
 */
export async function getKetarunaanStats(params?: {
  tahun_pelajaran_id?: string;
  semester_id?: string;
  jadwal_kegiatan_id?: string;
}): Promise<KetarunaanStatsResponse> {
  return requestWithFallback<KetarunaanStatsResponse>(
    'get',
    '/kesiswaan/program-ketarunaan/stats',
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

// ─── Daftar Pendamping & Terminal ─────────────────────────────────────────────

/**
 * Mengambil daftar pendamping (Tim Ketarunaan + Kaprog + Wali Kelas + Guru Mapel Beririsan)
 * beserta status kehadiran mereka di sesi kegiatan Ketarunaan hari ini.
 */
export async function getKetarunaanPendamping(params: {
  tanggal?: string;
  sesi_id?: string;
  jadwal_kegiatan_id?: string;
}): Promise<{ success: boolean; data: KetarunaanPendamping[]; sesi_id: string | null }> {
  return requestWithFallback<{ success: boolean; data: KetarunaanPendamping[]; sesi_id: string | null }>(
    'get',
    '/kesiswaan/program-ketarunaan/pendamping',
    { params, headers: { 'X-Skip-403-Redirect': 'true' } }
  ).catch(() => ({ success: false, data: [], sesi_id: null }));
}

/**
 * Tap/ceklis kehadiran pendamping di Terminal Khusus Ketarunaan.
 * Menghasilkan 2 record murni: AbsenGuru pada SesiAbsensi Ketarunaan + 
 * sinkronisasi ke SesiAbsensi KBM Reguler yang beririsan (jika ada).
 */
export async function tapKetarunaanPendamping(payload: TapKetarunaanPayload): Promise<{
  success: boolean;
  message: string;
  synced_kbm?: boolean;
  kbm_sesi_id?: string;
}> {
  return requestWithFallback<{ success: boolean; message: string; synced_kbm?: boolean; kbm_sesi_id?: string }>(
    'post',
    '/kesiswaan/program-ketarunaan/tap',
    { data: payload }
  );
}

// ─── Laporan ──────────────────────────────────────────────────────────────────

/**
 * Mengambil data laporan Tim Ketarunaan & Pendamping (Scope Sekolah).
 */
export async function getKetarunaanLaporanTim(params: {
  tanggal?: string;
  sesi_id?: string;
  jadwal_kegiatan_id?: string;
}): Promise<{ success: boolean; data: KetarunaanLaporanTimRow[]; tanggal: string; jenis_kegiatan: string }> {
  return requestWithFallback<{ success: boolean; data: KetarunaanLaporanTimRow[]; tanggal: string; jenis_kegiatan: string }>(
    'get',
    '/kesiswaan/program-ketarunaan/laporan-tim',
    { params, headers: { 'X-Skip-403-Redirect': 'true' } }
  ).catch(() => ({ success: false, data: [], tanggal: '', jenis_kegiatan: 'Ketarunaan' }));
}

/**
 * Mengambil data laporan per kelas (Scope Kelas) dari SSOT SesiAbsensi + AbsenSiswa + AbsenGuru.
 */
export async function getKetarunaanLaporanKelas(params: {
  tanggal?: string;
  kelas_id?: string;
  jadwal_kegiatan_id?: string;
  sesi_id?: string;
}): Promise<{ success: boolean; data: KetarunaanLaporanKelasRow[] }> {
  return requestWithFallback<{ success: boolean; data: KetarunaanLaporanKelasRow[] }>(
    'get',
    '/kesiswaan/program-ketarunaan/laporan-kelas',
    { params, headers: { 'X-Skip-403-Redirect': 'true' } }
  ).catch(() => ({ success: false, data: [] }));
}

// ─── Sesi Ketarunaan hari ini ─────────────────────────────────────────────────

/**
 * Mengambil SesiAbsensi Ketarunaan hari ini (per tanggal atau otomatis hari ini).
 */
export async function getKetarunaanSesiHariIni(params?: {
  tanggal?: string;
  jadwal_kegiatan_id?: string;
}): Promise<{ success: boolean; data: KetarunaanSession | null }> {
  return requestWithFallback<{ success: boolean; data: KetarunaanSession | null }>(
    'get',
    '/kesiswaan/program-ketarunaan/sesi-hari-ini',
    { params, headers: { 'X-Skip-403-Redirect': 'true' } }
  ).catch(() => ({ success: false, data: null }));
}
