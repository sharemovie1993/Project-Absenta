/**
 * kbm-normalizer.ts
 * 
 * SATU KABEL untuk semua modul KBM.
 * 
 * Fungsi ini menerima item dari ENDPOINT MANAPUN (sesi-absensi ATAU jadwal-kbm/my)
 * dan menghasilkan KbmItem dengan shape yang IDENTIK — termasuk status flags.
 * 
 * Semua komponen (Guru, Siswa, Ops, Monitoring) harus konsumsi KbmItem,
 * bukan raw response dari masing-masing endpoint.
 */

export interface KbmStatus {
  isLive: boolean;
  isFinished: boolean;
  isOverdue: boolean;
  isUpcoming: boolean;
  teacherStatus: 'TEPAT_WAKTU' | 'TERLAMBAT' | 'ALPA' | 'BELUM_TAP';
}

export interface KbmSummary {
  hadir: number;
  total: number;
  HADIR: number;
  TERLAMBAT: number;
  IZIN: number;
  SAKIT: number;
  ALPA: number;
}

export interface KbmItem {
  id: string;
  jam_mulai: string;       // "HH:MM"
  jam_selesai: string;     // "HH:MM"
  slot_mulai?: number;
  slot_selesai?: number;
  jamLabel?: string;       // "Jam ke-1 s/d 3"
  waktu_mulai?: string;    // ISO string
  waktu_selesai?: string;  // ISO string
  kelas_id?: string;
  kelas_nama: string;
  mapel_id?: string;
  mapel_nama: string;
  guru_id?: string;
  guru_nama: string;
  jenis_kegiatan: string;
  tanggal?: string;

  // Physical session (null jika virtual/terjadwal belum dibuka)
  session: any | null;

  // Unified status — always from server, never computed in frontend
  status: KbmStatus;

  // Attendance summary
  summary: KbmSummary;

  // Siswa-specific
  attendance_status?: string;
  waktu_tap?: string;

  // Metadata
  is_adhoc?: boolean;
  is_piket?: boolean;
  _raw?: any; // raw response untuk keperluan debug
}

const EMPTY_SUMMARY: KbmSummary = {
  hadir: 0, total: 0, HADIR: 0, TERLAMBAT: 0, IZIN: 0, SAKIT: 0, ALPA: 0
};

/**
 * Normalizes an item from GET /attendance/sesi-absensi (Ops/Monitoring endpoint).
 * These items are physical sessions with _summary enrichment from server.
 */
export function normalizeFromSesiAbsensi(raw: any): KbmItem {
  const summary = raw._summary || raw.summary || {};
  const hadir = (summary.HADIR || 0) + (summary.TERLAMBAT || 0);

  const status: KbmStatus = {
    isLive:     summary.isLive     ?? false,
    isFinished: summary.isFinished ?? (raw.status === 'SELESAI'),
    isOverdue:  summary.isOverdue  ?? false,
    isUpcoming: summary.isUpcoming ?? false,
    teacherStatus: summary.teacherStatus ?? 'BELUM_TAP',
  };

  const jamMulai = raw.waktu_mulai
    ? new Date(raw.waktu_mulai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':')
    : (raw.jam_mulai || '??:??');

  const jamSelesai = raw.waktu_selesai
    ? new Date(raw.waktu_selesai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':')
    : (raw.jam_selesai || '??:??');

  const isUpcoming = !status.isLive && !status.isFinished && !status.isOverdue;
  status.isUpcoming = isUpcoming;

  const slotMulai = raw.slot_mulai ?? raw.slotMulai ?? raw.jam_ke_start ?? raw.slot_index ?? raw.session?.slot_index;
  const slotSelesai = raw.slot_selesai ?? raw.slotSelesai ?? raw.jam_ke_end ?? slotMulai;
  let jamLabel = raw.jamLabel;
  if (!jamLabel && slotMulai) {
    jamLabel = (slotMulai === slotSelesai || !slotSelesai)
      ? `Jam ke-${slotMulai}`
      : `Jam ke-${slotMulai} s/d ${slotSelesai}`;
  }

  return {
    id: raw.id,
    jam_mulai: jamMulai,
    jam_selesai: jamSelesai,
    slot_mulai: slotMulai,
    slot_selesai: slotSelesai,
    jamLabel: jamLabel || undefined,
    waktu_mulai: raw.waktu_mulai,
    waktu_selesai: raw.waktu_selesai,
    kelas_id: raw.kelas_id,
    kelas_nama: raw.Kelas?.nama_kelas || raw.kelas_nama || '-',
    mapel_id: raw.mapel_id,
    mapel_nama: raw.Mapel?.nama_mapel || raw.mapel_nama || raw.jenis_kegiatan || '-',
    kegiatan: raw.Mapel?.nama_mapel || raw.mapel_nama || raw.jenis_kegiatan || raw.kegiatan || '-',
    guru_id: raw.guru_id,
    guru_nama: raw.Guru?.nama_guru || raw.guru_nama || '-',
    guru_status: raw.guru_status || (status.teacherStatus === 'TERLAMBAT' ? 'TERLAMBAT' : (status.teacherStatus === 'TEPAT_WAKTU' ? 'HADIR' : (status.isFinished || status.isOverdue ? 'ALPA' : 'BELUM_TAP'))),
    jenis_kegiatan: raw.jenis_kegiatan || 'KBM',
    tanggal: raw.tanggal,
    session: raw, // physical session IS the item here
    status,
    foto_kegiatan: raw.foto_kegiatan || null,
    summary: {
      ...EMPTY_SUMMARY,
      ...summary,
      hadir,
      total: summary.total || 0,
    },
    attendance_status: raw.attendance_status,
    waktu_tap: raw.waktu_tap,
    is_adhoc: raw.is_adhoc,
    _raw: raw,
    // ── Preserved Nested Relations for Legacy Components ──
    Kelas: raw.Kelas || { nama_kelas: raw.kelas_nama || '-' },
    Mapel: raw.Mapel || { nama_mapel: raw.mapel_nama || raw.jenis_kegiatan || '-' },
    Guru: raw.Guru || { nama_guru: raw.guru_nama || '-' },
    ProgresMateri: raw.ProgresMateri || null,
    _summary: {
      ...EMPTY_SUMMARY,
      ...summary,
      hadir,
      total: summary.total || 0,
      isLive: status.isLive,
      isFinished: status.isFinished,
      isOverdue: status.isOverdue,
      isUpcoming: status.isUpcoming,
      teacherStatus: status.teacherStatus,
    },
    // ── Backward-compatible root-level aliases ──
    isLive:     status.isLive,
    isFinished: status.isFinished,
    isOverdue:  status.isOverdue,
    is_overdue: status.isOverdue,
    isUpcoming: status.isUpcoming,
  };
}

/**
 * Normalizes an item from GET /kurikulum/jadwal-kbm/my (Guru/Siswa endpoint).
 * These items are schedule slots with optional matched physical session.
 */
export function normalizeFromJadwalKbm(raw: any): KbmItem {
  const physicalSession = raw.session;
  const sessionSummary = physicalSession?._summary || {};
  const rawSummary = raw.summary || {};
  const merged = { ...rawSummary, ...sessionSummary };
  const hadir = (merged.HADIR || 0) + (merged.TERLAMBAT || 0);

  const isLive     = raw.is_live     ?? sessionSummary.isLive     ?? false;
  const isFinished = raw.is_finished ?? sessionSummary.isFinished ?? false;
  const isOverdue  = raw.is_overdue  ?? sessionSummary.isOverdue  ?? false;
  const isUpcoming = !isLive && !isFinished && !isOverdue;

  const status: KbmStatus = {
    isLive,
    isFinished,
    isOverdue,
    isUpcoming,
    teacherStatus: sessionSummary.teacherStatus ?? (
      raw.attendance_status === 'HADIR' ? (raw.is_terlambat ? 'TERLAMBAT' : 'TEPAT_WAKTU') : 
      (raw.guru_status === 'TERLAMBAT' || physicalSession?.guru_status === 'TERLAMBAT' || raw.absenGuru?.is_terlambat) ? 'TERLAMBAT' :
      (raw.guru_status === 'HADIR' || raw.is_live ? 'TEPAT_WAKTU' :
      (isFinished || isOverdue) ? 'ALPA' : 'BELUM_TAP')
    ),
  };

  const mapelNama = raw.Mapel?.nama_mapel || raw.kegiatan || raw.jenis_kegiatan || raw.title || '-';
  const guruNama = raw.Guru?.nama_guru || raw.guru_nama || '-';
  const kelasNama = raw.Kelas?.nama_kelas || raw.kelas_nama || raw.subTitle || '-';

  const slotMulai = raw.slot_mulai ?? raw.slotMulai ?? raw.slot_index ?? raw.jam_ke_start ?? 1;
  const slotSelesai = raw.slot_selesai ?? raw.slotSelesai ?? raw.jam_ke_end ?? slotMulai;
  let jamLabel = raw.jamLabel;
  if (!jamLabel && slotMulai) {
    jamLabel = (slotMulai === slotSelesai || !slotSelesai)
      ? `Jam ke-${slotMulai}`
      : `Jam ke-${slotMulai} s/d ${slotSelesai}`;
  }

  return {
    id: raw.id,
    jam_mulai: raw.jam_mulai || raw.jamMulai || '??:??',
    jam_selesai: raw.jam_selesai || raw.jamSelesai || '??:??',
    slot_mulai: slotMulai,
    slot_selesai: slotSelesai,
    jamLabel: jamLabel || undefined,
    waktu_mulai: physicalSession?.waktu_mulai,
    waktu_selesai: physicalSession?.waktu_selesai,
    kelas_id: raw.kelas_id,
    kelas_nama: kelasNama,
    mapel_id: raw.mapel_id,
    mapel_nama: mapelNama,
    guru_id: raw.guru_id,
    guru_nama: guruNama,
    jenis_kegiatan: raw.jenis_kegiatan || raw.kegiatan || raw.type || 'KBM',
    session: physicalSession || null,
    status,
    summary: {
      ...EMPTY_SUMMARY,
      ...merged,
      hadir,
      total: merged.total || 0,
    },
    attendance_status: raw.attendance_status,
    waktu_tap: raw.waktu_tap,
    is_adhoc: raw.is_adhoc,
    is_piket: raw.is_piket,
    _raw: raw,
    // ── Preserved Nested Relations ──
    Kelas: raw.Kelas || { nama_kelas: kelasNama },
    Mapel: raw.Mapel || { nama_mapel: mapelNama },
    Guru: raw.Guru || { nama_guru: guruNama },
    ProgresMateri: physicalSession?.ProgresMateri || raw.ProgresMateri || null,
    _summary: {
      ...EMPTY_SUMMARY,
      ...merged,
      hadir,
      total: merged.total || 0,
      isLive: status.isLive,
      isFinished: status.isFinished,
      isOverdue: status.isOverdue,
      isUpcoming: status.isUpcoming,
      teacherStatus: status.teacherStatus,
    },
    // ── Backward-compatible root-level aliases ──
    isLive:     status.isLive,
    isFinished: status.isFinished,
    isOverdue:  status.isOverdue,
    is_overdue: status.isOverdue,
    isUpcoming: status.isUpcoming,
    // Legacy kegiatan/mapel field names
    kegiatan:     mapelNama,
    kegiatan_raw: raw.jenis_kegiatan,
    posPiket:     raw.pos_piket,
    catatan:      raw.catatan,
    myAbsenRecord: physicalSession?.AbsenGuru?.[0] || null,
    isGuruHadir: !!raw.waktu_tap || !!raw.attendance_status,
    teacherStatus: status.teacherStatus,
    isAdHoc: !!raw.is_adhoc,
    isPiket: !!raw.is_piket,
  };
}

/**
 * Status label yang konsisten untuk semua modul.
 * Gunakan ini di semua badge/label, jangan hardcode string sendiri.
 */
export function getKbmStatusLabel(status: KbmStatus): string {
  if (status.isLive)     return 'Sedang Berlangsung';
  if (status.isFinished) return 'Selesai';
  if (status.isOverdue)  return 'Terlewat';
  return 'Mendatang';
}

export function getKbmStatusKey(status: KbmStatus): 'LIVE' | 'FINISHED' | 'OVERDUE' | 'UPCOMING' {
  if (status.isLive)     return 'LIVE';
  if (status.isFinished) return 'FINISHED';
  if (status.isOverdue)  return 'OVERDUE';
  return 'UPCOMING';
}
