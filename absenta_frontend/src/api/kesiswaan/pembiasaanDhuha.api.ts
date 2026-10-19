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
  type UnifiedLaporanTimRow,
  type UnifiedLaporanKelasRow,
} from '../attendance/unifiedKegiatan.api';

// ─── Backward-Compatible Aliases ──────────────────────────────────────────────

export type DhuhaSession = UnifiedActivitySession;
export type DhuhaPendamping = UnifiedPendampingItem;
export type DhuhaGuardStatus = UnifiedGuardStatus;
export type TapDhuhaPayload = UnifiedTapPayload;
export type TapDhuhaRfidPayload = UnifiedRfidTapPayload;
export type TapDhuhaRfidResponse = UnifiedRfidTapResponse;
export type DhuhaStatsResponse = UnifiedStatsResponse;
export type DhuhaTrendItem = UnifiedTrendItem;
export type DhuhaLaporanTimRow = UnifiedLaporanTimRow;
export type DhuhaLaporanKelasRow = UnifiedLaporanKelasRow;

// ─── API Wrapper Functions (Context: DHUHA / DUHA) ──────────────────────────

export async function getDhuhaGuardStatus(): Promise<DhuhaGuardStatus> {
  // Cek DUHA terlebih dahulu (sesuai nama master data di database), lalu fallback DHUHA
  const resDuha = await getUnifiedGuardStatus({ jenis_kegiatan: 'DUHA' });
  if (resDuha?.is_active) return resDuha;
  return getUnifiedGuardStatus({ jenis_kegiatan: 'DHUHA' });
}

export async function getDhuhaSesiHariIni(params?: {
  tanggal?: string;
  jadwal_kegiatan_id?: string;
}): Promise<{ success: boolean; data: DhuhaSession | null }> {
  const res = await getUnifiedSesiHariIni({ ...params, jenis_kegiatan: 'DUHA' });
  if (res?.data) return res;
  return getUnifiedSesiHariIni({ ...params, jenis_kegiatan: 'DHUHA' });
}

export async function getDhuhaPendamping(params: {
  tanggal?: string;
  sesi_id?: string;
  jadwal_kegiatan_id?: string;
}): Promise<{ success: boolean; data: DhuhaPendamping[]; sesi_id: string | null }> {
  const res = await getUnifiedPendamping({ ...params, jenis_kegiatan: 'DUHA' });
  if (res?.data && res.data.length > 0) return res;
  return getUnifiedPendamping({ ...params, jenis_kegiatan: 'DHUHA' });
}

export async function tapDhuhaPendamping(payload: TapDhuhaPayload): Promise<UnifiedTapResponse> {
  return tapUnifiedPendamping({ ...payload, jenis_kegiatan: 'DUHA' });
}

export async function tapDhuhaPendampingRfid(payload: TapDhuhaRfidPayload): Promise<TapDhuhaRfidResponse> {
  return tapUnifiedPendampingRfid({ ...payload, jenis_kegiatan: 'DUHA' });
}

export async function getDhuhaStats(params?: {
  tahun_pelajaran_id?: string;
  semester_id?: string;
  jadwal_kegiatan_id?: string;
  limit?: number;
}): Promise<DhuhaStatsResponse> {
  const res = await getUnifiedStats({ ...params, jenis_kegiatan: 'DUHA' });
  if (res?.data && res.data.trend && res.data.trend.length > 0) return res;
  return getUnifiedStats({ ...params, jenis_kegiatan: 'DHUHA' });
}

export async function getDhuhaLaporanTim(params: {
  tanggal?: string;
  sesi_id?: string;
  jadwal_kegiatan_id?: string;
}): Promise<{ success: boolean; data: DhuhaLaporanTimRow[]; tanggal: string; jenis_kegiatan: string }> {
  return getUnifiedLaporanTim({ ...params, jenis_kegiatan: 'Pembiasaan Dhuha' });
}

export async function getDhuhaLaporanKelas(params: {
  tanggal?: string;
  kelas_id?: string;
  jadwal_kegiatan_id?: string;
  sesi_id?: string;
}): Promise<{ success: boolean; data: DhuhaLaporanKelasRow[] }> {
  return getUnifiedLaporanKelas({ ...params, jenis_kegiatan: 'Pembiasaan Dhuha' });
}
