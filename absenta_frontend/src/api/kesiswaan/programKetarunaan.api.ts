import { requestWithFallback } from '../apiUtils';
import {
  getUnifiedGuardStatus,
  getUnifiedSesiHariIni,
  getUnifiedPendamping,
  tapUnifiedPendamping,
  tapUnifiedPendampingRfid,
  getUnifiedStats,
  getUnifiedLaporanTim,
  getUnifiedLaporanKelas,
  type UnifiedActivitySession,
  type UnifiedPendampingItem,
  type UnifiedGuardStatus,
  type UnifiedTapPayload,
  type UnifiedTapResponse,
  type UnifiedRfidTapPayload,
  type UnifiedRfidTapResponse,
  type UnifiedStatsResponse,
  type UnifiedTrendItem,
  type UnifiedTarunaRankingItem,
  type UnifiedLaporanTimRow,
  type UnifiedLaporanKelasRow,
} from '../attendance/unifiedKegiatan.api';

// ─── Backward-Compatible Aliases ──────────────────────────────────────────────

export type KetarunaanSession = UnifiedActivitySession;
export type KetarunaanPendamping = UnifiedPendampingItem;
export type KetarunaanGuardStatus = UnifiedGuardStatus;
export type TapKetarunaanPayload = UnifiedTapPayload;
export type TapKetarunaanRfidPayload = UnifiedRfidTapPayload;
export type TapKetarunaanRfidResponse = UnifiedRfidTapResponse;
export type KetarunaanStatsResponse = UnifiedStatsResponse;
export type KetarunaanTrendItem = UnifiedTrendItem;
export type KetarunaanTarunaRankingItem = UnifiedTarunaRankingItem;
export type KetarunaanLaporanTimRow = UnifiedLaporanTimRow;
export type KetarunaanLaporanKelasRow = UnifiedLaporanKelasRow;

// ─── API Wrapper Functions (Context: KETARUNAAN) ──────────────────────────────

export async function getKetarunaanGuardStatus(): Promise<KetarunaanGuardStatus> {
  return getUnifiedGuardStatus({ jenis_kegiatan: 'KETARUNAAN' });
}

export async function getKetarunaanSesiHariIni(params?: {
  tanggal?: string;
  jadwal_kegiatan_id?: string;
}): Promise<{ success: boolean; data: KetarunaanSession | null }> {
  return getUnifiedSesiHariIni({ ...params, jenis_kegiatan: 'KETARUNAAN' });
}

export async function getKetarunaanPendamping(params: {
  tanggal?: string;
  sesi_id?: string;
  jadwal_kegiatan_id?: string;
}): Promise<{ success: boolean; data: KetarunaanPendamping[]; sesi_id: string | null }> {
  return getUnifiedPendamping({ ...params, jenis_kegiatan: 'KETARUNAAN' });
}

export async function tapKetarunaanPendamping(payload: TapKetarunaanPayload): Promise<UnifiedTapResponse> {
  return tapUnifiedPendamping(payload);
}

export async function tapKetarunaanPendampingRfid(payload: TapKetarunaanRfidPayload): Promise<TapKetarunaanRfidResponse> {
  return tapUnifiedPendampingRfid({ ...payload, jenis_kegiatan: 'KETARUNAAN' });
}

export async function getKetarunaanStats(params?: {
  tahun_pelajaran_id?: string;
  semester_id?: string;
  jadwal_kegiatan_id?: string;
  tanggal_mulai?: string;
  tanggal_selesai?: string;
  scope_periode?: '1_tahun' | '1_semester' | '1_bulan' | 'kustom';
  bulan_ym?: string;
  mode_agenda?: 'SEMUA_SIKLUS' | 'APEL_PAGI' | 'UPACARA' | 'KETARUNAAN' | 'LATIHAN_KETARUNAAN' | 'DUHA' | 'APEL_SORE';
  limit?: number;
}): Promise<KetarunaanStatsResponse> {
  return getUnifiedStats({ ...params, jenis_kegiatan: 'KETARUNAAN' });
}

export async function getKetarunaanLaporanTim(params: {
  tanggal?: string;
  sesi_id?: string;
  jadwal_kegiatan_id?: string;
  tahun_pelajaran_id?: string;
  semester_id?: string;
}): Promise<{ success: boolean; data: KetarunaanLaporanTimRow[]; tanggal: string; jenis_kegiatan: string }> {
  return getUnifiedLaporanTim({ ...params, jenis_kegiatan: 'Ketarunaan' });
}

export async function getKetarunaanLaporanKelas(params: {
  tanggal?: string;
  kelas_id?: string;
  jadwal_kegiatan_id?: string;
  sesi_id?: string;
  tahun_pelajaran_id?: string;
  semester_id?: string;
}): Promise<{ success: boolean; data: KetarunaanLaporanKelasRow[] }> {
  return getUnifiedLaporanKelas({ ...params, jenis_kegiatan: 'Ketarunaan' });
}

// ─── Modul Penilaian & Skema Bobot Ketarunaan ─────────────────────────────────

export interface KetarunaanSkema {
  id?: string;
  tenant_id?: string;
  tahun_pelajaran_id: string;
  semester_id?: string | null;
  jurusan_id?: string | null;
  mode_pelatihan: 'FULL_TARUNA' | 'SEMI_TARUNA';
  bobot_samapta: number;
  bobot_pbb: number;
  bobot_disiplin: number;
  bobot_mental: number;
  active_sub_aspects?: any;
  is_default?: boolean;
}

export interface Presensi5SiklusInfo {
  hadir_disiplin: number;
  total_sesi_disiplin: number;
  persen_disiplin: number;
  hadir_duha: number;
  total_sesi_duha: number;
  persen_duha: number;
  terlambat_count: number;
  rekomendasi_disiplin: number;
  rekomendasi_mental: number;
}

export interface KetarunaanNilaiStudent {
  siswa_id: string;
  siswa_akademik_id?: string | null;
  nis: string;
  nisn?: string | null;
  nama_siswa: string;
  jenis_kelamin: string;
  kelas_id?: string;
  nama_kelas?: string;
  tingkat?: string;
  jurusan_id?: string;
  jurusan_nama?: string;
  kode_jurusan?: string;
  nilai_samapta: number;
  nilai_pbb: number;
  nilai_disiplin: number;
  nilai_mental: number;
  nilai_akhir: number;
  predikat: string;
  deskripsi_rapor: string;
  detail_samapta?: any;
  is_locked: boolean;
  locked_at?: string | null;
  presensi?: Presensi5SiklusInfo;
}

export interface KetarunaanNilaiKelasResponse {
  success: boolean;
  data: {
    kelas: {
      id: string;
      nama_kelas: string;
      tingkat?: number;
      jurusan_id?: string | null;
      Jurusan?: { id: string; nama: string; kode?: string; singkatan?: string };
    };
    skema: KetarunaanSkema;
    total_siswa: number;
    is_class_locked: boolean;
    presensi_summary?: {
      total_sesi_terlaksana: number;
      total_sesi_disiplin: number;
      total_sesi_duha: number;
    };
    students: KetarunaanNilaiStudent[];
  };
}

export async function getKetarunaanSkema(params: {
  tahun_pelajaran_id: string;
  semester_id?: string | null;
  jurusan_id?: string | null;
}): Promise<{ success: boolean; data: KetarunaanSkema }> {
  return requestWithFallback<{ success: boolean; data: KetarunaanSkema }>(
    'get',
    '/kesiswaan/program-ketarunaan/skema',
    { params, unwrapData: true }
  );
}

export async function saveKetarunaanSkema(
  payload: KetarunaanSkema
): Promise<{ success: boolean; data: KetarunaanSkema; message: string }> {
  return requestWithFallback(
    'post',
    '/kesiswaan/program-ketarunaan/skema',
    { data: payload, unwrapData: true }
  );
}

export async function getKetarunaanNilaiKelas(params: {
  kelas_id: string;
  tahun_pelajaran_id: string;
  semester_id: string;
}): Promise<KetarunaanNilaiKelasResponse> {
  return requestWithFallback<KetarunaanNilaiKelasResponse>(
    'get',
    '/kesiswaan/program-ketarunaan/nilai',
    { params, unwrapData: true }
  );
}

export async function saveKetarunaanNilaiBulk(payload: {
  kelas_id: string;
  tahun_pelajaran_id: string;
  semester_id: string;
  is_archive_correction?: boolean;
  correction_reason?: string;
  items: Array<{
    siswa_id: string;
    siswa_akademik_id?: string | null;
    nilai_samapta: number;
    nilai_pbb: number;
    nilai_disiplin: number;
    nilai_mental: number;
    detail_samapta?: any;
    custom_deskripsi?: string | null;
  }>;
}): Promise<{ success: boolean; message: string }> {
  return requestWithFallback(
    'post',
    '/kesiswaan/program-ketarunaan/nilai/bulk',
    { data: payload, unwrapData: true }
  );
}

export async function lockKetarunaanNilai(payload: {
  kelas_id: string;
  tahun_pelajaran_id: string;
  semester_id: string;
  is_archive_correction?: boolean;
  correction_reason?: string;
}): Promise<{ success: boolean; message: string }> {
  return requestWithFallback(
    'post',
    '/kesiswaan/program-ketarunaan/nilai/lock',
    { data: payload, unwrapData: true }
  );
}

export async function unlockKetarunaanNilai(payload: {
  kelas_id: string;
  tahun_pelajaran_id: string;
  semester_id: string;
  is_archive_correction?: boolean;
  correction_reason?: string;
}): Promise<{ success: boolean; message: string }> {
  return requestWithFallback(
    'post',
    '/kesiswaan/program-ketarunaan/nilai/unlock',
    { data: payload, unwrapData: true }
  );
}

export async function syncKetarunaanPresensi5Siklus(params: {
  kelas_id: string;
  tahun_pelajaran_id: string;
  semester_id: string;
}): Promise<{
  success: boolean;
  data: {
    totalSesiTerlaksana: number;
    totalSesiDisiplin: number;
    totalSesiDuha: number;
    rekap: Record<string, Presensi5SiklusInfo>;
  };
}> {
  return requestWithFallback(
    'get',
    '/kesiswaan/program-ketarunaan/presensi-sync',
    { params, unwrapData: true }
  );
}

export interface KetarunaanNilaiExportRow {
  no: number;
  siswa_id: string;
  nis: string;
  nisn: string;
  nama_taruna: string;
  nama_lengkap: string;
  nama_siswa: string;
  jenis_kelamin: string;
  jk: string;
  jk_label: string;
  kelas_id: string;
  kelas: string;
  rombel: string;
  tingkat: string;
  jurusan_id: string;
  jurusan: string;
  kode_jurusan: string;
  tahun_pelajaran: string;
  semester: string;
  mode_pelatihan: string;
  nilai_samapta: number;
  nilai_pbb: number;
  nilai_disiplin: number;
  nilai_mental: number;
  bobot_samapta: number;
  bobot_pbb: number;
  bobot_disiplin: number;
  bobot_mental: number;
  nilai_akhir: number;
  predikat: string;
  predikat_label: string;
  keterangan: string;
  deskripsi_capaian: string;
  deskripsi_rapor: string;
  nomor_sertifikat: string;
  tempat_terbit: string;
  tanggal_terbit: string;
  tanggal_cetak: string;
  nama_sekolah: string;
  npsn: string;
  alamat_sekolah: string;
  kota_sekolah: string;
  kepala_sekolah: string;
  nip_kepala_sekolah: string;
  is_locked: boolean;
}

export interface KetarunaanNilaiExportResponse {
  sekolah: any;
  tenant: any;
  tahun_pelajaran: any;
  semester: any;
  total_siswa: number;
  classes: Array<{ id: string; nama: string }>;
  students: KetarunaanNilaiExportRow[];
}

export async function getKetarunaanNilaiExport(params: {
  tahun_pelajaran_id: string;
  semester_id: string;
  kelas_id?: string;
}): Promise<{ success: boolean; data: KetarunaanNilaiExportResponse }> {
  return requestWithFallback(
    'get',
    '/kesiswaan/program-ketarunaan/nilai/export',
    { params, unwrapData: true }
  );
}

