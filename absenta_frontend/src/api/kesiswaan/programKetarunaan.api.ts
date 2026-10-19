import {
  getUnifiedGuardStatus,
  getUnifiedSesiHariIni,
  getUnifiedPendamping,
  tapUnifiedPendamping,
  getUnifiedStats,
  getUnifiedLaporanTim,
  getUnifiedLaporanKelas,
  type UnifiedActivitySession,
  type UnifiedPendampingItem,
  type UnifiedGuardStatus,
  type UnifiedTapPayload,
  type UnifiedTapResponse,
  type UnifiedStatsResponse,
  type UnifiedTrendItem,
  type UnifiedLaporanTimRow,
  type UnifiedLaporanKelasRow,
} from '../attendance/unifiedKegiatan.api';

// ─── Backward-Compatible Aliases ──────────────────────────────────────────────

export type KetarunaanSession = UnifiedActivitySession;
export type KetarunaanPendamping = UnifiedPendampingItem;
export type KetarunaanGuardStatus = UnifiedGuardStatus;
export type TapKetarunaanPayload = UnifiedTapPayload;
export type KetarunaanStatsResponse = UnifiedStatsResponse;
export type KetarunaanTrendItem = UnifiedTrendItem;
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

export async function getKetarunaanStats(params?: {
  tahun_pelajaran_id?: string;
  semester_id?: string;
  jadwal_kegiatan_id?: string;
  limit?: number;
}): Promise<KetarunaanStatsResponse> {
  return getUnifiedStats({ ...params, jenis_kegiatan: 'KETARUNAAN' });
}

export async function getKetarunaanLaporanTim(params: {
  tanggal?: string;
  sesi_id?: string;
  jadwal_kegiatan_id?: string;
}): Promise<{ success: boolean; data: KetarunaanLaporanTimRow[]; tanggal: string; jenis_kegiatan: string }> {
  return getUnifiedLaporanTim({ ...params, jenis_kegiatan: 'Ketarunaan' });
}

export async function getKetarunaanLaporanKelas(params: {
  tanggal?: string;
  kelas_id?: string;
  jadwal_kegiatan_id?: string;
  sesi_id?: string;
}): Promise<{ success: boolean; data: KetarunaanLaporanKelasRow[] }> {
  return getUnifiedLaporanKelas({ ...params, jenis_kegiatan: 'Ketarunaan' });
}
