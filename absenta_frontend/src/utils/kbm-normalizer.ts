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
  isReadyToOpen?: boolean;
  teacherStatus: 'TEPAT_WAKTU' | 'HADIR' | 'TERLAMBAT' | 'IZIN' | 'SAKIT' | 'PENUGASAN' | 'DIGANTIKAN' | 'ALPA' | 'BELUM_TAP' | 'BELUM_MULAI' | string;
}

export interface TeacherStatusMeta {
  key: string;
  label: string;          // e.g. "GURU HADIR", "GURU IZIN", "GURU SAKIT", "PENUGASAN", "GURU INVAL", "GURU TERLAMBAT", "GURU ALPA", "GURU BELUM TAP"
  shortLabel: string;     // e.g. "HADIR", "IZIN", "SAKIT", "TUGAS", "INVAL", "TELAT", "ALPA", "BELUM TAP"
  titleCaseLabel: string; // e.g. "Guru Hadir", "Guru Izin", "Guru Sakit", "Penugasan", "Guru Inval", "Guru Telat", "Guru Alpa", "Belum Hadir"
  colorVariant: 'success' | 'warning' | 'info' | 'error' | 'purple' | 'orange' | 'slate';
  badgeClass: string;     // Tailwind classes
  dotClass: string;       // Dot indicator classes
  badgePropsVariant: 'success' | 'warning' | 'info' | 'error' | 'secondary'; // for UI Badge component
}

/**
 * 🏛️ Single Source of Truth (SSOT) untuk Resolusi Metadata Status Kehadiran Guru.
 * Digunakan seragam oleh Petugas Kelas, Siswa, Dashboard Guru, KBM Live, dan Meja Piket.
 */
export function getTeacherStatusMeta(rawStatus?: string): TeacherStatusMeta {
  const s = String(rawStatus || '').trim().toUpperCase().replace(/\s+/g, '_');
  
  if (s === 'HADIR' || s === 'TEPAT_WAKTU') {
    return {
      key: 'HADIR',
      label: 'GURU HADIR',
      shortLabel: 'HADIR',
      titleCaseLabel: 'Guru Hadir',
      colorVariant: 'success',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
      dotClass: 'bg-emerald-500',
      badgePropsVariant: 'success'
    };
  }
  if (s === 'TERLAMBAT') {
    return {
      key: 'TERLAMBAT',
      label: 'GURU TERLAMBAT',
      shortLabel: 'TERLAMBAT',
      titleCaseLabel: 'Guru Telat',
      colorVariant: 'warning',
      badgeClass: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
      dotClass: 'bg-amber-500',
      badgePropsVariant: 'warning'
    };
  }
  if (s === 'IZIN') {
    return {
      key: 'IZIN',
      label: 'GURU IZIN',
      shortLabel: 'IZIN',
      titleCaseLabel: 'Guru Izin',
      colorVariant: 'info',
      badgeClass: 'bg-blue-500/20 text-blue-300 border border-blue-500/40',
      dotClass: 'bg-blue-500',
      badgePropsVariant: 'info'
    };
  }
  if (s === 'SAKIT') {
    return {
      key: 'SAKIT',
      label: 'GURU SAKIT',
      shortLabel: 'SAKIT',
      titleCaseLabel: 'Guru Sakit',
      colorVariant: 'orange',
      badgeClass: 'bg-orange-500/20 text-orange-300 border border-orange-500/40',
      dotClass: 'bg-orange-500',
      badgePropsVariant: 'warning'
    };
  }
  if (s === 'PENDING_IZIN' || s === 'MENUNGGU_VERIFIKASI') {
    return {
      key: 'PENDING_IZIN',
      label: 'MENUNGGU VERIFIKASI IZIN',
      shortLabel: 'IZIN PENDING',
      titleCaseLabel: 'Izin Pending',
      colorVariant: 'warning',
      badgeClass: 'bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-500/40 animate-pulse',
      dotClass: 'bg-amber-500',
      badgePropsVariant: 'warning'
    };
  }
  if (s === 'DINAS_LUAR') {
    return {
      key: 'DINAS_LUAR',
      label: 'DINAS LUAR',
      shortLabel: 'DINAS LUAR',
      titleCaseLabel: 'Dinas Luar',
      colorVariant: 'purple',
      badgeClass: 'bg-purple-500/20 text-purple-900 dark:text-purple-300 border border-purple-500/40',
      dotClass: 'bg-purple-500',
      badgePropsVariant: 'secondary'
    };
  }
  if (s === 'PENUGASAN' || s === 'DISPEN') {
    return {
      key: 'PENUGASAN',
      label: 'PENUGASAN',
      shortLabel: 'PENUGASAN',
      titleCaseLabel: 'Penugasan',
      colorVariant: 'purple',
      badgeClass: 'bg-purple-500/20 text-purple-300 border border-purple-500/40',
      dotClass: 'bg-purple-500',
      badgePropsVariant: 'secondary'
    };
  }
  if (s === 'DIGANTIKAN' || s === 'INVAL') {
    return {
      key: 'INVAL',
      label: 'GURU INVAL',
      shortLabel: 'INVAL',
      titleCaseLabel: 'Guru Inval',
      colorVariant: 'purple',
      badgeClass: 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40',
      dotClass: 'bg-fuchsia-500',
      badgePropsVariant: 'secondary'
    };
  }
  if (s === 'ALPA') {
    return {
      key: 'ALPA',
      label: 'GURU ALPA',
      shortLabel: 'ALPA',
      titleCaseLabel: 'Guru Alpa',
      colorVariant: 'error',
      badgeClass: 'bg-rose-500/20 text-rose-300 border border-rose-500/40',
      dotClass: 'bg-rose-500',
      badgePropsVariant: 'error'
    };
  }
  if (s === 'BELUM_MULAI') {
    return {
      key: 'BELUM_MULAI',
      label: 'BELUM MULAI',
      shortLabel: 'BELUM MULAI',
      titleCaseLabel: 'Belum Mulai',
      colorVariant: 'slate',
      badgeClass: 'bg-slate-500/20 text-slate-300 border border-slate-500/40',
      dotClass: 'bg-slate-400',
      badgePropsVariant: 'secondary'
    };
  }
  return {
    key: 'BELUM_TAP',
    label: 'GURU BELUM TAP',
    shortLabel: 'BELUM TAP',
    titleCaseLabel: 'Belum Hadir',
    colorVariant: 'slate',
    badgeClass: 'bg-slate-500/20 text-slate-300 border border-slate-500/40',
    dotClass: 'bg-slate-400 animate-pulse',
    badgePropsVariant: 'info'
  };
}

export interface SessionStatusMeta {
  key: 'LIVE' | 'READY_TO_OPEN' | 'FINISHED' | 'OVERDUE' | 'UPCOMING';
  label: string;          // e.g. "BERLANGSUNG", "SIAP DIMULAI", "SELESAI", "TERLEWAT", "MENDATANG"
  shortLabel: string;     // e.g. "LIVE", "SIAP", "DONE", "TERLEWAT", "SOON"
  titleCaseLabel: string; // e.g. "Berlangsung", "Siap Dimulai", "Selesai", "Terlewat", "Mendatang"
  colorVariant: 'success' | 'warning' | 'info' | 'error' | 'secondary';
  badgeClass: string;     // Tailwind classes (with glowing dot animation where appropriate)
  dotClass: string;       // Dot indicator classes
  badgePropsVariant: 'success' | 'warning' | 'info' | 'error' | 'secondary';
}

/**
 * 🏛️ Single Source of Truth (SSOT) untuk Resolusi Metadata Status Sesi KBM.
 * Digunakan seragam oleh Petugas Kelas, Siswa, Dashboard Guru, KBM Live, dan Meja Piket.
 */
export function getSessionStatusMeta(statusInput?: KbmStatus | any): SessionStatusMeta {
  const isLive = Boolean(
    statusInput?.isLive ?? 
    statusInput?.status?.isLive ?? 
    (statusInput === 'BERLANGSUNG' || statusInput === 'LIVE' || statusInput?.status === 'BERLANGSUNG')
  );
  const isReadyToOpen = Boolean(
    statusInput?.isReadyToOpen ?? 
    statusInput?.status?.isReadyToOpen ?? 
    (statusInput === 'SIAP_DIMULAI' || statusInput === 'READY_TO_OPEN' || statusInput === 'READY_UNOPENED')
  );
  const isFinished = Boolean(
    statusInput?.isFinished ?? 
    statusInput?.status?.isFinished ?? 
    (statusInput === 'SELESAI' || statusInput === 'FINISHED' || statusInput === 'DONE' || statusInput?.status === 'SELESAI')
  );
  const isOverdue = Boolean(
    statusInput?.isOverdue ?? 
    statusInput?.status?.isOverdue ?? 
    statusInput?.is_overdue ?? 
    (statusInput === 'TERLEWAT' || statusInput === 'OVERDUE' || statusInput === 'MISSED' || statusInput?.status === 'Terlewat')
  );

  if (isLive) {
    return {
      key: 'LIVE',
      label: 'BERLANGSUNG',
      shortLabel: 'LIVE',
      titleCaseLabel: 'Berlangsung',
      colorVariant: 'success',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse',
      dotClass: 'bg-emerald-500 animate-ping',
      badgePropsVariant: 'success'
    };
  }
  if (isReadyToOpen) {
    return {
      key: 'READY_TO_OPEN',
      label: 'SIAP DIMULAI',
      shortLabel: 'SIAP',
      titleCaseLabel: 'Siap Dimulai',
      colorVariant: 'warning',
      badgeClass: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
      dotClass: 'bg-amber-500 animate-pulse',
      badgePropsVariant: 'warning'
    };
  }
  if (isFinished) {
    return {
      key: 'FINISHED',
      label: 'SELESAI',
      shortLabel: 'DONE',
      titleCaseLabel: 'Selesai',
      colorVariant: 'secondary',
      badgeClass: 'bg-slate-500/20 text-slate-400 border border-slate-500/30',
      dotClass: 'bg-slate-500',
      badgePropsVariant: 'secondary'
    };
  }
  if (isOverdue) {
    return {
      key: 'OVERDUE',
      label: 'TERLEWAT',
      shortLabel: 'TERLEWAT',
      titleCaseLabel: 'Terlewat',
      colorVariant: 'error',
      badgeClass: 'bg-rose-500/20 text-rose-300 border border-rose-500/40',
      dotClass: 'bg-rose-500',
      badgePropsVariant: 'error'
    };
  }
  return {
    key: 'UPCOMING',
    label: 'MENDATANG',
    shortLabel: 'SOON',
    titleCaseLabel: 'Mendatang',
    colorVariant: 'info',
    badgeClass: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40',
    dotClass: 'bg-indigo-500',
    badgePropsVariant: 'info'
  };
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
  isLive?: boolean;
  isFinished?: boolean;
  isOverdue?: boolean;
  isUpcoming?: boolean;
  isReadyToOpen?: boolean;
  is_overdue?: boolean;
  guru_status?: string;
  foto_kegiatan: string | null;

  // Attendance summary
  summary: KbmSummary;

  // Siswa-specific
  attendance_status?: string;
  waktu_tap?: string;

  // Metadata
  is_adhoc?: boolean;
  is_piket?: boolean;
  _raw?: any; // raw response untuk keperluan debug
  [key: string]: any;
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

  const isLive = raw.isLive ?? raw._summary?.isLive ?? summary.isLive ?? raw.status?.isLive ?? false;
  const isReadyToOpen = raw.isReadyToOpen ?? raw._summary?.isReadyToOpen ?? summary.isReadyToOpen ?? raw.status?.isReadyToOpen ?? false;
  const isFinished = raw.isFinished ?? raw._summary?.isFinished ?? summary.isFinished ?? raw.status?.isFinished ?? (raw.status === 'SELESAI');
  const isOverdue = raw.isOverdue ?? raw.is_overdue ?? raw._summary?.isOverdue ?? summary.isOverdue ?? raw.status?.isOverdue ?? false;
  const isUpcoming = raw.isUpcoming ?? raw._summary?.isUpcoming ?? summary.isUpcoming ?? raw.status?.isUpcoming ?? false;
  const teacherStatus = raw.teacherStatus ?? raw._summary?.teacherStatus ?? summary.teacherStatus ?? raw.guru_status ?? (raw.AbsenGuru?.[0]?.status) ?? 'BELUM_TAP';

  const status: KbmStatus = {
    isLive,
    isReadyToOpen,
    isFinished,
    isOverdue,
    isUpcoming,
    teacherStatus,
  };

  const jamMulai = raw.waktu_mulai
    ? new Date(raw.waktu_mulai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':')
    : (raw.jam_mulai || '??:??');

  const jamSelesai = raw.waktu_selesai
    ? new Date(raw.waktu_selesai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':')
    : (raw.jam_selesai || '??:??');

  const slotMulai = raw.slot_mulai ?? raw.slotMulai ?? raw.jam_ke_start ?? raw.slot_index ?? raw.session?.slot_index;
  const slotSelesai = raw.slot_selesai ?? raw.slotSelesai ?? raw.jam_ke_end ?? slotMulai;
  let jamLabel = raw.jamLabel;
  if (!jamLabel && slotMulai) {
    jamLabel = (slotMulai === slotSelesai || !slotSelesai)
      ? `Jam ke-${slotMulai}`
      : `Jam ke-${slotMulai} s/d ${slotSelesai}`;
  }

  // Preserve exact teacher status if already present
  const resolvedGuruStatus = raw.guru_status || (raw.AbsenGuru?.[0]?.status) || status.teacherStatus || (status.isFinished || status.isOverdue ? 'ALPA' : 'BELUM_TAP');

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
    guru_no_hp: raw.Guru?.no_hp || raw.guru_no_hp || raw.telepon || raw.phone || null,
    guru_status: resolvedGuruStatus,
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
    Guru: raw.Guru || { nama_guru: raw.guru_nama || '-', no_hp: raw.Guru?.no_hp || raw.guru_no_hp || raw.telepon || raw.phone || null },
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
      isReadyToOpen: status.isReadyToOpen,
      teacherStatus: status.teacherStatus,
    },
    // ── Backward-compatible root-level aliases ──
    isLive: status.isLive,
    isFinished: status.isFinished,
    isOverdue: status.isOverdue,
    is_overdue: status.isOverdue,
    isUpcoming: status.isUpcoming,
    isReadyToOpen: status.isReadyToOpen,
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

  const isLive     = physicalSession?.isLive ?? raw.is_live ?? false;
  const isFinished = physicalSession?.isFinished ?? raw.is_finished ?? false;
  const isOverdue  = physicalSession?.isOverdue ?? raw.is_overdue ?? false;
  const isReadyToOpen = physicalSession?.isReadyToOpen ?? false;
  const isUpcoming = !isLive && !isFinished && !isOverdue && !isReadyToOpen;

  const rawTeacherStatus = raw.guru_status || physicalSession?.guru_status || raw.absenGuru?.status || sessionSummary.teacherStatus;
  
  let resolvedTeacherStatus = rawTeacherStatus;
  if (!resolvedTeacherStatus || resolvedTeacherStatus === 'BELUM_TAP') {
    if (raw.attendance_status === 'HADIR') {
      resolvedTeacherStatus = raw.is_terlambat ? 'TERLAMBAT' : 'TEPAT_WAKTU';
    } else if (raw.absenGuru?.is_terlambat) {
      resolvedTeacherStatus = 'TERLAMBAT';
    } else if (raw.is_live) {
      resolvedTeacherStatus = 'TEPAT_WAKTU';
    } else if (isFinished || isOverdue) {
      resolvedTeacherStatus = 'ALPA';
    } else {
      resolvedTeacherStatus = 'BELUM_TAP';
    }
  }

  const status: KbmStatus = {
    isLive,
    isReadyToOpen,
    isFinished,
    isOverdue,
    isUpcoming,
    teacherStatus: resolvedTeacherStatus,
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
    guru_no_hp: raw.Guru?.no_hp || raw.guru_no_hp || raw.telepon || raw.phone || null,
    guru_status: resolvedTeacherStatus,
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
